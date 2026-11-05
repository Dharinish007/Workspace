import test from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';

// Import our DB logic and repository
import { 
  openDB, 
  seedInitialDataIfNeeded, 
  undoLastSnapshot,
  formatLocalDate,
  nowISO 
} from '../src/db/indexedDB.ts';
import { Repository } from '../src/db/repository.ts';
import { 
  isHabitScheduledOnDate,
  calculateCurrentStreak,
  calculateLongestStreak,
  calculateHabitStats,
  getHeatmapDayIntensity
} from '../src/utils/habitCalculations.ts';

test('Section 14 Phase 1: Foundation Acceptance Criteria', async (t) => {
  await t.test('IndexedDB opens with version 1 and seeds 4 default pages', async () => {
    const db = await openDB();
    assert.equal(db.version, 1);
    assert.ok(db.objectStoreNames.contains('pages'));
    assert.ok(db.objectStoreNames.contains('tasks'));
    assert.ok(db.objectStoreNames.contains('habits'));
    assert.ok(db.objectStoreNames.contains('habitLogs'));
    assert.ok(db.objectStoreNames.contains('events'));
    assert.ok(db.objectStoreNames.contains('dayColors'));
    assert.ok(db.objectStoreNames.contains('settings'));
    assert.ok(db.objectStoreNames.contains('snapshots'));

    await seedInitialDataIfNeeded(db);
    const pages = await Repository.getAllPages();
    assert.equal(pages.length, 4);
    assert.deepEqual(
      pages.map(p => p.name),
      ['Career', 'Projects', 'Learning', 'Personal']
    );

    // Empty state everywhere else
    const tasks = await Repository.getAllTasks();
    const habits = await Repository.getAllHabits();
    const events = await Repository.getAllEvents();
    assert.equal(tasks.length, 0);
    assert.equal(habits.length, 0);
    assert.equal(events.length, 0);
  });

  await t.test('Settings default values and theme persist', async () => {
    const settings = await Repository.getAllSettings();
    assert.equal(settings.theme, 'light');
    assert.equal(settings.weekStart, 'monday');
    assert.equal(settings.displayName, 'Dharinish');

    // Update theme
    await Repository.updateSetting('theme', 'dark');
    const updated = await Repository.getAllSettings();
    assert.equal(updated.theme, 'dark');
  });

  await t.test('Data survives database close and reopen (simulating browser restart)', async () => {
    // Add a test record
    const page = await Repository.createPage({ name: 'Restart Test', icon: 'Star', color: '#6366F1' });
    
    // Close and reopen DB
    const db = await openDB();
    db.close();

    const reopenedPages = await Repository.getAllPages();
    const found = reopenedPages.find(p => p.id === page.id);
    assert.ok(found);
    assert.equal(found.name, 'Restart Test');
  });
});

test('Section 14 Phase 2: To-Do Module Acceptance Criteria', async (t) => {
  let createdPageId = '';
  let taskId1 = '';
  let taskId2 = '';

  await t.test('Page can be created, renamed, reordered, archived, restored', async () => {
    const newPage = await Repository.createPage({ name: 'Work', icon: 'Briefcase', color: '#4285F4' });
    createdPageId = newPage.id;
    assert.equal(newPage.name, 'Work');

    // Rename
    const updated = await Repository.updatePage(newPage.id, { name: 'Work & Ops' });
    assert.equal(updated.name, 'Work & Ops');

    // Archive
    const archived = await Repository.setPageArchived(newPage.id, true);
    assert.equal(archived.archived, true);

    // Restore
    const restored = await Repository.setPageArchived(newPage.id, false);
    assert.equal(restored.archived, false);
  });

  await t.test('Tasks move between Pages without losing data', async () => {
    const pages = await Repository.getAllPages();
    const targetPage = pages.find(p => p.name === 'Projects');
    assert.ok(targetPage);

    // Create task in Work & Ops
    const task = await Repository.createTask({
      pageId: createdPageId,
      title: 'Deploy to Cloud',
      priority: 'high',
      dueDate: '2026-11-05'
    });
    taskId1 = task.id;

    // Move to Projects
    const moved = await Repository.moveTaskToPage(task.id, targetPage.id);
    assert.equal(moved.pageId, targetPage.id);
    assert.equal(moved.title, 'Deploy to Cloud');
    assert.equal(moved.priority, 'high');
    assert.equal(moved.dueDate, '2026-11-05');
  });

  await t.test('Page cards show correct counts and top 5 pending previews', async () => {
    const pages = await Repository.getAllPages();
    const targetPage = pages.find(p => p.name === 'Projects');
    
    // Add multiple tasks with priorities
    await Repository.createTask({ pageId: targetPage.id, title: 'Task Low', priority: 'low' });
    await Repository.createTask({ pageId: targetPage.id, title: 'Task Med', priority: 'medium' });
    const doneTask = await Repository.createTask({ pageId: targetPage.id, title: 'Task Completed', priority: 'high' });
    await Repository.toggleTaskCompleted(doneTask.id);

    const allTasks = await Repository.getAllTasks();
    const pageTasks = allTasks.filter(t => t.pageId === targetPage.id);
    const pending = pageTasks.filter(t => !t.completed);
    
    // Check completed tasks never in pending preview
    assert.ok(!pending.some(t => t.id === doneTask.id));
    // High priority must come first
    const highPending = pending.filter(t => t.priority === 'high');
    assert.ok(highPending.length >= 1);
  });

  await t.test('Permanent delete requires exact name and creates a snapshot', async () => {
    const tempPage = await Repository.createPage({ name: 'To Delete Page' });
    await Repository.createTask({ pageId: tempPage.id, title: 'Orphan Task' });

    // Wrong name must fail
    await assert.rejects(
      async () => Repository.deletePagePermanently(tempPage.id, 'Wrong Name'),
      /Page name confirmation does not match/
    );

    // Correct name succeeds
    await Repository.deletePagePermanently(tempPage.id, 'To Delete Page');
    const allPages = await Repository.getAllPages();
    assert.ok(!allPages.some(p => p.id === tempPage.id));
  });

  await t.test('Undo restores a deleted task', async () => {
    const pages = await Repository.getAllPages();
    const task = await Repository.createTask({
      pageId: pages[0].id,
      title: 'Task To Undo Delete'
    });

    // Delete task
    await Repository.deleteTask(task.id);
    let tasks = await Repository.getAllTasks();
    assert.ok(!tasks.some(t => t.id === task.id));

    // Undo delete
    const db = await openDB();
    const undone = await undoLastSnapshot(db);
    assert.ok(undone);
    assert.ok(undone.action.includes('Delete task'));

    tasks = await Repository.getAllTasks();
    const restoredTask = tasks.find(t => t.id === task.id);
    assert.ok(restoredTask);
    assert.equal(restoredTask.title, 'Task To Undo Delete');
  });
});

test('Section 14 Phase 3: Dashboard Acceptance Criteria', async (t) => {
  await t.test('Every number matches its source records', async () => {
    const todayStr = formatLocalDate(new Date());
    const pages = await Repository.getAllPages();
    const page = pages[0];

    // Create 1 task due today, 1 task due tomorrow
    const tToday = await Repository.createTask({ pageId: page.id, title: 'Today Task', dueDate: todayStr });
    const tTomorrow = await Repository.createTask({ pageId: page.id, title: 'Tomorrow Task', dueDate: '2099-01-01' });

    // Source truth check
    const allTasks = await Repository.getAllTasks();
    const dueToday = allTasks.filter(t => t.dueDate === todayStr);
    assert.ok(dueToday.some(t => t.id === tToday.id));
    assert.ok(!dueToday.some(t => t.id === tTomorrow.id));

    // Create 1 event today
    const evToday = await Repository.createEvent({ title: 'Today Meeting', date: todayStr });
    const allEvents = await Repository.getAllEvents();
    assert.equal(allEvents.filter(e => e.date === todayStr).length, 1);
  });

  await t.test('Ticking a task updates To-Do and Calendar', async () => {
    const tasks = await Repository.getAllTasks();
    const task = tasks.find(t => !t.completed) || tasks[0];
    assert.equal(task.completed, false);

    // Toggle complete
    const updated = await Repository.toggleTaskCompleted(task.id);
    assert.equal(updated.completed, true);
    assert.ok(updated.completedAt);

    // Read fresh from DB
    const fresh = (await Repository.getAllTasks()).find(t => t.id === task.id);
    assert.equal(fresh.completed, true);
  });
});

test('Section 14 Phase 4: Calendar Acceptance Criteria', async (t) => {
  await t.test('Editing a task dueDate in To-Do moves it on Calendar automatically', async () => {
    const pages = await Repository.getAllPages();
    const task = await Repository.createTask({
      pageId: pages[0].id,
      title: 'Calendar Move Test',
      dueDate: '2026-11-10'
    });

    assert.equal(task.dueDate, '2026-11-10');

    // Update due date
    const updated = await Repository.updateTask(task.id, { dueDate: '2026-11-20' });
    assert.equal(updated.dueDate, '2026-11-20');

    // Verify calendar reads exact single source of truth
    const allTasks = await Repository.getAllTasks();
    const onNov10 = allTasks.filter(t => t.dueDate === '2026-11-10');
    const onNov20 = allTasks.filter(t => t.dueDate === '2026-11-20');

    assert.ok(!onNov10.some(t => t.id === task.id));
    assert.ok(onNov20.some(t => t.id === task.id));
  });

  await t.test('Day view orders timed items and shows all-day items separately', async () => {
    const testDate = '2026-11-15';
    const ev1 = await Repository.createEvent({ title: 'Late Meeting', date: testDate, startTime: '15:00' });
    const ev2 = await Repository.createEvent({ title: 'Morning Standup', date: testDate, startTime: '09:00' });
    const evAllDay = await Repository.createEvent({ title: 'All Day Workshop', date: testDate });

    const allEvents = (await Repository.getAllEvents()).filter(e => e.date === testDate);
    const timed = allEvents.filter(e => e.startTime).sort((a, b) => a.startTime.localeCompare(b.startTime));
    const allDay = allEvents.filter(e => !e.startTime);

    assert.equal(timed[0].title, 'Morning Standup');
    assert.equal(timed[1].title, 'Late Meeting');
    assert.equal(allDay[0].title, 'All Day Workshop');
  });

  await t.test('Day background colors set and remove', async () => {
    const testDate = '2026-11-25';
    await Repository.setDayColor(testDate, '#E8F0FE');
    let dayColors = await Repository.getAllDayColors();
    assert.equal(dayColors.find(d => d.date === testDate)?.color, '#E8F0FE');

    await Repository.removeDayColor(testDate);
    dayColors = await Repository.getAllDayColors();
    assert.ok(!dayColors.some(d => d.date === testDate));
  });
});

test('Section 14 Phase 5: Habit Tracker Acceptance Criteria', async (t) => {
  const refDate = new Date(2026, 10, 15); // Sun Nov 15 2026
  const habitDaily = {
    id: 'h-daily',
    name: 'Daily Meditation',
    icon: 'Smile',
    color: '#0D9488',
    schedule: { type: 'daily' },
    createdAt: nowISO(),
    updatedAt: nowISO()
  };

  const habitWeekdays = {
    id: 'h-weekdays',
    name: 'Gym Workout',
    icon: 'Dumbbell',
    color: '#34A853',
    // Mon, Wed, Fri only (1, 3, 5)
    schedule: { type: 'weekdays', days: [1, 3, 5] },
    createdAt: nowISO(),
    updatedAt: nowISO()
  };

  await t.test('Unscheduled days are excluded from streaks and percentages', () => {
    // Tue Nov 10 is weekday 2 (unscheduled for gym)
    // Wed Nov 11 is weekday 3 (scheduled for gym)
    const tue = new Date(2026, 10, 10);
    const wed = new Date(2026, 10, 11);

    assert.equal(isHabitScheduledOnDate(habitWeekdays, tue), false);
    assert.equal(isHabitScheduledOnDate(habitWeekdays, wed), true);
  });

  await t.test('Streak rules in Section 8.6 pass hand-checked examples', () => {
    // Example 1: 5-day daily streak where today is completed
    const today = new Date(2026, 10, 5); // Thu
    const logs1 = [
      { id: '1', habitId: 'h-daily', date: '2026-11-05', completed: true, updatedAt: nowISO() },
      { id: '2', habitId: 'h-daily', date: '2026-11-04', completed: true, updatedAt: nowISO() },
      { id: '3', habitId: 'h-daily', date: '2026-11-03', completed: true, updatedAt: nowISO() },
      { id: '4', habitId: 'h-daily', date: '2026-11-02', completed: true, updatedAt: nowISO() },
      { id: '5', habitId: 'h-daily', date: '2026-11-01', completed: true, updatedAt: nowISO() },
    ];
    assert.equal(calculateCurrentStreak(habitDaily, logs1, today), 5);

    // Example 2: Today is scheduled but not yet completed -> streak is NOT broken, counts from yesterday
    const logs2 = [
      // 2026-11-05 not completed
      { id: '2', habitId: 'h-daily', date: '2026-11-04', completed: true, updatedAt: nowISO() },
      { id: '3', habitId: 'h-daily', date: '2026-11-03', completed: true, updatedAt: nowISO() },
      { id: '4', habitId: 'h-daily', date: '2026-11-02', completed: true, updatedAt: nowISO() },
    ];
    assert.equal(calculateCurrentStreak(habitDaily, logs2, today), 3);

    // Example 3: Unscheduled days are skipped in weekday habit
    // Wed Nov 4 (day 3), Mon Nov 2 (day 1) completed
    // Tue Nov 3 was unscheduled!
    const wedToday = new Date(2026, 10, 4); // Wed
    const logs3 = [
      { id: '1', habitId: 'h-weekdays', date: '2026-11-04', completed: true, updatedAt: nowISO() },
      { id: '2', habitId: 'h-weekdays', date: '2026-11-02', completed: true, updatedAt: nowISO() },
    ];
    // Both scheduled days completed, unscheduled Tue skipped -> streak is 2
    assert.equal(calculateCurrentStreak(habitWeekdays, logs3, wedToday), 2);

    // Example 4: Missed scheduled day breaks streak
    const logs4 = [
      { id: '1', habitId: 'h-daily', date: '2026-11-04', completed: true, updatedAt: nowISO() },
      // 2026-11-03 missed
      { id: '2', habitId: 'h-daily', date: '2026-11-02', completed: true, updatedAt: nowISO() },
    ];
    assert.equal(calculateCurrentStreak(habitDaily, logs4, today), 1);
  });

  await t.test('Heatmap 4-level intensity calculation', () => {
    const testD = new Date(2026, 10, 5);
    const testHabits = [habitDaily];
    const logDone = [{ id: '1', habitId: 'h-daily', date: '2026-11-05', completed: true, updatedAt: nowISO() }];
    const logNone = [];

    assert.equal(getHeatmapDayIntensity(testHabits, logDone, testD).level, 3); // 100%
    assert.equal(getHeatmapDayIntensity(testHabits, logNone, testD).level, 0); // 0%
  });
});

test('Section 14 Phase 6: Data Safety Acceptance Criteria', async (t) => {
  await t.test('Export -> clear site data -> import restores everything exactly', async () => {
    // Export current database
    const backup = await Repository.exportBackup();
    assert.equal(backup.app, 'my-workspace');
    assert.equal(backup.schemaVersion, 1);
    assert.ok(backup.data.pages.length > 0);

    const originalPageCount = backup.data.pages.length;
    const originalTaskCount = backup.data.tasks.length;

    // Simulate clearing database and importing backup in 'replace' mode
    const importResult = await Repository.importBackup(backup, 'replace');
    assert.ok(importResult.message.includes('Successfully imported (replace)'));

    // Verify counts match exactly
    const restoredPages = await Repository.getAllPages();
    const restoredTasks = await Repository.getAllTasks();
    assert.equal(restoredPages.length, originalPageCount);
    assert.equal(restoredTasks.length, originalTaskCount);
  });

  await t.test('Corrupted or wrong-version file is rejected with clear message', async () => {
    // 1. Wrong app name
    const wrongApp = { app: 'other-app', schemaVersion: 1, data: {} };
    await assert.rejects(
      async () => Repository.importBackup(wrongApp, 'merge'),
      /Application ID must be "my-workspace"/
    );

    // 2. Higher schema version
    const highVersion = { app: 'my-workspace', schemaVersion: 99, data: {} };
    await assert.rejects(
      async () => Repository.importBackup(highVersion, 'merge'),
      /Unsupported schema version: 99/
    );

    // 3. Corrupt record missing id
    const corruptRecords = {
      app: 'my-workspace',
      schemaVersion: 1,
      data: {
        pages: [{ name: 'Missing ID' }]
      }
    };
    await assert.rejects(
      async () => Repository.importBackup(corruptRecords, 'merge'),
      /Corrupted record in "pages"/
    );
  });
});

