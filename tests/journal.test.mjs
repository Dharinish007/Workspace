import test from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';

import { openDB } from '../src/db/indexedDB.ts';
import { Repository } from '../src/db/repository.ts';

test('Journal Storage & Persistence Verification', async (t) => {
  await t.test('Storage layer enforces one entry per calendar date', async () => {
    const entry1 = {
      id: 'entry-1',
      date: '2026-11-07',
      title: 'First Entry',
      body: 'Testing storage layer',
      mood: 'good',
      tags: ['test'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await Repository.saveJournalEntry(entry1);
    const fetched1 = await Repository.getJournalEntryByDate('2026-11-07');
    assert.equal(fetched1.title, 'First Entry');

    // Updating entry on the same date replaces/updates it without duplicating
    const entry2 = {
      id: 'entry-2',
      date: '2026-11-07',
      title: 'Updated Entry',
      body: 'Updated body content',
      mood: 'great',
      tags: ['test', 'updated'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await Repository.saveJournalEntry(entry2);
    const all = await Repository.getAllJournalEntries();
    const forDate = all.filter(e => e.date === '2026-11-07');
    assert.equal(forDate.length, 1);
    assert.equal(forDate[0].title, 'Updated Entry');
    assert.equal(forDate[0].mood, 'great');
  });

  await t.test('Title is optional and stored as null when empty or whitespace', async () => {
    const entry = {
      id: 'entry-no-title',
      date: '2026-11-08',
      title: '   ',
      body: 'Body without a title',
      mood: 'neutral',
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = await Repository.saveJournalEntry(entry);
    assert.equal(saved.title, null);

    const fetched = await Repository.getJournalEntryByDate('2026-11-08');
    assert.equal(fetched.title, null);
  });

  await t.test('Export and import preserves journal entries', async () => {
    const backup = await Repository.exportBackup();
    assert.ok(backup.data.journalEntries);
    assert.ok(backup.data.journalEntries.length >= 2);

    const originalCount = backup.data.journalEntries.length;
    await Repository.importBackup(backup, 'replace');

    const restored = await Repository.getAllJournalEntries();
    assert.equal(restored.length, originalCount);
  });
});

