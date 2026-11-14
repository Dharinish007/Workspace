import {
  UserSettings,
  GeneralSettings,
  AppearanceSettings,
  GlobalPreferences,
  ModuleSettingsMap,
  HabitsModuleSettings,
  TodoModuleSettings,
  FocusTimerModuleSettings,
  CalendarModuleSettings,
  JournalModuleSettings,
  NotesModuleSettings,
} from '../types/settings';

export const DEFAULT_GENERAL_SETTINGS: GeneralSettings = {
  displayName: 'Dharinish',
  language: 'en',
  dateFormat: 'YYYY-MM-DD',
  weekStart: 'monday',
  defaultLandingPage: 'dashboard',
};

export const DEFAULT_APPEARANCE_SETTINGS: AppearanceSettings = {
  themeId: 'minimal-light',
  themeStyle: 'minimal',
  themeMode: 'light',
  backgroundStyle: 'current',
  accentColor: 'blue',
  fontSize: 'md',
  density: 'comfortable',
  animations: 'full',
};

export const DEFAULT_GLOBAL_PREFERENCES: GlobalPreferences = {
  notifications: 'enabled',
  reminderLeadTimeMinutes: 15,
  defaultTaskSorting: 'order',
  confirmBeforeDelete: true,
  startupBehavior: 'landing_page',
};

export const DEFAULT_HABITS_SETTINGS: HabitsModuleSettings = {
  enabled: true,
  defaultFrequency: 'daily',
  reminderTime: '09:00',
  weeklyGoalDays: 5,
  streakDisplay: 'badge',
  completionBehavior: 'confetti',
  showArchived: false,
};

export const DEFAULT_TODO_SETTINGS: TodoModuleSettings = {
  enabled: true,
  defaultPriority: 'medium',
  defaultDueDate: 'none',
  defaultSort: 'order',
  completedVisibility: 'show',
  recurringBehavior: 'create_next',
  enableReminders: true,
};

export const DEFAULT_TIMER_SETTINGS: FocusTimerModuleSettings = {
  enabled: true,
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakInterval: 4,
  dailyGoalMinutes: null,
  autoStartBreaks: false,
  autoStartWork: false,
  soundTheme: 'bell',
  sessionTracking: 'auto_save',
};

export const DEFAULT_CALENDAR_SETTINGS: CalendarModuleSettings = {
  enabled: true,
  defaultView: 'month',
  showCompletedTasks: true,
  defaultEventDuration: 30,
};

export const DEFAULT_JOURNAL_SETTINGS: JournalModuleSettings = {
  enabled: true,
  promptMood: true,
  defaultTags: ['daily'],
  autoSaveDelayMs: 1000,
};

export const DEFAULT_NOTES_SETTINGS: NotesModuleSettings = {
  enabled: true,
  defaultViewMode: 'list',
  defaultSort: 'recent',
  previewMarkdown: true,
};

export const DEFAULT_MODULE_SETTINGS: ModuleSettingsMap = {
  habits: DEFAULT_HABITS_SETTINGS,
  todo: DEFAULT_TODO_SETTINGS,
  timer: DEFAULT_TIMER_SETTINGS,
  calendar: DEFAULT_CALENDAR_SETTINGS,
  journal: DEFAULT_JOURNAL_SETTINGS,
  notes: DEFAULT_NOTES_SETTINGS,
};

export function createDefaultUserSettings(): UserSettings {
  return {
    theme: 'light',
    displayName: 'Dharinish',
    weekStart: 'monday',
    lastBackup: null,
    habitDefaultColor: '#1A73E8',
    eventDefaultColor: '#F97316',
    backgroundStyle: 'current',
    themeStyle: 'minimal',
    timerConfig: {
      workMinutes: 25,
      shortBreakMinutes: 5,
      longBreakMinutes: 15,
      longBreakInterval: 4,
      dailyGoalMinutes: null,
    },
    general: { ...DEFAULT_GENERAL_SETTINGS },
    appearance: { ...DEFAULT_APPEARANCE_SETTINGS },
    globalPreferences: { ...DEFAULT_GLOBAL_PREFERENCES },
    modules: {
      habits: { ...DEFAULT_HABITS_SETTINGS },
      todo: { ...DEFAULT_TODO_SETTINGS },
      timer: { ...DEFAULT_TIMER_SETTINGS },
      calendar: { ...DEFAULT_CALENDAR_SETTINGS },
      journal: { ...DEFAULT_JOURNAL_SETTINGS },
      notes: { ...DEFAULT_NOTES_SETTINGS },
    },
  };
}

export function mergeWithDefaultSettings(raw: Partial<UserSettings> | Record<string, any> | undefined): UserSettings {
  const defaults = createDefaultUserSettings();
  if (!raw || typeof raw !== 'object') {
    return defaults;
  }

  // Preserve legacy top-level values if present
  const theme = raw.theme === 'dark' ? 'dark' : (raw.theme === 'light' ? 'light' : defaults.theme);
  const displayName = typeof raw.displayName === 'string' && raw.displayName.trim() ? raw.displayName : defaults.displayName;
  const weekStart = raw.weekStart === 'sunday' ? 'sunday' : 'monday';
  const backgroundStyle = raw.backgroundStyle || defaults.backgroundStyle;
  const lastBackup = raw.lastBackup ?? null;

  // General settings
  const rawGeneral = (raw.general && typeof raw.general === 'object') ? raw.general : {};
  const general: GeneralSettings = {
    displayName: rawGeneral.displayName || displayName,
    language: ['en', 'es', 'fr', 'de'].includes(rawGeneral.language) ? rawGeneral.language : defaults.general.language,
    dateFormat: ['YYYY-MM-DD', 'MM/DD/YYYY', 'DD/MM/YYYY'].includes(rawGeneral.dateFormat) ? rawGeneral.dateFormat : defaults.general.dateFormat,
    weekStart: rawGeneral.weekStart === 'sunday' ? 'sunday' : weekStart,
    defaultLandingPage: ['dashboard', 'tasks', 'calendar', 'habits', 'journal', 'notes', 'timer'].includes(rawGeneral.defaultLandingPage)
      ? rawGeneral.defaultLandingPage
      : defaults.general.defaultLandingPage,
  };

  // Appearance settings
  const rawAppearance = (raw.appearance && typeof raw.appearance === 'object') ? raw.appearance : {};
  const effectiveBgStyle = ['current', 'minimal', 'paper', 'notion'].includes(rawAppearance.backgroundStyle)
    ? rawAppearance.backgroundStyle
    : (['current', 'minimal', 'paper', 'notion'].includes(backgroundStyle) ? backgroundStyle : 'current');
  const rawStyle = rawAppearance.themeStyle || (effectiveBgStyle === 'paper' ? 'paper' : effectiveBgStyle === 'notion' ? 'notion' : 'minimal');
  const themeStyle = ['minimal', 'paper', 'notion'].includes(rawStyle) ? rawStyle : 'minimal';
  const themeMode = ['light', 'dark', 'system'].includes(rawAppearance.themeMode) ? rawAppearance.themeMode : (theme as any);
  const themeId = rawAppearance.themeId || `${themeStyle}-${themeMode === 'dark' ? 'dark' : 'light'}`;

  const appearance: AppearanceSettings = {
    themeId,
    themeStyle,
    themeMode,
    backgroundStyle: effectiveBgStyle,
    accentColor: ['blue', 'indigo', 'violet', 'emerald', 'rose', 'amber'].includes(rawAppearance.accentColor) ? rawAppearance.accentColor : defaults.appearance.accentColor,
    fontSize: ['sm', 'md', 'lg'].includes(rawAppearance.fontSize) ? rawAppearance.fontSize : defaults.appearance.fontSize,
    density: ['comfortable', 'compact'].includes(rawAppearance.density) ? rawAppearance.density : defaults.appearance.density,
    animations: ['full', 'reduced', 'none'].includes(rawAppearance.animations) ? rawAppearance.animations : defaults.appearance.animations,
  };

  // Global Preferences
  const rawGlobal = (raw.globalPreferences && typeof raw.globalPreferences === 'object') ? raw.globalPreferences : {};
  const globalPreferences: GlobalPreferences = {
    notifications: ['enabled', 'sound_only', 'disabled'].includes(rawGlobal.notifications) ? rawGlobal.notifications : defaults.globalPreferences.notifications,
    reminderLeadTimeMinutes: typeof rawGlobal.reminderLeadTimeMinutes === 'number' ? rawGlobal.reminderLeadTimeMinutes : defaults.globalPreferences.reminderLeadTimeMinutes,
    defaultTaskSorting: ['order', 'dueDate', 'priority', 'title'].includes(rawGlobal.defaultTaskSorting) ? rawGlobal.defaultTaskSorting : defaults.globalPreferences.defaultTaskSorting,
    confirmBeforeDelete: typeof rawGlobal.confirmBeforeDelete === 'boolean' ? rawGlobal.confirmBeforeDelete : defaults.globalPreferences.confirmBeforeDelete,
    startupBehavior: ['landing_page', 'last_visited'].includes(rawGlobal.startupBehavior) ? rawGlobal.startupBehavior : defaults.globalPreferences.startupBehavior,
  };

  // Module settings
  const anyRaw = (raw as Record<string, any>) || {};
  const rawModules = (anyRaw.modules && typeof anyRaw.modules === 'object') ? anyRaw.modules : {};
  const rawHabits = rawModules.habits || anyRaw.module_habits || {};
  const rawTodo = rawModules.todo || anyRaw.module_todo || {};
  const rawTimer = rawModules.timer || anyRaw.module_timer || anyRaw.timerConfig || {};
  const rawCalendar = rawModules.calendar || anyRaw.module_calendar || {};
  const rawJournal = rawModules.journal || anyRaw.module_journal || {};
  const rawNotes = rawModules.notes || anyRaw.module_notes || {};

  const modules: ModuleSettingsMap = {
    habits: {
      ...DEFAULT_HABITS_SETTINGS,
      ...rawHabits,
    },
    todo: {
      ...DEFAULT_TODO_SETTINGS,
      ...rawTodo,
    },
    timer: {
      ...DEFAULT_TIMER_SETTINGS,
      ...rawTimer,
    },
    calendar: {
      ...DEFAULT_CALENDAR_SETTINGS,
      ...rawCalendar,
    },
    journal: {
      ...DEFAULT_JOURNAL_SETTINGS,
      ...rawJournal,
    },
    notes: {
      ...DEFAULT_NOTES_SETTINGS,
      ...rawNotes,
    },
  };

  return {
    theme: appearance.themeMode === 'dark' ? 'dark' : 'light',
    displayName: general.displayName,
    weekStart: general.weekStart,
    lastBackup,
    habitDefaultColor: raw.habitDefaultColor || defaults.habitDefaultColor,
    eventDefaultColor: raw.eventDefaultColor || defaults.eventDefaultColor,
    backgroundStyle: appearance.backgroundStyle,
    themeStyle: appearance.themeStyle,
    timerConfig: {
      workMinutes: modules.timer.workMinutes,
      shortBreakMinutes: modules.timer.shortBreakMinutes,
      longBreakMinutes: modules.timer.longBreakMinutes,
      longBreakInterval: modules.timer.longBreakInterval,
      dailyGoalMinutes: modules.timer.dailyGoalMinutes,
    },
    general,
    appearance,
    globalPreferences,
    modules,
  };
}

