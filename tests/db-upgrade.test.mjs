import test from 'node:test';
import assert from 'node:assert';
import 'fake-indexeddb/auto';
import { 
  openDB, 
  DB_NAME, 
  DB_VERSION, 
  seedInitialDataIfNeeded,
  undoLastSnapshot,
  generateUUID,
  nowISO
} from '../src/db/indexedDB.ts';
import { Repository } from '../src/db/repository.ts';

const EXPECTED_STORES = [
  'pages',
  'tasks',
  'habits',
  'habitLogs',
  'events',
  'dayColors',
  'settings',
  'snapshots',
  'journalEntries',
  'notes',
  'timerSessions',
  'timerActiveState',
  'activityLogs'
];

test('IndexedDB Architecture & Version Upgrade Integrity', async (t) => {
  await t.test('All 13 object stores exist in fresh database initialization', async () => {
    const db = await openDB();
    assert.equal(db.version, DB_VERSION);
    assert.equal(db.version, 3);

    for (const storeName of EXPECTED_STORES) {
      assert.ok(
        db.objectStoreNames.contains(storeName),
        `Object store "${storeName}" must exist in IndexedDB`
      );
    }
  });

  await t.test('Upgrade from Database Version 1 to Version 3 preserves records and creates missing stores', async () => {
    const UPGRADE_TEST_DB = 'UpgradeTestDB';

    // Step 1: Create a mock Version 1 database with only the original 8 stores
    await new Promise((resolve, reject) => {
      const v1Req = indexedDB.open(UPGRADE_TEST_DB, 1);
      v1Req.onupgradeneeded = () => {
        const v1Db = v1Req.result;
        v1Db.createObjectStore('pages', { keyPath: 'id' });
        v1Db.createObjectStore('tasks', { keyPath: 'id' });
        v1Db.createObjectStore('habits', { keyPath: 'id' });
        v1Db.createObjectStore('habitLogs', { keyPath: 'id' });
        v1Db.createObjectStore('events', { keyPath: 'id' });
        v1Db.createObjectStore('dayColors', { keyPath: 'date' });
        v1Db.createObjectStore('settings', { keyPath: 'key' });
        v1Db.createObjectStore('snapshots', { keyPath: 'id', autoIncrement: true });
      };
      v1Req.onsuccess = () => {
        const v1Db = v1Req.result;
        // Seed test data in version 1 stores
        const tx = v1Db.transaction(['pages', 'tasks', 'settings'], 'readwrite');
        tx.objectStore('pages').put({
          id: 'v1-page-1',
          name: 'Important Work',
          icon: 'Briefcase',
          color: '#4285F4',
          order: 0,
          archived: false,
          createdAt: nowISO(),
          updatedAt: nowISO(),
        });
        tx.objectStore('tasks').put({
          id: 'v1-task-1',
          pageId: 'v1-page-1',
          title: 'Critical Legacy Task',
          priority: 'high',
          important: true,
          completed: false,
          completedAt: null,
          dueDate: '2026-11-10',
          order: 0,
          createdAt: nowISO(),
          updatedAt: nowISO(),
        });
        tx.objectStore('settings').put({ key: 'theme', value: 'dark' });
        tx.oncomplete = () => {
          v1Db.close();
          resolve(true);
        };
        tx.onerror = () => reject(tx.error);
      };
      v1Req.onerror = () => reject(v1Req.error);
    });

    // Step 2: Open with upgrade handler to version 3 (simulating openDB upgrade path)
    const upgradedDb = await new Promise((resolve, reject) => {
      const upgradeReq = indexedDB.open(UPGRADE_TEST_DB, 3);
      upgradeReq.onupgradeneeded = (event) => {
        const db = upgradeReq.result;
        assert.equal(event.oldVersion, 1);

        // Version 2 additions
        if (!db.objectStoreNames.contains('journalEntries')) {
          db.createObjectStore('journalEntries', { keyPath: 'date' });
        }
        if (!db.objectStoreNames.contains('notes')) {
          const notesStore = db.createObjectStore('notes', { keyPath: 'id' });
          notesStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          notesStore.createIndex('pinned', 'pinned', { unique: false });
        }

        // Version 3 additions (Timer & Activity)
        if (!db.objectStoreNames.contains('timerSessions')) {
          const timerStore = db.createObjectStore('timerSessions', { keyPath: 'id' });
          timerStore.createIndex('startedAt', 'startedAt', { unique: false });
          timerStore.createIndex('taskId', 'taskId', { unique: false });
          timerStore.createIndex('localDate', 'localDate', { unique: false });
          timerStore.createIndex('status', 'status', { unique: false });
        }
        if (!db.objectStoreNames.contains('timerActiveState')) {
          db.createObjectStore('timerActiveState', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('activityLogs')) {
          const actStore = db.createObjectStore('activityLogs', { keyPath: 'id' });
          actStore.createIndex('timestamp', 'timestamp', { unique: false });
          actStore.createIndex('entity', 'entity', { unique: false });
          actStore.createIndex('entityId', 'entityId', { unique: false });
          actStore.createIndex('action', 'action', { unique: false });
        }
      };
      upgradeReq.onsuccess = () => resolve(upgradeReq.result);
      upgradeReq.onerror = () => reject(upgradeReq.error);
    });

    // Step 3: Verify all 13 stores exist after upgrade
    assert.equal(upgradedDb.version, 3);
    for (const storeName of EXPECTED_STORES) {
      assert.ok(
        upgradedDb.objectStoreNames.contains(storeName),
        `Store "${storeName}" must exist after upgrade`
      );
    }

    // Step 4: Verify existing version 1 data was preserved intact
    const verifyTx = upgradedDb.transaction(['pages', 'tasks', 'settings', 'journalEntries', 'notes'], 'readonly');
    const pageReq = verifyTx.objectStore('pages').get('v1-page-1');
    const taskReq = verifyTx.objectStore('tasks').get('v1-task-1');
    const settingReq = verifyTx.objectStore('settings').get('theme');

    await new Promise((resolve) => {
      verifyTx.oncomplete = () => {
        assert.equal(pageReq.result.name, 'Important Work');
        assert.equal(taskReq.result.title, 'Critical Legacy Task');
        assert.equal(settingReq.result.value, 'dark');
        resolve(true);
      };
    });

    // Step 5: Verify new stores can be read and written without throwing
    const writeTx = upgradedDb.transaction(['journalEntries', 'notes'], 'readwrite');
    writeTx.objectStore('journalEntries').put({
      date: '2026-11-07',
      title: 'Upgrade Day',
      body: 'Upgraded safely without data loss.',
      mood: 'great',
      tags: ['release'],
      createdAt: nowISO(),
      updatedAt: nowISO(),
    });
    writeTx.objectStore('notes').put({
      id: 'note-upgraded-1',
      title: 'Post-Upgrade Note',
      content: 'Notes store is fully operational.',
      tags: ['notes'],
      pinned: true,
      pinnedOrder: 0,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    });

    await new Promise((resolve) => {
      writeTx.oncomplete = () => resolve(true);
    });

    upgradedDb.close();
  });
});

