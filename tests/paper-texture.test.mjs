import test from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import fs from 'node:fs';
import path from 'node:path';
import { openDB, seedInitialDataIfNeeded } from '../src/db/indexedDB.ts';
import { Repository } from '../src/db/repository.ts';

test('Paper Texture Theme: Asset Verification', async (t) => {
  await t.test('Classic Paper asset exists in public/textures/', () => {
    const classicPath = path.resolve('public/textures/classic-paper.jpg');
    assert.ok(fs.existsSync(classicPath), 'classic-paper.jpg must exist in public/textures/');
    const stat = fs.statSync(classicPath);
    assert.ok(stat.size > 100000, `classic-paper.jpg size (${stat.size} bytes) should be valid 4K asset`);
  });

  await t.test('Charcoal Paper asset exists in public/textures/', () => {
    const charcoalPath = path.resolve('public/textures/charcoal-paper.jpg');
    assert.ok(fs.existsSync(charcoalPath), 'charcoal-paper.jpg must exist in public/textures/');
    const stat = fs.statSync(charcoalPath);
    assert.ok(stat.size > 100000, `charcoal-paper.jpg size (${stat.size} bytes) should be valid 4K asset`);
  });
});

test('Paper Texture Theme: Settings Persistence and Theme Independence', async (t) => {
  const db = await openDB();
  await seedInitialDataIfNeeded(db);

  await t.test('Settings defaults to "current" background style', async () => {
    const settings = await Repository.getAllSettings();
    assert.ok(settings.backgroundStyle === 'current' || settings.backgroundStyle === undefined);
  });

  await t.test('Setting backgroundStyle to "paper" persists in IndexedDB', async () => {
    await Repository.updateSetting('backgroundStyle', 'paper');
    const settings = await Repository.getAllSettings();
    assert.equal(settings.backgroundStyle, 'paper');
  });

  await t.test('Toggling theme between light and dark preserves backgroundStyle', async () => {
    // Switch to dark mode
    await Repository.updateSetting('theme', 'dark');
    let settings = await Repository.getAllSettings();
    assert.equal(settings.theme, 'dark');
    assert.equal(settings.backgroundStyle, 'paper');

    // Switch back to light mode
    await Repository.updateSetting('theme', 'light');
    settings = await Repository.getAllSettings();
    assert.equal(settings.theme, 'light');
    assert.equal(settings.backgroundStyle, 'paper');
  });

  await t.test('Setting backgroundStyle to "notion" persists in IndexedDB', async () => {
    await Repository.updateSetting('backgroundStyle', 'notion');
    const settings = await Repository.getAllSettings();
    assert.equal(settings.backgroundStyle, 'notion');
  });

  await t.test('Reverting to "current" background style restores default behavior', async () => {
    await Repository.updateSetting('backgroundStyle', 'current');
    const settings = await Repository.getAllSettings();
    assert.equal(settings.backgroundStyle, 'current');
  });
});

test('Appearance Styles: Six Mode Matrix and Non-Destructive Integrity', async (t) => {
  await t.test('All six theme and backgroundStyle combinations are valid and non-destructive', async () => {
    // 1. Current Theme + Light Mode
    await Repository.updateSetting('backgroundStyle', 'current');
    await Repository.updateSetting('theme', 'light');
    let settings = await Repository.getAllSettings();
    assert.equal(settings.backgroundStyle, 'current');
    assert.equal(settings.theme, 'light');

    // 2. Current Theme + Dark Mode
    await Repository.updateSetting('theme', 'dark');
    settings = await Repository.getAllSettings();
    assert.equal(settings.backgroundStyle, 'current');
    assert.equal(settings.theme, 'dark');

    // 3. Paper Texture + Dark Mode
    await Repository.updateSetting('backgroundStyle', 'paper');
    settings = await Repository.getAllSettings();
    assert.equal(settings.backgroundStyle, 'paper');
    assert.equal(settings.theme, 'dark');

    // 4. Paper Texture + Light Mode
    await Repository.updateSetting('theme', 'light');
    settings = await Repository.getAllSettings();
    assert.equal(settings.backgroundStyle, 'paper');
    assert.equal(settings.theme, 'light');

    // 5. Notion + Light Mode
    await Repository.updateSetting('backgroundStyle', 'notion');
    settings = await Repository.getAllSettings();
    assert.equal(settings.backgroundStyle, 'notion');
    assert.equal(settings.theme, 'light');

    // 6. Notion + Dark Mode
    await Repository.updateSetting('theme', 'dark');
    settings = await Repository.getAllSettings();
    assert.equal(settings.backgroundStyle, 'notion');
    assert.equal(settings.theme, 'dark');

    // Verify existing user data remains completely untouched
    const pages = await Repository.getAllPages();
    assert.ok(pages.length > 0, 'User pages must not be reset or deleted');
    const tasks = await Repository.getAllTasks();
    assert.ok(Array.isArray(tasks), 'User tasks must not be reset or deleted');

    // Restore to default
    await Repository.updateSetting('backgroundStyle', 'current');
  });
});

test('Appearance Styles: Backup Export and Import', async (t) => {
  await t.test('Exported backup contains backgroundStyle setting (notion)', async () => {
    await Repository.updateSetting('backgroundStyle', 'notion');
    const backup = await Repository.exportBackup();
    assert.ok(backup.data.settings);
    assert.equal(backup.data.settings.backgroundStyle, 'notion');

    // Cleanup to default
    await Repository.updateSetting('backgroundStyle', 'current');
  });
});
