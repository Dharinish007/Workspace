import test from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';

import { openDB, nowISO, formatLocalDate } from '../src/db/indexedDB.ts';
import { Repository } from '../src/db/repository.ts';
import { groupNotesByLastModified, stripMarkdown } from '../src/components/notes/noteUtils.ts';

test('Notes Module: Complete Architecture & Persistence Acceptance Criteria', async (t) => {
  await t.test('Multiple notes can be created without one-entry-per-date restriction', async () => {
    const note1 = await Repository.createNote({
      title: 'Sprint Plan',
      content: '# Sprint Tasks\n- Complete notes implementation',
      tags: ['work', 'plan'],
      pinned: false,
    });

    const note2 = await Repository.createNote({
      title: 'Architecture Review',
      content: 'Discussion notes on state management',
      tags: ['work', 'architecture'],
      pinned: false,
    });

    const note3 = await Repository.createNote({
      title: 'Spring Boot Notes',
      content: 'Dependency Injection and Starters',
      tags: ['java', 'spring'],
      pinned: true,
      pinnedOrder: 0,
    });

    assert.ok(note1.id);
    assert.ok(note2.id);
    assert.ok(note3.id);
    assert.notEqual(note1.id, note2.id);

    const allNotes = await Repository.getAllNotes();
    assert.ok(allNotes.length >= 3);
    assert.ok(allNotes.some(n => n.id === note1.id));
    assert.ok(allNotes.some(n => n.id === note2.id));
    assert.ok(allNotes.some(n => n.id === note3.id));
  });

  await t.test('Editing an older note updates its updatedAt and moves to Today', async () => {
    // Create an older note
    const olderDate = new Date(Date.now() - 5 * 86400000).toISOString();
    const created = await Repository.createNote({
      title: 'Legacy Note',
      content: 'Original content',
      tags: ['old'],
      pinned: false,
    });

    // Artificially simulate it being older
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(['notes'], 'readwrite');
      const store = tx.objectStore('notes');
      store.put({ ...created, updatedAt: olderDate });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    const fetchedBefore = await Repository.getNoteById(created.id);
    assert.equal(fetchedBefore?.updatedAt, olderDate);

    // Grouping before edit: should be in older
    const groupsBefore = groupNotesByLastModified([fetchedBefore]);
    assert.equal(groupsBefore.older.length, 1);
    assert.equal(groupsBefore.today.length, 0);

    // Now edit the note
    const updated = await Repository.updateNote(created.id, {
      content: 'Updated content with markdown',
    });

    assert.notEqual(updated.updatedAt, olderDate);
    const groupsAfter = groupNotesByLastModified([updated]);
    assert.equal(groupsAfter.today.length, 1);
    assert.equal(groupsAfter.older.length, 0);
  });

  await t.test('Pinned notes preserve ordering and drag-and-drop reorder persists', async () => {
    const noteA = await Repository.createNote({
      title: 'Pinned A',
      content: 'A',
      tags: ['a'],
      pinned: true,
      pinnedOrder: 0,
    });

    const noteB = await Repository.createNote({
      title: 'Pinned B',
      content: 'B',
      tags: ['b'],
      pinned: true,
      pinnedOrder: 1,
    });

    const noteC = await Repository.createNote({
      title: 'Pinned C',
      content: 'C',
      tags: ['c'],
      pinned: true,
      pinnedOrder: 2,
    });

    // Reorder: B, C, A
    await Repository.reorderPinnedNotes([noteB.id, noteC.id, noteA.id]);

    const allNotes = await Repository.getAllNotes();
    const pinned = allNotes.filter(n => n.pinned && [noteA.id, noteB.id, noteC.id].includes(n.id));
    
    assert.equal(pinned[0].id, noteB.id);
    assert.equal(pinned[0].pinnedOrder, 0);
    assert.equal(pinned[1].id, noteC.id);
    assert.equal(pinned[1].pinnedOrder, 1);
    assert.equal(pinned[2].id, noteA.id);
    assert.equal(pinned[2].pinnedOrder, 2);
  });

  await t.test('stripMarkdown helper cleans markdown syntax for clean previews', () => {
    const raw = '# Header 1\n**Bold text** and *italic* with `inline code` and [Link](https://google.com)\n> quote block\n- list item';
    const stripped = stripMarkdown(raw);
    assert.equal(stripped, 'Header 1 Bold text and italic with inline code and Link quote block list item');
  });

  await t.test('Backup export and import restores notes data accurately', async () => {
    const backup = await Repository.exportBackup();
    assert.ok(Array.isArray(backup.data.notes));
    const originalNoteCount = backup.data.notes.length;
    assert.ok(originalNoteCount > 0);

    // Replace import
    const result = await Repository.importBackup(backup, 'replace');
    assert.ok(result.message.includes('Successfully imported'));

    const restoredNotes = await Repository.getAllNotes();
    assert.equal(restoredNotes.length, originalNoteCount);
  });

  await t.test('Deleting a note removes it from the store', async () => {
    const note = await Repository.createNote({
      title: 'To Be Deleted',
      content: 'Temporary',
      tags: [],
      pinned: false,
    });

    const beforeDelete = await Repository.getNoteById(note.id);
    assert.ok(beforeDelete);

    await Repository.deleteNote(note.id);
    const afterDelete = await Repository.getNoteById(note.id);
    assert.equal(afterDelete, null);
  });
});

