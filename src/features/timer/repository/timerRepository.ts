import { openDB } from '../../../db/indexedDB';
import { TimerSession, ActiveTimerState, ActivityLogEvent } from '../types';

export class TimerRepository {
  /**
   * Saves a newly created or finalized timer session.
   * If an activityEvent is provided, writes both the session and the activity log event
   * in the same atomic transaction.
   */
  static async saveSession(session: TimerSession, activityEvent?: ActivityLogEvent): Promise<TimerSession> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const stores = activityEvent ? ['timerSessions', 'activityLogs'] : ['timerSessions'];
      const tx = db.transaction(stores, 'readwrite');
      const sessionStore = tx.objectStore('timerSessions');

      sessionStore.put(session);

      if (activityEvent) {
        const actStore = tx.objectStore('activityLogs');
        actStore.put(activityEvent);
      }

      tx.oncomplete = () => resolve(session);
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Updates an existing saved session (e.g. from manual edit).
   * Writes the updated session and activity log event atomically.
   */
  static async updateSession(session: TimerSession, activityEvent?: ActivityLogEvent): Promise<TimerSession> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const stores = activityEvent ? ['timerSessions', 'activityLogs'] : ['timerSessions'];
      const tx = db.transaction(stores, 'readwrite');
      const sessionStore = tx.objectStore('timerSessions');

      sessionStore.put(session);

      if (activityEvent) {
        const actStore = tx.objectStore('activityLogs');
        actStore.put(activityEvent);
      }

      tx.oncomplete = () => resolve(session);
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Retrieves all saved sessions, ordered newest first by startedAt.
   */
  static async getAllSessions(): Promise<TimerSession[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('timerSessions', 'readonly');
      const store = tx.objectStore('timerSessions');
      const request = store.getAll();

      request.onsuccess = () => {
        const sessions = (request.result as TimerSession[]) || [];
        // Newest first by startedAt
        sessions.sort((a, b) => b.startedAt - a.startedAt);
        resolve(sessions);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Retrieves a single session by UUID id.
   */
  static async getSessionById(id: string): Promise<TimerSession | null> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('timerSessions', 'readonly');
      const store = tx.objectStore('timerSessions');
      const request = store.get(id);

      request.onsuccess = () => resolve((request.result as TimerSession) || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Deletes a session by id.
   */
  static async deleteSession(id: string, activityEvent?: ActivityLogEvent): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const stores = activityEvent ? ['timerSessions', 'activityLogs'] : ['timerSessions'];
      const tx = db.transaction(stores, 'readwrite');
      const sessionStore = tx.objectStore('timerSessions');

      sessionStore.delete(id);

      if (activityEvent) {
        const actStore = tx.objectStore('activityLogs');
        actStore.put(activityEvent);
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Retrieves all sessions for a specific calendar date (YYYY-MM-DD).
   */
  static async getSessionsForDate(date: string): Promise<TimerSession[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('timerSessions', 'readonly');
      const store = tx.objectStore('timerSessions');
      const index = store.index('localDate');
      const request = index.getAll(date);

      request.onsuccess = () => {
        const sessions = (request.result as TimerSession[]) || [];
        sessions.sort((a, b) => b.startedAt - a.startedAt);
        resolve(sessions);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // --- ACTIVE TIMER STATE & CRASH RECOVERY ---

  /**
   * Reads current active timer draft / state.
   */
  static async getActiveState(): Promise<ActiveTimerState | null> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('timerActiveState', 'readonly');
      const store = tx.objectStore('timerActiveState');
      const request = store.get('current');

      request.onsuccess = () => resolve((request.result as ActiveTimerState) || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Persists active timer state and heartbeat.
   */
  static async saveActiveState(state: ActiveTimerState): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('timerActiveState', 'readwrite');
      const store = tx.objectStore('timerActiveState');
      store.put({ ...state, id: 'current' });

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Clears the active timer state.
   */
  static async clearActiveState(): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('timerActiveState', 'readwrite');
      const store = tx.objectStore('timerActiveState');
      store.delete('current');

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // --- ACTIVITY LOGS ---

  /**
   * Logs an standalone activity event.
   */
  static async logActivity(event: ActivityLogEvent): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('activityLogs', 'readwrite');
      const store = tx.objectStore('activityLogs');
      store.put(event);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Retrieves all activity log events, ordered newest first by timestamp.
   */
  static async getAllActivityLogs(): Promise<ActivityLogEvent[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('activityLogs', 'readonly');
      const store = tx.objectStore('activityLogs');
      const request = store.getAll();

      request.onsuccess = () => {
        const events = (request.result as ActivityLogEvent[]) || [];
        events.sort((a, b) => b.timestamp - a.timestamp);
        resolve(events);
      };
      request.onerror = () => reject(request.error);
    });
  }
}

