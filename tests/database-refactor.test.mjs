import test from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';

import { 
  openDB, 
  getDb, 
  closeDB, 
  recordSnapshot, 
  undoLastSnapshot, 
  MAX_SNAPSHOTS,
  nowISO,
  generateUUID 
} from '../src/db/indexedDB.ts';
import { Repository } from '../src/db/repository.ts';

test('Database Refactor & Architecture: Connection Caching Singleton', async (t) => {
  await t.test('openDB and getDb return identical cached IDBDatabase instance', async () => {
    const db1 = await openDB();
    const db2 = await openDB();
    const db3 = await getDb();

    assert.equal(db1, db2, 'Sequential openDB calls must reuse the cached instance');
    assert.equal(db1, db3, 'getDb must return the same instance as openDB');
    assert.equal(db1.name, 'MyWorkspaceDB');
  });

  await t.test('closeDB cleanly invalidates cache and subsequent openDB re-opens database', async () => {
    const dbBefore = await openDB();
    closeDB();

    const dbAfter = await openDB();
    assert.notEqual(dbBefore, dbAfter, 'After closeDB, openDB must return a fresh database connection');
    assert.equal(dbAfter.name, 'MyWorkspaceDB');
  });

  await t.test('Direct db.close() resets cached promise to prevent InvalidStateError on subsequent queries', async () => {
    const db = await openDB();
    db.close();

    // Calling openDB or a repository method must cleanly open a new connection
    const freshDb = await openDB();
    assert.notEqual(db, freshDb, 'Direct db.close() must clear the singleton cache');
    assert.equal(freshDb.name, 'MyWorkspaceDB');
    
    // Verify queries on fresh connection succeed
    const pages = await Repository.getAllPages();
    assert.ok(Array.isArray(pages));
  });
});

test('Database Refactor: Type-Safe Repository.mutate Helper', async (t) => {
  await t.test('mutate handles create (insert), update, and delete with automatic undo snapshots', async () => {
    const testTaskId = generateUUID();
    const now = nowISO();

    // 1. Insert mutation
    const createResult = await Repository.mutate(
      'tasks',
      testTaskId,
      `Create test task ${testTaskId}`,
      (existing) => {
        assert.equal(existing, null, 'Before insert, existing record must be null');
        return {
          id: testTaskId,
          pageId: 'test-page',
          title: 'Mutate Helper Test Task',
          priority: 'high',
          important: true,
          completed: false,
          completedAt: null,
          dueDate: null,
          order: 0,
          createdAt: now,
          updatedAt: now,
        };
      }
    );

    assert.equal(createResult.before, null);
    assert.ok(createResult.after);
    assert.equal(createResult.after.title, 'Mutate Helper Test Task');

    // Verify task exists in repository
    let tasks = await Repository.getAllTasks();
    let found = tasks.find(t => t.id === testTaskId);
    assert.ok(found);
    assert.equal(found.title, 'Mutate Helper Test Task');

    // 2. Update mutation
    const updateResult = await Repository.mutate(
      'tasks',
      testTaskId,
      `Update test task ${testTaskId}`,
      (existing) => {
        assert.ok(existing);
        return {
          ...existing,
          title: 'Mutate Helper Test Task (Updated)',
          completed: true,
          completedAt: nowISO(),
        };
      }
    );

    assert.equal(updateResult.before?.title, 'Mutate Helper Test Task');
    assert.equal(updateResult.after?.title, 'Mutate Helper Test Task (Updated)');
    assert.equal(updateResult.after?.completed, true);

    // 3. Delete mutation
    const deleteResult = await Repository.mutate(
      'tasks',
      testTaskId,
      `Delete test task ${testTaskId}`,
      (existing) => {
        assert.ok(existing);
        return null; // Return null to signal deletion
      }
    );

    assert.equal(deleteResult.before?.title, 'Mutate Helper Test Task (Updated)');
    assert.equal(deleteResult.after, null);

    tasks = await Repository.getAllTasks();
    found = tasks.find(t => t.id === testTaskId);
    assert.equal(found, undefined, 'Task must be deleted after null mutation');

    // 4. Undo restores deleted task
    const db = await openDB();
    const undoRes = await undoLastSnapshot(db);
    assert.ok(undoRes);
    assert.ok(undoRes.action.includes('Delete test task'));

    tasks = await Repository.getAllTasks();
    const restored = tasks.find(t => t.id === testTaskId);
    assert.ok(restored, 'Undo must restore the deleted task');
    assert.equal(restored.title, 'Mutate Helper Test Task (Updated)');

    // Cleanup restored task
    await Repository.deleteTask(testTaskId);
  });
});

test('Database Refactor: Snapshot Storage Cap & Burst Pruning', async (t) => {
  await t.test(`Snapshot count never exceeds MAX_SNAPSHOTS (${MAX_SNAPSHOTS})`, async () => {
    const db = await openDB();

    // Generate 35 snapshots to trigger pruning beyond cap
    for (let i = 1; i <= 35; i++) {
      await recordSnapshot(db, `Burst snapshot ${i}`, [{
        storeName: 'settings',
        key: `burst_${i}`,
        type: 'insert',
        before: null,
        after: { key: `burst_${i}`, value: i }
      }]);
    }

    // Verify snapshot count in IndexedDB
    const count = await new Promise((resolve, reject) => {
      const tx = db.transaction('snapshots', 'readonly');
      const store = tx.objectStore('snapshots');
      const req = store.count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    assert.ok(count <= MAX_SNAPSHOTS, `Snapshot count (${count}) must not exceed MAX_SNAPSHOTS (${MAX_SNAPSHOTS})`);
    assert.equal(count, MAX_SNAPSHOTS, `Snapshot count must be capped exactly at MAX_SNAPSHOTS (${MAX_SNAPSHOTS})`);
  });
});
