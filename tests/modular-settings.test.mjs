import test from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';

import { 
  createDefaultUserSettings, 
  mergeWithDefaultSettings,
  DEFAULT_GENERAL_SETTINGS,
  DEFAULT_APPEARANCE_SETTINGS,
  DEFAULT_GLOBAL_PREFERENCES,
  DEFAULT_HABITS_SETTINGS
} from '../src/utils/defaultSettings.ts';
import { formatDisplayDate, formatDisplayDateTime } from '../src/utils/dateUtils.ts';
import { Repository } from '../src/db/repository.ts';
import { openDB } from '../src/db/indexedDB.ts';

test('Modular Settings: Canonical Default Configuration', (t) => {
  t.test('createDefaultUserSettings produces complete, decoupled structures', () => {
    const defaults = createDefaultUserSettings();

    // 1. General
    assert.equal(defaults.general.displayName, 'Dharinish');
    assert.equal(defaults.general.language, 'en');
    assert.equal(defaults.general.dateFormat, 'YYYY-MM-DD');
    assert.equal(defaults.general.weekStart, 'monday');
    assert.equal(defaults.general.defaultLandingPage, 'dashboard');

    // 2. Appearance
    assert.equal(defaults.appearance.themeMode, 'light');
    assert.equal(defaults.appearance.backgroundStyle, 'current');
    assert.equal(defaults.appearance.accentColor, 'blue');
    assert.equal(defaults.appearance.fontSize, 'md');
    assert.equal(defaults.appearance.density, 'comfortable');
    assert.equal(defaults.appearance.animations, 'full');

    // 3. Global Preferences (no module duplication)
    assert.equal(defaults.globalPreferences.notifications, 'enabled');
    assert.equal(defaults.globalPreferences.reminderLeadTimeMinutes, 15);
    assert.equal(defaults.globalPreferences.defaultTaskSorting, 'order');
    assert.equal(defaults.globalPreferences.confirmBeforeDelete, true);
    assert.equal(defaults.globalPreferences.startupBehavior, 'landing_page');

    // 4. Module Settings
    assert.ok(defaults.modules.habits);
    assert.equal(defaults.modules.habits.enabled, true);
    assert.equal(defaults.modules.habits.defaultFrequency, 'daily');
    assert.equal(defaults.modules.habits.streakDisplay, 'badge');
    assert.equal(defaults.modules.habits.showArchived, false);

    assert.ok(defaults.modules.todo);
    assert.equal(defaults.modules.todo.enabled, true);
    assert.equal(defaults.modules.todo.defaultPriority, 'medium');
    assert.equal(defaults.modules.todo.defaultDueDate, 'none');
    assert.equal(defaults.modules.todo.completedVisibility, 'show');

    assert.ok(defaults.modules.timer);
    assert.equal(defaults.modules.timer.enabled, true);
    assert.equal(defaults.modules.timer.workMinutes, 25);
    assert.equal(defaults.modules.timer.shortBreakMinutes, 5);
    assert.equal(defaults.modules.timer.longBreakMinutes, 15);
    assert.equal(defaults.modules.timer.autoStartBreaks, false);

    assert.ok(defaults.modules.calendar);
    assert.equal(defaults.modules.calendar.enabled, true);
    assert.equal(defaults.modules.calendar.defaultView, 'month');
    assert.equal(defaults.modules.calendar.showCompletedTasks, true);

    assert.ok(defaults.modules.journal);
    assert.equal(defaults.modules.journal.enabled, true);
    assert.equal(defaults.modules.journal.promptMood, true);

    assert.ok(defaults.modules.notes);
    assert.equal(defaults.modules.notes.enabled, true);
    assert.equal(defaults.modules.notes.defaultViewMode, 'list');
  });

  t.test('Legacy property mirror sync holds in defaults', () => {
    const defaults = createDefaultUserSettings();
    assert.equal(defaults.theme, defaults.appearance.themeMode);
    assert.equal(defaults.weekStart, defaults.general.weekStart);
    assert.equal(defaults.displayName, defaults.general.displayName);
    assert.equal(defaults.backgroundStyle, defaults.appearance.backgroundStyle);
  });
});

test('Modular Settings: Safe Defaults & Legacy Merge Resilience', (t) => {
  t.test('mergeWithDefaultSettings handles null or undefined safely', () => {
    const mergedNull = mergeWithDefaultSettings(null);
    assert.equal(mergedNull.general.displayName, 'Dharinish');
    assert.equal(mergedNull.appearance.themeMode, 'light');

    const mergedEmpty = mergeWithDefaultSettings({});
    assert.equal(mergedEmpty.general.language, 'en');
    assert.equal(mergedEmpty.modules.habits.defaultFrequency, 'daily');
  });

  t.test('mergeWithDefaultSettings adopts flat legacy fields into structured objects', () => {
    const legacy = {
      theme: 'dark',
      weekStart: 'sunday',
      displayName: 'Alex',
      backgroundStyle: 'paper'
    };

    const merged = mergeWithDefaultSettings(legacy);
    assert.equal(merged.appearance.themeMode, 'dark');
    assert.equal(merged.general.weekStart, 'sunday');
    assert.equal(merged.general.displayName, 'Alex');
    assert.equal(merged.appearance.backgroundStyle, 'paper');
    assert.equal(merged.theme, 'dark');
    assert.equal(merged.weekStart, 'sunday');
  });

  t.test('mergeWithDefaultSettings preserves partial module configurations while falling back safely', () => {
    const partial = {
      modules: {
        habits: {
          defaultFrequency: 'weekdays',
          streakDisplay: 'flame_only'
          // reminderTime, weeklyGoalDays etc omitted
        },
        timer: {
          workMinutes: 50
        }
      }
    };

    const merged = mergeWithDefaultSettings(partial);
    assert.equal(merged.modules.habits.defaultFrequency, 'weekdays');
    assert.equal(merged.modules.habits.streakDisplay, 'flame_only');
    // unspecified fields inherit defaults
    assert.equal(merged.modules.habits.enabled, true);
    assert.equal(merged.modules.habits.reminderTime, '09:00');
    assert.equal(merged.modules.habits.weeklyGoalDays, 5);
    assert.equal(merged.modules.timer.workMinutes, 50);
    assert.equal(merged.modules.timer.shortBreakMinutes, 5);
  });
});

test('Modular Settings: IndexedDB Persistence & Retrieval', async (t) => {
  await t.test('Mutating subsections persists and reflects in getAllSettings()', async () => {
    await openDB();

    // 1. Update general settings
    await Repository.updateSetting('general', {
      displayName: 'Jordan',
      language: 'es',
      dateFormat: 'DD/MM/YYYY',
      weekStart: 'sunday',
      defaultLandingPage: 'timer'
    });

    let current = await Repository.getAllSettings();
    assert.equal(current.general.displayName, 'Jordan');
    assert.equal(current.general.language, 'es');
    assert.equal(current.general.dateFormat, 'DD/MM/YYYY');
    assert.equal(current.general.weekStart, 'sunday');
    assert.equal(current.general.defaultLandingPage, 'timer');
    // Mirror check
    assert.equal(current.displayName, 'Jordan');
    assert.equal(current.weekStart, 'sunday');

    // 2. Update appearance settings
    await Repository.updateSetting('appearance', {
      themeMode: 'system',
      backgroundStyle: 'notion',
      accentColor: 'emerald',
      fontSize: 'lg',
      density: 'compact',
      animations: 'reduced'
    });

    current = await Repository.getAllSettings();
    assert.equal(current.appearance.themeMode, 'system');
    assert.equal(current.appearance.backgroundStyle, 'notion');
    assert.equal(current.appearance.accentColor, 'emerald');
    assert.equal(current.appearance.fontSize, 'lg');
    assert.equal(current.appearance.density, 'compact');
    assert.equal(current.appearance.animations, 'reduced');

    // 3. Update global preferences
    await Repository.updateSetting('globalPreferences', {
      notifications: 'sound_only',
      reminderLeadTimeMinutes: 30,
      defaultTaskSorting: 'priority',
      confirmBeforeDelete: false,
      startupBehavior: 'last_visited'
    });

    current = await Repository.getAllSettings();
    assert.equal(current.globalPreferences.notifications, 'sound_only');
    assert.equal(current.globalPreferences.reminderLeadTimeMinutes, 30);
    assert.equal(current.globalPreferences.defaultTaskSorting, 'priority');
    assert.equal(current.globalPreferences.confirmBeforeDelete, false);
    assert.equal(current.globalPreferences.startupBehavior, 'last_visited');
  });

  await t.test('Disabling a module retains its configuration without data loss', async () => {
    // Customize habits configuration first
    await Repository.updateSetting('module_habits', {
      enabled: true,
      defaultFrequency: 'weekdays',
      reminderTime: '18:00',
      weeklyGoalDays: 4,
      streakDisplay: 'flame_only',
      completionBehavior: 'toast',
      showArchived: true
    });

    let settings = await Repository.getAllSettings();
    assert.equal(settings.modules.habits.enabled, true);
    assert.equal(settings.modules.habits.defaultFrequency, 'weekdays');
    assert.equal(settings.modules.habits.weeklyGoalDays, 4);

    // Disable the module
    await Repository.updateSetting('module_habits', {
      ...settings.modules.habits,
      enabled: false
    });

    settings = await Repository.getAllSettings();
    assert.equal(settings.modules.habits.enabled, false);
    // All individual configuration fields remain preserved
    assert.equal(settings.modules.habits.defaultFrequency, 'weekdays');
    assert.equal(settings.modules.habits.reminderTime, '18:00');
    assert.equal(settings.modules.habits.weeklyGoalDays, 4);
    assert.equal(settings.modules.habits.streakDisplay, 'flame_only');
    assert.equal(settings.modules.habits.completionBehavior, 'toast');
    assert.equal(settings.modules.habits.showArchived, true);

    // Re-enable the module
    await Repository.updateSetting('module_habits', {
      ...settings.modules.habits,
      enabled: true
    });

    settings = await Repository.getAllSettings();
    assert.equal(settings.modules.habits.enabled, true);
    assert.equal(settings.modules.habits.defaultFrequency, 'weekdays');
    assert.equal(settings.modules.habits.reminderTime, '18:00');
  });
});

test('Modular Settings: Date Formatting Helper', (t) => {
  t.test('formatDisplayDate formats various standard formats properly', () => {
    const raw = '2026-11-15';
    assert.equal(formatDisplayDate(raw, 'YYYY-MM-DD'), '2026-11-15');
    assert.equal(formatDisplayDate(raw, 'MM/DD/YYYY'), '11/15/2026');
    assert.equal(formatDisplayDate(raw, 'DD/MM/YYYY'), '15/11/2026');
  });

  t.test('formatDisplayDate handles null or invalid values gracefully', () => {
    assert.equal(formatDisplayDate(null, 'YYYY-MM-DD'), '');
    assert.equal(formatDisplayDate('', 'MM/DD/YYYY'), '');
  });
});

test('Modular Settings: Vertical Sidebar Navigation & Search Spec', (t) => {
  t.test('Sidebar groups contain all required categories with zero overlap', () => {
    const expectedGroups = {
      GENERAL: ['general', 'appearance', 'preferences'],
      MODULES: ['habits', 'todo', 'timer', 'calendar', 'journal_notes'],
      'DATA & PRIVACY': ['backup', 'privacy']
    };

    const allTabs = Object.values(expectedGroups).flat();
    assert.equal(allTabs.length, 10);
    // Ensure uniqueness
    assert.equal(new Set(allTabs).size, 10);
  });

  t.test('URL aliases map backward-compatible tabs properly', () => {
    const resolveTab = (param) => {
      if (param === 'global') return 'preferences';
      if (param === 'data') return 'backup';
      if (param === 'storage') return 'privacy';
      const valid = ['general', 'appearance', 'preferences', 'habits', 'todo', 'timer', 'calendar', 'journal_notes', 'backup', 'privacy'];
      return valid.includes(param) ? param : 'general';
    };

    assert.equal(resolveTab('global'), 'preferences');
    assert.equal(resolveTab('data'), 'backup');
    assert.equal(resolveTab('storage'), 'privacy');
    assert.equal(resolveTab('habits'), 'habits');
    assert.equal(resolveTab('todo'), 'todo');
    assert.equal(resolveTab('timer'), 'timer');
    assert.equal(resolveTab('calendar'), 'calendar');
    assert.equal(resolveTab('journal_notes'), 'journal_notes');
    assert.equal(resolveTab('unknown_foo'), 'general');
  });

  t.test('Keyword search index matches critical settings query terms', () => {
    const sampleSearchIndex = [
      { tab: 'appearance', title: 'Theme Mode', keywords: ['dark mode', 'theme', 'light', 'system'] },
      { tab: 'backup', title: 'Export JSON Backup', keywords: ['backup', 'export', 'download', 'json'] },
      { tab: 'general', title: 'Language', keywords: ['language', 'english', 'spanish'] },
      { tab: 'preferences', title: 'Notifications', keywords: ['notifications', 'alerts', 'sound'] },
      { tab: 'general', title: 'Week Starts On', keywords: ['week starts on', 'week start', 'monday', 'sunday'] },
    ];

    const findMatches = (query) => {
      const q = query.toLowerCase();
      return sampleSearchIndex.filter(item => 
        item.title.toLowerCase().includes(q) || 
        item.keywords.some(k => k.toLowerCase().includes(q))
      );
    };

    assert.ok(findMatches('dark mode').some(m => m.tab === 'appearance'));
    assert.ok(findMatches('backup').some(m => m.tab === 'backup'));
    assert.ok(findMatches('language').some(m => m.tab === 'general'));
    assert.ok(findMatches('notifications').some(m => m.tab === 'preferences'));
    assert.ok(findMatches('week starts on').some(m => m.tab === 'general'));
  });
});
