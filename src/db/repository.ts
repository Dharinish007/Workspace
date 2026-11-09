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
  BackupData,
  JournalEntry,
  Note 
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

  // --- JOURNAL ENTRIES ---
  static async getAllJournalEntries(): Promise<JournalEntry[]> {
    const { store } = await this.getStore('journalEntries', 'readonly');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const results = (request.result as JournalEntry[]) || [];
        results.sort((a, b) => b.date.localeCompare(a.date));
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  static async getJournalEntryByDate(date: string): Promise<JournalEntry | null> {
    const { store } = await this.getStore('journalEntries', 'readonly');
    return new Promise((resolve, reject) => {
      const request = store.get(date);
      request.onsuccess = () => resolve((request.result as JournalEntry) || null);
      request.onerror = () => reject(request.error);
    });
  }

  static async saveJournalEntry(entry: JournalEntry): Promise<JournalEntry> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['journalEntries', 'snapshots'], 'readwrite');
      const store = tx.objectStore('journalEntries');
      const getReq = store.get(entry.date);

      getReq.onsuccess = () => {
        const existing = getReq.result as JournalEntry | undefined;
        const normalizedEntry: JournalEntry = {
          ...entry,
          title: entry.title && entry.title.trim() ? entry.title.trim() : null,
          updatedAt: nowISO()
        };
        store.put(normalizedEntry);

        recordSnapshot(db, `Save journal entry for ${entry.date}`, [{
          storeName: 'journalEntries' as any,
          key: entry.date,
          type: existing ? 'update' : 'insert',
          before: existing || null,
          after: normalizedEntry
        }]);

        tx.oncomplete = () => resolve(normalizedEntry);
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  static async deleteJournalEntry(date: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['journalEntries', 'snapshots'], 'readwrite');
      const store = tx.objectStore('journalEntries');
      const getReq = store.get(date);

      getReq.onsuccess = () => {
        const existing = getReq.result as JournalEntry | undefined;
        if (existing) {
          store.delete(date);
          recordSnapshot(db, `Delete journal entry for ${date}`, [{
            storeName: 'journalEntries' as any,
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

  // --- NOTES ---
  static async getAllNotes(): Promise<Note[]> {
    const { store } = await this.getStore('notes', 'readonly');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const notes = (request.result as Note[]) || [];
        notes.sort((a, b) => {
          if (a.pinned && b.pinned) {
            return (a.pinnedOrder ?? 0) - (b.pinnedOrder ?? 0);
          }
          if (a.pinned) return -1;
          if (b.pinned) return 1;
          return b.updatedAt.localeCompare(a.updatedAt);
        });
        resolve(notes);
      };
      request.onerror = () => reject(request.error);
    });
  }

  static async getNoteById(id: string): Promise<Note | null> {
    const { store } = await this.getStore('notes', 'readonly');
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve((request.result as Note) || null);
      request.onerror = () => reject(request.error);
    });
  }

  static async createNote(data: {
    title?: string;
    content?: string;
    tags?: string[];
    pinned?: boolean;
    pinnedOrder?: number;
    icon?: string;
  }): Promise<Note> {
    const db = await openDB();
    const now = nowISO();
    const newNote: Note = {
      id: generateUUID(),
      title: data.title !== undefined ? data.title : 'Untitled Note',
      content: data.content !== undefined ? data.content : '',
      tags: data.tags || [],
      pinned: !!data.pinned,
      pinnedOrder: data.pinnedOrder ?? 0,
      icon: data.icon,
      createdAt: now,
      updatedAt: now,
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(['notes', 'snapshots'], 'readwrite');
      const store = tx.objectStore('notes');
      store.add(newNote);

      recordSnapshot(db, `Create note: ${newNote.title}`, [{
        storeName: 'notes',
        key: newNote.id,
        type: 'insert',
        before: null,
        after: newNote,
      }]);

      tx.oncomplete = () => resolve(newNote);
      tx.onerror = () => reject(tx.error);
    });
  }

  static async updateNote(id: string, updates: Partial<Note>): Promise<Note> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['notes', 'snapshots'], 'readwrite');
      const store = tx.objectStore('notes');
      const getReq = store.get(id);

      getReq.onsuccess = () => {
        const existing = getReq.result as Note | undefined;
        if (!existing) {
          reject(new Error(`Note with id ${id} not found`));
          return;
        }

        const updated: Note = {
          ...existing,
          ...updates,
          updatedAt: updates.updatedAt || nowISO(),
        };

        store.put(updated);

        recordSnapshot(db, `Update note: ${updated.title}`, [{
          storeName: 'notes',
          key: id,
          type: 'update',
          before: existing,
          after: updated,
        }]);

        tx.oncomplete = () => resolve(updated);
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  static async deleteNote(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['notes', 'snapshots'], 'readwrite');
      const store = tx.objectStore('notes');
      const getReq = store.get(id);

      getReq.onsuccess = () => {
        const existing = getReq.result as Note | undefined;
        if (existing) {
          store.delete(id);
          recordSnapshot(db, `Delete note: ${existing.title}`, [{
            storeName: 'notes',
            key: id,
            type: 'delete',
            before: existing,
            after: null,
          }]);
        }
        tx.oncomplete = () => resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  static async reorderPinnedNotes(orderedIds: string[]): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['notes'], 'readwrite');
      const store = tx.objectStore('notes');

      orderedIds.forEach((id, index) => {
        const getReq = store.get(id);
        getReq.onsuccess = () => {
          const item = getReq.result as Note | undefined;
          if (item) {
            item.pinned = true;
            item.pinnedOrder = index;
            store.put(item);
          }
        };
      });

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  static async seedSampleNotesIfEmpty(): Promise<Note[]> {
    const existing = await this.getAllNotes();
    if (existing.length > 0) return existing;

    const now = Date.now();
    const today = new Date(now).toISOString();
    const yesterday = new Date(now - 86400000).toISOString();
    const twoDaysAgo = new Date(now - 2 * 86400000).toISOString();
    const threeDaysAgo = new Date(now - 3 * 86400000).toISOString();

    const sampleNotes: Note[] = [
      {
        id: generateUUID(),
        title: 'Spring Boot Notes',
        content: '# Spring Boot Notes\n\nKey concepts and core dependencies for modern backend development.\n\n## Architecture\n- Controller, Service, Repository layers\n- Auto-configuration and starters\n- Dependency injection (IoC)\n- Embedded server (Tomcat)',
        tags: ['java', 'spring'],
        pinned: true,
        pinnedOrder: 0,
        icon: 'Code',
        createdAt: threeDaysAgo,
        updatedAt: today,
      },
      {
        id: generateUUID(),
        title: 'RAG Concepts',
        content: '# Retrieval-Augmented Generation (RAG)\n\nBridging the gap between LLM reasoning and domain data.\n\n- Vector embeddings and nearest-neighbor search\n- Chunking strategies & token overlap\n- Re-ranking and contextual compression',
        tags: ['ai', 'rag'],
        pinned: true,
        pinnedOrder: 1,
        icon: 'BookOpen',
        createdAt: threeDaysAgo,
        updatedAt: yesterday,
      },
      {
        id: generateUUID(),
        title: 'Goals & Plan',
        content: '# Personal Goals & Strategy\n\nQuarterly focus areas for engineering craft and health.\n\n1. Ship Notes module with zero-regression\n2. Build daily reflection habit\n3. Deep-dive into distributed systems',
        tags: ['personal', 'goals'],
        pinned: true,
        pinnedOrder: 2,
        icon: 'Target',
        createdAt: threeDaysAgo,
        updatedAt: twoDaysAgo,
      },
      {
        id: generateUUID(),
        title: 'Sprint Plan',
        content: 'Tasks for this week and next steps...\n\n- Implement Notes overview\n- Implement Note Editor with markdown preview\n- Drag and drop pinned notes',
        tags: ['work', 'plan'],
        pinned: false,
        pinnedOrder: 0,
        createdAt: today,
        updatedAt: today,
      },
      {
        id: generateUUID(),
        title: 'Book Notes – Atomic Habits',
        content: 'Key takeaways and actionable points...\n\n- 1% better every day\n- Systems over goals\n- Identity-based habits',
        tags: ['reading'],
        pinned: false,
        pinnedOrder: 0,
        createdAt: yesterday,
        updatedAt: yesterday,
      },
      {
        id: generateUUID(),
        title: 'RAG Architecture',
        content: 'Full flow, components and use cases...\n\nIngestion pipeline -> Vector Database -> Retriever -> LLM Generator',
        tags: ['ai'],
        pinned: false,
        pinnedOrder: 0,
        createdAt: threeDaysAgo,
        updatedAt: threeDaysAgo,
      },
      {
        id: generateUUID(),
        title: 'Java Collections',
        content: 'List, Set, Map and common operations...\n\nArrayList vs LinkedList, HashMap internals, ConcurrentHashMap',
        tags: ['java'],
        pinned: false,
        pinnedOrder: 0,
        createdAt: threeDaysAgo,
        updatedAt: threeDaysAgo,
      },
    ];

    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['notes'], 'readwrite');
      const store = tx.objectStore('notes');
      sampleNotes.forEach(n => store.put(n));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    return sampleNotes;
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
    const [pages, tasks, habits, habitLogs, events, dayColors, settings, journalEntries, notes] = await Promise.all([
      this.getAllPages(),
      this.getAllTasks(),
      this.getAllHabits(),
      this.getAllHabitLogs(),
      this.getAllEvents(),
      this.getAllDayColors(),
      this.getAllSettings(),
      this.getAllJournalEntries(),
      this.getAllNotes(),
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
        journalEntries,
        notes,
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
        ['pages', 'tasks', 'habits', 'habitLogs', 'events', 'dayColors', 'settings', 'snapshots', 'journalEntries', 'notes'],
        'readwrite'
      );

      const pageStore = tx.objectStore('pages');
      const taskStore = tx.objectStore('tasks');
      const habitStore = tx.objectStore('habits');
      const logStore = tx.objectStore('habitLogs');
      const eventStore = tx.objectStore('events');
      const dayColorStore = tx.objectStore('dayColors');
      const settingStore = tx.objectStore('settings');
      const journalStore = tx.objectStore('journalEntries');
      const noteStore = tx.objectStore('notes');

      if (mode === 'replace') {
        pageStore.clear();
        taskStore.clear();
        habitStore.clear();
        logStore.clear();
        eventStore.clear();
        dayColorStore.clear();
        journalStore.clear();
        noteStore.clear();
      }

      // Write imported data
      pages.forEach((p: Page) => pageStore.put(p));
      tasks.forEach((t: Task) => taskStore.put(t));
      habits.forEach((h: Habit) => habitStore.put(h));
      habitLogs.forEach((l: HabitLog) => logStore.put(l));
      events.forEach((e: CalendarEvent) => eventStore.put(e));
      dayColors.forEach((d: DayColor) => dayColorStore.put(d));

      const journalEntries = (backup.data && backup.data.journalEntries) || [];
      journalEntries.forEach((j: JournalEntry) => journalStore.put(j));

      const notes = (backup.data && backup.data.notes) || [];
      notes.forEach((n: Note) => noteStore.put(n));

      if (settings && typeof settings === 'object') {
        Object.entries(settings).forEach(([k, v]) => {
          settingStore.put({ key: k, value: v });
        });
      }

      tx.oncomplete = () => {
        resolve({
          message: `Successfully imported (${mode}): ${pages.length} pages, ${tasks.length} tasks, ${habits.length} habits, ${events.length} events, ${notes.length} notes.`
        });
      };
      tx.onerror = () => reject(new DatabaseError('Import transaction failed', tx.error));
    });
  }
}

