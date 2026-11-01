import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { 
  openDB, 
  seedInitialDataIfNeeded, 
  undoLastSnapshot,
  formatLocalDate
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
  NavigationSection 
} from '../types';

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
  settings: UserSettings;
  activeSection: NavigationSection;
  selectedPageId: string | null;
  highlightedTaskId: string | null;
  highlightedHabitId: string | null;
  isSettingsOpen: boolean;
  isSearchOpen: boolean;
  toast: ToastInfo | null;
  errorMessage: string | null;

  // Navigation
  setActiveSection: (section: NavigationSection) => void;
  setSelectedPageId: (pageId: string | null) => void;
  setHighlightedTaskId: (taskId: string | null) => void;
  setHighlightedHabitId: (habitId: string | null) => void;
  setIsSettingsOpen: (open: boolean) => void;
  setIsSearchOpen: (open: boolean) => void;
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

  // Settings
  updateSetting: (key: string, value: any) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [pages, setPages] = useState<Page[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [dayColors, setDayColors] = useState<DayColor[]>([]);
  const [settings, setSettings] = useState<UserSettings>({
    theme: 'light',
    displayName: 'Dharinish',
    weekStart: 'monday',
    lastBackup: null,
    habitDefaultColor: '#0D9488',
    eventDefaultColor: '#F97316',
  });

  const [activeSection, setActiveSection] = useState<NavigationSection>('dashboard');
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);
  const [highlightedHabitId, setHighlightedHabitId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [toast, setToast] = useState<ToastInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const toastTimerRef = useRef<number | null>(null);

  const clearToast = useCallback(() => {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setToast(null);
  }, []);

  const showToast = useCallback((message: string, actionLabel?: string, onAction?: () => void, type: ToastInfo['type'] = 'info') => {
    clearToast();
    const id = Date.now().toString();
    setToast({ id, message, actionLabel, onAction, type });
    // Keep toast visible for 6.5s (Section 10: 6-7 seconds)
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
    }, 6500);
  }, [clearToast]);

  const refreshAll = useCallback(async () => {
    try {
      const db = await openDB();
      await seedInitialDataIfNeeded(db);

      const [p, t, h, hl, e, dc, s] = await Promise.all([
        Repository.getAllPages(),
        Repository.getAllTasks(),
        Repository.getAllHabits(),
        Repository.getAllHabitLogs(),
        Repository.getAllEvents(),
        Repository.getAllDayColors(),
        Repository.getAllSettings(),
      ]);

      setPages(p);
      setTasks(t);
      setHabits(h);
      setHabitLogs(hl);
      setEvents(e);
      setDayColors(dc);
      setSettings(s);
      setIsInitialized(true);

      // Apply theme to document element
      document.documentElement.setAttribute('data-theme', s.theme || 'light');
    } catch (err: any) {
      console.error('Failed to initialize database:', err);
      setErrorMessage(err?.message || 'Database initialization error');
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
    } catch (err: any) {
      console.error('Undo failed:', err);
      showToast(`Undo failed: ${err.message}`, undefined, undefined, 'error');
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
        if (isSearchOpen) {
          setIsSearchOpen(false);
          e.preventDefault();
          return;
        }
        if (isSettingsOpen) {
          setIsSettingsOpen(false);
          e.preventDefault();
          return;
        }
      }

      // 2. Ctrl/Cmd + K: Global search
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
  }, [isSearchOpen, isSettingsOpen, undo]);

  // Navigation helpers
  const navigateToTask = useCallback((pageId: string, taskId: string) => {
    setActiveSection('todo');
    setSelectedPageId(pageId);
    setHighlightedTaskId(taskId);
    setIsSearchOpen(false);
  }, []);

  const navigateToHabit = useCallback((habitId: string) => {
    setActiveSection('habits');
    setHighlightedHabitId(habitId);
    setIsSearchOpen(false);
  }, []);

  // Theme toggle
  const toggleTheme = useCallback(async () => {
    const nextTheme = settings.theme === 'light' ? 'dark' : 'light';
    // Optimistic
    document.documentElement.setAttribute('data-theme', nextTheme);
    setSettings(prev => ({ ...prev, theme: nextTheme }));
    try {
      await Repository.updateSetting('theme', nextTheme);
    } catch (err) {
      document.documentElement.setAttribute('data-theme', settings.theme);
      setSettings(prev => ({ ...prev, theme: settings.theme }));
      showToast('Failed to save theme setting', undefined, undefined, 'error');
    }
  }, [settings.theme, showToast]);

  const updateSetting = useCallback(async (key: string, value: any) => {
    const prevVal = (settings as any)[key];
    setSettings(prev => ({ ...prev, [key]: value }));
    try {
      await Repository.updateSetting(key, value);
    } catch (err: any) {
      setSettings(prev => ({ ...prev, [key]: prevVal }));
      showToast(`Failed to update setting: ${err.message}`, undefined, undefined, 'error');
    }
  }, [settings, showToast]);

  // --- Page operations ---
  const createPage = useCallback(async (data: { name: string; icon?: string; color?: string }) => {
    try {
      const newPage = await Repository.createPage(data);
      await refreshAll();
      showToast(`Created page "${newPage.name}"`, 'Undo', undo, 'success');
      return newPage;
    } catch (err: any) {
      showToast(err.message, undefined, undefined, 'error');
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
    } catch (err: any) {
      setPages(p => p.map(item => item.id === id ? prev : item));
      showToast(`Failed to update page: ${err.message}`, undefined, undefined, 'error');
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
    } catch (err: any) {
      setPages(prev);
      showToast(`Failed to reorder pages: ${err.message}`, undefined, undefined, 'error');
    }
  }, [pages, showToast]);

  const archivePage = useCallback(async (id: string) => {
    try {
      const page = await Repository.setPageArchived(id, true);
      await refreshAll();
      showToast(`Archived "${page.name}"`, 'Undo', undo, 'info');
    } catch (err: any) {
      showToast(`Failed to archive page: ${err.message}`, undefined, undefined, 'error');
    }
  }, [refreshAll, showToast, undo]);

  const restorePage = useCallback(async (id: string) => {
    try {
      const page = await Repository.setPageArchived(id, false);
      await refreshAll();
      showToast(`Restored "${page.name}"`, 'Undo', undo, 'success');
    } catch (err: any) {
      showToast(`Failed to restore page: ${err.message}`, undefined, undefined, 'error');
    }
  }, [refreshAll, showToast, undo]);

  const deletePagePermanently = useCallback(async (id: string, confirmationName: string) => {
    try {
      await Repository.deletePagePermanently(id, confirmationName);
      await refreshAll();
      if (selectedPageId === id) setSelectedPageId(null);
      showToast(`Permanently deleted page and its tasks`, 'Undo', undo, 'info');
    } catch (err: any) {
      showToast(err.message, undefined, undefined, 'error');
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
    } catch (err: any) {
      showToast(err.message, undefined, undefined, 'error');
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
    } catch (err: any) {
      setTasks(t => t.map(item => item.id === id ? prev : item));
      showToast(`Failed to update task: ${err.message}`, undefined, undefined, 'error');
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
    } catch (err: any) {
      setTasks(t => t.map(item => item.id === id ? target : item));
      showToast(`Failed to update task: ${err.message}`, undefined, undefined, 'error');
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
    } catch (err: any) {
      setTasks(t => [...t, target]);
      showToast(`Failed to delete task: ${err.message}`, undefined, undefined, 'error');
    }
  }, [refreshAll, showToast, tasks, undo]);

  const moveTaskToPage = useCallback(async (taskId: string, targetPageId: string) => {
    try {
      await Repository.moveTaskToPage(taskId, targetPageId);
      await refreshAll();
      showToast('Moved task to page', 'Undo', undo, 'info');
    } catch (err: any) {
      showToast(`Failed to move task: ${err.message}`, undefined, undefined, 'error');
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
    } catch (err: any) {
      setTasks(prev);
      showToast(`Failed to reorder tasks: ${err.message}`, undefined, undefined, 'error');
    }
  }, [showToast, tasks]);

  // --- Habit operations ---
  const createHabit = useCallback(async (data: { name: string; icon?: string; color?: string; schedule: Habit['schedule'] }) => {
    try {
      const newHabit = await Repository.createHabit(data);
      await refreshAll();
      showToast(`Created habit "${newHabit.name}"`, 'Undo', undo, 'success');
      return newHabit;
    } catch (err: any) {
      showToast(err.message, undefined, undefined, 'error');
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
    } catch (err: any) {
      setHabits(h => h.map(item => item.id === id ? prev : item));
      showToast(`Failed to update habit: ${err.message}`, undefined, undefined, 'error');
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
    } catch (err: any) {
      setHabits(h => [...h, target]);
      showToast(`Failed to delete habit: ${err.message}`, undefined, undefined, 'error');
    }
  }, [habits, refreshAll, showToast, undo]);

  const toggleHabitLog = useCallback(async (habitId: string, date: string) => {
    const target = habits.find(h => h.id === habitId);
    const existingLog = habitLogs.find(l => l.habitId === habitId && l.date === date);
    const nextCompleted = existingLog ? !existingLog.completed : true;

    // Optimistic
    setHabitLogs(logs => {
      const idx = logs.findIndex(l => l.habitId === habitId && l.date === date);
      if (idx !== -1) {
        return logs.map((l, i) => i === idx ? { ...l, completed: nextCompleted } : l);
      }
      return [...logs, { id: `${habitId}_${date}`, habitId, date, completed: true, updatedAt: new Date().toISOString() }];
    });

    try {
      await Repository.toggleHabitLog(habitId, date);
      await refreshAll();
      showToast(
        nextCompleted ? `Completed "${target?.name || 'habit'}" on ${date}` : `Unchecked "${target?.name || 'habit'}" on ${date}`,
        'Undo',
        undo,
        'info'
      );
    } catch (err: any) {
      await refreshAll();
      showToast(`Failed to update habit log: ${err.message}`, undefined, undefined, 'error');
    }
  }, [habitLogs, habits, refreshAll, showToast, undo]);

  // --- Calendar Event operations ---
  const createEvent = useCallback(async (data: { title: string; date: string; startTime?: string | null; endTime?: string | null; color?: string; category?: string }) => {
    try {
      const newEvent = await Repository.createEvent(data);
      await refreshAll();
      showToast(`Created event "${newEvent.title}"`, 'Undo', undo, 'success');
      return newEvent;
    } catch (err: any) {
      showToast(err.message, undefined, undefined, 'error');
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
    } catch (err: any) {
      setEvents(e => e.map(item => item.id === id ? prev : item));
      showToast(`Failed to update event: ${err.message}`, undefined, undefined, 'error');
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
    } catch (err: any) {
      setEvents(e => [...e, target]);
      showToast(`Failed to delete event: ${err.message}`, undefined, undefined, 'error');
    }
  }, [events, refreshAll, showToast, undo]);

  // --- Day Color operations ---
  const setDayColor = useCallback(async (date: string, color: string) => {
    setDayColors(prev => {
      const exists = prev.some(d => d.date === date);
      if (exists) {
        return prev.map(d => d.date === date ? { date, color } : d);
      }
      return [...prev, { date, color }];
    });
    try {
      await Repository.setDayColor(date, color);
    } catch (err: any) {
      await refreshAll();
      showToast(`Failed to set day color: ${err.message}`, undefined, undefined, 'error');
    }
  }, [refreshAll, showToast]);

  const removeDayColor = useCallback(async (date: string) => {
    setDayColors(prev => prev.filter(d => d.date !== date));
    try {
      await Repository.removeDayColor(date);
    } catch (err: any) {
      await refreshAll();
      showToast(`Failed to remove day color: ${err.message}`, undefined, undefined, 'error');
    }
  }, [refreshAll, showToast]);

  const value = {
    isInitialized,
    pages,
    tasks,
    habits,
    habitLogs,
    events,
    dayColors,
    settings,
    activeSection,
    selectedPageId,
    highlightedTaskId,
    highlightedHabitId,
    isSettingsOpen,
    isSearchOpen,
    toast,
    errorMessage,
    setActiveSection,
    setSelectedPageId,
    setHighlightedTaskId,
    setHighlightedHabitId,
    setIsSettingsOpen,
    setIsSearchOpen,
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
    updateSetting,
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

