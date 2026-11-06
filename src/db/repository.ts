import { 
  openDB, 
  generateUUID, 
  nowISO, 
  recordSnapshot, 
  DatabaseError 
} from './indexedDB';
import { 
  Page, 
  Task, 
  Habit, 
  HabitLog, 
  CalendarEvent, 
  DayColor, 
  UserSettings, 
  BackupData 
} from '../types';

export class Repository {
  private static async getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): Promise<{ db: IDBDatabase, tx: IDBTransaction, store: IDBObjectStore }> {
    const db = await openDB();
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    return { db, tx, store };
  }

  // --- PAGES ---
  static async getAllPages(): Promise<Page[]> {
    const { store } = await this.getStore('pages', 'readonly');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const pages = request.result as Page[];
        pages.sort((a, b) => a.order - b.order);
        resolve(pages);
      };
      request.onerror = () => reject(request.error);
    });
  }

  static async createPage(pageData: { name: string; icon?: string; color?: string }): Promise<Page> {
    const db = await openDB();
    const allPages = await this.getAllPages();
    
    // Validate uniqueness
    if (allPages.some(p => p.name.trim().toLowerCase() === pageData.name.trim().toLowerCase())) {
      throw new Error(`A page named "${pageData.name}" already exists.`);
    }

    const now = nowISO();
    const newPage: Page = {
      id: generateUUID(),
      name: pageData.name.trim().slice(0, 40),
      icon: pageData.icon || 'Folder',
      color: pageData.color || '#4285F4',
      order: allPages.length,
      archived: false,
      createdAt: now,
      updatedAt: now,
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(['pages', 'snapshots'], 'readwrite');
      const store = tx.objectStore('pages');
      store.add(newPage);

      recordSnapshot(db, `Create page "${newPage.name}"`, [{
        storeName: 'pages',
        key: newPage.id,
        type: 'insert',
        before: null,
        after: newPage
      }]);

      tx.oncomplete = () => resolve(newPage);
      tx.onerror = () => reject(tx.error);
    });
  }

  static async updatePage(id: string, updates: Partial<Pick<Page, 'name' | 'icon' | 'color'>>): Promise<Page> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['pages', 'snapshots'], 'readwrite');
      const store = tx.objectStore('pages');
      const getReq = store.get(id);

      getReq.onsuccess = () => {
        const existing = getReq.result as Page | undefined;
        if (!existing) {
          reject(new Error('Page not found'));
          return;
        }

        const now = nowISO();
        const updated: Page = {
          ...existing,
          ...updates,
          updatedAt: now,
        };

        store.put(updated);
        recordSnapshot(db, `Update page "${updated.name}"`, [{
          storeName: 'pages',
          key: id,
          type: 'update',
          before: existing,
          after: updated
        }]);

        tx.oncomplete = () => resolve(updated);
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  static async reorderPages(orderedPageIds: string[]): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['pages', 'snapshots'], 'readwrite');
      const store = tx.objectStore('pages');
      const now = nowISO();
      const recordsToSnapshot: any[] = [];

      let completedCount = 0;
      orderedPageIds.forEach((id, index) => {
        const getReq = store.get(id);
        getReq.onsuccess = () => {
          const page = getReq.result as Page | undefined;
          if (page && page.order !== index) {
            const before = { ...page };
            page.order = index;
            page.updatedAt = now;
            store.put(page);
            recordsToSnapshot.push({
              storeName: 'pages',
              key: id,
              type: 'update',
              before,
              after: page
            });
          }
          completedCount++;
          if (completedCount === orderedPageIds.length) {
            if (recordsToSnapshot.length > 0) {
              recordSnapshot(db, 'Reorder pages', recordsToSnapshot);
            }
          }
        };
      });

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  static async setPageArchived(id: string, archived: boolean): Promise<Page> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['pages', 'snapshots'], 'readwrite');
      const store = tx.objectStore('pages');
      const getReq = store.get(id);

      getReq.onsuccess = () => {
        const page = getReq.result as Page | undefined;
        if (!page) {
          reject(new Error('Page not found'));
          return;
        }

        const now = nowISO();
        const before = { ...page };
        page.archived = archived;
        page.updatedAt = now;
        store.put(page);

        recordSnapshot(db, `${archived ? 'Archive' : 'Restore'} page "${page.name}"`, [{
          storeName: 'pages',
          key: id,
          type: 'update',
          before,
          after: page
        }]);

        tx.oncomplete = () => resolve(page);
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  static async deletePagePermanently(id: string, confirmedName: string): Promise<void> {
    const db = await openDB();
    const tasks = await this.getAllTasks();
    const pageTasks = tasks.filter(t => t.pageId === id);

    return new Promise((resolve, reject) => {
      const tx = db.transaction(['pages', 'tasks', 'snapshots'], 'readwrite');
      const pageStore = tx.objectStore('pages');
      const taskStore = tx.objectStore('tasks');

      const getReq = pageStore.get(id);
      getReq.onsuccess = () => {
        const page = getReq.result as Page | undefined;
        if (!page) {
          reject(new Error('Page not found'));
          return;
        }

        if (page.name.trim() !== confirmedName.trim()) {
          reject(new Error('Page name confirmation does not match'));
          return;
        }

        const recordsToSnapshot: any[] = [{
          storeName: 'pages',
          key: id,
          type: 'delete',
          before: page,
          after: null
        }];

        // Delete page
        pageStore.delete(id);

        // Delete associated tasks
        pageTasks.forEach(task => {
          taskStore.delete(task.id);
          recordsToSnapshot.push({
            storeName: 'tasks',
            key: task.id,
            type: 'delete',
            before: task,
            after: null
          });
        });

        recordSnapshot(db, `Permanently delete page "${page.name}" and ${pageTasks.length} tasks`, recordsToSnapshot);

        tx.oncomplete = () => resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  // --- TASKS ---
  static async getAllTasks(): Promise<Task[]> {
    const { store } = await this.getStore('tasks', 'readonly');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result as Task[]);
      request.onerror = () => reject(request.error);
    });
  }

  static async createTask(taskData: {
    pageId: string;
    title: string;
    priority?: Task['priority'];
    important?: boolean;
    dueDate?: string | null;
  }): Promise<Task> {
    const db = await openDB();
    const allTasks = await this.getAllTasks();
    const pageTasks = allTasks.filter(t => t.pageId === taskData.pageId);
    const maxOrder = pageTasks.reduce((max, t) => Math.max(max, t.order), -1);

    const now = nowISO();
    const newTask: Task = {
      id: generateUUID(),
      pageId: taskData.pageId,
      title: taskData.title.trim().slice(0, 200),
      priority: taskData.priority || 'medium',
      important: !!taskData.important,
      completed: false,
      completedAt: null,
      dueDate: taskData.dueDate || null,
      order: maxOrder + 1,
      createdAt: now,
      updatedAt: now,
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(['tasks', 'snapshots'], 'readwrite');
      const store = tx.objectStore('tasks');
      store.add(newTask);

      recordSnapshot(db, `Create task "${newTask.title}"`, [{
        storeName: 'tasks',
        key: newTask.id,
        type: 'insert',
        before: null,
        after: newTask
      }]);

      tx.oncomplete = () => resolve(newTask);
      tx.onerror = () => reject(tx.error);
    });
  }

  static async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['tasks', 'snapshots'], 'readwrite');
      const store = tx.objectStore('tasks');
      const getReq = store.get(id);

      getReq.onsuccess = () => {
        const existing = getReq.result as Task | undefined;
        if (!existing) {
          reject(new Error('Task not found'));
          return;
        }

        const now = nowISO();
        let completedAt = existing.completedAt;
        if (updates.completed !== undefined) {
          completedAt = updates.completed ? now : null;
        }

        const updated: Task = {
          ...existing,
          ...updates,
          completedAt,
          updatedAt: now,
        };

        store.put(updated);
        recordSnapshot(db, `Update task "${updated.title}"`, [{
          storeName: 'tasks',
          key: id,
          type: 'update',
          before: existing,
          after: updated
        }]);

        tx.oncomplete = () => resolve(updated);
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  static async toggleTaskCompleted(id: string): Promise<Task> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['tasks', 'snapshots'], 'readwrite');
      const store = tx.objectStore('tasks');
      const getReq = store.get(id);

      getReq.onsuccess = () => {
        const existing = getReq.result as Task | undefined;
        if (!existing) {
          reject(new Error('Task not found'));
          return;
        }

        const now = nowISO();
        const nextCompleted = !existing.completed;
        const updated: Task = {
          ...existing,
          completed: nextCompleted,
          completedAt: nextCompleted ? now : null,
          updatedAt: now,
        };

        store.put(updated);
        recordSnapshot(db, `${nextCompleted ? 'Complete' : 'Reopen'} task "${updated.title}"`, [{
          storeName: 'tasks',
          key: id,
          type: 'update',
          before: existing,
          after: updated
        }]);

        tx.oncomplete = () => resolve(updated);
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  static async deleteTask(id: string): Promise<Task> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['tasks', 'snapshots'], 'readwrite');
      const store = tx.objectStore('tasks');
      const getReq = store.get(id);

      getReq.onsuccess = () => {
        const existing = getReq.result as Task | undefined;
        if (!existing) {
          reject(new Error('Task not found'));
          return;
        }

        store.delete(id);
        recordSnapshot(db, `Delete task "${existing.title}"`, [{
          storeName: 'tasks',
          key: id,
          type: 'delete',
          before: existing,
          after: null
        }]);

        tx.oncomplete = () => resolve(existing);
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  static async moveTaskToPage(taskId: string, targetPageId: string): Promise<Task> {
    const db = await openDB();
    const allTasks = await this.getAllTasks();
    const targetPageTasks = allTasks.filter(t => t.pageId === targetPageId);
    const maxOrder = targetPageTasks.reduce((max, t) => Math.max(max, t.order), -1);

    return new Promise((resolve, reject) => {
      const tx = db.transaction(['tasks', 'snapshots'], 'readwrite');
      const store = tx.objectStore('tasks');
      const getReq = store.get(taskId);

      getReq.onsuccess = () => {
        const existing = getReq.result as Task | undefined;
        if (!existing) {
          reject(new Error('Task not found'));
          return;
        }

        const now = nowISO();
        const updated: Task = {
          ...existing,
          pageId: targetPageId,
          order: maxOrder + 1,
          updatedAt: now,
        };

        store.put(updated);
        recordSnapshot(db, `Move task "${updated.title}"`, [{
          storeName: 'tasks',
          key: taskId,
          type: 'update',
          before: existing,
          after: updated
        }]);

        tx.oncomplete = () => resolve(updated);
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  static async reorderTasksInPage(pageId: string, orderedTaskIds: string[]): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['tasks', 'snapshots'], 'readwrite');
      const store = tx.objectStore('tasks');
      const now = nowISO();
      const recordsToSnapshot: any[] = [];

      let completedCount = 0;
      orderedTaskIds.forEach((id, index) => {
        const getReq = store.get(id);
        getReq.onsuccess = () => {
          const task = getReq.result as Task | undefined;
          if (task && (task.order !== index || task.pageId !== pageId)) {
            const before = { ...task };
            task.order = index;
            task.pageId = pageId;
            task.updatedAt = now;
            store.put(task);
            recordsToSnapshot.push({
              storeName: 'tasks',
              key: id,
              type: 'update',
              before,
              after: task
            });
          }
          completedCount++;
          if (completedCount === orderedTaskIds.length) {
            if (recordsToSnapshot.length > 0) {
              recordSnapshot(db, 'Reorder tasks', recordsToSnapshot);
            }
          }
        };
      });

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // --- HABITS ---
  static async getAllHabits(): Promise<Habit[]> {
    const { store } = await this.getStore('habits', 'readonly');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result as Habit[]);
      request.onerror = () => reject(request.error);
    });
  }

  static async createHabit(habitData: {
    name: string;
    icon?: string;
    color?: string;
    schedule: Habit['schedule'];
  }): Promise<Habit> {
    const db = await openDB();
    const now = nowISO();
    const newHabit: Habit = {
      id: generateUUID(),
      name: habitData.name.trim().slice(0, 60),
      icon: habitData.icon || 'Flame',
      color: habitData.color || '#0D9488',
      schedule: habitData.schedule,
      createdAt: now,
      updatedAt: now,
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(['habits', 'snapshots'], 'readwrite');
      const store = tx.objectStore('habits');
      store.add(newHabit);

      recordSnapshot(db, `Create habit "${newHabit.name}"`, [{
        storeName: 'habits',
        key: newHabit.id,
        type: 'insert',
        before: null,
        after: newHabit
      }]);

      tx.oncomplete = () => resolve(newHabit);
      tx.onerror = () => reject(tx.error);
    });
  }

  static async updateHabit(id: string, updates: Partial<Omit<Habit, 'id' | 'createdAt'>>): Promise<Habit> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['habits', 'snapshots'], 'readwrite');
      const store = tx.objectStore('habits');
      const getReq = store.get(id);

      getReq.onsuccess = () => {
        const existing = getReq.result as Habit | undefined;
        if (!existing) {
          reject(new Error('Habit not found'));
          return;
        }

        const now = nowISO();
        const updated: Habit = {
          ...existing,
          ...updates,
          updatedAt: now,
        };

        store.put(updated);
        recordSnapshot(db, `Update habit "${updated.name}"`, [{
          storeName: 'habits',
          key: id,
          type: 'update',
          before: existing,
          after: updated
        }]);

        tx.oncomplete = () => resolve(updated);
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  static async deleteHabit(id: string): Promise<Habit> {
    const db = await openDB();
    const logs = await this.getAllHabitLogs();
    const habitLogs = logs.filter(l => l.habitId === id);

    return new Promise((resolve, reject) => {
      const tx = db.transaction(['habits', 'habitLogs', 'snapshots'], 'readwrite');
      const habitStore = tx.objectStore('habits');
      const logStore = tx.objectStore('habitLogs');

      const getReq = habitStore.get(id);
      getReq.onsuccess = () => {
        const existing = getReq.result as Habit | undefined;
        if (!existing) {
          reject(new Error('Habit not found'));
          return;
        }

        const recordsToSnapshot: any[] = [{
          storeName: 'habits',
          key: id,
          type: 'delete',
          before: existing,
          after: null
        }];

        habitStore.delete(id);

        habitLogs.forEach(log => {
          logStore.delete(log.id);
          recordsToSnapshot.push({
            storeName: 'habitLogs',
            key: log.id,
            type: 'delete',
            before: log,
            after: null
          });
        });

        recordSnapshot(db, `Delete habit "${existing.name}"`, recordsToSnapshot);

        tx.oncomplete = () => resolve(existing);
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  // --- HABIT LOGS ---
  static async getAllHabitLogs(): Promise<HabitLog[]> {
    const { store } = await this.getStore('habitLogs', 'readonly');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result as HabitLog[]);
      request.onerror = () => reject(request.error);
    });
  }

  static async toggleHabitLog(habitId: string, date: string): Promise<HabitLog> {
    const db = await openDB();
    const logId = `${habitId}_${date}`;

    return new Promise((resolve, reject) => {
      const tx = db.transaction(['habitLogs', 'snapshots'], 'readwrite');
      const store = tx.objectStore('habitLogs');
      const getReq = store.get(logId);

      getReq.onsuccess = () => {
        const existing = getReq.result as HabitLog | undefined;
        const now = nowISO();
        let log: HabitLog;

        if (existing) {
          log = {
            ...existing,
            completed: !existing.completed,
            updatedAt: now,
          };
          store.put(log);
          recordSnapshot(db, `Toggle habit on ${date}`, [{
            storeName: 'habitLogs',
            key: logId,
            type: 'update',
            before: existing,
            after: log
          }]);
        } else {
          log = {
            id: logId,
            habitId,
            date,
            completed: true,
            updatedAt: now,
          };
          store.add(log);
          recordSnapshot(db, `Check habit on ${date}`, [{
            storeName: 'habitLogs',
            key: logId,
            type: 'insert',
            before: null,
            after: log
          }]);
        }

        tx.oncomplete = () => resolve(log);
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  // --- CALENDAR EVENTS ---
  static async getAllEvents(): Promise<CalendarEvent[]> {
    const { store } = await this.getStore('events', 'readonly');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result as CalendarEvent[]);
      request.onerror = () => reject(request.error);
    });
  }

  static async createEvent(eventData: {
    title: string;
    date: string;
    startTime?: string | null;
    endTime?: string | null;
    color?: string;
    category?: string;
  }): Promise<CalendarEvent> {
    const db = await openDB();
    const now = nowISO();
    const newEvent: CalendarEvent = {
      id: generateUUID(),
      title: eventData.title.trim().slice(0, 100),
      date: eventData.date,
      startTime: eventData.startTime || null,
      endTime: eventData.endTime || null,
      color: eventData.color || '#F97316',
      category: eventData.category || 'Event / Meeting',
      createdAt: now,
      updatedAt: now,
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(['events', 'snapshots'], 'readwrite');
      const store = tx.objectStore('events');
      store.add(newEvent);

      recordSnapshot(db, `Create event "${newEvent.title}"`, [{
        storeName: 'events',
        key: newEvent.id,
        type: 'insert',
        before: null,
        after: newEvent
      }]);

      tx.oncomplete = () => resolve(newEvent);
      tx.onerror = () => reject(tx.error);
    });
  }

  static async updateEvent(id: string, updates: Partial<Omit<CalendarEvent, 'id' | 'createdAt'>>): Promise<CalendarEvent> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['events', 'snapshots'], 'readwrite');
      const store = tx.objectStore('events');
      const getReq = store.get(id);

      getReq.onsuccess = () => {
        const existing = getReq.result as CalendarEvent | undefined;
        if (!existing) {
          reject(new Error('Event not found'));
          return;
        }

        const now = nowISO();
        const updated: CalendarEvent = {
          ...existing,
          ...updates,
          updatedAt: now,
        };

        store.put(updated);
        recordSnapshot(db, `Update event "${updated.title}"`, [{
          storeName: 'events',
          key: id,
          type: 'update',
          before: existing,
          after: updated
        }]);

        tx.oncomplete = () => resolve(updated);
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  static async deleteEvent(id: string): Promise<CalendarEvent> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['events', 'snapshots'], 'readwrite');
      const store = tx.objectStore('events');
      const getReq = store.get(id);

      getReq.onsuccess = () => {
        const existing = getReq.result as CalendarEvent | undefined;
        if (!existing) {
          reject(new Error('Event not found'));
          return;
        }

        store.delete(id);
        recordSnapshot(db, `Delete event "${existing.title}"`, [{
          storeName: 'events',
          key: id,
          type: 'delete',
          before: existing,
          after: null
        }]);

        tx.oncomplete = () => resolve(existing);
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  // --- DAY BACKGROUND COLORS ---
  static async getAllDayColors(): Promise<DayColor[]> {
    const { store } = await this.getStore('dayColors', 'readonly');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result as DayColor[]);
      request.onerror = () => reject(request.error);
    });
  }

  static async setDayColor(date: string, color: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['dayColors', 'snapshots'], 'readwrite');
      const store = tx.objectStore('dayColors');
      const getReq = store.get(date);

      getReq.onsuccess = () => {
        const existing = getReq.result as DayColor | undefined;
        const entry: DayColor = { date, color };
        store.put(entry);

        recordSnapshot(db, `Set day color for ${date}`, [{
          storeName: 'dayColors',
          key: date,
          type: existing ? 'update' : 'insert',
          before: existing || null,
          after: entry
        }]);

        tx.oncomplete = () => resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  static async removeDayColor(date: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['dayColors', 'snapshots'], 'readwrite');
      const store = tx.objectStore('dayColors');
      const getReq = store.get(date);

      getReq.onsuccess = () => {
        const existing = getReq.result as DayColor | undefined;
        if (existing) {
          store.delete(date);
          recordSnapshot(db, `Remove day color for ${date}`, [{
            storeName: 'dayColors',
            key: date,
            type: 'delete',
            before: existing,
            after: null
          }]);
        }
        tx.oncomplete = () => resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  // --- SETTINGS ---
  static async getAllSettings(): Promise<UserSettings> {
    const { store } = await this.getStore('settings', 'readonly');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const results = request.result as { key: string; value: any }[];
        const settingsMap: any = {
          theme: 'light',
          displayName: 'Dharinish',
          weekStart: 'monday',
          lastBackup: null,
          habitDefaultColor: '#0D9488',
          eventDefaultColor: '#F97316',
          backgroundStyle: 'current',
        };
        results.forEach(r => {
          settingsMap[r.key] = r.value;
        });
        resolve(settingsMap as UserSettings);
      };
      request.onerror = () => reject(request.error);
    });
  }

  static async updateSetting(key: string, value: any): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['settings'], 'readwrite');
      const store = tx.objectStore('settings');
      store.put({ key, value });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // --- BACKUP EXPORT / IMPORT ---
  static async exportBackup(): Promise<BackupData> {
    const db = await openDB();
    const [pages, tasks, habits, habitLogs, events, dayColors, settings] = await Promise.all([
      this.getAllPages(),
      this.getAllTasks(),
      this.getAllHabits(),
      this.getAllHabitLogs(),
      this.getAllEvents(),
      this.getAllDayColors(),
      this.getAllSettings(),
    ]);

    const backup: BackupData = {
      app: 'my-workspace',
      schemaVersion: 1,
      exportedAt: nowISO(),
      data: {
        pages,
        tasks,
        habits,
        habitLogs,
        events,
        dayColors,
        settings: settings as any,
      },
    };

    // Update lastBackup in settings
    await this.updateSetting('lastBackup', backup.exportedAt);

    return backup;
  }

  static async importBackup(backup: any, mode: 'merge' | 'replace'): Promise<{ message: string }> {
    // 1. Validate
    if (!backup || typeof backup !== 'object') {
      throw new Error('Invalid JSON: Not an object.');
    }
    if (backup.app !== 'my-workspace') {
      throw new Error('Invalid file: Application ID must be "my-workspace".');
    }
    if (typeof backup.schemaVersion !== 'number' || backup.schemaVersion > 1) {
      throw new Error(`Unsupported schema version: ${backup.schemaVersion}. This app supports up to version 1.`);
    }
    if (!backup.data || typeof backup.data !== 'object') {
      throw new Error('Invalid format: Missing "data" payload.');
    }

    const { pages = [], tasks = [], habits = [], habitLogs = [], events = [], dayColors = [], settings = {} } = backup.data;

    // Validate IDs on required arrays
    const validateArray = (arr: any[], name: string, keyField: string = 'id') => {
      if (!Array.isArray(arr)) {
        throw new Error(`Data format error: "${name}" must be an array.`);
      }
      for (let i = 0; i < arr.length; i++) {
        if (!arr[i] || typeof arr[i] !== 'object' || !arr[i][keyField]) {
          throw new Error(`Corrupted record in "${name}" at index ${i}: missing unique "${keyField}".`);
        }
      }
    };

    validateArray(pages, 'pages');
    validateArray(tasks, 'tasks');
    validateArray(habits, 'habits');
    validateArray(habitLogs, 'habitLogs');
    validateArray(events, 'events');
    validateArray(dayColors, 'dayColors', 'date');

    const db = await openDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(
        ['pages', 'tasks', 'habits', 'habitLogs', 'events', 'dayColors', 'settings', 'snapshots'],
        'readwrite'
      );

      const pageStore = tx.objectStore('pages');
      const taskStore = tx.objectStore('tasks');
      const habitStore = tx.objectStore('habits');
      const logStore = tx.objectStore('habitLogs');
      const eventStore = tx.objectStore('events');
      const dayColorStore = tx.objectStore('dayColors');
      const settingStore = tx.objectStore('settings');

      if (mode === 'replace') {
        pageStore.clear();
        taskStore.clear();
        habitStore.clear();
        logStore.clear();
        eventStore.clear();
        dayColorStore.clear();
      }

      // Write imported data
      pages.forEach((p: Page) => pageStore.put(p));
      tasks.forEach((t: Task) => taskStore.put(t));
      habits.forEach((h: Habit) => habitStore.put(h));
      habitLogs.forEach((l: HabitLog) => logStore.put(l));
      events.forEach((e: CalendarEvent) => eventStore.put(e));
      dayColors.forEach((d: DayColor) => dayColorStore.put(d));

      if (settings && typeof settings === 'object') {
        Object.entries(settings).forEach(([k, v]) => {
          settingStore.put({ key: k, value: v });
        });
      }

      tx.oncomplete = () => {
        resolve({
          message: `Successfully imported (${mode}): ${pages.length} pages, ${tasks.length} tasks, ${habits.length} habits, ${events.length} events.`
        });
      };
      tx.onerror = () => reject(new DatabaseError('Import transaction failed', tx.error));
    });
  }
}

