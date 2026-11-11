export type BackgroundStyle = 'current' | 'paper' | 'notion';

// 1. General Preferences
export type SupportedLanguage = 'en' | 'es' | 'fr' | 'de';
export type DateFormatOption = 'YYYY-MM-DD' | 'MM/DD/YYYY' | 'DD/MM/YYYY';
export type LandingPageOption = 'dashboard' | 'tasks' | 'calendar' | 'habits' | 'journal' | 'notes' | 'timer';

export interface GeneralSettings {
  displayName: string;
  language: SupportedLanguage;
  dateFormat: DateFormatOption;
  weekStart: 'monday' | 'sunday';
  defaultLandingPage: LandingPageOption;
}

// 2. Appearance Preferences
export type ThemeMode = 'light' | 'dark' | 'system';
export type AccentColor = 'blue' | 'indigo' | 'violet' | 'emerald' | 'rose' | 'amber';
export type FontSizeOption = 'sm' | 'md' | 'lg';
export type LayoutDensity = 'comfortable' | 'compact';
export type AnimationPreference = 'full' | 'reduced' | 'none';

export interface AppearanceSettings {
  themeMode: ThemeMode;
  backgroundStyle: BackgroundStyle;
  accentColor: AccentColor;
  fontSize: FontSizeOption;
  density: LayoutDensity;
  animations: AnimationPreference;
}

// 3. Global Behavioural Preferences
export type NotificationPreference = 'enabled' | 'sound_only' | 'disabled';
export type TaskSortOption = 'order' | 'dueDate' | 'priority' | 'title';
export type StartupBehavior = 'landing_page' | 'last_visited';

export interface GlobalPreferences {
  notifications: NotificationPreference;
  reminderLeadTimeMinutes: number; // 5, 15, 30, 60
  defaultTaskSorting: TaskSortOption;
  confirmBeforeDelete: boolean;
  startupBehavior: StartupBehavior;
}

// 4. Module-Specific Settings
export interface HabitsModuleSettings {
  enabled: boolean;
  defaultFrequency: 'daily' | 'weekdays';
  reminderTime: string; // e.g. "09:00"
  weeklyGoalDays: number; // 1-7
  streakDisplay: 'badge' | 'flame_only' | 'hidden';
  completionBehavior: 'confetti' | 'toast' | 'none';
  showArchived: boolean;
}

export interface TodoModuleSettings {
  enabled: boolean;
  defaultPriority: 'low' | 'medium' | 'high';
  defaultDueDate: 'none' | 'today' | 'tomorrow';
  defaultSort: 'order' | 'priority' | 'dueDate' | 'title';
  completedVisibility: 'show' | 'hide' | 'bottom';
  recurringBehavior: 'create_next' | 'keep_completed';
  enableReminders: boolean;
}

export interface FocusTimerModuleSettings {
  enabled: boolean;
  workMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  longBreakInterval: number;
  dailyGoalMinutes: number | null;
  autoStartBreaks: boolean;
  autoStartWork: boolean;
  soundTheme: 'bell' | 'digital' | 'chime' | 'silent';
  sessionTracking: 'auto_save' | 'prompt';
}

export interface CalendarModuleSettings {
  enabled: boolean;
  defaultView: 'month' | 'week' | 'day';
  showCompletedTasks: boolean;
  defaultEventDuration: number; // minutes
}

export interface JournalModuleSettings {
  enabled: boolean;
  promptMood: boolean;
  defaultTags: string[];
  autoSaveDelayMs: number;
}

export interface NotesModuleSettings {
  enabled: boolean;
  defaultViewMode: 'list' | 'grid';
  defaultSort: 'recent' | 'oldest' | 'title-asc' | 'title-desc';
  previewMarkdown: boolean;
}

export interface ModuleSettingsMap {
  habits: HabitsModuleSettings;
  todo: TodoModuleSettings;
  timer: FocusTimerModuleSettings;
  calendar: CalendarModuleSettings;
  journal: JournalModuleSettings;
  notes: NotesModuleSettings;
}

export interface TimerSettingsConfig {
  workMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  longBreakInterval: number;
  dailyGoalMinutes: number | null;
}

// Unified UserSettings interface maintaining full legacy compatibility while providing modular separation
export interface UserSettings {
  // Legacy top-level keys
  theme: 'light' | 'dark';
  displayName: string;
  weekStart: 'monday' | 'sunday';
  lastBackup: string | null;
  habitDefaultColor?: string;
  eventDefaultColor?: string;
  backgroundStyle?: BackgroundStyle;
  timerConfig?: TimerSettingsConfig;

  // Modern structured preferences & module settings
  general: GeneralSettings;
  appearance: AppearanceSettings;
  globalPreferences: GlobalPreferences;
  modules: ModuleSettingsMap;
}

