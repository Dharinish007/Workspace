import { Page, Task, Habit, HabitLog, CalendarEvent, DayColor, UserSettings, Snapshot, SnapshotRecord, BackupData, JournalEntry } from '../types';

export const DB_NAME = 'MyWorkspaceDB';
export const DB_VERSION = 3;
export const MAX_SNAPSHOTS = 30;

export class DatabaseError extends Error {
  public cause?: any;
  constructor(message: string, cause?: any) {
    super(message);
    this.cause = cause;
    this.name = 'DatabaseError';
  }
}

// Connection caching singleton
let cachedDbPromise: Promise<IDBDatabase> | null = null;

export function getDb(): Promise<IDBDatabase> {
  return openDB();
}

export function closeDB(): void {
  if (cachedDbPromise) {
    const p = cachedDbPromise;
    cachedDbPromise = null;
    p.then((db) => {
      try {
        db.close();
      } catch {
        // ignore errors during close
      }
    }).catch(() => {});
  }
}

export function openDB(): Promise<IDBDatabase> {
  if (cachedDbPromise) {
    return cachedDbPromise;
  }

  cachedDbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onblocked = () => {
      console.warn('IndexedDB database upgrade blocked by an existing open connection. Please close other tabs.');
    };

    request.onupgradeneeded = (event) => {
      const db = request.result;
      const tx = request.transaction;

      // 1. pages
      let pagesStore: IDBObjectStore;
      if (!db.objectStoreNames.contains('pages')) {
        pagesStore = db.createObjectStore('pages', { keyPath: 'id' });
      } else {
        pagesStore = tx!.objectStore('pages');
      }
      if (!pagesStore.indexNames.contains('order')) {
        pagesStore.createIndex('order', 'order', { unique: false });
      }

      // 2. tasks
      let tasksStore: IDBObjectStore;
      if (!db.objectStoreNames.contains('tasks')) {
        tasksStore = db.createObjectStore('tasks', { keyPath: 'id' });
      } else {
        tasksStore = tx!.objectStore('tasks');
      }
      if (!tasksStore.indexNames.contains('pageId')) {
        tasksStore.createIndex('pageId', 'pageId', { unique: false });
      }
      if (!tasksStore.indexNames.contains('dueDate')) {
        tasksStore.createIndex('dueDate', 'dueDate', { unique: false });
      }
      if (!tasksStore.indexNames.contains('pageId_order')) {
        tasksStore.createIndex('pageId_order', ['pageId', 'order'], { unique: false });
      }

      // 3. habits
      if (!db.objectStoreNames.contains('habits')) {
        db.createObjectStore('habits', { keyPath: 'id' });
      }

      // 4. habitLogs
      let habitLogsStore: IDBObjectStore;
      if (!db.objectStoreNames.contains('habitLogs')) {
        habitLogsStore = db.createObjectStore('habitLogs', { keyPath: 'id' });
      } else {
        habitLogsStore = tx!.objectStore('habitLogs');
      }
      if (!habitLogsStore.indexNames.contains('date')) {
        habitLogsStore.createIndex('date', 'date', { unique: false });
      }
      if (!habitLogsStore.indexNames.contains('habitId_date')) {
        habitLogsStore.createIndex('habitId_date', ['habitId', 'date'], { unique: true });
      }

      // 5. events
      let eventsStore: IDBObjectStore;
      if (!db.objectStoreNames.contains('events')) {
        eventsStore = db.createObjectStore('events', { keyPath: 'id' });
      } else {
        eventsStore = tx!.objectStore('events');
      }
      if (!eventsStore.indexNames.contains('date')) {
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
      let snapshotsStore: IDBObjectStore;
      if (!db.objectStoreNames.contains('snapshots')) {
        snapshotsStore = db.createObjectStore('snapshots', { keyPath: 'id', autoIncrement: true });
      } else {
        snapshotsStore = tx!.objectStore('snapshots');
      }
      if (!snapshotsStore.indexNames.contains('timestamp')) {
        snapshotsStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // 9. journalEntries (keyed by calendar date YYYY-MM-DD for storage-layer uniqueness)
      if (!db.objectStoreNames.contains('journalEntries')) {
        db.createObjectStore('journalEntries', { keyPath: 'date' });
      }

      // 10. notes (keyed by UUID id)
      let notesStore: IDBObjectStore;
      if (!db.objectStoreNames.contains('notes')) {
        notesStore = db.createObjectStore('notes', { keyPath: 'id' });
      } else {
        notesStore = tx!.objectStore('notes');
      }
      if (!notesStore.indexNames.contains('updatedAt')) {
        notesStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
      if (!notesStore.indexNames.contains('pinned')) {
        notesStore.createIndex('pinned', 'pinned', { unique: false });
      }

      // 11. timerSessions (keyed by UUID id)
      let timerSessionsStore: IDBObjectStore;
      if (!db.objectStoreNames.contains('timerSessions')) {
        timerSessionsStore = db.createObjectStore('timerSessions', { keyPath: 'id' });
      } else {
        timerSessionsStore = tx!.objectStore('timerSessions');
      }
      if (!timerSessionsStore.indexNames.contains('startedAt')) {
        timerSessionsStore.createIndex('startedAt', 'startedAt', { unique: false });
      }
      if (!timerSessionsStore.indexNames.contains('taskId')) {
        timerSessionsStore.createIndex('taskId', 'taskId', { unique: false });
      }
      if (!timerSessionsStore.indexNames.contains('localDate')) {
        timerSessionsStore.createIndex('localDate', 'localDate', { unique: false });
      }
      if (!timerSessionsStore.indexNames.contains('status')) {
        timerSessionsStore.createIndex('status', 'status', { unique: false });
      }

      // 12. timerActiveState (keyed by id 'current')
      if (!db.objectStoreNames.contains('timerActiveState')) {
        db.createObjectStore('timerActiveState', { keyPath: 'id' });
      }

      // 13. activityLogs (keyed by UUID id)
      let activityLogsStore: IDBObjectStore;
      if (!db.objectStoreNames.contains('activityLogs')) {
        activityLogsStore = db.createObjectStore('activityLogs', { keyPath: 'id' });
      } else {
        activityLogsStore = tx!.objectStore('activityLogs');
      }
      if (!activityLogsStore.indexNames.contains('timestamp')) {
        activityLogsStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
      if (!activityLogsStore.indexNames.contains('entity')) {
        activityLogsStore.createIndex('entity', 'entity', { unique: false });
      }
      if (!activityLogsStore.indexNames.contains('entityId')) {
        activityLogsStore.createIndex('entityId', 'entityId', { unique: false });
      }
      if (!activityLogsStore.indexNames.contains('action')) {
        activityLogsStore.createIndex('action', 'action', { unique: false });
      }
    };

    request.onsuccess = () => {
      const db = request.result;

      // Wrap db.close so that if caller explicitly closes connection, cached promise is reset
      const originalClose = db.close.bind(db);
      db.close = () => {
        cachedDbPromise = null;
        return originalClose();
      };

      db.onversionchange = () => {
        cachedDbPromise = null;
        try {
          db.close();
        } catch {
          // ignore
        }
      };

      db.onclose = () => {
        cachedDbPromise = null;
      };

      resolve(db);
    };

    request.onerror = () => {
      cachedDbPromise = null;
      reject(new DatabaseError('Failed to open IndexedDB', request.error));
    };
  });

  return cachedDbPromise;
}

// Generate cryptographically secure RFC4122 v4 UUID
export function generateUUID(): string {
  if (typeof crypto !== 'undefined') {
    if (typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    if (typeof crypto.getRandomValues === 'function') {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      // Per RFC 4122 section 4.4: set bits for version (4) and variant (10xx)
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
    }
  }
  // Theoretical fallback for environments devoid of Web Cryptography
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
        settingsStore.put({ key: 'habitDefaultColor', value: '#1A73E8' });
        settingsStore.put({ key: 'eventDefaultColor', value: '#F97316' });
        settingsStore.put({ key: 'backgroundStyle', value: 'current' });
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
  records: SnapshotRecord[]
): Promise<number | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['snapshots'], 'readwrite');
    const store = tx.objectStore('snapshots');

    // Safe deep clone to decouple from caller object references and avoid unintended state mutation
    const cleanRecords: SnapshotRecord[] = JSON.parse(JSON.stringify(records));

    const snapshot: Snapshot = {
      timestamp: nowISO(),
      action,
      records: cleanRecords,
    };

    let newId: number | undefined;
    const addReq = store.add(snapshot);
    addReq.onsuccess = () => {
      newId = addReq.result as number;
      // Prune snapshots older than MAX_SNAPSHOTS
      const index = store.index('timestamp');
      const countReq = store.count();
      countReq.onsuccess = () => {
        const total = countReq.result;
        if (total > MAX_SNAPSHOTS) {
          const deleteCount = total - MAX_SNAPSHOTS;
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
    };

    tx.oncomplete = () => resolve(newId);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(new DatabaseError('Snapshot transaction aborted', tx.error));
  });
}

// Undo last snapshot
export async function undoLastSnapshot(db: IDBDatabase): Promise<{ action: string } | null> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(
      [
        'snapshots',
        'pages',
        'tasks',
        'habits',
        'habitLogs',
        'events',
        'dayColors',
        'settings',
        'journalEntries',
        'notes',
        'timerSessions',
        'timerActiveState',
        'activityLogs',
      ],
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
        if (!db.objectStoreNames.contains(rec.storeName)) {
          continue;
        }
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
