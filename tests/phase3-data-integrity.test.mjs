import test from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';

import { 
  openDB, 
  undoLastSnapshot, 
  generateUUID, 
  nowISO 
} from '../src/db/indexedDB.ts';
import { Repository, SchemaValidationError } from '../src/db/repository.ts';
import { normalizeError, getErrorMessage } from '../src/utils/errorUtils.ts';

test('Phase 3: Error Utilities & SchemaValidationError', async (t) => {
  await t.test('normalizeError converts strings, objects, and Error instances uniformly', () => {
    const errFromStr = normalizeError('Network timeout');
    assert.ok(errFromStr instanceof Error);
    assert.equal(errFromStr.message, 'Network timeout');

    const standardErr = new Error('Database locked');
    assert.equal(normalizeError(standardErr), standardErr);

    const objErr = normalizeError({ message: 'Payload too large', code: 413 });
    assert.ok(objErr instanceof Error);
    assert.equal(objErr.message, 'Payload too large');

    const fallbackErr = normalizeError(null);
    assert.equal(fallbackErr.message, 'An unexpected error occurred');

    assert.equal(getErrorMessage('Simple error message'), 'Simple error message');
    assert.equal(getErrorMessage(new Error('Instance message')), 'Instance message');
  });

  await t.test('SchemaValidationError carries storeName, index, and field properties', () => {
    const schemaErr = new SchemaValidationError(
      'Corrupted record in "tasks" at index 3: missing unique "id".',
      'tasks',
      3,
      'id'
    );

    assert.ok(schemaErr instanceof Error);
    assert.ok(schemaErr instanceof SchemaValidationError);
    assert.equal(schemaErr.name, 'SchemaValidationError');
    assert.equal(schemaErr.storeName, 'tasks');
    assert.equal(schemaErr.index, 3);
    assert.equal(schemaErr.field, 'id');
  });
});

test('Phase 3: Pre-Import Schema Conformance Checker', async (t) => {
  const baseValidData = () => ({
    app: 'my-workspace',
    schemaVersion: 1,
    exportedAt: nowISO(),
    data: {
      pages: [{ id: generateUUID(), name: 'Work', order: 0, createdAt: nowISO(), updatedAt: nowISO() }],
      tasks: [],
      habits: [],
      habitLogs: [],
      events: [],
      dayColors: [],
      settings: { theme: 'light' },
      journalEntries: [],
      notes: [],
      timerSessions: [],
      activityLogs: []
    }
  });

  await t.test('Rejects missing root payload or wrong app identifier', async () => {
    await assert.rejects(
      async () => Repository.importBackup(null, 'merge'),
      (err) => err instanceof SchemaValidationError && err.message.includes('Not an object')
    );

    await assert.rejects(
      async () => Repository.importBackup({ app: 'other-app', schemaVersion: 1, data: {} }, 'merge'),
      (err) => err instanceof SchemaValidationError && err.message.includes('Application ID must be "my-workspace"')
    );

    await assert.rejects(
      async () => Repository.importBackup({ app: 'my-workspace', schemaVersion: 2, data: {} }, 'merge'),
      (err) => err instanceof SchemaValidationError && err.message.includes('Unsupported schema version')
    );
  });

  await t.test('Rejects corrupted page with empty or whitespace-only name', async () => {
    const backup = baseValidData();
    backup.data.pages = [{ id: generateUUID(), name: '   ' }];

    await assert.rejects(
      async () => Repository.importBackup(backup, 'merge'),
      (err) => err instanceof SchemaValidationError && err.message.includes('page name is required')
    );
  });

  await t.test('Rejects task with invalid dueDate format', async () => {
    const backup = baseValidData();
    backup.data.tasks = [{
      id: generateUUID(),
      pageId: backup.data.pages[0].id,
      title: 'Valid Task',
      dueDate: '11-05-2026' // Invalid date format (must be YYYY-MM-DD)
    }];

    await assert.rejects(
      async () => Repository.importBackup(backup, 'merge'),
      (err) => err instanceof SchemaValidationError && err.message.includes('invalid dueDate format')
    );
  });

  await t.test('Rejects journalEntries with invalid calendar date format', async () => {
    const backup = baseValidData();
    backup.data.journalEntries = [{
      id: generateUUID(),
      date: '2026/11/05', // Invalid separator
      title: 'Bad Date Journal',
      body: 'Some text'
    }];

    await assert.rejects(
      async () => Repository.importBackup(backup, 'merge'),
      (err) => err instanceof SchemaValidationError && err.message.includes('invalid date format')
    );
  });

  await t.test('Rejects notes with missing id or non-string title', async () => {
    const backup = baseValidData();
    backup.data.notes = [{
      id: generateUUID(),
      title: 12345 // Non-string title
    }];

    await assert.rejects(
      async () => Repository.importBackup(backup, 'merge'),
      (err) => err instanceof SchemaValidationError && err.message.includes('title must be a string')
    );
  });

  await t.test('Rejects timerSessions with non-numeric timestamps', async () => {
    const backup = baseValidData();
    backup.data.timerSessions = [{
      id: generateUUID(),
      startedAt: 'not-a-timestamp',
      endedAt: 123456789
    }];

    await assert.rejects(
      async () => Repository.importBackup(backup, 'merge'),
      (err) => err instanceof SchemaValidationError && err.message.includes('startedAt and endedAt must be numbers')
    );
  });

  await t.test('Rejects non-object settings bucket', async () => {
    const backup = baseValidData();
    backup.data.settings = 'not-an-object';

    await assert.rejects(
      async () => Repository.importBackup(backup, 'merge'),
      (err) => err instanceof SchemaValidationError && err.message.includes('"settings" must be an object')
    );
  });

  await t.test('Cleanly imports valid backup spanning all stores without errors', async () => {
    const backup = baseValidData();
    const now = nowISO();
    const pageId = backup.data.pages[0].id;

    backup.data.tasks.push({
      id: generateUUID(),
      pageId,
      title: 'Valid Task',
      priority: 'high',
      important: true,
      completed: false,
      completedAt: null,
      dueDate: '2026-11-20',
      order: 0,
      createdAt: now,
      updatedAt: now
    });

    backup.data.journalEntries.push({
      id: generateUUID(),
      date: '2026-11-20',
      title: 'Valid Journal',
      body: 'Today was productive.',
      mood: 'good',
      tags: ['work'],
      createdAt: now,
      updatedAt: now
    });

    backup.data.notes.push({
      id: generateUUID(),
      title: 'Valid Note',
      content: 'Note contents',
      tags: [],
      pinned: true,
      pinnedOrder: 0,
      createdAt: now,
      updatedAt: now
    });

    const res = await Repository.importBackup(backup, 'merge');
    assert.ok(res.message.includes('Successfully imported'));

    const tasks = await Repository.getAllTasks();
    assert.ok(tasks.some(t => t.title === 'Valid Task'));

    const journal = await Repository.getJournalEntryByDate('2026-11-20');
    assert.ok(journal);
    assert.equal(journal.title, 'Valid Journal');
  });
});

test('Phase 3: Strict Page Deletion Confirmation', async (t) => {
  await t.test('Rejects deletion if confirmation name is null, undefined, or empty', async () => {
    const page = await Repository.createPage({ name: 'Strict Delete Test' });

    await assert.rejects(
      async () => Repository.deletePagePermanently(page.id, null),
      /Page name confirmation does not match/
    );

    await assert.rejects(
      async () => Repository.deletePagePermanently(page.id, undefined),
      /Page name confirmation does not match/
    );

    await assert.rejects(
      async () => Repository.deletePagePermanently(page.id, '   '),
      /Page name confirmation does not match/
    );

    // Exact match succeeds
    await Repository.deletePagePermanently(page.id, 'Strict Delete Test');
    const allPages = await Repository.getAllPages();
    assert.ok(!allPages.some(p => p.id === page.id));
  });
});

test('Phase 3: Guarded Note Pin Reordering & Snapshot Undo', async (t) => {
  await t.test('Reordering pinned notes records an undoable snapshot and ignores unpinned notes', async () => {
    const note1 = await Repository.createNote({ title: 'Pinned 1', pinned: true, pinnedOrder: 0 });
    const note2 = await Repository.createNote({ title: 'Pinned 2', pinned: true, pinnedOrder: 1 });
    const unpinned = await Repository.createNote({ title: 'Unpinned', pinned: false, pinnedOrder: 0 });

    // Reorder: 2, 1, plus accidentally include unpinned
    await Repository.reorderPinnedNotes([note2.id, note1.id, unpinned.id]);

    let notes = await Repository.getAllNotes();
    let reordered1 = notes.find(n => n.id === note1.id);
    let reordered2 = notes.find(n => n.id === note2.id);
    let reorderedUnpinned = notes.find(n => n.id === unpinned.id);

    assert.equal(reordered2.pinnedOrder, 0);
    assert.equal(reordered1.pinnedOrder, 1);
    assert.equal(reorderedUnpinned.pinned, false, 'Unpinned note must NOT become pinned during reorder');

    // Test Undo
    const db = await openDB();
    const undoRes = await undoLastSnapshot(db);
    assert.ok(undoRes);
    assert.ok(undoRes.action.includes('Reorder pinned notes'));

    notes = await Repository.getAllNotes();
    reordered1 = notes.find(n => n.id === note1.id);
    reordered2 = notes.find(n => n.id === note2.id);
    assert.equal(reordered1.pinnedOrder, 0, 'Undo must restore original pinned order for note 1');
    assert.equal(reordered2.pinnedOrder, 1, 'Undo must restore original pinned order for note 2');

    // Clean up
    await Repository.deleteNote(note1.id);
    await Repository.deleteNote(note2.id);
    await Repository.deleteNote(unpinned.id);
  });
});
