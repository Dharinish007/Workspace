import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Repository } from '../../db/repository';
import { TimerRepository } from '../../features/timer/repository/timerRepository';
import { 
  Download, 
  Upload, 
  ShieldAlert, 
  ShieldCheck,
  User, 
  Database, 
  Check, 
  AlertTriangle,
  Sparkles,
  RotateCcw,
  Palette,
  Sun,
  Moon,
  Laptop,
  Timer,
  Sliders,
  SlidersHorizontal,
  Globe,
  Flame,
  CheckSquare,
  Calendar,
  BookOpen,
  FileText,
  Bell,
  Volume2,
  Type,
  Layout,
  Zap,
  HelpCircle,
  Search,
  X,
  ChevronRight,
  HardDrive,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { loadDemoData, resetToDefaultWorkspace } from '../../data';
import { 
  ThemeMode, 
  AccentColor, 
  FontSizeOption, 
  LayoutDensity, 
  AnimationPreference,
  SupportedLanguage,
  DateFormatOption,
  LandingPageOption,
  NotificationPreference,
  TaskSortOption,
  StartupBehavior
} from '../../types/settings';

export type SettingsTab = 
  | 'general' 
  | 'appearance' 
  | 'preferences' 
  | 'habits' 
  | 'todo' 
  | 'timer' 
  | 'calendar' 
  | 'journal_notes' 
  | 'backup' 
  | 'privacy';

interface SettingsCategory {
  id: SettingsTab;
  label: string;
  icon: React.FC<{ className?: string }>;
  description: string;
}

interface SettingsGroup {
  id: string;
  title: string;
  items: SettingsCategory[];
}

const SETTINGS_GROUPS: SettingsGroup[] = [
  {
    id: 'general_group',
    title: 'GENERAL',
    items: [
      {
        id: 'general',
        label: 'General',
        icon: Sliders,
        description: 'Display name, language, date format, week start, and landing page.',
      },
      {
        id: 'appearance',
        label: 'Appearance',
        icon: Palette,
        description: 'Theme mode, textures, accent colors, font size, density, and motion.',
      },
      {
        id: 'preferences',
        label: 'Preferences',
        icon: SlidersHorizontal,
        description: 'Notifications, reminder lead times, task sorting, and deletion confirmation.',
      },
    ],
  },
  {
    id: 'modules_group',
    title: 'MODULES',
    items: [
      {
        id: 'habits',
        label: 'Habits',
        icon: Flame,
        description: 'Frequency defaults, reminder schedule, weekly goals, streak display, and archiving.',
      },
      {
        id: 'todo',
        label: 'To-Do',
        icon: CheckSquare,
        description: 'Default priority, due dates, sorting order, completed visibility, and recurring behavior.',
      },
      {
        id: 'timer',
        label: 'Focus Timer',
        icon: Timer,
        description: 'Focus durations, short and long breaks, daily goals, auto-start, and sound themes.',
      },
      {
        id: 'calendar',
        label: 'Calendar',
        icon: Calendar,
        description: 'Default calendar view mode, completed task overlays, and default event durations.',
      },
      {
        id: 'journal_notes',
        label: 'Journal & Notes',
        icon: BookOpen,
        description: 'Daily mood prompt, default entry tags, editor autosave cadence, and markdown preview.',
      },
    ],
  },
  {
    id: 'data_group',
    title: 'DATA & PRIVACY',
    items: [
      {
        id: 'backup',
        label: 'Backup & Restore',
        icon: Download,
        description: 'JSON snapshots, full backup export, data import, and test seeders.',
      },
      {
        id: 'privacy',
        label: 'Privacy & Storage',
        icon: ShieldCheck,
        description: 'Local-first offline architecture, IndexedDB quota metrics, and database purge.',
      },
    ],
  },
];

// Flat list of all categories for quick lookups
const ALL_CATEGORIES: SettingsCategory[] = SETTINGS_GROUPS.flatMap(g => g.items);

// Search Index for local keyword lookup
interface SearchableSetting {
  id: string;
  tab: SettingsTab;
  category: string;
  title: string;
  description: string;
  keywords: string[];
}

const SETTINGS_SEARCH_INDEX: SearchableSetting[] = [
  { id: 'gen_name', tab: 'general', category: 'General', title: 'Display Name', description: 'Your profile display name across greetings and headers', keywords: ['name', 'display', 'profile', 'user'] },
  { id: 'gen_lang', tab: 'general', category: 'General', title: 'Language', description: 'Select interface language (English, Spanish, French, German)', keywords: ['language', 'english', 'spanish', 'french', 'german', 'locale'] },
  { id: 'gen_date', tab: 'general', category: 'General', title: 'Date Format', description: 'Standard date display format (YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY)', keywords: ['date', 'format', 'date format', 'calendar'] },
  { id: 'gen_week', tab: 'general', category: 'General', title: 'Week Starts On', description: 'First day of the week (Monday or Sunday) for calendars and habit grids', keywords: ['week starts on', 'week start', 'monday', 'sunday', 'calendar'] },
  { id: 'gen_landing', tab: 'general', category: 'General', title: 'Default Landing Page', description: 'Initial page loaded upon opening workspace (Dashboard, Tasks, Calendar, Habits, etc.)', keywords: ['landing page', 'startup', 'home', 'default page', 'dashboard'] },

  { id: 'app_mode', tab: 'appearance', category: 'Appearance', title: 'Theme Mode', description: 'Switch between Light, Dark, or System mode', keywords: ['theme mode', 'dark mode', 'light mode', 'system theme', 'color scheme'] },
  { id: 'app_style', tab: 'appearance', category: 'Appearance', title: 'UI Theme Style', description: 'Choose between Modern Current, Warm Textured Paper, or Notion aesthetic', keywords: ['style', 'paper', 'texture', 'notion', 'aesthetic', 'theme'] },
  { id: 'app_accent', tab: 'appearance', category: 'Appearance', title: 'Accent Color', description: 'Primary brand accent: Blue, Indigo, Violet, Emerald, Rose, Amber', keywords: ['accent color', 'accent', 'color', 'blue', 'indigo', 'violet', 'emerald', 'rose', 'amber'] },
  { id: 'app_font', tab: 'appearance', category: 'Appearance', title: 'Font Size', description: 'Scale text typography between Small (13px), Medium (14px), and Large (15px)', keywords: ['font size', 'text size', 'font', 'typography', 'scale'] },
  { id: 'app_density', tab: 'appearance', category: 'Appearance', title: 'Layout Density', description: 'Padding and row spacing (Comfortable or Compact)', keywords: ['layout density', 'density', 'compact', 'comfortable', 'spacing', 'padding'] },
  { id: 'app_anim', tab: 'appearance', category: 'Appearance', title: 'Animation Preferences', description: 'Control animations and motion (Full, Reduced, or None)', keywords: ['animations', 'motion', 'reduced motion', 'transitions', 'framer'] },

  { id: 'pref_notif', tab: 'preferences', category: 'Preferences', title: 'Notifications', description: 'Application alert delivery: Enabled, Sound Only, or Disabled', keywords: ['notifications', 'alerts', 'sound', 'reminders'] },
  { id: 'pref_lead', tab: 'preferences', category: 'Preferences', title: 'Reminder Lead Time', description: 'Advance notice for scheduled tasks and events (5m, 15m, 30m, 60m)', keywords: ['reminder lead time', 'reminders', 'lead time', 'minutes', 'alerts'] },
  { id: 'pref_sort', tab: 'preferences', category: 'Preferences', title: 'Default Task Sorting', description: 'Default sorting order for tasks across the workspace', keywords: ['task sorting', 'sort', 'priority', 'due date', 'title', 'order'] },
  { id: 'pref_confirm', tab: 'preferences', category: 'Preferences', title: 'Confirmation Preferences', description: 'Prompt for confirmation before permanent record deletions', keywords: ['confirmation preferences', 'confirm delete', 'safety', 'confirmation', 'trash'] },
  { id: 'pref_start', tab: 'preferences', category: 'Preferences', title: 'Startup Behaviour', description: 'Open default landing page or restore last visited screen route', keywords: ['startup behaviour', 'startup', 'last visited', 'resume', 'route'] },

  { id: 'hab_enable', tab: 'habits', category: 'Habits', title: 'Habits Module Toggle', description: 'Enable or disable the habit tracker module in navigation', keywords: ['habits module', 'enable habits', 'disable habits'] },
  { id: 'hab_freq', tab: 'habits', category: 'Habits', title: 'Default Habit Frequency', description: 'Initial frequency for new habits (Daily or Weekdays)', keywords: ['habit frequency', 'daily', 'weekdays', 'habits schedule'] },
  { id: 'hab_rem', tab: 'habits', category: 'Habits', title: 'Daily Reminder Time', description: 'Set daily reminder schedule for habit tracking check-ins', keywords: ['reminder time', 'habit reminder', 'habits schedule'] },
  { id: 'hab_goal', tab: 'habits', category: 'Habits', title: 'Weekly Goals', description: 'Default target completed days per week (1 to 7)', keywords: ['weekly goals', 'goal days', 'target', 'habits'] },
  { id: 'hab_streak', tab: 'habits', category: 'Habits', title: 'Streak Display Style', description: 'Show streak badges with day count, flame icon only, or hidden', keywords: ['streak display', 'streak', 'flame', 'badge', 'habits streak'] },
  { id: 'hab_comp', tab: 'habits', category: 'Habits', title: 'Completion Behavior', description: 'Celebration confetti animation, toast message, or subtle check', keywords: ['completion behavior', 'confetti', 'reaction', 'toast', 'habits'] },
  { id: 'hab_arch', tab: 'habits', category: 'Habits', title: 'Archived Habits Visibility', description: 'Show or hide archived habits in tables and card views', keywords: ['archived habits', 'show archived', 'habits archive'] },

  { id: 'todo_enable', tab: 'todo', category: 'To-Do', title: 'To-Do Module Toggle', description: 'Enable or disable the to-do list module in navigation', keywords: ['todo module', 'enable todo', 'tasks module'] },
  { id: 'todo_prio', tab: 'todo', category: 'To-Do', title: 'Default Task Priority', description: 'Default priority (Low, Medium, High) for new tasks', keywords: ['default priority', 'task priority', 'priority', 'high priority'] },
  { id: 'todo_due', tab: 'todo', category: 'To-Do', title: 'Default Due Date', description: 'Default due date (None, Today, Tomorrow) for new tasks', keywords: ['default due date', 'due date', 'today', 'tomorrow', 'tasks'] },
  { id: 'todo_sort', tab: 'todo', category: 'To-Do', title: 'Task Sorting', description: 'Sorting order for task items within pages (Manual, Due date, Priority, Title)', keywords: ['task sorting', 'todo sorting', 'order', 'due date', 'priority'] },
  { id: 'todo_vis', tab: 'todo', category: 'To-Do', title: 'Completed Task Visibility', description: 'Show, hide, or move completed tasks to bottom of list', keywords: ['completed task visibility', 'hide completed', 'show completed', 'bottom'] },
  { id: 'todo_rec', tab: 'todo', category: 'To-Do', title: 'Recurring Task Behavior', description: 'Create next occurrence immediately upon check-off or keep completed', keywords: ['recurring task behavior', 'recurring', 'repeat', 'tasks'] },

  { id: 'tim_enable', tab: 'timer', category: 'Focus Timer', title: 'Focus Timer Module Toggle', description: 'Enable or disable the focus timer module in navigation', keywords: ['focus timer', 'timer module', 'pomodoro'] },
  { id: 'tim_dur', tab: 'timer', category: 'Focus Timer', title: 'Focus Duration', description: 'Planned duration for work and focus sessions (15 to 60 minutes)', keywords: ['focus duration', 'pomodoro duration', 'work duration', 'minutes', '25'] },
  { id: 'tim_break', tab: 'timer', category: 'Focus Timer', title: 'Short & Long Break Durations', description: 'Rest periods between focus sessions (3-10m short, 10-30m long)', keywords: ['breaks', 'short break', 'long break', 'break duration', 'rest'] },
  { id: 'tim_auto', tab: 'timer', category: 'Focus Timer', title: 'Auto-Start Preferences', description: 'Automatically start breaks or next work block when timer expires', keywords: ['auto-start', 'auto start breaks', 'auto start work', 'pomodoro'] },
  { id: 'tim_sound', tab: 'timer', category: 'Focus Timer', title: 'Sound Theme', description: 'Chime, digital beep, classic bell, or silent timer notifications', keywords: ['sound theme', 'timer sound', 'bell', 'chime', 'audio', 'volume'] },

  { id: 'cal_enable', tab: 'calendar', category: 'Calendar', title: 'Calendar Module Toggle', description: 'Enable or disable the calendar module in navigation', keywords: ['calendar module', 'enable calendar'] },
  { id: 'cal_view', tab: 'calendar', category: 'Calendar', title: 'Default Calendar View', description: 'Initial view mode for the calendar (Month, Week, Day)', keywords: ['default calendar view', 'calendar view', 'month view', 'week view', 'day view'] },
  { id: 'cal_comp', tab: 'calendar', category: 'Calendar', title: 'Show Completed Tasks', description: 'Overlay completed tasks on calendar day cells', keywords: ['show completed tasks', 'calendar completed', 'tasks on calendar'] },
  { id: 'cal_dur', tab: 'calendar', category: 'Calendar', title: 'Default Event Duration', description: 'Default length in minutes for newly created calendar events', keywords: ['default event duration', 'event duration', 'length', 'meeting'] },

  { id: 'jn_enable', tab: 'journal_notes', category: 'Journal & Notes', title: 'Journal & Notes Modules', description: 'Enable or disable journal and notes modules in navigation', keywords: ['journal module', 'notes module', 'enable journal', 'enable notes'] },
  { id: 'jn_mood', tab: 'journal_notes', category: 'Journal & Notes', title: 'Daily Mood Prompt', description: 'Ask for mood rating upon opening daily journal', keywords: ['mood prompt', 'daily mood', 'journal mood', 'reflection'] },
  { id: 'jn_tags', tab: 'journal_notes', category: 'Journal & Notes', title: 'Default Journal Tags', description: 'Preset tags automatically suggested for new journal entries', keywords: ['default tags', 'journal tags', 'work', 'learning', 'project'] },
  { id: 'jn_auto', tab: 'journal_notes', category: 'Journal & Notes', title: 'Journal Auto-Save Delay', description: 'Cadence for background autosaving in journal editor', keywords: ['autosave', 'save delay', 'journal save'] },
  { id: 'jn_view', tab: 'journal_notes', category: 'Journal & Notes', title: 'Notes View Mode & Sort', description: 'List or Grid card layout and sorting options for notes', keywords: ['notes view mode', 'notes sort', 'grid', 'list', 'recent'] },
  { id: 'jn_prev', tab: 'journal_notes', category: 'Journal & Notes', title: 'Markdown Live Preview', description: 'Render markdown formatting in real-time note editor', keywords: ['markdown preview', 'markdown', 'notes editor'] },

  { id: 'bak_exp', tab: 'backup', category: 'Backup & Restore', title: 'Export JSON Backup', description: 'Download a complete, offline JSON snapshot of all records', keywords: ['export json backup', 'backup', 'export', 'download', 'json', 'data'] },
  { id: 'bak_imp', tab: 'backup', category: 'Backup & Restore', title: 'Import Backup File', description: 'Merge or replace workspace data from a JSON backup file', keywords: ['import backup', 'restore', 'upload', 'merge', 'replace'] },
  { id: 'bak_demo', tab: 'backup', category: 'Backup & Restore', title: 'Sample Demo Data', description: 'Inject sample pages, tasks, habits, and events for testing', keywords: ['sample data', 'demo data', 'test data', 'seed'] },

  { id: 'prv_local', tab: 'privacy', category: 'Privacy & Storage', title: 'Local-First Architecture', description: '100% offline, client-side storage guarantee with zero remote telemetry', keywords: ['privacy', 'offline', 'local-first', 'client-side', 'telemetry', 'security'] },
  { id: 'prv_quota', tab: 'privacy', category: 'Privacy & Storage', title: 'IndexedDB Storage Quota', description: 'Inspect storage byte consumption, quota limits, and record tallies', keywords: ['storage quota', 'indexeddb', 'usage', 'bytes', 'megabytes', 'quota'] },
  { id: 'prv_cache', tab: 'privacy', category: 'Privacy & Storage', title: 'Cache & Workspace Reset', description: 'Clear temporary session cache or safely reset to default workspace', keywords: ['clear cache', 'reset workspace', 'purge', 'storage', 'danger zone'] },
];

export const SettingsContent: React.FC = () => {
  const { 
    settings, 
    updateSetting,
    updateGeneralSettings,
    updateAppearanceSettings,
    updateGlobalPreferences,
    updateModuleSettings,
    toggleTheme,
    showToast, 
    refreshAll,
    pages,
    tasks,
    habits,
    habitLogs,
    events,
    dayColors,
    journalEntries,
    notes
  } = useWorkspace();

  const [searchParams, setSearchParams] = useSearchParams();

  // Normalize initial tab and map aliases
  const rawTabParam = (searchParams.get('tab') as string) || 'general';
  const resolveTab = (param: string): SettingsTab => {
    if (param === 'global') return 'preferences';
    if (param === 'data') return 'backup';
    if (param === 'storage') return 'privacy';
    const validTabs: SettingsTab[] = [
      'general', 'appearance', 'preferences', 'habits', 'todo', 
      'timer', 'calendar', 'journal_notes', 'backup', 'privacy'
    ];
    return validTabs.includes(param as SettingsTab) ? (param as SettingsTab) : 'general';
  };

  const [activeTab, setActiveTab] = useState<SettingsTab>(() => resolveTab(rawTabParam));
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Sync tab when search params change externally
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      const resolved = resolveTab(tabParam);
      if (resolved !== activeTab) {
        setActiveTab(resolved);
      }
    }
  }, [searchParams]);

  const handleTabChange = (tab: SettingsTab) => {
    setActiveTab(tab);
    setSearchQuery('');
    setMobileMenuOpen(false);
    setSearchParams({ tab });
  };

  const isDark = settings.theme === 'dark';
  const currentBgStyle = settings.appearance?.backgroundStyle || settings.backgroundStyle || 'current';
  const currentAccent = settings.appearance?.accentColor || 'blue';
  const currentThemeMode = settings.appearance?.themeMode || (isDark ? 'dark' : 'light');

  // Form local state
  const [displayNameInput, setDisplayNameInput] = useState(settings.general?.displayName || settings.displayName || '');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Storage estimation metrics
  const [storageUsage, setStorageUsage] = useState<{ usedBytes: number; quotaBytes: number } | null>(null);
  const [timerSessionCount, setTimerSessionCount] = useState<number>(0);
  const [activityLogCount, setActivityLogCount] = useState<number>(0);

  useEffect(() => {
    if (navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then(estimate => {
        if (estimate.usage !== undefined && estimate.quota !== undefined) {
          setStorageUsage({
            usedBytes: estimate.usage,
            quotaBytes: estimate.quota,
          });
        }
      }).catch(() => {});
    }

    TimerRepository.getAllSessions().then(s => setTimerSessionCount(s.length)).catch(() => {});
    TimerRepository.getAllActivityLogs().then(a => setActivityLogCount(a.length)).catch(() => {});
  }, [activeTab]);

  // Sync display name input if settings update
  useEffect(() => {
    if (settings.general?.displayName) {
      setDisplayNameInput(settings.general.displayName);
    }
  }, [settings.general?.displayName]);

  // Calculate days since last backup
  let daysSinceBackup: number | null = null;
  if (settings.lastBackup) {
    const lastDate = new Date(settings.lastBackup).getTime();
    const now = Date.now();
    daysSinceBackup = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));
  }
  const needsBackupBanner = daysSinceBackup === null || daysSinceBackup >= 7;

  // Filtered search results
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return SETTINGS_SEARCH_INDEX.filter(item => {
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchDesc = item.description.toLowerCase().includes(q);
      const matchCat = item.category.toLowerCase().includes(q);
      const matchKey = item.keywords.some(k => k.toLowerCase().includes(q));
      return matchTitle || matchDesc || matchCat || matchKey;
    });
  }, [searchQuery]);

  // Export JSON backup handler
  const handleExport = async () => {
    try {
      const backupData = await Repository.exportBackup();
      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `my-workspace-backup-${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      await refreshAll();
      showToast('Backup successfully exported!', undefined, undefined, 'success');
    } catch (err: any) {
      showToast(`Export failed: ${err.message}`, undefined, undefined, 'error');
    }
  };

  // Handle JSON file selection for import
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    setImportPreview(null);
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.app !== 'my-workspace') {
          throw new Error('This is not a valid My Workspace backup file (app identifier mismatch).');
        }
        if (typeof parsed.schemaVersion !== 'number' || parsed.schemaVersion > 1) {
          throw new Error(`Unsupported schema version (${parsed.schemaVersion}). Supported version is 1.`);
        }
        if (!parsed.data) {
          throw new Error('Backup file missing required "data" payload.');
        }

        setImportPreview({
          pagesCount: parsed.data.pages?.length || 0,
          tasksCount: parsed.data.tasks?.length || 0,
          habitsCount: parsed.data.habits?.length || 0,
          habitLogsCount: parsed.data.habitLogs?.length || 0,
          eventsCount: parsed.data.events?.length || 0,
          raw: parsed,
        });
      } catch (err: any) {
        setImportError(err.message || 'Failed to parse JSON file');
      }
    };
    reader.readAsText(file);
  };

  // Perform import
  const handlePerformImport = async () => {
    if (!importPreview?.raw) return;
    setIsImporting(true);
    setImportError(null);

    try {
      if (importMode === 'replace') {
        const safetyBackup = await Repository.exportBackup();
        const blob = new Blob([JSON.stringify(safetyBackup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `my-workspace-safety-before-replace-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      await Repository.importBackup(importPreview.raw, importMode);
      await refreshAll();

      showToast(
        importMode === 'replace'
          ? 'Backup restored cleanly! All records updated.'
          : 'Backup merged successfully with existing data!',
        undefined,
        undefined,
        'success'
      );

      setImportFile(null);
      setImportPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      setImportError(err.message || 'Failed to import backup file');
      showToast(`Import failed: ${err.message}`, undefined, undefined, 'error');
    } finally {
      setIsImporting(false);
    }
  };

  // Load sample demo data
  const handleLoadDemo = async (mode: 'merge' | 'replace') => {
    if (!window.confirm(`Load sample workspace data in ${mode.toUpperCase()} mode?`)) {
      return;
    }
    setIsLoadingDemo(true);
    try {
      await loadDemoData(mode);
      await refreshAll();
      showToast('Sample workspace data loaded successfully!', undefined, undefined, 'success');
    } catch (err: any) {
      showToast(`Failed to load sample data: ${err.message}`, undefined, undefined, 'error');
    } finally {
      setIsLoadingDemo(false);
    }
  };

  // Reset workspace
  const handleResetDefault = async () => {
    if (!window.confirm('Reset workspace to a clean, empty state with default pages?')) {
      return;
    }
    const safety = prompt('Type RESET to confirm complete workspace wipe:');
    if (safety !== 'RESET') {
      showToast('Reset cancelled - confirmation did not match', undefined, undefined, 'info');
      return;
    }

    setIsResetting(true);
    try {
      await resetToDefaultWorkspace();
      await refreshAll();
      showToast('Workspace reset to clean default state', undefined, undefined, 'info');
    } catch (err: any) {
      showToast(`Failed to reset workspace: ${err.message}`, undefined, undefined, 'error');
    } finally {
      setIsResetting(false);
    }
  };

  // Save display name
  const handleSaveDisplayName = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = displayNameInput.trim();
    if (!trimmed) {
      showToast('Display name cannot be empty', undefined, undefined, 'error');
      return;
    }
    await updateGeneralSettings({ displayName: trimmed });
    showToast('Display name updated!', undefined, undefined, 'success');
  };

  // Clear UI local cache
  const handleClearCache = () => {
    try {
      localStorage.removeItem('my_workspace_last_route');
      sessionStorage.clear();
      showToast('Temporary view cache cleared successfully', undefined, undefined, 'success');
    } catch (err) {
      showToast('Failed to clear local cache', undefined, undefined, 'error');
    }
  };

  const activeCategoryInfo = ALL_CATEGORIES.find(c => c.id === activeTab) || ALL_CATEGORIES[0];
  const ActiveIcon = activeCategoryInfo.icon;

  return (
    <div className="space-y-6">
      {/* Backup Reminder Banner */}
      {needsBackupBanner && activeTab === 'backup' && (
        <div className="p-3.5 sm:p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-800 dark:text-amber-300">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <div>
              <span className="font-bold">Backup Recommendation: </span>
              <span>
                {daysSinceBackup === null
                  ? 'You have not created a JSON backup of your workspace yet.'
                  : `Your last backup was ${daysSinceBackup} days ago.`}
              </span>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={handleExport}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors flex-shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Now</span>
          </motion.button>
        </div>
      )}

      {/* Main Two-Column Vertical Navigation Layout */}
      <div className="flex flex-col md:flex-row gap-6 lg:gap-8 items-start min-h-[580px]">
        {/* ==================================================================== */}
        {/* LEFT COLUMN: CLAUDE-INSPIRED VERTICAL SIDEBAR NAVIGATION            */}
        {/* ==================================================================== */}
        <aside className="w-full md:w-56 lg:w-64 shrink-0 md:border-r border-border md:pr-4 lg:pr-6 space-y-4">
          {/* Settings Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-txt-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search settings..."
              aria-label="Search settings"
              className="w-full pl-8 pr-7 py-2 text-xs bg-bg-subtle/80 hover:bg-bg-subtle focus:bg-bg-card border border-border focus:border-primary rounded-xl text-txt-primary placeholder:text-txt-muted focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-txt-muted hover:text-txt-primary p-0.5 rounded cursor-pointer"
                title="Clear search"
                aria-label="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Mobile Category Dropdown / Switcher Bar (visible only on small screens) */}
          <div className="md:hidden">
            <div className="flex items-center justify-between p-2.5 bg-bg-subtle/70 border border-border rounded-xl">
              <div className="flex items-center gap-2 min-w-0">
                <ActiveIcon className="w-4 h-4 text-primary shrink-0" />
                <span className="text-xs font-bold text-txt-primary truncate">
                  {activeCategoryInfo.label}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-xs font-semibold text-primary px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors cursor-pointer"
              >
                {mobileMenuOpen ? 'Close Menu' : 'All Categories ▾'}
              </button>
            </div>

            {/* Mobile Expandable Category Accordion */}
            <AnimatePresence>
              {mobileMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden mt-2 border border-border rounded-xl bg-bg-card shadow-lg p-2 space-y-3"
                >
                  {SETTINGS_GROUPS.map(group => (
                    <div key={group.id} className="space-y-1">
                      <div className="text-xs font-semibold text-txt-secondary px-2 pt-1 font-sans">
                        {group.title}
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        {group.items.map(item => {
                          const Icon = item.icon;
                          const isActive = activeTab === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleTabChange(item.id)}
                              className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs transition-colors text-left cursor-pointer ${
                                isActive
                                  ? 'bg-primary text-white font-bold'
                                  : 'text-txt-secondary hover:text-txt-primary hover:bg-bg-subtle'
                              }`}
                            >
                              <Icon className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{item.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Mobile Quick Horizontal Pill Scroll */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-2 no-scrollbar">
              {ALL_CATEGORIES.map(c => {
                const Icon = c.icon;
                const isActive = activeTab === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleTabChange(c.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                      isActive
                        ? 'bg-primary text-white font-bold shadow-2xs'
                        : 'bg-bg-subtle text-txt-secondary hover:text-txt-primary border border-border'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Desktop & Tablet Vertical Grouped Navigation */}
          <nav className="hidden md:block space-y-4 font-sans" aria-label="Settings navigation">
            {SETTINGS_GROUPS.map(group => (
              <div key={group.id} className="space-y-1">
                <div className="px-3 pt-2 pb-1 text-xs font-semibold text-txt-secondary font-sans select-none">
                  {group.title}
                </div>
                <div className="space-y-0.5">
                  {group.items.map(item => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id && !searchQuery.trim();

                    // Check if module is disabled
                    let isDisabled = false;
                    if (item.id === 'habits' && settings.modules?.habits?.enabled === false) isDisabled = true;
                    if (item.id === 'todo' && settings.modules?.todo?.enabled === false) isDisabled = true;
                    if (item.id === 'timer' && settings.modules?.timer?.enabled === false) isDisabled = true;
                    if (item.id === 'calendar' && settings.modules?.calendar?.enabled === false) isDisabled = true;
                    if (item.id === 'journal_notes' && settings.modules?.journal?.enabled === false && settings.modules?.notes?.enabled === false) isDisabled = true;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleTabChange(item.id)}
                        aria-current={isActive ? 'page' : undefined}
                        className={`relative w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all text-left group cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                          isActive
                            ? 'bg-primary/10 text-primary font-bold shadow-2xs border border-primary/20'
                            : 'text-txt-secondary hover:text-txt-primary hover:bg-bg-subtle/80 border border-transparent'
                        }`}
                      >
                        <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-primary' : 'text-txt-muted group-hover:text-txt-primary'}`} />
                        <span className="truncate">{item.label}</span>

                        {isDisabled && (
                          <span className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded bg-bg-subtle text-txt-muted border border-border">
                            Off
                          </span>
                        )}

                        {isActive && (
                          <motion.div
                            layoutId="activeSettingsSidebarIndicator"
                            className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-primary rounded-r-full"
                            transition={{ type: "spring", stiffness: 500, damping: 35 }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Subtle Local Storage Guarantee Pill */}
          <div className="hidden md:block pt-3 border-t border-border">
            <div className="p-3 bg-bg-subtle/50 rounded-xl border border-border text-[11px] text-txt-muted space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-txt-primary">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>100% Client-Side</span>
              </div>
              <p className="leading-relaxed">
                IndexedDB offline database. No telemetry or server uploads.
              </p>
            </div>
          </div>
        </aside>

        {/* ==================================================================== */}
        {/* RIGHT COLUMN: DYNAMIC CONTENT PANEL                                 */}
        {/* ==================================================================== */}
        <section className="flex-1 min-w-0 md:pl-2 lg:pl-4 space-y-6">
          {/* SEARCH RESULTS VIEW (when user is searching) */}
          {searchQuery.trim().length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div>
                  <h2 className="text-lg font-sans font-semibold text-txt-primary">
                    Search Results for &ldquo;{searchQuery}&rdquo;
                  </h2>
                  <p className="text-xs text-txt-muted mt-0.5">
                    Found {searchResults.length} matching settings across categories.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="px-3 py-1.5 text-xs text-txt-secondary hover:text-txt-primary bg-bg-subtle hover:bg-bg-hover border border-border rounded-lg transition-colors cursor-pointer"
                >
                  Clear Search
                </button>
              </div>

              {searchResults.length > 0 ? (
                <div className="space-y-2">
                  {searchResults.map(item => (
                    <motion.div
                      key={item.id}
                      whileHover={{ x: 2 }}
                      onClick={() => handleTabChange(item.tab)}
                      className="p-3.5 bg-bg-subtle/40 hover:bg-bg-subtle border border-border hover:border-primary/40 rounded-xl flex items-center justify-between gap-4 transition-all cursor-pointer group"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-txt-primary group-hover:text-primary transition-colors">
                            {item.title}
                          </span>
                          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                            {item.category}
                          </span>
                        </div>
                        <p className="text-xs text-txt-secondary truncate">
                          {item.description}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-txt-muted group-hover:text-primary shrink-0 transition-colors" />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-bg-subtle/30 border border-dashed border-border rounded-2xl space-y-2">
                  <HelpCircle className="w-8 h-8 text-txt-muted mx-auto" />
                  <div className="text-sm font-semibold text-txt-primary">No settings found</div>
                  <p className="text-xs text-txt-muted max-w-sm mx-auto">
                    No settings match &ldquo;{searchQuery}&rdquo;. Try searching for &ldquo;dark mode&rdquo;, &ldquo;backup&rdquo;, &ldquo;language&rdquo;, &ldquo;notifications&rdquo;, or &ldquo;week starts on&rdquo;.
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* NORMAL CATEGORY VIEW */
            <div>
              {/* Active Category Header */}
              <div className="pb-4 border-b border-border mb-6">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    <ActiveIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-sans font-semibold text-txt-primary tracking-tight">
                      {activeCategoryInfo.label}
                    </h2>
                    <p className="text-xs sm:text-sm text-txt-secondary mt-0.5 font-sans">
                      {activeCategoryInfo.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Dynamic Panel Content */}
              <AnimatePresence mode="wait">
                {/* ==================================================================== */}
                {/* 1. GENERAL PREFERENCES                                               */}
                {/* ==================================================================== */}
                {activeTab === 'general' && (
                  <motion.div
                    key="general"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-6"
                  >
                    {/* Display Name */}
                    <div className="p-5 bg-bg-subtle/40 rounded-2xl border border-border space-y-3">
                      <div className="flex items-center gap-2 text-xs font-semibold text-txt-primary">
                        <User className="w-4 h-4 text-primary" />
                        <span>Display Name</span>
                      </div>
                      <p className="text-xs text-txt-secondary">
                        This name is used across personal dashboard greetings and headers.
                      </p>
                      <form onSubmit={handleSaveDisplayName} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 max-w-md pt-1">
                        <input
                          type="text"
                          value={displayNameInput}
                          onChange={e => setDisplayNameInput(e.target.value)}
                          placeholder="Your Name (e.g. Dharinish)"
                          className="flex-1 px-3.5 py-2 text-xs bg-bg-card border border-border rounded-xl text-txt-primary focus:border-primary focus:outline-none transition-colors"
                          maxLength={32}
                        />
                        <button
                          type="submit"
                          className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs"
                        >
                          Save Name
                        </button>
                      </form>
                    </div>

                    {/* Language & Regional Options */}
                    <div className="p-5 bg-bg-subtle/40 rounded-2xl border border-border space-y-4">
                      <div className="flex items-center gap-2 text-xs font-semibold text-txt-primary">
                        <Globe className="w-4 h-4 text-primary" />
                        <span>Language & Regional</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Language Selection */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-txt-secondary block">
                            Display Language
                          </label>
                          <select
                            value={settings.general?.language || 'en'}
                            onChange={e => updateGeneralSettings({ language: e.target.value as SupportedLanguage })}
                            className="w-full px-3 py-2 text-xs bg-bg-card border border-border rounded-xl text-txt-primary focus:border-primary focus:outline-none cursor-pointer"
                          >
                            <option value="en">English (US)</option>
                            <option value="es">Español (Spanish)</option>
                            <option value="fr">Français (French)</option>
                            <option value="de">Deutsch (German)</option>
                          </select>
                        </div>

                        {/* Date Format */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-txt-secondary block">
                            Date Format
                          </label>
                          <select
                            value={settings.general?.dateFormat || 'YYYY-MM-DD'}
                            onChange={e => updateGeneralSettings({ dateFormat: e.target.value as DateFormatOption })}
                            className="w-full px-3 py-2 text-xs bg-bg-card border border-border rounded-xl text-txt-primary focus:border-primary focus:outline-none cursor-pointer"
                          >
                            <option value="YYYY-MM-DD">YYYY-MM-DD (2026-11-15)</option>
                            <option value="MM/DD/YYYY">MM/DD/YYYY (11/15/2026)</option>
                            <option value="DD/MM/YYYY">DD/MM/YYYY (15/11/2026)</option>
                          </select>
                        </div>

                        {/* Week Starts On */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-txt-secondary block">
                            Week Starts On
                          </label>
                          <select
                            value={settings.general?.weekStart || 'monday'}
                            onChange={e => updateGeneralSettings({ weekStart: e.target.value as 'monday' | 'sunday' })}
                            className="w-full px-3 py-2 text-xs bg-bg-card border border-border rounded-xl text-txt-primary focus:border-primary focus:outline-none cursor-pointer"
                          >
                            <option value="monday">Monday (ISO standard)</option>
                            <option value="sunday">Sunday (US standard)</option>
                          </select>
                        </div>

                        {/* Default Landing Page */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-txt-secondary block">
                            Default Landing Page
                          </label>
                          <select
                            value={settings.general?.defaultLandingPage || 'dashboard'}
                            onChange={e => updateGeneralSettings({ defaultLandingPage: e.target.value as LandingPageOption })}
                            className="w-full px-3 py-2 text-xs bg-bg-card border border-border rounded-xl text-txt-primary focus:border-primary focus:outline-none cursor-pointer"
                          >
                            <option value="dashboard">Dashboard (Overview)</option>
                            <option value="tasks">To-Do (Tasks & Pages)</option>
                            <option value="calendar">Calendar (Schedule)</option>
                            <option value="habits">Habit Tracker (Streaks)</option>
                            <option value="journal">Journal (Daily Log)</option>
                            <option value="notes">Notes (Knowledge Base)</option>
                            <option value="timer">Focus Timer (Pomodoro)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ==================================================================== */}
                {/* 2. APPEARANCE PREFERENCES                                            */}
                {/* ==================================================================== */}
                {activeTab === 'appearance' && (
                  <motion.div
                    key="appearance"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-6"
                  >
                    {/* Theme Mode: Light / Dark / System */}
                    <div className="p-5 bg-bg-subtle/40 rounded-2xl border border-border space-y-3">
                      <div>
                        <div className="text-xs font-semibold text-txt-primary flex items-center gap-2">
                          <Palette className="w-4 h-4 text-primary" />
                          <span>Color Mode</span>
                        </div>
                        <p className="text-xs text-txt-secondary mt-0.5">
                          Select your preferred interface color mode or synchronize with your operating system.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                        {[
                          { id: 'light' as ThemeMode, label: 'Light', icon: Sun, desc: 'Crisp light interface' },
                          { id: 'dark' as ThemeMode, label: 'Dark', icon: Moon, desc: 'Deep focus contrast' },
                          { id: 'system' as ThemeMode, label: 'System', icon: Laptop, desc: 'Sync with OS mode' },
                        ].map(m => {
                          const Icon = m.icon;
                          const isSelected = currentThemeMode === m.id;
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => updateAppearanceSettings({ themeMode: m.id })}
                              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                                isSelected
                                  ? 'border-primary bg-primary/10 text-txt-primary ring-1 ring-primary shadow-xs'
                                  : 'border-border bg-bg-card hover:bg-bg-hover text-txt-secondary'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <Icon className={`w-4 h-4 ${isSelected ? 'text-primary' : 'text-txt-muted'}`} />
                                {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                              </div>
                              <div className="font-bold text-xs text-txt-primary mt-2">{m.label}</div>
                              <div className="text-[11px] text-txt-muted mt-0.5">{m.desc}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* UI Theme Style: Current / Paper / Notion */}
                    <div className="p-5 bg-bg-subtle/40 rounded-2xl border border-border space-y-3">
                      <div>
                        <div className="text-xs font-semibold text-txt-primary">UI Theme Style</div>
                        <p className="text-xs text-txt-secondary mt-0.5">
                          Aesthetic styling and background material applied across all modules.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                        {[
                          { id: 'current', label: 'Current', desc: 'Modern clean minimalist aesthetic' },
                          { id: 'paper', label: 'Paper Texture', desc: 'Warm vintage organic paper feel' },
                          { id: 'notion', label: 'Notion Clean', desc: 'Crisp, structured workspace style' },
                        ].map(style => {
                          const isSelected = currentBgStyle === style.id;
                          return (
                            <button
                              key={style.id}
                              type="button"
                              onClick={() => updateAppearanceSettings({ backgroundStyle: style.id as any })}
                              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                                isSelected
                                  ? 'border-primary bg-primary/10 text-txt-primary ring-1 ring-primary shadow-xs'
                                  : 'border-border bg-bg-card hover:bg-bg-hover text-txt-secondary'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs text-txt-primary">{style.label}</span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                              </div>
                              <div className="text-[11px] text-txt-muted mt-1">{style.desc}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Accent Color */}
                    <div className="p-5 bg-bg-subtle/40 rounded-2xl border border-border space-y-3">
                      <div>
                        <div className="text-xs font-semibold text-txt-primary">Accent Color</div>
                        <p className="text-xs text-txt-secondary mt-0.5">
                          Custom primary tint for active pills, links, badges, and progress indicators.
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2.5 pt-1">
                        {[
                          { id: 'blue' as AccentColor, label: 'Blue', hex: '#1A73E8' },
                          { id: 'indigo' as AccentColor, label: 'Indigo', hex: '#4F46E5' },
                          { id: 'violet' as AccentColor, label: 'Violet', hex: '#7C3AED' },
                          { id: 'emerald' as AccentColor, label: 'Emerald', hex: '#059669' },
                          { id: 'rose' as AccentColor, label: 'Rose', hex: '#E11D48' },
                          { id: 'amber' as AccentColor, label: 'Amber', hex: '#D97706' },
                        ].map(c => {
                          const isSelected = currentAccent === c.id;
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => updateAppearanceSettings({ accentColor: c.id })}
                              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                                isSelected
                                  ? 'border-primary ring-2 ring-primary/40 bg-bg-card shadow-xs text-txt-primary'
                                  : 'border-border bg-bg-card hover:bg-bg-hover text-txt-secondary'
                              }`}
                            >
                              <span
                                className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: c.hex }}
                              />
                              <span>{c.label}</span>
                              {isSelected && <Check className="w-3 h-3 text-primary ml-1" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Typography Scaling, Density & Motion */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Font Size */}
                      <div className="p-4 bg-bg-subtle/40 rounded-2xl border border-border space-y-2">
                        <div className="text-xs font-semibold text-txt-primary flex items-center gap-1.5">
                          <Type className="w-3.5 h-3.5 text-primary" />
                          <span>Font Size</span>
                        </div>
                        <select
                          value={settings.appearance?.fontSize || 'md'}
                          onChange={e => updateAppearanceSettings({ fontSize: e.target.value as FontSizeOption })}
                          className="w-full px-3 py-2 text-xs bg-bg-card border border-border rounded-xl text-txt-primary focus:border-primary focus:outline-none cursor-pointer"
                        >
                          <option value="sm">Small (13px body)</option>
                          <option value="md">Medium (14px standard)</option>
                          <option value="lg">Large (15px comfortable)</option>
                        </select>
                      </div>

                      {/* Layout Density */}
                      <div className="p-4 bg-bg-subtle/40 rounded-2xl border border-border space-y-2">
                        <div className="text-xs font-semibold text-txt-primary flex items-center gap-1.5">
                          <Layout className="w-3.5 h-3.5 text-primary" />
                          <span>Layout Density</span>
                        </div>
                        <select
                          value={settings.appearance?.density || 'comfortable'}
                          onChange={e => updateAppearanceSettings({ density: e.target.value as LayoutDensity })}
                          className="w-full px-3 py-2 text-xs bg-bg-card border border-border rounded-xl text-txt-primary focus:border-primary focus:outline-none cursor-pointer"
                        >
                          <option value="comfortable">Comfortable (Standard)</option>
                          <option value="compact">Compact (Tighter rows)</option>
                        </select>
                      </div>

                      {/* Animation Preferences */}
                      <div className="p-4 bg-bg-subtle/40 rounded-2xl border border-border space-y-2">
                        <div className="text-xs font-semibold text-txt-primary flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-primary" />
                          <span>Animations</span>
                        </div>
                        <select
                          value={settings.appearance?.animations || 'full'}
                          onChange={e => updateAppearanceSettings({ animations: e.target.value as AnimationPreference })}
                          className="w-full px-3 py-2 text-xs bg-bg-card border border-border rounded-xl text-txt-primary focus:border-primary focus:outline-none cursor-pointer"
                        >
                          <option value="full">Full (Smooth transitions)</option>
                          <option value="reduced">Reduced (Fast motion)</option>
                          <option value="none">None (Instant switches)</option>
                        </select>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ==================================================================== */}
                {/* 3. GLOBAL PREFERENCES                                                */}
                {/* ==================================================================== */}
                {activeTab === 'preferences' && (
                  <motion.div
                    key="preferences"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-6"
                  >
                    {/* Notification Preferences */}
                    <div className="p-5 bg-bg-subtle/40 rounded-2xl border border-border space-y-3">
                      <div>
                        <div className="text-xs font-semibold text-txt-primary flex items-center gap-2">
                          <Bell className="w-4 h-4 text-primary" />
                          <span>Notification Mode</span>
                        </div>
                        <p className="text-xs text-txt-secondary mt-0.5">
                          Application-wide alerts for reminders, timers, and habit check-ins.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                        {[
                          { id: 'enabled' as NotificationPreference, label: 'Enabled', desc: 'Banners and audio alerts' },
                          { id: 'sound_only' as NotificationPreference, label: 'Sound Only', desc: 'Chimes without popups' },
                          { id: 'disabled' as NotificationPreference, label: 'Disabled', desc: 'Completely silent mode' },
                        ].map(n => {
                          const isSelected = (settings.globalPreferences?.notifications || 'enabled') === n.id;
                          return (
                            <button
                              key={n.id}
                              type="button"
                              onClick={() => updateGlobalPreferences({ notifications: n.id })}
                              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                                isSelected
                                  ? 'border-primary bg-primary/10 text-txt-primary ring-1 ring-primary shadow-xs'
                                  : 'border-border bg-bg-card hover:bg-bg-hover text-txt-secondary'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs text-txt-primary">{n.label}</span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                              </div>
                              <div className="text-[11px] text-txt-muted mt-1">{n.desc}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Behavioral Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Reminder Lead Time */}
                      <div className="p-4 bg-bg-subtle/40 rounded-2xl border border-border space-y-2">
                        <label className="text-xs font-semibold text-txt-primary block">
                          Reminder Lead Time
                        </label>
                        <p className="text-[11px] text-txt-muted">
                          Advance notice before scheduled calendar events and task deadlines.
                        </p>
                        <select
                          value={settings.globalPreferences?.reminderLeadTimeMinutes || 15}
                          onChange={e => updateGlobalPreferences({ reminderLeadTimeMinutes: Number(e.target.value) })}
                          className="w-full px-3 py-2 text-xs bg-bg-card border border-border rounded-xl text-txt-primary focus:border-primary focus:outline-none cursor-pointer"
                        >
                          <option value={5}>5 minutes before</option>
                          <option value={15}>15 minutes before (Recommended)</option>
                          <option value={30}>30 minutes before</option>
                          <option value={60}>1 hour before</option>
                        </select>
                      </div>

                      {/* Default Task Sorting */}
                      <div className="p-4 bg-bg-subtle/40 rounded-2xl border border-border space-y-2">
                        <label className="text-xs font-semibold text-txt-primary block">
                          Default Task Sorting
                        </label>
                        <p className="text-[11px] text-txt-muted">
                          Baseline sorting priority when viewing cross-page task lists.
                        </p>
                        <select
                          value={settings.globalPreferences?.defaultTaskSorting || 'order'}
                          onChange={e => updateGlobalPreferences({ defaultTaskSorting: e.target.value as TaskSortOption })}
                          className="w-full px-3 py-2 text-xs bg-bg-card border border-border rounded-xl text-txt-primary focus:border-primary focus:outline-none cursor-pointer"
                        >
                          <option value="order">Custom Manual Drag Order</option>
                          <option value="dueDate">Due Date (Earliest first)</option>
                          <option value="priority">Priority (High to Low)</option>
                          <option value="title">Title (Alphabetical)</option>
                        </select>
                      </div>

                      {/* Startup Behaviour */}
                      <div className="p-4 bg-bg-subtle/40 rounded-2xl border border-border space-y-2 sm:col-span-2">
                        <label className="text-xs font-semibold text-txt-primary block">
                          Startup Behaviour
                        </label>
                        <p className="text-[11px] text-txt-muted">
                          Choose what screen opens when launching your workspace.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {[
                            { id: 'landing_page' as StartupBehavior, title: 'Open Default Landing Page', desc: 'Always load your configured landing page' },
                            { id: 'last_visited' as StartupBehavior, title: 'Restore Last Visited Screen', desc: 'Resume exactly where you left off' },
                          ].map(b => {
                            const isSelected = (settings.globalPreferences?.startupBehavior || 'landing_page') === b.id;
                            return (
                              <button
                                key={b.id}
                                type="button"
                                onClick={() => updateGlobalPreferences({ startupBehavior: b.id })}
                                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                                  isSelected
                                    ? 'border-primary bg-primary/10 text-txt-primary ring-1 ring-primary'
                                    : 'border-border bg-bg-card hover:bg-bg-hover text-txt-secondary'
                                }`}
                              >
                                <div className="flex items-center justify-between text-xs font-bold text-txt-primary">
                                  <span>{b.title}</span>
                                  {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                                </div>
                                <div className="text-[11px] text-txt-muted mt-0.5">{b.desc}</div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Confirmation Checkbox */}
                      <div className="p-4 bg-bg-subtle/40 rounded-2xl border border-border space-y-2 sm:col-span-2">
                        <label className="flex items-start gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.globalPreferences?.confirmBeforeDelete ?? true}
                            onChange={e => updateGlobalPreferences({ confirmBeforeDelete: e.target.checked })}
                            className="mt-1 w-4 h-4 rounded text-primary border-border focus:ring-primary cursor-pointer"
                          />
                          <div>
                            <span className="text-xs font-semibold text-txt-primary block">
                              Require Confirmation Before Deleting Items
                            </span>
                            <span className="text-[11px] text-txt-muted block mt-0.5">
                              When enabled, a confirmation prompt appears before permanently deleting journal entries, session records, or notes. (Page deletions always require exact name typing).
                            </span>
                          </div>
                        </label>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ==================================================================== */}
                {/* 4. HABITS MODULE SETTINGS                                            */}
                {/* ==================================================================== */}
                {activeTab === 'habits' && (
                  <motion.div
                    key="habits"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-6"
                  >
                    {/* Module Enabled Banner */}
                    <div className="p-4 bg-bg-subtle/50 rounded-2xl border border-border flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-txt-primary">Habit Tracker Module</div>
                        <div className="text-[11px] text-txt-muted">Show or hide habits in the main workspace navigation.</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.modules?.habits?.enabled ?? true}
                          onChange={e => updateModuleSettings('habits', { enabled: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5 bg-bg-card peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary border border-border"></div>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Default Habit Frequency */}
                      <div className="p-4 bg-bg-subtle/40 rounded-2xl border border-border space-y-2">
                        <label className="text-xs font-semibold text-txt-primary block">Default Frequency</label>
                        <select
                          value={settings.modules?.habits?.defaultFrequency || 'daily'}
                          onChange={e => updateModuleSettings('habits', { defaultFrequency: e.target.value as any })}
                          className="w-full px-3 py-2 text-xs bg-bg-card border border-border rounded-xl text-txt-primary focus:border-primary focus:outline-none cursor-pointer"
                        >
                          <option value="daily">Daily (7 days / week)</option>
                          <option value="weekdays">Weekdays (Monday - Friday)</option>
                        </select>
                      </div>

                      {/* Reminder Time */}
                      <div className="p-4 bg-bg-subtle/40 rounded-2xl border border-border space-y-2">
                        <label className="text-xs font-semibold text-txt-primary block">Daily Reminder Time</label>
                        <select
                          value={settings.modules?.habits?.reminderTime || '09:00'}
                          onChange={e => updateModuleSettings('habits', { reminderTime: e.target.value })}
                          className="w-full px-3 py-2 text-xs bg-bg-card border border-border rounded-xl text-txt-primary focus:border-primary focus:outline-none cursor-pointer"
                        >
                          <option value="08:00">08:00 AM (Early morning)</option>
                          <option value="09:00">09:00 AM (Morning start)</option>
                          <option value="12:00">12:00 PM (Midday)</option>
                          <option value="18:00">06:00 PM (Evening)</option>
                          <option value="20:00">08:00 PM (Night wrap-up)</option>
                        </select>
                      </div>

                      {/* Weekly Goal Days */}
                      <div className="p-4 bg-bg-subtle/40 rounded-2xl border border-border space-y-2">
                        <label className="text-xs font-semibold text-txt-primary block">Weekly Goal Target</label>
                        <div className="flex items-center gap-2">
                          {[3, 4, 5, 7].map(days => (
                            <button
                              key={days}
                              type="button"
                              onClick={() => updateModuleSettings('habits', { weeklyGoalDays: days })}
                              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                (settings.modules?.habits?.weeklyGoalDays || 5) === days
                                  ? 'bg-primary text-white shadow-2xs'
                                  : 'bg-bg-card border border-border text-txt-secondary hover:text-txt-primary'
                              }`}
                            >
                              {days}d
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Streak Display Style */}
                      <div className="p-4 bg-bg-subtle/40 rounded-2xl border border-border space-y-2">
                        <label className="text-xs font-semibold text-txt-primary block">Streak Display</label>
                        <select
                          value={settings.modules?.habits?.streakDisplay || 'badge'}
                          onChange={e => updateModuleSettings('habits', { streakDisplay: e.target.value as any })}
                          className="w-full px-3 py-2 text-xs bg-bg-card border border-border rounded-xl text-txt-primary focus:border-primary focus:outline-none cursor-pointer"
                        >
                          <option value="badge">Badge with count (e.g. 14d)</option>
                          <option value="flame_only">Flame icon only</option>
                          <option value="hidden">Hidden</option>
                        </select>
                      </div>

                      {/* Completion Behavior */}
                      <div className="p-4 bg-bg-subtle/40 rounded-2xl border border-border space-y-2">
                        <label className="text-xs font-semibold text-txt-primary block">Completion Reaction</label>
                        <select
                          value={settings.modules?.habits?.completionBehavior || 'confetti'}
                          onChange={e => updateModuleSettings('habits', { completionBehavior: e.target.value as any })}
                          className="w-full px-3 py-2 text-xs bg-bg-card border border-border rounded-xl text-txt-primary focus:border-primary focus:outline-none cursor-pointer"
                        >
                          <option value="confetti">Confetti celebration burst</option>
                          <option value="toast">Subtle toast message</option>
                          <option value="none">None (Immediate toggle)</option>
                        </select>
                      </div>

                      {/* Archived Habits Visibility */}
                      <div className="p-4 bg-bg-subtle/40 rounded-2xl border border-border space-y-2">
                        <label className="text-xs font-semibold text-txt-primary block">Archived Habits Visibility</label>
                        <label className="flex items-center gap-2 cursor-pointer pt-1">
                          <input
                            type="checkbox"
                            checked={settings.modules?.habits?.showArchived ?? false}
                            onChange={e => updateModuleSettings('habits', { showArchived: e.target.checked })}
                            className="w-4 h-4 rounded text-primary border-border focus:ring-primary cursor-pointer"
                          />
                          <span className="text-xs text-txt-secondary">Show archived habits in tables and cards</span>
                        </label>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ==================================================================== */}
                {/* 5. TO-DO MODULE SETTINGS                                             */}
                {/* ==================================================================== */}
                {activeTab === 'todo' && (
                  <motion.div
                    key="todo"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-6"
                  >
                    {/* Module Enabled Banner */}
                    <div className="p-4 bg-bg-subtle/50 rounded-2xl border border-border flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-txt-primary">To-Do Module</div>
                        <div className="text-[11px] text-txt-muted">Show or hide tasks and pages in the main workspace navigation.</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.modules?.todo?.enabled ?? true}
                          onChange={e => updateModuleSettings('todo', { enabled: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5 bg-bg-card peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary border border-border"></div>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Default Task Priority */}
                      <div className="p-4 bg-bg-subtle/40 rounded-2xl border border-border space-y-2">
                        <label className="text-xs font-semibold text-txt-primary block">Default Priority</label>
                        <select
                          value={settings.modules?.todo?.defaultPriority || 'medium'}
                          onChange={e => updateModuleSettings('todo', { defaultPriority: e.target.value as any })}
                          className="w-full px-3 py-2 text-xs bg-bg-card border border-border rounded-xl text-txt-primary focus:border-primary focus:outline-none cursor-pointer"
                        >
                          <option value="high">High priority</option>
                          <option value="medium">Medium priority (Default)</option>
                          <option value="low">Low priority</option>
                        </select>
                      </div>

                      {/* Default Due Date */}
                      <div className="p-4 bg-bg-subtle/40 rounded-2xl border border-border space-y-2">
                        <label className="text-xs font-semibold text-txt-primary block">Default Due Date</label>
                        <select
                          value={settings.modules?.todo?.defaultDueDate || 'none'}
                          onChange={e => updateModuleSettings('todo', { defaultDueDate: e.target.value as any })}
                          className="w-full px-3 py-2 text-xs bg-bg-card border border-border rounded-xl text-txt-primary focus:border-primary focus:outline-none cursor-pointer"
                        >
                          <option value="none">No due date</option>
                          <option value="today">Today</option>
                          <option value="tomorrow">Tomorrow</option>
                        </select>
                      </div>

                      {/* Task Sorting */}
                      <div className="p-4 bg-bg-subtle/40 rounded-2xl border border-border space-y-2">
                        <label className="text-xs font-semibold text-txt-primary block">Task Sorting</label>
                        <select
                          value={settings.modules?.todo?.defaultSort || 'order'}
                          onChange={e => updateModuleSettings('todo', { defaultSort: e.target.value as any })}
                          className="w-full px-3 py-2 text-xs bg-bg-card border border-border rounded-xl text-txt-primary focus:border-primary focus:outline-none cursor-pointer"
                        >
                          <option value="order">Custom Manual Drag Order</option>
                          <option value="dueDate">Due Date (Earliest first)</option>
                          <option value="priority">Priority (High to Low)</option>
                          <option value="title">Title (Alphabetical)</option>
                        </select>
                      </div>

                      {/* Completed Task Visibility */}
                      <div className="p-4 bg-bg-subtle/40 rounded-2xl border border-border space-y-2">
                        <label className="text-xs font-semibold text-txt-primary block">Completed Task Visibility</label>
                        <select
                          value={settings.modules?.todo?.completedVisibility || 'show'}
                          onChange={e => updateModuleSettings('todo', { completedVisibility: e.target.value as any })}
                          className="w-full px-3 py-2 text-xs bg-bg-card border border-border rounded-xl text-txt-primary focus:border-primary focus:outline-none cursor-pointer"
                        >
                          <option value="show">Show inline with strikethrough</option>
                          <option value="bottom">Move completed to bottom</option>
                          <option value="hide">Hide completed tasks</option>
                        </select>
                      </div>

                      {/* Recurring Task Behavior */}
                      <div className="p-4 bg-bg-subtle/40 rounded-2xl border border-border space-y-2">
                        <label className="text-xs font-semibold text-txt-primary block">Recurring Task Behavior</label>
                        <select
                          value={settings.modules?.todo?.recurringBehavior || 'create_next'}
                          onChange={e => updateModuleSettings('todo', { recurringBehavior: e.target.value as any })}
                          className="w-full px-3 py-2 text-xs bg-bg-card border border-border rounded-xl text-txt-primary focus:border-primary focus:outline-none cursor-pointer"
                        >
                          <option value="create_next">Create next occurrence immediately</option>
                          <option value="keep_completed">Keep completed without creating next</option>
                        </select>
                      </div>

                      {/* Reminders Toggle */}
                      <div className="p-4 bg-bg-subtle/40 rounded-2xl border border-border space-y-2">
                        <label className="text-xs font-semibold text-txt-primary block">Task Reminders</label>
                        <label className="flex items-center gap-2 cursor-pointer pt-1">
                          <input
                            type="checkbox"
                            checked={settings.modules?.todo?.enableReminders ?? true}
                            onChange={e => updateModuleSettings('todo', { enableReminders: e.target.checked })}
                            className="w-4 h-4 rounded text-primary border-border focus:ring-primary cursor-pointer"
                          />
                          <span className="text-xs text-txt-secondary">Enable due date reminder alerts</span>
                        </label>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ==================================================================== */}
                {/* 6. FOCUS TIMER MODULE SETTINGS                                       */}
                {/* ==================================================================== */}
                {activeTab === 'timer' && (
                  <motion.div
                    key="timer"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-6"
                  >
                    {/* Module Enabled Banner */}
                    <div className="p-4 bg-bg-subtle/50 rounded-2xl border border-border flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-txt-primary">Focus Timer Module</div>
                        <div className="text-[11px] text-txt-muted">Show or hide focus timer in the main workspace navigation.</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.modules?.timer?.enabled ?? true}
                          onChange={e => updateModuleSettings('timer', { enabled: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5 bg-bg-card peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary border border-border"></div>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Default Focus Duration */}
                      <div className="p-4 bg-bg-subtle/40 rounded-2xl border border-border space-y-2">
                        <label className="text-xs font-semibold text-txt-primary block">Focus Duration</label>
                        <select
                          value={settings.modules?.timer?.workMinutes || 25}
                          onChange={e => updateModuleSettings('timer', { workMinutes: Number(e.target.value) })}
                          className="w-full px-3 py-2 text-xs bg-bg-card border border-border rounded-xl text-txt-primary focus:border-primary focus:outline-none cursor-pointer"
                        >
                          <option value={15}>15 minutes (Sprint)</option>
                          <option value={25}>25 minutes (Standard Pomodoro)</option>
                          <option value={30}>30 minutes</option>
                          <option value={45}>45 minutes</option>
                          <option value={50}>50 minutes (Deep Work)</option>
                          <option value={60}>60 minutes (1 Hour)</option>
                        </select>
                      </div>

                      {/* Short Break */}
                      <div className="p-4 bg-bg-subtle/40 rounded-2xl border border-border space-y-2">
                        <label className="text-xs font-semibold text-txt-primary block">Short Break</label>
                        <select
                          value={settings.modules?.timer?.shortBreakMinutes || 5}
                          onChange={e => updateModuleSettings('timer', { shortBreakMinutes: Number(e.target.value) })}
                          className="w-full px-3 py-2 text-xs bg-bg-card border border-border rounded-xl text-txt-primary focus:border-primary focus:outline-none cursor-pointer"
                        >
                          <option value={3}>3 minutes</option>
                          <option value={5}>5 minutes (Standard)</option>
                          <option value={10}>10 minutes</option>
                        </select>
                      </div>

                      {/* Long Break */}
                      <div className="p-4 bg-bg-subtle/40 rounded-2xl border border-border space-y-2">
                        <label className="text-xs font-semibold text-txt-primary block">Long Break</label>
                        <select
                          value={settings.modules?.timer?.longBreakMinutes || 15}
                          onChange={e => updateModuleSettings('timer', { longBreakMinutes: Number(e.target.value) })}
                          className="w-full px-3 py-2 text-xs bg-bg-card border border-border rounded-xl text-txt-primary focus:border-primary focus:outline-none cursor-pointer"
                        >
                          <option value={10}>10 minutes</option>
                          <option value={15}>15 minutes (Standard)</option>
                          <option value={20}>20 minutes</option>
                          <option value={30}>30 minutes</option>
                        </select>
                      </div>

                      {/* Long Break Interval */}
                      <div className="p-4 bg-bg-subtle/40 rounded-2xl border border-border space-y-2">
                        <label className="text-xs font-semibold text-txt-primary block">Long Break Interval</label>
                        <select
                          value={settings.modules?.timer?.longBreakInterval || 4}
                          onChange={e => updateModuleSettings('timer', { longBreakInterval: Number(e.target.value) })}
                          className="w-full px-3 py-2 text-xs bg-bg-card border border-border rounded-xl text-txt-primary focus:border-primary focus:outline-none cursor-pointer"
                        >
                          <option value={3}>Every 3 completed sessions</option>
                          <option value={4}>Every 4 completed sessions (Standard)</option>
                          <option value={5}>Every 5 completed sessions</option>
                          <option value={6}>Every 6 completed sessions</option>
                        </select>
                      </div>

                      {/* Daily Goal */}
                      <div className="p-4 bg-bg-subtle/40 rounded-2xl border border-border space-y-2">
                        <label className="text-xs font-semibold text-txt-primary block">Daily Target Goal</label>
                        <select
                          value={settings.modules?.timer?.dailyGoalMinutes || ''}
                          onChange={e => updateModuleSettings('timer', { dailyGoalMinutes: e.target.value ? Number(e.target.value) : null })}
                          className="w-full px-3 py-2 text-xs bg-bg-card border border-border rounded-xl text-txt-primary focus:border-primary focus:outline-none cursor-pointer"
                        >
                          <option value="">No daily target</option>
                          <option value={60}>1 hour / day</option>
                          <option value={120}>2 hours / day</option>
                          <option value={180}>3 hours / day</option>
                          <option value={240}>4 hours / day</option>
                        </select>
                      </div>

                      {/* Sound Theme */}
                      <div className="p-4 bg-bg-subtle/40 rounded-2xl border border-border space-y-2">
                        <label className="text-xs font-semibold text-txt-primary block">Sound Theme</label>
                        <select
                          value={settings.modules?.timer?.soundTheme || 'bell'}
                          onChange={e => updateModuleSettings('timer', { soundTheme: e.target.value as any })}
                          className="w-full px-3 py-2 text-xs bg-bg-card border border-border rounded-xl text-txt-primary focus:border-primary focus:outline-none cursor-pointer"
                        >
                          <option value="bell">Classic Bell</option>
                          <option value="chime">Modern Chime</option>
                          <option value="digital">Digital Beep</option>
                          <option value="silent">Silent (No audio)</option>
                        </select>
                      </div>

                      {/* Auto-Start Options */}
                      <div className="p-4 bg-bg-subtle/40 rounded-2xl border border-border space-y-3 sm:col-span-2">
                        <div className="text-xs font-semibold text-txt-primary">Automation & Session Tracking</div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={settings.modules?.timer?.autoStartBreaks ?? false}
                              onChange={e => updateModuleSettings('timer', { autoStartBreaks: e.target.checked })}
                              className="w-4 h-4 rounded text-primary border-border focus:ring-primary cursor-pointer"
                            />
                            <span className="text-xs text-txt-secondary">Auto-start breaks</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={settings.modules?.timer?.autoStartWork ?? false}
                              onChange={e => updateModuleSettings('timer', { autoStartWork: e.target.checked })}
                              className="w-4 h-4 rounded text-primary border-border focus:ring-primary cursor-pointer"
                            />
                            <span className="text-xs text-txt-secondary">Auto-start work sessions</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={(settings.modules?.timer?.sessionTracking || 'prompt') === 'auto_save'}
                              onChange={e => updateModuleSettings('timer', { sessionTracking: e.target.checked ? 'auto_save' : 'prompt' })}
                              className="w-4 h-4 rounded text-primary border-border focus:ring-primary cursor-pointer"
                            />
                            <span className="text-xs text-txt-secondary">Auto-save completed sessions</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ==================================================================== */}
                {/* 7. CALENDAR MODULE SETTINGS                                          */}
                {/* ==================================================================== */}
                {activeTab === 'calendar' && (
                  <motion.div
                    key="calendar"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-6"
                  >
                    {/* Module Enabled Banner */}
                    <div className="p-4 bg-bg-subtle/50 rounded-2xl border border-border flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-txt-primary">Calendar Module</div>
                        <div className="text-[11px] text-txt-muted">Show or hide calendar in the main workspace navigation.</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.modules?.calendar?.enabled ?? true}
                          onChange={e => updateModuleSettings('calendar', { enabled: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5 bg-bg-card peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary border border-border"></div>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Default View */}
                      <div className="p-4 bg-bg-subtle/40 rounded-2xl border border-border space-y-2">
                        <label className="text-xs font-semibold text-txt-primary block">Default View</label>
                        <select
                          value={settings.modules?.calendar?.defaultView || 'month'}
                          onChange={e => updateModuleSettings('calendar', { defaultView: e.target.value as any })}
                          className="w-full px-3 py-2 text-xs bg-bg-card border border-border rounded-xl text-txt-primary focus:border-primary focus:outline-none cursor-pointer"
                        >
                          <option value="month">Month View (Grid)</option>
                          <option value="week">Week View (7 columns)</option>
                          <option value="day">Day View (Timeline)</option>
                        </select>
                      </div>

                      {/* Default Event Duration */}
                      <div className="p-4 bg-bg-subtle/40 rounded-2xl border border-border space-y-2">
                        <label className="text-xs font-semibold text-txt-primary block">Default Event Duration</label>
                        <select
                          value={settings.modules?.calendar?.defaultEventDuration || 60}
                          onChange={e => updateModuleSettings('calendar', { defaultEventDuration: Number(e.target.value) })}
                          className="w-full px-3 py-2 text-xs bg-bg-card border border-border rounded-xl text-txt-primary focus:border-primary focus:outline-none cursor-pointer"
                        >
                          <option value={15}>15 minutes</option>
                          <option value={30}>30 minutes</option>
                          <option value={45}>45 minutes</option>
                          <option value={60}>60 minutes (1 hour)</option>
                          <option value={90}>90 minutes</option>
                          <option value={120}>120 minutes (2 hours)</option>
                        </select>
                      </div>

                      {/* Show Completed Tasks */}
                      <div className="p-4 bg-bg-subtle/40 rounded-2xl border border-border space-y-2">
                        <label className="text-xs font-semibold text-txt-primary block">Completed Tasks</label>
                        <label className="flex items-center gap-2 cursor-pointer pt-2">
                          <input
                            type="checkbox"
                            checked={settings.modules?.calendar?.showCompletedTasks ?? true}
                            onChange={e => updateModuleSettings('calendar', { showCompletedTasks: e.target.checked })}
                            className="w-4 h-4 rounded text-primary border-border focus:ring-primary cursor-pointer"
                          />
                          <span className="text-xs text-txt-secondary">Show completed tasks</span>
                        </label>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ==================================================================== */}
                {/* 8. JOURNAL & NOTES MODULE SETTINGS                                   */}
                {/* ==================================================================== */}
                {activeTab === 'journal_notes' && (
                  <motion.div
                    key="journal_notes"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-6"
                  >
                    {/* Section: Journal */}
                    <div className="p-5 bg-bg-subtle/40 rounded-2xl border border-border space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-bold text-txt-primary">
                          <BookOpen className="w-4 h-4 text-primary" />
                          <span>Daily Journal Configuration</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.modules?.journal?.enabled ?? true}
                            onChange={e => updateModuleSettings('journal', { enabled: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-10 h-5 bg-bg-card peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary border border-border"></div>
                        </label>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                        <div className="p-3 bg-bg-card rounded-xl border border-border space-y-1.5">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={settings.modules?.journal?.promptMood ?? true}
                              onChange={e => updateModuleSettings('journal', { promptMood: e.target.checked })}
                              className="w-4 h-4 rounded text-primary border-border focus:ring-primary cursor-pointer"
                            />
                            <span className="text-xs font-semibold text-txt-primary">Prompt Mood on Entry Open</span>
                          </label>
                          <p className="text-[11px] text-txt-muted pl-6">
                            Displays the 5-emoji mood picker upon opening daily reflection editor.
                          </p>
                        </div>

                        <div className="p-3 bg-bg-card rounded-xl border border-border space-y-1.5">
                          <label className="text-xs font-semibold text-txt-primary block">Auto-Save Delay</label>
                          <select
                            value={settings.modules?.journal?.autoSaveDelayMs || 1000}
                            onChange={e => updateModuleSettings('journal', { autoSaveDelayMs: Number(e.target.value) })}
                            className="w-full px-3 py-1.5 text-xs bg-bg-subtle border border-border rounded-lg text-txt-primary focus:border-primary focus:outline-none cursor-pointer"
                          >
                            <option value={500}>0.5 seconds (Instant)</option>
                            <option value={1000}>1 second (Standard)</option>
                            <option value={2000}>2 seconds</option>
                            <option value={5000}>5 seconds</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Section: Notes */}
                    <div className="p-5 bg-bg-subtle/40 rounded-2xl border border-border space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-bold text-txt-primary">
                          <FileText className="w-4 h-4 text-primary" />
                          <span>Notes & Markdown Configuration</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.modules?.notes?.enabled ?? true}
                            onChange={e => updateModuleSettings('notes', { enabled: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-10 h-5 bg-bg-card peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary border border-border"></div>
                        </label>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                        <div className="p-3 bg-bg-card rounded-xl border border-border space-y-1.5">
                          <label className="text-xs font-semibold text-txt-primary block">Default View Mode</label>
                          <select
                            value={settings.modules?.notes?.defaultViewMode || 'list'}
                            onChange={e => updateModuleSettings('notes', { defaultViewMode: e.target.value as any })}
                            className="w-full px-3 py-1.5 text-xs bg-bg-subtle border border-border rounded-lg text-txt-primary focus:border-primary focus:outline-none cursor-pointer"
                          >
                            <option value="list">List View (Dense rows)</option>
                            <option value="grid">Grid View (Visual cards)</option>
                          </select>
                        </div>

                        <div className="p-3 bg-bg-card rounded-xl border border-border space-y-1.5">
                          <label className="text-xs font-semibold text-txt-primary block">Default Sort Order</label>
                          <select
                            value={settings.modules?.notes?.defaultSort || 'recent'}
                            onChange={e => updateModuleSettings('notes', { defaultSort: e.target.value as any })}
                            className="w-full px-3 py-1.5 text-xs bg-bg-subtle border border-border rounded-lg text-txt-primary focus:border-primary focus:outline-none cursor-pointer"
                          >
                            <option value="recent">Recently Modified</option>
                            <option value="oldest">Oldest First</option>
                            <option value="title-asc">Title (A to Z)</option>
                            <option value="title-desc">Title (Z to A)</option>
                          </select>
                        </div>

                        <div className="p-3 bg-bg-card rounded-xl border border-border space-y-1.5">
                          <label className="text-xs font-semibold text-txt-primary block">Markdown Preview</label>
                          <label className="flex items-center gap-2 cursor-pointer pt-1.5">
                            <input
                              type="checkbox"
                              checked={settings.modules?.notes?.previewMarkdown ?? true}
                              onChange={e => updateModuleSettings('notes', { previewMarkdown: e.target.checked })}
                              className="w-4 h-4 rounded text-primary border-border focus:ring-primary cursor-pointer"
                            />
                            <span className="text-xs text-txt-secondary">Enable live markdown rendering</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ==================================================================== */}
                {/* 9. BACKUP & RESTORE                                                  */}
                {/* ==================================================================== */}
                {activeTab === 'backup' && (
                  <motion.div
                    key="backup"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-6"
                  >
                    {/* Section: Backup & Export */}
                    <div className="p-5 bg-bg-subtle/40 rounded-2xl border border-border space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <div className="text-sm font-semibold text-txt-primary flex items-center gap-2">
                            <Download className="w-4 h-4 text-primary" />
                            <span>Full Workspace Export</span>
                          </div>
                          <p className="text-xs text-txt-secondary mt-0.5">
                            Downloads a complete, self-contained JSON file containing all pages, tasks, habits, events, notes, journals, and focus sessions.
                          </p>
                          <div className="text-xs font-mono text-txt-muted mt-2">
                            Last exported: {settings.lastBackup ? new Date(settings.lastBackup).toLocaleString() : 'Never'}
                          </div>
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.96 }}
                          onClick={handleExport}
                          className="px-4 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-xs transition-colors shrink-0 cursor-pointer"
                        >
                          <Download className="w-4 h-4" />
                          <span>Export JSON Backup</span>
                        </motion.button>
                      </div>
                    </div>

                    {/* Section: Import */}
                    <div className="p-5 bg-bg-subtle/40 rounded-2xl border border-border space-y-4">
                      <div>
                        <div className="text-xs font-semibold text-txt-primary flex items-center gap-2">
                          <Upload className="w-4 h-4 text-primary" />
                          <span>Import Backup File</span>
                        </div>
                        <p className="text-xs text-txt-secondary mt-0.5">
                          Restore your workspace from an existing backup file. Schema validation verifies file integrity.
                        </p>
                      </div>

                      <div className="p-5 border-2 border-dashed border-border rounded-xl text-center space-y-2 bg-bg-card/50">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".json,application/json"
                          onChange={handleFileChange}
                          className="hidden"
                          id="workspace-import-input"
                        />
                        <label
                          htmlFor="workspace-import-input"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-bg-card hover:bg-bg-subtle text-txt-primary border border-border rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
                        >
                          <Upload className="w-4 h-4 text-primary" />
                          <span>{importFile ? importFile.name : 'Choose Backup JSON File'}</span>
                        </label>
                        {importFile && (
                          <div className="text-xs font-mono text-txt-muted">
                            {(importFile.size / 1024).toFixed(1)} KB selected
                          </div>
                        )}
                      </div>

                      {importError && (
                        <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 rounded-xl text-xs flex items-center gap-2">
                          <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                          <span>{importError}</span>
                        </div>
                      )}

                      {importPreview && (
                        <div className="bg-bg-card border border-border rounded-xl p-4 space-y-3">
                          <div className="text-xs font-semibold text-txt-secondary">Backup Preview</div>
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                            <div className="bg-bg-subtle p-2 rounded-lg border border-border">
                              <div className="text-base font-mono font-bold text-primary">{importPreview.pagesCount}</div>
                              <div className="text-xs text-txt-muted">Pages</div>
                            </div>
                            <div className="bg-bg-subtle p-2 rounded-lg border border-border">
                              <div className="text-base font-mono font-bold text-primary">{importPreview.tasksCount}</div>
                              <div className="text-xs text-txt-muted">Tasks</div>
                            </div>
                            <div className="bg-bg-subtle p-2 rounded-lg border border-border">
                              <div className="text-base font-mono font-bold text-primary">{importPreview.habitsCount}</div>
                              <div className="text-xs text-txt-muted">Habits</div>
                            </div>
                            <div className="bg-bg-subtle p-2 rounded-lg border border-border">
                              <div className="text-base font-mono font-bold text-primary">{importPreview.habitLogsCount}</div>
                              <div className="text-xs text-txt-muted">Habit Logs</div>
                            </div>
                            <div className="bg-bg-subtle p-2 rounded-lg border border-border">
                              <div className="text-base font-mono font-bold text-primary">{importPreview.eventsCount}</div>
                              <div className="text-xs text-txt-muted">Events</div>
                            </div>
                          </div>

                          <div className="space-y-1.5 pt-2">
                            <div className="text-xs font-medium text-txt-secondary">Select Import Mode:</div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => setImportMode('merge')}
                                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                                  importMode === 'merge'
                                    ? 'border-primary bg-primary/10 text-txt-primary ring-1 ring-primary'
                                    : 'border-border bg-bg-card text-txt-secondary hover:bg-bg-hover'
                                }`}
                              >
                                <div className="font-semibold text-xs text-txt-primary flex items-center justify-between">
                                  <span>Merge</span>
                                  {importMode === 'merge' && <Check className="w-3.5 h-3.5 text-primary" />}
                                </div>
                                <div className="text-[11px] text-txt-muted mt-1">
                                  Inserts new records and updates by ID. Existing records not in the file are preserved.
                                </div>
                              </button>

                              <button
                                type="button"
                                onClick={() => setImportMode('replace')}
                                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                                  importMode === 'replace'
                                    ? 'border-red-500 bg-red-500/10 text-txt-primary ring-1 ring-red-500'
                                    : 'border-border bg-bg-card text-txt-secondary hover:bg-bg-hover'
                                }`}
                              >
                                <div className="font-semibold text-xs text-txt-primary flex items-center justify-between">
                                  <span>Replace (Clean)</span>
                                  {importMode === 'replace' && <Check className="w-3.5 h-3.5 text-red-500" />}
                                </div>
                                <div className="text-[11px] text-txt-muted mt-1">
                                  Clears existing records and restores this backup. A safety backup will be downloaded first.
                                </div>
                              </button>
                            </div>
                          </div>

                          <div className="flex justify-end pt-2">
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.96 }}
                              onClick={handlePerformImport}
                              disabled={isImporting}
                              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs ${
                                importMode === 'replace'
                                  ? 'bg-red-600 hover:bg-red-700 text-white'
                                  : 'bg-primary hover:bg-primary-hover text-white'
                              }`}
                            >
                              {isImporting ? 'Importing...' : `Confirm & ${importMode === 'replace' ? 'Replace All' : 'Merge Data'}`}
                            </motion.button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Section: Demo & Testing Data */}
                    <div className="p-5 bg-bg-subtle/40 rounded-2xl border border-border space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-semibold text-txt-primary flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-primary" />
                          <span>Demo & Testing Data</span>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/20 text-primary border border-primary/30">
                          Developer Utilities
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                        <div>
                          <div className="text-xs font-semibold text-txt-primary">Sample Workspace Data</div>
                          <div className="text-[11px] text-txt-muted mt-0.5">
                            Injects pages, sample tasks, habit streaks, and scheduled events for testing.
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleLoadDemo('replace')}
                            disabled={isLoadingDemo}
                            className="px-3.5 py-2 bg-primary text-white text-xs font-semibold rounded-xl hover:bg-primary-hover transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {isLoadingDemo ? 'Loading...' : 'Load Sample Data'}
                          </button>
                          <button
                            type="button"
                            onClick={handleResetDefault}
                            disabled={isResetting}
                            className="px-3.5 py-2 bg-bg-card hover:bg-bg-subtle text-txt-secondary hover:text-red-500 border border-border rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {isResetting ? 'Resetting...' : 'Reset Clean'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ==================================================================== */}
                {/* 10. PRIVACY & STORAGE                                                */}
                {/* ==================================================================== */}
                {activeTab === 'privacy' && (
                  <motion.div
                    key="privacy"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-6"
                  >
                    {/* Privacy Guarantee Card */}
                    <div className="p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl space-y-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-txt-primary">
                            100% Local-First & Private Architecture
                          </h3>
                          <p className="text-xs text-txt-secondary">
                            Your workspace is completely offline-first.
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-txt-secondary leading-relaxed">
                        All pages, tasks, habits, calendar events, focus sessions, journal reflections, and markdown notes are stored directly within your browser&apos;s sandboxed IndexedDB database. There are no tracking scripts, remote telemetry, third-party cookies, or unseen server synchronization.
                      </p>
                      <div className="flex flex-wrap gap-2 pt-1 text-[11px] font-mono">
                        <span className="px-2.5 py-1 rounded-lg bg-bg-card border border-border text-txt-secondary">
                          IndexedDB v3 Sandbox
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-bg-card border border-border text-txt-secondary">
                          Zero Telemetry
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-bg-card border border-border text-txt-secondary">
                          Offline Functional
                        </span>
                      </div>
                    </div>

                    {/* Storage Quota Metrics */}
                    <div className="p-5 bg-bg-subtle/40 rounded-2xl border border-border space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-semibold text-txt-primary">
                          <HardDrive className="w-4 h-4 text-primary" />
                          <span>IndexedDB Storage Quota</span>
                        </div>
                        {storageUsage && (
                          <span className="text-xs font-mono text-txt-muted">
                            {(storageUsage.usedBytes / (1024 * 1024)).toFixed(2)} MB of {(storageUsage.quotaBytes / (1024 * 1024 * 1024)).toFixed(1)} GB
                          </span>
                        )}
                      </div>

                      {/* Quota Progress Bar */}
                      {storageUsage && (
                        <div className="space-y-1">
                          <div className="w-full h-2 bg-bg-card rounded-full overflow-hidden border border-border">
                            <div 
                              className="h-full bg-primary rounded-full transition-all duration-300" 
                              style={{ width: `${Math.max(1, (storageUsage.usedBytes / storageUsage.quotaBytes) * 100)}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[11px] text-txt-muted font-mono">
                            <span>Browser quota utilization</span>
                            <span>{((storageUsage.usedBytes / storageUsage.quotaBytes) * 100).toFixed(4)}%</span>
                          </div>
                        </div>
                      )}

                      {/* Store Record Tallies */}
                      <div className="space-y-2 pt-2">
                        <div className="text-xs font-semibold text-txt-primary">Local Database Record Breakdown</div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                          <div className="p-2.5 bg-bg-card rounded-xl border border-border">
                            <div className="text-base font-mono font-bold text-primary">{pages.length}</div>
                            <div className="text-[11px] text-txt-muted">Pages</div>
                          </div>
                          <div className="p-2.5 bg-bg-card rounded-xl border border-border">
                            <div className="text-base font-mono font-bold text-primary">{tasks.length}</div>
                            <div className="text-[11px] text-txt-muted">Tasks</div>
                          </div>
                          <div className="p-2.5 bg-bg-card rounded-xl border border-border">
                            <div className="text-base font-mono font-bold text-primary">{habits.length}</div>
                            <div className="text-[11px] text-txt-muted">Habits</div>
                          </div>
                          <div className="p-2.5 bg-bg-card rounded-xl border border-border">
                            <div className="text-base font-mono font-bold text-primary">{habitLogs.length}</div>
                            <div className="text-[11px] text-txt-muted">Habit Logs</div>
                          </div>
                          <div className="p-2.5 bg-bg-card rounded-xl border border-border">
                            <div className="text-base font-mono font-bold text-primary">{events.length}</div>
                            <div className="text-[11px] text-txt-muted">Events</div>
                          </div>
                          <div className="p-2.5 bg-bg-card rounded-xl border border-border">
                            <div className="text-base font-mono font-bold text-primary">{notes.length}</div>
                            <div className="text-[11px] text-txt-muted">Notes</div>
                          </div>
                          <div className="p-2.5 bg-bg-card rounded-xl border border-border">
                            <div className="text-base font-mono font-bold text-primary">{journalEntries.length}</div>
                            <div className="text-[11px] text-txt-muted">Journal Entries</div>
                          </div>
                          <div className="p-2.5 bg-bg-card rounded-xl border border-border">
                            <div className="text-base font-mono font-bold text-primary">{timerSessionCount}</div>
                            <div className="text-[11px] text-txt-muted">Focus Sessions</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Cache & Data Maintenance */}
                    <div className="p-5 bg-bg-subtle/40 rounded-2xl border border-border space-y-4">
                      <div className="text-xs font-semibold text-txt-primary flex items-center gap-2">
                        <Trash2 className="w-4 h-4 text-txt-muted" />
                        <span>Cache & Data Maintenance</span>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-bg-card rounded-xl border border-border">
                        <div>
                          <div className="text-xs font-semibold text-txt-primary">Clear UI Temporary Cache</div>
                          <div className="text-[11px] text-txt-muted mt-0.5">
                            Clears cached session routes and search filters without removing any database records.
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleClearCache}
                          className="px-3.5 py-1.5 bg-bg-subtle hover:bg-bg-hover text-txt-primary border border-border rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0"
                        >
                          Clear Cache
                        </button>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-red-500/5 border border-red-500/20 rounded-xl">
                        <div>
                          <div className="text-xs font-semibold text-red-600 dark:text-red-400">Database Purge (Danger Zone)</div>
                          <div className="text-[11px] text-txt-muted mt-0.5">
                            Permanently wipes local database records and reinitializes default pages.
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleResetDefault}
                          disabled={isResetting}
                          className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                        >
                          {isResetting ? 'Resetting...' : 'Purge Database'}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
