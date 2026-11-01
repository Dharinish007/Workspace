import { Page, Task, Habit, HabitLog, CalendarEvent, DayColor, UserSettings, Snapshot, BackupData } from '../types';

const DB_NAME = 'MyWorkspaceDB';
const DB_VERSION = 1;

export class DatabaseError extends Error {
  public cause?: any;
  constructor(message: string, cause?: any) {
    super(message);
    this.cause = cause;
    this.name = 'DatabaseError';
  }
}

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;

      // 1. pages
      if (!db.objectStoreNames.contains('pages')) {
        const pagesStore = db.createObjectStore('pages', { keyPath: 'id' });
        pagesStore.createIndex('order', 'order', { unique: false });
      }

      // 2. tasks
      if (!db.objectStoreNames.contains('tasks')) {
        const tasksStore = db.createObjectStore('tasks', { keyPath: 'id' });
        tasksStore.createIndex('pageId', 'pageId', { unique: false });
        tasksStore.createIndex('dueDate', 'dueDate', { unique: false });
        tasksStore.createIndex('pageId_order', ['pageId', 'order'], { unique: false });
      }

      // 3. habits
      if (!db.objectStoreNames.contains('habits')) {
        db.createObjectStore('habits', { keyPath: 'id' });
      }

      // 4. habitLogs
      if (!db.objectStoreNames.contains('habitLogs')) {
        const habitLogsStore = db.createObjectStore('habitLogs', { keyPath: 'id' });
        habitLogsStore.createIndex('date', 'date', { unique: false });
        habitLogsStore.createIndex('habitId_date', ['habitId', 'date'], { unique: true });
      }

      // 5. events
      if (!db.objectStoreNames.contains('events')) {
        const eventsStore = db.createObjectStore('events', { keyPath: 'id' });
        eventsStore.createIndex('date', 'date', { unique: false });
      }

      // 6. dayColors
      if (!db.objectStoreNames.contains('dayColors')) {
        db.createObjectStore('dayColors', { keyPath: 'date' });
      }

      // 7. settings
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }

      // 8. snapshots
      if (!db.objectStoreNames.contains('snapshots')) {
        const snapshotsStore = db.createObjectStore('snapshots', { keyPath: 'id', autoIncrement: true });
        snapshotsStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new DatabaseError('Failed to open IndexedDB', request.error));
  });
}

// Generate simple RFC4122 v4 UUID
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Get local ISO string
export function nowISO(): string {
  return new Date().toISOString();
}

// Format Date to YYYY-MM-DD in local time
export function formatLocalDate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Seed initial default pages if not existing
export async function seedInitialDataIfNeeded(db: IDBDatabase): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['pages', 'settings'], 'readwrite');
    const pagesStore = tx.objectStore('pages');
    const settingsStore = tx.objectStore('settings');

    const countReq = pagesStore.count();
    countReq.onsuccess = () => {
      if (countReq.result === 0) {
        const now = nowISO();
        const initialPages: Page[] = [
          {
            id: generateUUID(),
            name: 'Career',
            icon: 'Briefcase',
            color: '#4285F4',
            order: 0,
            archived: false,
            createdAt: now,
            updatedAt: now,
          },
          {
            id: generateUUID(),
            name: 'Projects',
            icon: 'Code',
            color: '#34A853',
            order: 1,
            archived: false,
            createdAt: now,
            updatedAt: now,
          },
          {
            id: generateUUID(),
            name: 'Learning',
            icon: 'BookOpen',
            color: '#A142F4',
            order: 2,
            archived: false,
            createdAt: now,
            updatedAt: now,
          },
          {
            id: generateUUID(),
            name: 'Personal',
            icon: 'Heart',
            color: '#EC4899',
            order: 3,
            archived: false,
            createdAt: now,
            updatedAt: now,
          },
        ];

        initialPages.forEach((p) => pagesStore.put(p));

        // Default settings
        settingsStore.put({ key: 'theme', value: 'light' });
        settingsStore.put({ key: 'displayName', value: 'Dharinish' });
        settingsStore.put({ key: 'weekStart', value: 'monday' });
        settingsStore.put({ key: 'lastBackup', value: null });
        settingsStore.put({ key: 'habitDefaultColor', value: '#0D9488' });
        settingsStore.put({ key: 'eventDefaultColor', value: '#F97316' });
      }
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Record a snapshot and keep last 30
export async function recordSnapshot(
  db: IDBDatabase,
  action: string,
  records: Snapshot['records']
): Promise<number | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['snapshots'], 'readwrite');
    const store = tx.objectStore('snapshots');
    const snapshot: Snapshot = {
      timestamp: nowISO(),
      action,
      records,
    };

    const addReq = store.add(snapshot);
    addReq.onsuccess = () => {
      const newId = addReq.result as number;
      // Prune snapshots older than 30
      const index = store.index('timestamp');
      const countReq = store.count();
      countReq.onsuccess = () => {
        const total = countReq.result;
        if (total > 30) {
          const deleteCount = total - 30;
          let deleted = 0;
          const cursorReq = index.openCursor();
          cursorReq.onsuccess = () => {
            const cursor = cursorReq.result;
            if (cursor && deleted < deleteCount) {
              cursor.delete();
              deleted++;
              cursor.continue();
            }
          };
        }
      };
      resolve(newId);
    };
    tx.onerror = () => reject(tx.error);
  });
}

// Undo last snapshot
export async function undoLastSnapshot(db: IDBDatabase): Promise<{ action: string } | null> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(
      ['snapshots', 'pages', 'tasks', 'habits', 'habitLogs', 'events', 'dayColors', 'settings'],
      'readwrite'
    );
    const snapStore = tx.objectStore('snapshots');
    const index = snapStore.index('timestamp');

    // Get the most recent snapshot
    const cursorReq = index.openCursor(null, 'prev');
    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result;
      if (!cursor) {
        resolve(null);
        return;
      }

      const snap: Snapshot = cursor.value;
      const snapKey = cursor.primaryKey;

      // Revert each record in reverse order
      for (let i = snap.records.length - 1; i >= 0; i--) {
        const rec = snap.records[i];
        const targetStore = tx.objectStore(rec.storeName);

        if (rec.type === 'insert') {
          // It was inserted by the action, so undo = delete it
          targetStore.delete(rec.key);
        } else if (rec.type === 'delete') {
          // It was deleted, so undo = re-insert before-state
          if (rec.before) {
            targetStore.put(rec.before);
          }
        } else if (rec.type === 'update') {
          // It was updated, so undo = restore before-state
          if (rec.before) {
            targetStore.put(rec.before);
          } else {
            targetStore.delete(rec.key);
          }
        }
      }

      // Delete the snapshot record itself
      snapStore.delete(snapKey);

      tx.oncomplete = () => {
        resolve({ action: snap.action });
      };
    };

    tx.onerror = () => reject(tx.error);
  });
}
