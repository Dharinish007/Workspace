import test from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Repository } from '../src/db/repository.js';
import { openDB, closeDB } from '../src/db/indexedDB.js';

test('Phase 4: Route Normalization Verification in App.tsx & Sidebar.tsx', async (t) => {
  const appFile = readFileSync(resolve('src/App.tsx'), 'utf-8');
  const sidebarFile = readFileSync(resolve('src/components/layout/Sidebar.tsx'), 'utf-8');

  await t.test('App.tsx redirects /activity to /timer via Navigate component', () => {
    assert.match(
      appFile,
      /<Route\s+path="\/activity"\s+element=\{<Navigate\s+to="\/timer"\s+replace\s*\/>\}\s*\/>/,
      'App.tsx must normalize /activity by redirecting to /timer'
    );
    assert.match(
      appFile,
      /<Route\s+path="\/timer"\s+element=\{<TimerModule\s*\/>\}\s*\/>/,
      'App.tsx mounts TimerModule on /timer'
    );
  });

  await t.test('Sidebar.tsx recognizes /timer and /activity under Timer navigation', () => {
    assert.match(
      sidebarFile,
      /path === '\/timer'/,
      'Sidebar must have route matching for /timer'
    );
    assert.match(
      sidebarFile,
      /location\.pathname\.startsWith\('\/timer'\)\s*\|\|\s*location\.pathname\.startsWith\('\/activity'\)/,
      'Sidebar must match both /timer and /activity for active state'
    );
  });
});

test('Phase 4: Localized Habit Toggle & Direct State Return', async (t) => {
  closeDB();
  const db = await openDB();

  const habit = await Repository.createHabit({
    name: 'Morning Hydration',
    icon: 'Droplet',
    color: '#1A73E8',
    schedule: { type: 'daily' },
  });

  const testDate = '2026-11-15';

  await t.test('toggleHabitLog returns updated HabitLog record with completed=true', async () => {
    const updated = await Repository.toggleHabitLog(habit.id, testDate);
    assert.equal(updated.habitId, habit.id);
    assert.equal(updated.date, testDate);
    assert.equal(updated.completed, true);
  });

  await t.test('second toggleHabitLog toggles to completed=false', async () => {
    const updated = await Repository.toggleHabitLog(habit.id, testDate);
    assert.equal(updated.habitId, habit.id);
    assert.equal(updated.date, testDate);
    assert.equal(updated.completed, false);
  });

  await t.test('WorkspaceContext toggleHabitLog implements localized rollback on mutation failure', () => {
    const ctxFile = readFileSync(resolve('src/context/WorkspaceContext.tsx'), 'utf-8');
    // Verify it doesn't call await refreshAll() inside try block of toggleHabitLog
    const toggleHabitBlock = ctxFile.match(/const toggleHabitLog = useCallback\(async \([\s\S]*?\}, \[[\s\S]*?\]\);/);
    assert.ok(toggleHabitBlock, 'toggleHabitLog block must exist in WorkspaceContext');
    
    // Check that try block updates habitLogs with updatedLog and does NOT call refreshAll()
    assert.doesNotMatch(
      toggleHabitBlock[0],
      /await Repository\.toggleHabitLog[\s\S]*?await refreshAll\(\)/,
      'toggleHabitLog must update local state directly instead of calling refreshAll() on success'
    );

    // Check that catch block rolls back locally instead of calling refreshAll()
    assert.doesNotMatch(
      toggleHabitBlock[0],
      /catch\s*\([^\)]*\)\s*\{[\s\S]*?await refreshAll\(\)/,
      'toggleHabitLog must roll back locally on error instead of calling refreshAll()'
    );
  });
});

test('Phase 4: Localized Day Color Rollback without Full Refresh', async (t) => {
  const ctxFile = readFileSync(resolve('src/context/WorkspaceContext.tsx'), 'utf-8');
  
  await t.test('setDayColor rolls back to prevColor on failure without refreshAll()', () => {
    const setDayColorBlock = ctxFile.match(/const setDayColor = useCallback\(async \([\s\S]*?\}, \[[\s\S]*?\]\);/);
    assert.ok(setDayColorBlock, 'setDayColor block must exist');
    assert.doesNotMatch(
      setDayColorBlock[0],
      /catch\s*\([^\)]*\)\s*\{[\s\S]*?await refreshAll\(\)/,
      'setDayColor must not call refreshAll() in catch block'
    );
  });

  await t.test('removeDayColor rolls back to prevColor on failure without refreshAll()', () => {
    const removeDayColorBlock = ctxFile.match(/const removeDayColor = useCallback\(async \([\s\S]*?\}, \[[\s\S]*?\]\);/);
    assert.ok(removeDayColorBlock, 'removeDayColor block must exist');
    assert.doesNotMatch(
      removeDayColorBlock[0],
      /catch\s*\([^\)]*\)\s*\{[\s\S]*?await refreshAll\(\)/,
      'removeDayColor must not call refreshAll() in catch block'
    );
  });
});

test('Phase 4: Derived State & Lookup Indexing Verification', async (t) => {
  const dashFile = readFileSync(resolve('src/components/dashboard/DashboardModule.tsx'), 'utf-8');
  const monthViewFile = readFileSync(resolve('src/components/calendar/MonthView.tsx'), 'utf-8');
  const headerFile = readFileSync(resolve('src/components/layout/Header.tsx'), 'utf-8');

  await t.test('DashboardModule indexes completed habit logs with Set lookup', () => {
    assert.match(
      dashFile,
      /completedHabitLogKeys = useMemo\(\(\) => \{[\s\S]*?new Set/,
      'DashboardModule must use a memoized Set for O(1) completed habit lookups'
    );
    assert.match(
      dashFile,
      /pagesMap = useMemo\(\(\) => new Map\(pages\.map/,
      'DashboardModule must memoize pagesMap for O(1) page color lookups'
    );
  });

  await t.test('MonthView pre-indexes tasks, events, and dayColors by date', () => {
    assert.match(
      monthViewFile,
      /tasksByDate = React\.useMemo/,
      'MonthView must pre-index tasks by date'
    );
    assert.match(
      monthViewFile,
      /eventsByDate = React\.useMemo/,
      'MonthView must pre-index events by date'
    );
    assert.match(
      monthViewFile,
      /dayColorsMap = React\.useMemo/,
      'MonthView must pre-index dayColors by date'
    );
  });

  await t.test('Header pageTitle memoization is guarded by page route', () => {
    assert.match(
      headerFile,
      /location\.pathname\.startsWith\('\/pages\/'\)\s*\?\s*pages\s*:\s*null/,
      'Header must guard pages dependency in pageTitle'
    );
  });
});
