import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  openDB, 
  seedInitialDataIfNeeded, 
  undoLastSnapshot,
  formatLocalDate,
  generateUUID,
  nowISO
} from '../db/indexedDB';
import { Repository } from '../db/repository';
import { 
  Page, 
  Task, 
  Habit, 
  HabitLog, 
  CalendarEvent, 
  DayColor, 
  UserSettings, 
  NavigationSection,
  JournalEntry,
  Note,
  GeneralSettings,
  AppearanceSettings,
  GlobalPreferences,
  ModuleSettingsMap
} from '../types';
import { getErrorMessage } from '../utils/errorUtils';
import { createDefaultUserSettings } from '../utils/defaultSettings';

export interface ToastInfo {
  id: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  type?: 'info' | 'success' | 'error';
}

interface WorkspaceContextType {
  // State
  isInitialized: boolean;
  pages: Page[];
  tasks: Task[];
  habits: Habit[];
  habitLogs: HabitLog[];
  events: CalendarEvent[];
  dayColors: DayColor[];
  journalEntries: JournalEntry[];
  notes: Note[];
  settings: UserSettings;
  activeSection: NavigationSection;
  selectedPageId: string | null;
  highlightedTaskId: string | null;
  highlightedHabitId: string | null;
  isSearchOpen: boolean;
  isSidebarCollapsed: boolean;
  isMobileSidebarOpen: boolean;
  toast: ToastInfo | null;
  errorMessage: string | null;

  // Navigation
  setActiveSection: (section: NavigationSection) => void;
  setSelectedPageId: (pageId: string | null) => void;
  setHighlightedTaskId: (taskId: string | null) => void;
  setHighlightedHabitId: (habitId: string | null) => void;
  setIsSearchOpen: (open: boolean) => void;
  setIsSidebarCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  setIsMobileSidebarOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  toggleSidebar: () => void;
  toggleMobileSidebar: () => void;
  navigateToTask: (pageId: string, taskId: string) => void;
  navigateToHabit: (habitId: string) => void;

  // Actions
  refreshAll: () => Promise<void>;
  showToast: (message: string, actionLabel?: string, onAction?: () => void, type?: ToastInfo['type']) => void;
  clearToast: () => void;
  undo: () => Promise<void>;

  // Pages
  createPage: (data: { name: string; icon?: string; color?: string }) => Promise<Page>;
  updatePage: (id: string, data: Partial<Pick<Page, 'name' | 'icon' | 'color'>>) => Promise<void>;
  reorderPages: (orderedIds: string[]) => Promise<void>;
  archivePage: (id: string) => Promise<void>;
  restorePage: (id: string) => Promise<void>;
  deletePagePermanently: (id: string, confirmationName: string) => Promise<void>;

  // Tasks
  createTask: (data: { pageId: string; title: string; priority?: Task['priority']; important?: boolean; dueDate?: string | null }) => Promise<Task>;
  updateTask: (id: string, data: Partial<Task>) => Promise<void>;
  toggleTaskCompleted: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  moveTaskToPage: (taskId: string, targetPageId: string) => Promise<void>;
  reorderTasksInPage: (pageId: string, orderedIds: string[]) => Promise<void>;

  // Habits
  createHabit: (data: { name: string; icon?: string; color?: string; schedule: Habit['schedule'] }) => Promise<Habit>;
  updateHabit: (id: string, data: Partial<Omit<Habit, 'id' | 'createdAt'>>) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  toggleHabitLog: (habitId: string, date: string) => Promise<void>;

  // Events
  createEvent: (data: { title: string; date: string; startTime?: string | null; endTime?: string | null; color?: string; category?: string }) => Promise<CalendarEvent>;
  updateEvent: (id: string, data: Partial<Omit<CalendarEvent, 'id' | 'createdAt'>>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;

  // Day Colors
  setDayColor: (date: string, color: string) => Promise<void>;
  removeDayColor: (date: string) => Promise<void>;

  // Journal
  createOrGetJournalEntry: (date: string) => Promise<JournalEntry>;
  saveJournalEntry: (entry: JournalEntry) => Promise<JournalEntry>;
  deleteJournalEntry: (date: string) => Promise<void>;

  // Notes
  createNote: (data?: { title?: string; content?: string; tags?: string[]; pinned?: boolean; icon?: string }) => Promise<Note>;
  updateNote: (id: string, data: Partial<Note>) => Promise<Note>;
  deleteNote: (id: string) => Promise<void>;
  reorderPinnedNotes: (orderedIds: string[]) => Promise<void>;
  refreshNotes: () => Promise<void>;

  // Settings
  updateSetting: (key: string, value: any) => Promise<void>;
  updateGeneralSettings: (updates: Partial<GeneralSettings>) => Promise<void>;
  updateAppearanceSettings: (updates: Partial<AppearanceSettings>) => Promise<void>;
  updateGlobalPreferences: (updates: Partial<GlobalPreferences>) => Promise<void>;
  updateModuleSettings: <K extends keyof ModuleSettingsMap>(module: K, updates: Partial<ModuleSettingsMap[K]>) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

export function applyAppearanceToDom(appearance?: AppearanceSettings) {
  if (!appearance || typeof document === 'undefined') return;
  let activeTheme = appearance.themeMode;
  if (activeTheme === 'system') {
    if (typeof window !== 'undefined' && window.matchMedia) {
      activeTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
      activeTheme = 'light';
    }
  }

  document.documentElement.setAttribute('data-theme', activeTheme);
  document.documentElement.setAttribute('data-bg-style', appearance.backgroundStyle || 'current');
  document.documentElement.setAttribute('data-accent', appearance.accentColor || 'blue');
  document.documentElement.setAttribute('data-font-size', appearance.fontSize || 'md');
  document.documentElement.setAttribute('data-density', appearance.density || 'comfortable');
  document.documentElement.setAttribute('data-animations', appearance.animations || 'full');

  try {
    localStorage.setItem('my_workspace_theme', activeTheme);
    localStorage.setItem('my_workspace_bg_style', appearance.backgroundStyle || 'current');
    localStorage.setItem('my_workspace_accent', appearance.accentColor || 'blue');
    localStorage.setItem('my_workspace_font_size', appearance.fontSize || 'md');
    localStorage.setItem('my_workspace_density', appearance.density || 'comfortable');
    localStorage.setItem('my_workspace_animations', appearance.animations || 'full');
  } catch {
    // Ignore storage errors in sandboxed contexts
  }
}

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [isInitialized, setIsInitialized] = useState(false);
  const [pages, setPages] = useState<Page[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [dayColors, setDayColors] = useState<DayColor[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [settings, setSettings] = useState<UserSettings>(createDefaultUserSettings);

  // Derive active section from URL pathname
  const activeSection = React.useMemo<NavigationSection>(() => {
    const p = location.pathname;
    if (p.startsWith('/calendar')) return 'calendar';
    if (p.startsWith('/habits')) return 'habits';
    if (p.startsWith('/journal')) return 'journal';
    if (p.startsWith('/notes')) return 'notes';
    if (p.startsWith('/timer') || p.startsWith('/activity')) return 'timer';
    if (p.startsWith('/pages')) return 'pages';
    if (p.startsWith('/tasks') || p.startsWith('/todo')) return 'todo';
    return 'dashboard';
  }, [location.pathname]);

  const setActiveSection = useCallback((section: NavigationSection) => {
    switch (section) {
      case 'dashboard':
        navigate('/dashboard');
        break;
      case 'todo':
        navigate('/tasks');
        break;
      case 'calendar':
        navigate('/calendar');
        break;
      case 'habits':
        navigate('/habits');
        break;
      case 'journal':
        navigate('/journal');
        break;
      case 'notes':
        navigate('/notes');
        break;
      case 'timer':
        navigate('/timer');
        break;
      case 'pages':
        navigate('/pages');
        break;
      default:
        navigate('/dashboard');
        break;
    }
  }, [navigate]);

  // Derive selected page ID directly from /pages/:pageId URL
  const selectedPageId = React.useMemo<string | null>(() => {
    const match = location.pathname.match(/^\/pages\/([^/]+)/);
    return match ? match[1] : null;
  }, [location.pathname]);

  const setSelectedPageId = useCallback((pageId: string | null) => {
    if (pageId) {
      navigate(`/pages/${pageId}`);
    } else {
      navigate('/pages');
    }
  }, [navigate]);

  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);
  const [highlightedHabitId, setHighlightedHabitId] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsedState] = useState<boolean>(() => {
    try {
      return localStorage.getItem('sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const setIsSidebarCollapsed = useCallback((action: boolean | ((prev: boolean) => boolean)) => {
    setIsSidebarCollapsedState(prev => {
      const next = typeof action === 'function' ? action(prev) : action;
      try {
        localStorage.setItem('sidebar_collapsed', String(next));
      } catch (e) {
        console.warn('Failed to save sidebar state to localStorage', e);
      }
      return next;
    });
  }, []);

  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed(prev => !prev);
  }, [setIsSidebarCollapsed]);

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const toggleMobileSidebar = useCallback(() => {
    setIsMobileSidebarOpen(prev => !prev);
  }, []);

  // Automatically close mobile sidebar if window is resized to desktop width
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [toast, setToast] = useState<ToastInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const toastTimerRef = useRef<number | null>(null);

  const clearToast = useCallback(() => {
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setToast(null);
  }, []);

  const showToast = useCallback((message: string, actionLabel?: string, onAction?: () => void, type: ToastInfo['type'] = 'info') => {
    // Clear any active timer immediately before scheduling next
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    const id = Date.now().toString();
    const wrappedAction = onAction ? () => {
      clearToast();
      onAction();
    } : undefined;
    setToast({ id, message, actionLabel, onAction: wrappedAction, type });
    // Keep toast visible for 6.5s (Section 10: 6-7 seconds)
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 6500);
  }, [clearToast]);

  // Clean up timer on unmount to prevent memory leaks and state updates on unmounted component
  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
        toastTimerRef.current = null;
      }
    };
  }, []);

  const refreshAll = useCallback(async () => {
    try {
      const db = await openDB();
      await seedInitialDataIfNeeded(db);

      const [p, t, h, hl, e, dc, s, j] = await Promise.all([
        Repository.getAllPages(),
        Repository.getAllTasks(),
        Repository.getAllHabits(),
        Repository.getAllHabitLogs(),
        Repository.getAllEvents(),
        Repository.getAllDayColors(),
        Repository.getAllSettings(),
        Repository.getAllJournalEntries(),
      ]);

      let n = await Repository.getAllNotes();
      if (n.length === 0) {
        n = await Repository.seedSampleNotesIfEmpty();
      }

      setPages(p);
      setTasks(t);
      setHabits(h);
      setHabitLogs(hl);
      setEvents(e);
      setDayColors(dc);
      setJournalEntries(j);
      setNotes(n);
      setSettings(s);
      setIsInitialized(true);

      // Apply appearance settings to document element
      applyAppearanceToDom(s.appearance);
    } catch (err: unknown) {
      console.error('Failed to initialize database:', err);
      setErrorMessage(getErrorMessage(err) || 'Database initialization error');
    }
  }, []);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Undo function
  const undo = useCallback(async () => {
    try {
      const db = await openDB();
      const res = await undoLastSnapshot(db);
      if (res) {
        await refreshAll();
        showToast(`Undid: ${res.action}`, undefined, undefined, 'success');
      } else {
        showToast('Nothing to undo', undefined, undefined, 'info');
      }
    } catch (err: unknown) {
      console.error('Undo failed:', err);
      showToast(`Undo failed: ${getErrorMessage(err)}`, undefined, undefined, 'error');
    }
  }, [refreshAll, showToast]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input, textarea, or contentEditable
      const target = e.target as HTMLElement | null;
      const isInput = target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.getAttribute('role') === 'textbox'
      );

      // 1. Esc: close modal or cancel active interaction
      if (e.key === 'Escape') {
        if (isMobileSidebarOpen) {
          setIsMobileSidebarOpen(false);
          e.preventDefault();
          return;
        }
        if (isSearchOpen) {
          setIsSearchOpen(false);
          e.preventDefault();
          return;
        }
      }

      // 2. Ctrl/Cmd + B: Toggle sidebar
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        if (!isInput) {
          e.preventDefault();
          if (window.innerWidth < 768) {
            toggleMobileSidebar();
          } else {
            toggleSidebar();
          }
          return;
        }
      }

      // 3. Ctrl/Cmd + K: Global search
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
        return;
      }

      // 3. Ctrl/Cmd + Z: Undo last action
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        // Only trigger global undo if not editing a rich text field
        if (!isInput) {
          e.preventDefault();
          undo();
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileSidebarOpen, isSearchOpen, toggleMobileSidebar, toggleSidebar, undo]);

  // Navigation helpers
  const navigateToTask = useCallback((pageId: string, taskId: string) => {
    setHighlightedTaskId(taskId);
    setIsSearchOpen(false);
    navigate(`/pages/${pageId}`);
  }, [navigate]);

  const navigateToHabit = useCallback((habitId: string) => {
    setHighlightedHabitId(habitId);
    setIsSearchOpen(false);
    navigate('/habits');
  }, [navigate]);

  // Listen for OS system theme changes when in 'system' mode
  useEffect(() => {
    if (settings.appearance?.themeMode !== 'system' || typeof window === 'undefined' || !window.matchMedia) {
      return;
    }
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      applyAppearanceToDom(settings.appearance);
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [settings.appearance]);

  const updateAppearanceSettings = useCallback(async (updates: Partial<AppearanceSettings>) => {
    const prevAppearance = settings.appearance;
    const newAppearance: AppearanceSettings = {
      ...prevAppearance,
      ...updates,
    };
    applyAppearanceToDom(newAppearance);

    const resolvedTheme: 'light' | 'dark' = newAppearance.themeMode === 'system'
      ? (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : (newAppearance.themeMode === 'dark' ? 'dark' : 'light');

    setSettings(prev => ({
      ...prev,
      theme: resolvedTheme,
      backgroundStyle: newAppearance.backgroundStyle,
      appearance: newAppearance,
    }));

    try {
      await Repository.updateSetting('appearance', newAppearance);
      await Repository.updateSetting('theme', resolvedTheme);
      await Repository.updateSetting('backgroundStyle', newAppearance.backgroundStyle);
      showToast('Appearance settings updated', undefined, undefined, 'success');
    } catch (err: unknown) {
      applyAppearanceToDom(prevAppearance);
      setSettings(prev => ({
        ...prev,
        theme: prevAppearance.themeMode === 'dark' ? 'dark' : 'light',
        backgroundStyle: prevAppearance.backgroundStyle,
        appearance: prevAppearance,
      }));
      showToast(`Failed to update appearance: ${getErrorMessage(err)}`, undefined, undefined, 'error');
    }
  }, [settings.appearance, showToast]);

  // Theme toggle
  const toggleTheme = useCallback(async () => {
    const currentTheme = settings.appearance?.themeMode === 'system'
      ? (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : (settings.theme || 'light');
    const nextTheme: 'light' | 'dark' = currentTheme === 'light' ? 'dark' : 'light';
    await updateAppearanceSettings({ themeMode: nextTheme });
  }, [settings.appearance, settings.theme, updateAppearanceSettings]);

  const updateGeneralSettings = useCallback(async (updates: Partial<GeneralSettings>) => {
    const prevGeneral = settings.general;
    const newGeneral: GeneralSettings = {
      ...prevGeneral,
      ...updates,
    };

    setSettings(prev => ({
      ...prev,
      displayName: newGeneral.displayName,
      weekStart: newGeneral.weekStart,
      general: newGeneral,
    }));

    try {
      await Repository.updateSetting('general', newGeneral);
      if (updates.displayName !== undefined) {
        await Repository.updateSetting('displayName', newGeneral.displayName);
      }
      if (updates.weekStart !== undefined) {
        await Repository.updateSetting('weekStart', newGeneral.weekStart);
      }
      showToast('General preferences updated', undefined, undefined, 'success');
    } catch (err: unknown) {
      setSettings(prev => ({
        ...prev,
        displayName: prevGeneral.displayName,
        weekStart: prevGeneral.weekStart,
        general: prevGeneral,
      }));
      showToast(`Failed to update general preferences: ${getErrorMessage(err)}`, undefined, undefined, 'error');
    }
  }, [settings.general, showToast]);

  const updateGlobalPreferences = useCallback(async (updates: Partial<GlobalPreferences>) => {
    const prevGlobal = settings.globalPreferences;
    const newGlobal: GlobalPreferences = {
      ...prevGlobal,
      ...updates,
    };

    setSettings(prev => ({
      ...prev,
      globalPreferences: newGlobal,
    }));

    try {
      await Repository.updateSetting('globalPreferences', newGlobal);
      showToast('Global preferences updated', undefined, undefined, 'success');
    } catch (err: unknown) {
      setSettings(prev => ({ ...prev, globalPreferences: prevGlobal }));
      showToast(`Failed to update preferences: ${getErrorMessage(err)}`, undefined, undefined, 'error');
    }
  }, [settings.globalPreferences, showToast]);

  const updateModuleSettings = useCallback(async <K extends keyof ModuleSettingsMap>(
    moduleName: K,
    updates: Partial<ModuleSettingsMap[K]>
  ) => {
    const prevModules = settings.modules;
    const prevModule = settings.modules[moduleName];
    const newModule = {
      ...prevModule,
      ...updates,
    };
    const newModules: ModuleSettingsMap = {
      ...prevModules,
      [moduleName]: newModule,
    };

    setSettings(prev => ({
      ...prev,
      modules: newModules,
      ...(moduleName === 'timer' ? {
        timerConfig: {
          workMinutes: (newModule as any).workMinutes,
          shortBreakMinutes: (newModule as any).shortBreakMinutes,
          longBreakMinutes: (newModule as any).longBreakMinutes,
          longBreakInterval: (newModule as any).longBreakInterval,
          dailyGoalMinutes: (newModule as any).dailyGoalMinutes,
        }
      } : {})
    }));

    try {
      await Repository.updateSetting('modules', newModules);
      await Repository.updateSetting(`module_${moduleName}`, newModule);
      if (moduleName === 'timer') {
        await Repository.updateSetting('timerConfig', newModule);
      }
      showToast(`${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)} settings saved`, undefined, undefined, 'success');
    } catch (err: unknown) {
      setSettings(prev => ({ ...prev, modules: prevModules }));
      showToast(`Failed to update ${moduleName} settings: ${getErrorMessage(err)}`, undefined, undefined, 'error');
    }
  }, [settings.modules, showToast]);

  const updateSetting = useCallback(async (key: string, value: any) => {
    const prevVal = (settings as any)[key];
    setSettings(prev => ({ ...prev, [key]: value }));

    if (key === 'backgroundStyle') {
      const bgVal = value || 'current';
      document.documentElement.setAttribute('data-bg-style', bgVal);
      try {
        localStorage.setItem('my_workspace_bg_style', bgVal);
      } catch (e) {}
    }
    if (key === 'theme') {
      const themeVal = value || 'light';
      document.documentElement.setAttribute('data-theme', themeVal);
      try {
        localStorage.setItem('my_workspace_theme', themeVal);
      } catch (e) {}
    }

    try {
      await Repository.updateSetting(key, value);
    } catch (err: unknown) {
      setSettings(prev => ({ ...prev, [key]: prevVal }));
      if (key === 'backgroundStyle') {
        document.documentElement.setAttribute('data-bg-style', prevVal || 'current');
      }
      showToast(`Failed to update setting: ${getErrorMessage(err)}`, undefined, undefined, 'error');
    }
  }, [settings, showToast]);

  // --- Page operations ---
  const createPage = useCallback(async (data: { name: string; icon?: string; color?: string }) => {
    try {
      const newPage = await Repository.createPage(data);
      await refreshAll();
      showToast(`Created page "${newPage.name}"`, 'Undo', undo, 'success');
      return newPage;
    } catch (err: unknown) {
      showToast(getErrorMessage(err), undefined, undefined, 'error');
      throw err;
    }
  }, [refreshAll, showToast, undo]);

  const updatePage = useCallback(async (id: string, data: Partial<Pick<Page, 'name' | 'icon' | 'color'>>) => {
    const prev = pages.find(p => p.id === id);
    if (!prev) return;
    setPages(p => p.map(item => item.id === id ? { ...item, ...data } : item));
    try {
      await Repository.updatePage(id, data);
      await refreshAll();
    } catch (err: unknown) {
      setPages(p => p.map(item => item.id === id ? prev : item));
      showToast(`Failed to update page: ${getErrorMessage(err)}`, undefined, undefined, 'error');
    }
  }, [pages, refreshAll, showToast]);

  const reorderPages = useCallback(async (orderedIds: string[]) => {
    const prev = [...pages];
    const newPages = orderedIds.map((id, index) => {
      const found = pages.find(p => p.id === id)!;
      return { ...found, order: index };
    });
    setPages(newPages);
    try {
      await Repository.reorderPages(orderedIds);
    } catch (err: unknown) {
      setPages(prev);
      showToast(`Failed to reorder pages: ${getErrorMessage(err)}`, undefined, undefined, 'error');
    }
  }, [pages, showToast]);

  const archivePage = useCallback(async (id: string) => {
    try {
      const page = await Repository.setPageArchived(id, true);
      await refreshAll();
      showToast(`Archived "${page.name}"`, 'Undo', undo, 'info');
    } catch (err: unknown) {
      showToast(`Failed to archive page: ${getErrorMessage(err)}`, undefined, undefined, 'error');
    }
  }, [refreshAll, showToast, undo]);

  const restorePage = useCallback(async (id: string) => {
    try {
      const page = await Repository.setPageArchived(id, false);
      await refreshAll();
      showToast(`Restored "${page.name}"`, 'Undo', undo, 'success');
    } catch (err: unknown) {
      showToast(`Failed to restore page: ${getErrorMessage(err)}`, undefined, undefined, 'error');
    }
  }, [refreshAll, showToast, undo]);

  const deletePagePermanently = useCallback(async (id: string, confirmationName: string) => {
    try {
      await Repository.deletePagePermanently(id, confirmationName);
      await refreshAll();
      if (selectedPageId === id) setSelectedPageId(null);
      showToast(`Permanently deleted page and its tasks`, 'Undo', undo, 'info');
    } catch (err: unknown) {
      showToast(getErrorMessage(err), undefined, undefined, 'error');
      throw err;
    }
  }, [refreshAll, selectedPageId, showToast, undo]);

  // --- Task operations ---
  const createTask = useCallback(async (data: { pageId: string; title: string; priority?: Task['priority']; important?: boolean; dueDate?: string | null }) => {
    try {
      const newTask = await Repository.createTask(data);
      await refreshAll();
      showToast(`Created task "${newTask.title}"`, 'Undo', undo, 'success');
      return newTask;
    } catch (err: unknown) {
      showToast(getErrorMessage(err), undefined, undefined, 'error');
      throw err;
    }
  }, [refreshAll, showToast, undo]);

  const updateTask = useCallback(async (id: string, data: Partial<Task>) => {
    const prev = tasks.find(t => t.id === id);
    if (!prev) return;
    setTasks(t => t.map(item => item.id === id ? { ...item, ...data } : item));
    try {
      await Repository.updateTask(id, data);
      await refreshAll();
    } catch (err: unknown) {
      setTasks(t => t.map(item => item.id === id ? prev : item));
      showToast(`Failed to update task: ${getErrorMessage(err)}`, undefined, undefined, 'error');
    }
  }, [refreshAll, showToast, tasks]);

  const toggleTaskCompleted = useCallback(async (id: string) => {
    const target = tasks.find(t => t.id === id);
    if (!target) return;
    const nextCompleted = !target.completed;
    // Optimistic
    setTasks(t => t.map(item => item.id === id ? { ...item, completed: nextCompleted } : item));
    try {
      await Repository.toggleTaskCompleted(id);
      await refreshAll();
      showToast(
        nextCompleted ? `Completed "${target.title}"` : `Reopened "${target.title}"`,
        'Undo',
        undo,
        'info'
      );
    } catch (err: unknown) {
      setTasks(t => t.map(item => item.id === id ? target : item));
      showToast(`Failed to update task: ${getErrorMessage(err)}`, undefined, undefined, 'error');
    }
  }, [refreshAll, showToast, tasks, undo]);

  const deleteTask = useCallback(async (id: string) => {
    const target = tasks.find(t => t.id === id);
    if (!target) return;
    setTasks(t => t.filter(item => item.id !== id));
    try {
      await Repository.deleteTask(id);
      await refreshAll();
      showToast(`Deleted task "${target.title}"`, 'Undo', undo, 'info');
    } catch (err: unknown) {
      setTasks(t => [...t, target]);
      showToast(`Failed to delete task: ${getErrorMessage(err)}`, undefined, undefined, 'error');
    }
  }, [refreshAll, showToast, tasks, undo]);

  const moveTaskToPage = useCallback(async (taskId: string, targetPageId: string) => {
    try {
      await Repository.moveTaskToPage(taskId, targetPageId);
      await refreshAll();
      showToast('Moved task to page', 'Undo', undo, 'info');
    } catch (err: unknown) {
      showToast(`Failed to move task: ${getErrorMessage(err)}`, undefined, undefined, 'error');
    }
  }, [refreshAll, showToast, undo]);

  const reorderTasksInPage = useCallback(async (pageId: string, orderedIds: string[]) => {
    const prev = [...tasks];
    setTasks(t => {
      return t.map(task => {
        if (task.pageId === pageId) {
          const idx = orderedIds.indexOf(task.id);
          if (idx !== -1) {
            return { ...task, order: idx };
          }
        }
        return task;
      });
    });

    try {
      await Repository.reorderTasksInPage(pageId, orderedIds);
    } catch (err: unknown) {
      setTasks(prev);
      showToast(`Failed to reorder tasks: ${getErrorMessage(err)}`, undefined, undefined, 'error');
    }
  }, [showToast, tasks]);

  // --- Habit operations ---
  const createHabit = useCallback(async (data: { name: string; icon?: string; color?: string; schedule: Habit['schedule'] }) => {
    try {
      const newHabit = await Repository.createHabit(data);
      await refreshAll();
      showToast(`Created habit "${newHabit.name}"`, 'Undo', undo, 'success');
      return newHabit;
    } catch (err: unknown) {
      showToast(getErrorMessage(err), undefined, undefined, 'error');
      throw err;
    }
  }, [refreshAll, showToast, undo]);

  const updateHabit = useCallback(async (id: string, data: Partial<Omit<Habit, 'id' | 'createdAt'>>) => {
    const prev = habits.find(h => h.id === id);
    if (!prev) return;
    setHabits(h => h.map(item => item.id === id ? { ...item, ...data } : item));
    try {
      await Repository.updateHabit(id, data);
      await refreshAll();
    } catch (err: unknown) {
      setHabits(h => h.map(item => item.id === id ? prev : item));
      showToast(`Failed to update habit: ${getErrorMessage(err)}`, undefined, undefined, 'error');
    }
  }, [habits, refreshAll, showToast]);

  const deleteHabit = useCallback(async (id: string) => {
    const target = habits.find(h => h.id === id);
    if (!target) return;
    setHabits(h => h.filter(item => item.id !== id));
    try {
      await Repository.deleteHabit(id);
      await refreshAll();
      showToast(`Deleted habit "${target.name}"`, 'Undo', undo, 'info');
    } catch (err: unknown) {
      setHabits(h => [...h, target]);
      showToast(`Failed to delete habit: ${getErrorMessage(err)}`, undefined, undefined, 'error');
    }
  }, [habits, refreshAll, showToast, undo]);

  const toggleHabitLog = useCallback(async (habitId: string, date: string) => {
    const target = habits.find(h => h.id === habitId);
    const existingLog = habitLogs.find(l => l.habitId === habitId && l.date === date);
    const nextCompleted = existingLog ? !existingLog.completed : true;

    // Optimistic local update
    setHabitLogs(logs => {
      const idx = logs.findIndex(l => l.habitId === habitId && l.date === date);
      if (idx !== -1) {
        return logs.map((l, i) => i === idx ? { ...l, completed: nextCompleted } : l);
      }
      return [...logs, { id: `${habitId}_${date}`, habitId, date, completed: true, updatedAt: new Date().toISOString() }];
    });

    try {
      const updatedLog = await Repository.toggleHabitLog(habitId, date);
      setHabitLogs(logs => {
        const idx = logs.findIndex(l => l.habitId === habitId && l.date === date);
        if (idx !== -1) {
          return logs.map((l, i) => i === idx ? updatedLog : l);
        }
        return [...logs, updatedLog];
      });
      showToast(
        nextCompleted ? `Completed "${target?.name || 'habit'}" on ${date}` : `Unchecked "${target?.name || 'habit'}" on ${date}`,
        'Undo',
        undo,
        'info'
      );
    } catch (err: unknown) {
      // Localized rollback without refreshAll()
      setHabitLogs(logs => {
        if (existingLog) {
          return logs.map(l => (l.habitId === habitId && l.date === date) ? existingLog : l);
        } else {
          return logs.filter(l => !(l.habitId === habitId && l.date === date));
        }
      });
      showToast(`Failed to update habit log: ${getErrorMessage(err)}`, undefined, undefined, 'error');
    }
  }, [habitLogs, habits, showToast, undo]);

  // --- Calendar Event operations ---
  const createEvent = useCallback(async (data: { title: string; date: string; startTime?: string | null; endTime?: string | null; color?: string; category?: string }) => {
    try {
      const newEvent = await Repository.createEvent(data);
      await refreshAll();
      showToast(`Created event "${newEvent.title}"`, 'Undo', undo, 'success');
      return newEvent;
    } catch (err: unknown) {
      showToast(getErrorMessage(err), undefined, undefined, 'error');
      throw err;
    }
  }, [refreshAll, showToast, undo]);

  const updateEvent = useCallback(async (id: string, data: Partial<Omit<CalendarEvent, 'id' | 'createdAt'>>) => {
    const prev = events.find(e => e.id === id);
    if (!prev) return;
    setEvents(e => e.map(item => item.id === id ? { ...item, ...data } : item));
    try {
      await Repository.updateEvent(id, data);
      await refreshAll();
    } catch (err: unknown) {
      setEvents(e => e.map(item => item.id === id ? prev : item));
      showToast(`Failed to update event: ${getErrorMessage(err)}`, undefined, undefined, 'error');
    }
  }, [events, refreshAll, showToast]);

  const deleteEvent = useCallback(async (id: string) => {
    const target = events.find(e => e.id === id);
    if (!target) return;
    setEvents(e => e.filter(item => item.id !== id));
    try {
      await Repository.deleteEvent(id);
      await refreshAll();
      showToast(`Deleted event "${target.title}"`, 'Undo', undo, 'info');
    } catch (err: unknown) {
      setEvents(e => [...e, target]);
      showToast(`Failed to delete event: ${getErrorMessage(err)}`, undefined, undefined, 'error');
    }
  }, [events, refreshAll, showToast, undo]);

  // --- Day Color operations ---
  const setDayColor = useCallback(async (date: string, color: string) => {
    const prevColor = dayColors.find(d => d.date === date);
    setDayColors(prev => {
      const exists = prev.some(d => d.date === date);
      if (exists) {
        return prev.map(d => d.date === date ? { date, color } : d);
      }
      return [...prev, { date, color }];
    });
    try {
      await Repository.setDayColor(date, color);
    } catch (err: unknown) {
      setDayColors(prev => {
        if (prevColor) {
          return prev.map(d => d.date === date ? prevColor : d);
        }
        return prev.filter(d => d.date !== date);
      });
      showToast(`Failed to set day color: ${getErrorMessage(err)}`, undefined, undefined, 'error');
    }
  }, [dayColors, showToast]);

  const removeDayColor = useCallback(async (date: string) => {
    const prevColor = dayColors.find(d => d.date === date);
    if (!prevColor) return;
    setDayColors(prev => prev.filter(d => d.date !== date));
    try {
      await Repository.removeDayColor(date);
    } catch (err: unknown) {
      setDayColors(prev => [...prev, prevColor]);
      showToast(`Failed to remove day color: ${getErrorMessage(err)}`, undefined, undefined, 'error');
    }
  }, [dayColors, showToast]);

  const createOrGetJournalEntry = useCallback(async (date: string): Promise<JournalEntry> => {
    const existing = await Repository.getJournalEntryByDate(date);
    if (existing) {
      return existing;
    }
    const newEntry: JournalEntry = {
      id: generateUUID(),
      date,
      title: null,
      body: '',
      mood: null,
      tags: [],
      createdAt: nowISO(),
      updatedAt: nowISO()
    };
    const saved = await Repository.saveJournalEntry(newEntry);
    setJournalEntries(prev => [saved, ...prev.filter(item => item.date !== date)].sort((a, b) => b.date.localeCompare(a.date)));
    return saved;
  }, []);

  const saveJournalEntry = useCallback(async (entry: JournalEntry): Promise<JournalEntry> => {
    const saved = await Repository.saveJournalEntry(entry);
    setJournalEntries(prev => [saved, ...prev.filter(item => item.date !== saved.date)].sort((a, b) => b.date.localeCompare(a.date)));
    return saved;
  }, []);

  const deleteJournalEntry = useCallback(async (date: string): Promise<void> => {
    await Repository.deleteJournalEntry(date);
    setJournalEntries(prev => prev.filter(item => item.date !== date));
  }, []);

  const refreshNotes = useCallback(async () => {
    const allNotes = await Repository.getAllNotes();
    setNotes(allNotes);
  }, []);

  const createNote = useCallback(async (data?: { title?: string; content?: string; tags?: string[]; pinned?: boolean; icon?: string }): Promise<Note> => {
    const newNote = await Repository.createNote(data || {});
    setNotes(prev => [newNote, ...prev]);
    return newNote;
  }, []);

  const updateNote = useCallback(async (id: string, data: Partial<Note>): Promise<Note> => {
    const updated = await Repository.updateNote(id, data);
    setNotes(prev => {
      const updatedList = prev.map(n => (n.id === id ? updated : n));
      return updatedList.sort((a, b) => {
        if (a.pinned && b.pinned) {
          return (a.pinnedOrder ?? 0) - (b.pinnedOrder ?? 0);
        }
        if (a.pinned) return -1;
        if (b.pinned) return 1;
        return b.updatedAt.localeCompare(a.updatedAt);
      });
    });
    return updated;
  }, []);

  const deleteNote = useCallback(async (id: string): Promise<void> => {
    const target = notes.find(n => n.id === id);
    await Repository.deleteNote(id);
    setNotes(prev => prev.filter(n => n.id !== id));
    if (target) {
      showToast(`Note "${target.title}" deleted`, 'Undo', undo, 'info');
    }
  }, [notes, undo, showToast]);

  const reorderPinnedNotes = useCallback(async (orderedIds: string[]): Promise<void> => {
    setNotes(prev => {
      const pinnedNotesMap = new Map(prev.filter(n => n.pinned).map(n => [n.id, n]));
      const nonPinnedNotes = prev.filter(n => !n.pinned);
      const reorderedPinned: Note[] = [];
      orderedIds.forEach((id, idx) => {
        const item = pinnedNotesMap.get(id);
        if (item) {
          reorderedPinned.push({ ...item, pinnedOrder: idx });
        }
      });
      return [...reorderedPinned, ...nonPinnedNotes];
    });
    await Repository.reorderPinnedNotes(orderedIds);
  }, []);

  const value = {
    isInitialized,
    pages,
    tasks,
    habits,
    habitLogs,
    events,
    dayColors,
    journalEntries,
    notes,
    settings,
    activeSection,
    selectedPageId,
    highlightedTaskId,
    highlightedHabitId,
    isSearchOpen,
    isSidebarCollapsed,
    isMobileSidebarOpen,
    toast,
    errorMessage,
    setActiveSection,
    setSelectedPageId,
    setHighlightedTaskId,
    setHighlightedHabitId,
    setIsSearchOpen,
    setIsSidebarCollapsed,
    setIsMobileSidebarOpen,
    toggleSidebar,
    toggleMobileSidebar,
    navigateToTask,
    navigateToHabit,
    refreshAll,
    showToast,
    clearToast,
    undo,
    createPage,
    updatePage,
    reorderPages,
    archivePage,
    restorePage,
    deletePagePermanently,
    createTask,
    updateTask,
    toggleTaskCompleted,
    deleteTask,
    moveTaskToPage,
    reorderTasksInPage,
    createHabit,
    updateHabit,
    deleteHabit,
    toggleHabitLog,
    createEvent,
    updateEvent,
    deleteEvent,
    setDayColor,
    removeDayColor,
    createOrGetJournalEntry,
    saveJournalEntry,
    deleteJournalEntry,
    createNote,
    updateNote,
    deleteNote,
    reorderPinnedNotes,
    refreshNotes,
    updateSetting,
    updateGeneralSettings,
    updateAppearanceSettings,
    updateGlobalPreferences,
    updateModuleSettings,
    toggleTheme,
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};

