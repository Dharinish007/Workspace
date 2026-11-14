import { 
  openDB, 
  getDb,
  closeDB,
  generateUUID, 
  nowISO, 
  recordSnapshot, 
  seedInitialDataIfNeeded,
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
  Note,
  SnapshotRecord,
  SnapshotStoreName,
  StoreEntityMap
} from '../types';
import { TimerRepository } from '../features/timer/repository/timerRepository';
import { SchemaValidationError, getErrorMessage } from '../utils/errorUtils';
import { mergeWithDefaultSettings } from '../utils/defaultSettings';

export { SchemaValidationError };

export class Repository {
  private static async getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): Promise<{ db: IDBDatabase, tx: IDBTransaction, store: IDBObjectStore }> {
    const db = await openDB();
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    return { db, tx, store };
  }

  /**
   * Generic, type-safe mutate helper for single-record CRUD operations.
   * Handles transaction lifecycle, retrieval, user mutation logic,
   * snapshot creation with undo capability, and database commit.
   */
  static async mutate<K extends SnapshotStoreName>(
    storeName: K,
    key: string | number,
    action: string | ((before: StoreEntityMap[K] | null, after: StoreEntityMap[K] | null) => string),
    mutator: (current: StoreEntityMap[K] | null) => StoreEntityMap[K] | null,
    extraStoreNames: SnapshotStoreName[] = []
  ): Promise<{ before: StoreEntityMap[K] | null; after: StoreEntityMap[K] | null }> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const stores = Array.from(new Set([storeName, ...extraStoreNames]));
      const tx = db.transaction(stores, 'readwrite');
      const store = tx.objectStore(storeName);
      const getReq = store.get(key);

      getReq.onsuccess = () => {
        try {
          const existing = (getReq.result as StoreEntityMap[K]) || null;
          const next = mutator(existing);

          let snapshotType: 'insert' | 'update' | 'delete' | null = null;

          if (existing === null && next !== null) {
            snapshotType = 'insert';
            store.add(next);
          } else if (existing !== null && next === null) {
            snapshotType = 'delete';
            store.delete(key);
          } else if (existing !== null && next !== null) {
            snapshotType = 'update';
            store.put(next);
          } else {
            // Both are null - no-op
            tx.oncomplete = () => resolve({ before: null, after: null });
            return;
          }

          const actionText = typeof action === 'function' ? action(existing, next) : action;

          tx.oncomplete = async () => {
            try {
              if (actionText && snapshotType) {
                const snapRecord: SnapshotRecord = {
                  storeName,
                  key,
                  type: snapshotType,
                  before: existing,
                  after: next,
                } as SnapshotRecord;

                await recordSnapshot(db, actionText, [snapRecord]);
              }
              resolve({ before: existing, after: next });
            } catch {
              resolve({ before: existing, after: next });
            }
          };
        } catch (err) {
          reject(err);
        }
      };

      tx.onerror = () => reject(tx.error);
    });
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
    const res = await this.mutate(
      'pages',
      id,
      (b, a) => `Update page "${a?.name}"`,
      (existing) => {
        if (!existing) {
          throw new Error('Page not found');
        }
        return {
          ...existing,
          ...updates,
          updatedAt: nowISO(),
        };
      }
    );
    return res.after!;
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
    const res = await this.mutate(
      'pages',
      id,
      (b, a) => `${archived ? 'Archive' : 'Restore'} page "${a?.name}"`,
      (existing) => {
        if (!existing) {
          throw new Error('Page not found');
        }
        return {
          ...existing,
          archived,
          updatedAt: nowISO(),
        };
      }
    );
    return res.after!;
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

        if (!confirmedName || typeof confirmedName !== 'string' || page.name.trim().normalize() !== confirmedName.trim().normalize()) {
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
    const res = await this.mutate(
      'tasks',
      id,
      (b, a) => `Update task "${a?.title}"`,
      (existing) => {
        if (!existing) {
          throw new Error('Task not found');
        }
        const now = nowISO();
        let completedAt = existing.completedAt;
        if (updates.completed !== undefined) {
          completedAt = updates.completed ? now : null;
        }
        return {
          ...existing,
          ...updates,
          completedAt,
          updatedAt: now,
        };
      }
    );
    return res.after!;
  }

  static async toggleTaskCompleted(id: string): Promise<Task> {
    const res = await this.mutate(
      'tasks',
      id,
      (b, a) => `${a?.completed ? 'Complete' : 'Reopen'} task "${a?.title}"`,
      (existing) => {
        if (!existing) {
          throw new Error('Task not found');
        }
        const now = nowISO();
        const nextCompleted = !existing.completed;
        return {
          ...existing,
          completed: nextCompleted,
          completedAt: nextCompleted ? now : null,
          updatedAt: now,
        };
      }
    );
    return res.after!;
  }

  static async deleteTask(id: string): Promise<Task> {
    const res = await this.mutate(
      'tasks',
      id,
      (b) => `Delete task "${b?.title}"`,
      (existing) => {
        if (!existing) {
          throw new Error('Task not found');
        }
        return null;
      }
    );
    return res.before!;
  }

  static async moveTaskToPage(taskId: string, targetPageId: string): Promise<Task> {
    const allTasks = await this.getAllTasks();
    const targetPageTasks = allTasks.filter(t => t.pageId === targetPageId);
    const maxOrder = targetPageTasks.reduce((max, t) => Math.max(max, t.order), -1);

    const res = await this.mutate(
      'tasks',
      taskId,
      (b, a) => `Move task "${a?.title}"`,
      (existing) => {
        if (!existing) {
          throw new Error('Task not found');
        }
        return {
          ...existing,
          pageId: targetPageId,
          order: maxOrder + 1,
          updatedAt: nowISO(),
        };
      }
    );
    return res.after!;
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
      color: habitData.color || '#1A73E8',
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
    const res = await this.mutate(
      'habits',
      id,
      (b, a) => `Update habit "${a?.name}"`,
      (existing) => {
        if (!existing) {
          throw new Error('Habit not found');
        }
        return {
          ...existing,
          ...updates,
          updatedAt: nowISO(),
        };
      }
    );
    return res.after!;
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
    const logId = `${habitId}_${date}`;
    const res = await this.mutate(
      'habitLogs',
      logId,
      (b, a) => b ? `Toggle habit on ${date}` : `Check habit on ${date}`,
      (existing) => {
        const now = nowISO();
        if (existing) {
          return {
            ...existing,
            completed: !existing.completed,
            updatedAt: now,
          };
        }
        return {
          id: logId,
          habitId,
          date,
          completed: true,
          updatedAt: now,
        };
      }
    );
    return res.after!;
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
    const res = await this.mutate(
      'events',
      id,
      (b, a) => `Update event "${a?.title}"`,
      (existing) => {
        if (!existing) {
          throw new Error('Event not found');
        }
        return {
          ...existing,
          ...updates,
          updatedAt: nowISO(),
        };
      }
    );
    return res.after!;
  }

  static async deleteEvent(id: string): Promise<CalendarEvent> {
    const res = await this.mutate(
      'events',
      id,
      (b) => `Delete event "${b?.title}"`,
      (existing) => {
        if (!existing) {
          throw new Error('Event not found');
        }
        return null;
      }
    );
    return res.before!;
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
    await this.mutate(
      'dayColors',
      date,
      `Set day color for ${date}`,
      () => ({ date, color })
    );
  }

  static async removeDayColor(date: string): Promise<void> {
    await this.mutate(
      'dayColors',
      date,
      (b) => b ? `Remove day color for ${date}` : '',
      (existing) => (existing ? null : null)
    );
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
    const res = await this.mutate(
      'journalEntries',
      entry.date,
      `Save journal entry for ${entry.date}`,
      () => ({
        ...entry,
        title: entry.title && entry.title.trim() ? entry.title.trim() : null,
        updatedAt: nowISO()
      })
    );
    return res.after!;
  }

  static async deleteJournalEntry(date: string): Promise<void> {
    await this.mutate(
      'journalEntries',
      date,
      (b) => b ? `Delete journal entry for ${date}` : '',
      (existing) => (existing ? null : null)
    );
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
    const res = await this.mutate(
      'notes',
      id,
      (b, a) => `Update note: ${a?.title}`,
      (existing) => {
        if (!existing) {
          throw new Error(`Note with id ${id} not found`);
        }
        return {
          ...existing,
          ...updates,
          updatedAt: updates.updatedAt || nowISO(),
        };
      }
    );
    return res.after!;
  }

  static async deleteNote(id: string): Promise<void> {
    await this.mutate(
      'notes',
      id,
      (b) => b ? `Delete note: ${b.title}` : '',
      (existing) => (existing ? null : null)
    );
  }

  static async reorderPinnedNotes(orderedIds: string[]): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['notes', 'snapshots'], 'readwrite');
      const store = tx.objectStore('notes');
      const recordsToSnapshot: SnapshotRecord[] = [];
      const now = nowISO();

      let completedCount = 0;
      orderedIds.forEach((id, index) => {
        const getReq = store.get(id);
        getReq.onsuccess = () => {
          const item = getReq.result as Note | undefined;
          if (item && item.pinned && item.pinnedOrder !== index) {
            const before = { ...item };
            item.pinnedOrder = index;
            item.updatedAt = now;
            store.put(item);
            recordsToSnapshot.push({
              storeName: 'notes',
              key: id,
              type: 'update',
              before,
              after: item,
            });
          }
          completedCount++;
          if (completedCount === orderedIds.length && recordsToSnapshot.length > 0) {
            recordSnapshot(db, 'Reorder pinned notes', recordsToSnapshot);
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
  /**
   * High-performance batched loader that retrieves all initial workspace entities
   * in a single read-only IndexedDB transaction rather than 9 separate transactions.
   */
  static async getInitialWorkspaceData(): Promise<{
    pages: Page[];
    tasks: Task[];
    habits: Habit[];
    habitLogs: HabitLog[];
    events: CalendarEvent[];
    dayColors: DayColor[];
    settings: UserSettings;
    journalEntries: JournalEntry[];
    notes: Note[];
  }> {
    const db = await openDB();
    await seedInitialDataIfNeeded(db);

    return new Promise((resolve, reject) => {
      const stores = ['pages', 'tasks', 'habits', 'habitLogs', 'events', 'dayColors', 'settings', 'journalEntries', 'notes'];
      const tx = db.transaction(stores, 'readonly');

      const pagesReq = tx.objectStore('pages').getAll();
      const tasksReq = tx.objectStore('tasks').getAll();
      const habitsReq = tx.objectStore('habits').getAll();
      const habitLogsReq = tx.objectStore('habitLogs').getAll();
      const eventsReq = tx.objectStore('events').getAll();
      const dayColorsReq = tx.objectStore('dayColors').getAll();
      const settingsReq = tx.objectStore('settings').getAll();
      const journalReq = tx.objectStore('journalEntries').getAll();
      const notesReq = tx.objectStore('notes').getAll();

      tx.oncomplete = async () => {
        try {
          const pages = (pagesReq.result as Page[]) || [];
          pages.sort((a, b) => a.order - b.order);

          const tasks = (tasksReq.result as Task[]) || [];
          const habits = (habitsReq.result as Habit[]) || [];
          const habitLogs = (habitLogsReq.result as HabitLog[]) || [];
          const events = (eventsReq.result as CalendarEvent[]) || [];
          const dayColors = (dayColorsReq.result as DayColor[]) || [];

          const settingsResults = (settingsReq.result as { key: string; value: any }[]) || [];
          const rawMap: Record<string, any> = {};
          settingsResults.forEach(r => { rawMap[r.key] = r.value; });
          const settings = mergeWithDefaultSettings(rawMap);

          const journalEntries = (journalReq.result as JournalEntry[]) || [];
          journalEntries.sort((a, b) => b.date.localeCompare(a.date));

          let notes = (notesReq.result as Note[]) || [];
          if (notes.length === 0) {
            notes = await Repository.seedSampleNotesIfEmpty();
          } else {
            notes.sort((a, b) => {
              if (a.pinned && b.pinned) {
                return (a.pinnedOrder ?? 0) - (b.pinnedOrder ?? 0);
              }
              if (a.pinned) return -1;
              if (b.pinned) return 1;
              return b.updatedAt.localeCompare(a.updatedAt);
            });
          }

          resolve({
            pages,
            tasks,
            habits,
            habitLogs,
            events,
            dayColors,
            settings,
            journalEntries,
            notes,
          });
        } catch (err) {
          reject(err);
        }
      };

      tx.onerror = () => reject(tx.error);
    });
  }

  static async getAllSettings(): Promise<UserSettings> {
    const { store } = await this.getStore('settings', 'readonly');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const results = request.result as { key: string; value: any }[];
        const rawMap: Record<string, any> = {};
        results.forEach(r => {
          rawMap[r.key] = r.value;
        });
        const merged = mergeWithDefaultSettings(rawMap);
        resolve(merged);
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
    const [pages, tasks, habits, habitLogs, events, dayColors, settings, journalEntries, notes, timerSessions, activityLogs] = await Promise.all([
      this.getAllPages(),
      this.getAllTasks(),
      this.getAllHabits(),
      this.getAllHabitLogs(),
      this.getAllEvents(),
      this.getAllDayColors(),
      this.getAllSettings(),
      this.getAllJournalEntries(),
      this.getAllNotes(),
      TimerRepository.getAllSessions(),
      TimerRepository.getAllActivityLogs(),
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
        timerSessions,
        activityLogs,
      },
    };

    // Update lastBackup in settings
    await this.updateSetting('lastBackup', backup.exportedAt);

    return backup;
  }

  static async importBackup(backup: any, mode: 'merge' | 'replace'): Promise<{ message: string }> {
    // 1. Root Structure Validation
    if (!backup || typeof backup !== 'object') {
      throw new SchemaValidationError('Invalid JSON: Not an object.');
    }
    if (backup.app !== 'my-workspace') {
      throw new SchemaValidationError('Invalid file: Application ID must be "my-workspace".');
    }
    if (typeof backup.schemaVersion !== 'number' || backup.schemaVersion > 1) {
      throw new SchemaValidationError(`Unsupported schema version: ${backup.schemaVersion}. This app supports up to version 1.`);
    }
    if (!backup.data || typeof backup.data !== 'object') {
      throw new SchemaValidationError('Invalid format: Missing "data" payload.');
    }

    const { 
      pages = [], 
      tasks = [], 
      habits = [], 
      habitLogs = [], 
      events = [], 
      dayColors = [], 
      settings = {},
      journalEntries = [],
      notes = [],
      timerSessions = [],
      activityLogs = []
    } = backup.data;

    // Strict date format regex: YYYY-MM-DD
    const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

    // Helper to validate array structure and individual records before opening transaction
    const validateArray = (
      arr: any[], 
      name: string, 
      keyField: string = 'id',
      extraCheck?: (item: any, idx: number) => void
    ) => {
      if (!Array.isArray(arr)) {
        throw new SchemaValidationError(`Data format error: "${name}" must be an array.`, name);
      }
      for (let i = 0; i < arr.length; i++) {
        const item = arr[i];
        if (!item || typeof item !== 'object' || item[keyField] === undefined || item[keyField] === null || item[keyField] === '') {
          throw new SchemaValidationError(
            `Corrupted record in "${name}" at index ${i}: missing unique "${keyField}".`,
            name,
            i,
            keyField
          );
        }
        if (extraCheck) {
          extraCheck(item, i);
        }
      }
    };

    // Pre-validate all 10 entity stores
    validateArray(pages, 'pages', 'id', (p, i) => {
      if (typeof p.name !== 'string' || !p.name.trim()) {
        throw new SchemaValidationError(`Corrupted record in "pages" at index ${i}: page name is required.`, 'pages', i, 'name');
      }
    });

    validateArray(tasks, 'tasks', 'id', (t, i) => {
      if (typeof t.pageId !== 'string' || !t.pageId) {
        throw new SchemaValidationError(`Corrupted record in "tasks" at index ${i}: task requires pageId.`, 'tasks', i, 'pageId');
      }
      if (typeof t.title !== 'string') {
        throw new SchemaValidationError(`Corrupted record in "tasks" at index ${i}: task title must be a string.`, 'tasks', i, 'title');
      }
      if (t.dueDate && (typeof t.dueDate !== 'string' || !DATE_REGEX.test(t.dueDate))) {
        throw new SchemaValidationError(`Corrupted record in "tasks" at index ${i}: invalid dueDate format.`, 'tasks', i, 'dueDate');
      }
    });

    validateArray(habits, 'habits', 'id', (h, i) => {
      if (typeof h.name !== 'string' || !h.name.trim()) {
        throw new SchemaValidationError(`Corrupted record in "habits" at index ${i}: habit name is required.`, 'habits', i, 'name');
      }
    });

    validateArray(habitLogs, 'habitLogs', 'id', (hl, i) => {
      if (typeof hl.date !== 'string' || !DATE_REGEX.test(hl.date)) {
        throw new SchemaValidationError(`Corrupted record in "habitLogs" at index ${i}: invalid date format.`, 'habitLogs', i, 'date');
      }
    });

    validateArray(events, 'events', 'id', (e, i) => {
      if (typeof e.date !== 'string' || !DATE_REGEX.test(e.date)) {
        throw new SchemaValidationError(`Corrupted record in "events" at index ${i}: invalid date format.`, 'events', i, 'date');
      }
      if (typeof e.title !== 'string') {
        throw new SchemaValidationError(`Corrupted record in "events" at index ${i}: title must be a string.`, 'events', i, 'title');
      }
    });

    validateArray(dayColors, 'dayColors', 'date', (d, i) => {
      if (typeof d.date !== 'string' || !DATE_REGEX.test(d.date)) {
        throw new SchemaValidationError(`Corrupted record in "dayColors" at index ${i}: invalid date format.`, 'dayColors', i, 'date');
      }
    });

    validateArray(journalEntries, 'journalEntries', 'date', (j, i) => {
      if (typeof j.date !== 'string' || !DATE_REGEX.test(j.date)) {
        throw new SchemaValidationError(`Corrupted record in "journalEntries" at index ${i}: invalid date format.`, 'journalEntries', i, 'date');
      }
    });

    validateArray(notes, 'notes', 'id', (n, i) => {
      if (typeof n.title !== 'string') {
        throw new SchemaValidationError(`Corrupted record in "notes" at index ${i}: title must be a string.`, 'notes', i, 'title');
      }
    });

    validateArray(timerSessions, 'timerSessions', 'id', (s, i) => {
      if (typeof s.startedAt !== 'number' || typeof s.endedAt !== 'number') {
        throw new SchemaValidationError(`Corrupted record in "timerSessions" at index ${i}: startedAt and endedAt must be numbers.`, 'timerSessions', i);
      }
    });

    validateArray(activityLogs, 'activityLogs', 'id', (a, i) => {
      if (typeof a.timestamp !== 'number') {
        throw new SchemaValidationError(`Corrupted record in "activityLogs" at index ${i}: timestamp must be a number.`, 'activityLogs', i);
      }
    });

    if (settings && typeof settings !== 'object') {
      throw new SchemaValidationError('Data format error: "settings" must be an object.');
    }

    const db = await openDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(
        ['pages', 'tasks', 'habits', 'habitLogs', 'events', 'dayColors', 'settings', 'snapshots', 'journalEntries', 'notes', 'timerSessions', 'activityLogs'],
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
      const timerSessionStore = tx.objectStore('timerSessions');
      const activityLogStore = tx.objectStore('activityLogs');

      if (mode === 'replace') {
        pageStore.clear();
        taskStore.clear();
        habitStore.clear();
        logStore.clear();
        eventStore.clear();
        dayColorStore.clear();
        journalStore.clear();
        noteStore.clear();
        timerSessionStore.clear();
        activityLogStore.clear();
      }

      // Write imported data
      pages.forEach((p: Page) => pageStore.put(p));
      tasks.forEach((t: Task) => taskStore.put(t));
      habits.forEach((h: Habit) => habitStore.put(h));
      habitLogs.forEach((l: HabitLog) => logStore.put(l));
      events.forEach((e: CalendarEvent) => eventStore.put(e));
      dayColors.forEach((d: DayColor) => dayColorStore.put(d));
      journalEntries.forEach((j: JournalEntry) => journalStore.put(j));
      notes.forEach((n: Note) => noteStore.put(n));
      timerSessions.forEach((s: any) => timerSessionStore.put(s));
      activityLogs.forEach((a: any) => activityLogStore.put(a));

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

