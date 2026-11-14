export type Priority = 'high' | 'medium' | 'low';

export interface Page {
  id: string;
  name: string;
  icon: string;
  color: string;
  order: number;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  pageId: string;
  title: string;
  priority: Priority;
  important: boolean;
  completed: boolean;
  completedAt: string | null;
  dueDate: string | null; // YYYY-MM-DD
  order: number;
  createdAt: string;
  updatedAt: string;
}

export type HabitSchedule = 
  | { type: 'daily' }
  | { type: 'weekdays'; days: number[] }; // 1 = Monday, ..., 7 = Sunday

export interface Habit {
  id: string;
  name: string;
  icon: string;
  color: string;
  schedule: HabitSchedule;
  createdAt: string;
  updatedAt: string;
}

export interface HabitLog {
  id: string; // `${habitId}_${date}`
  habitId: string;
  date: string; // YYYY-MM-DD
  completed: boolean;
  updatedAt: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string | null; // HH:mm (e.g. "09:30")
  endTime: string | null;   // HH:mm (e.g. "11:00")
  color: string;
  category: string;
  createdAt: string;
  updatedAt: string;
}

export interface DayColor {
  date: string; // YYYY-MM-DD
  color: string;
}

export type JournalMood = 'terrible' | 'bad' | 'neutral' | 'good' | 'great';

export interface JournalEntry {
  id: string;
  date: string; // YYYY-MM-DD (unique key per calendar date)
  title: string | null;
  body: string;
  mood: JournalMood | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  pinned: boolean;
  pinnedOrder: number;
  icon?: string;
  createdAt: string;
  updatedAt: string;
}

export * from './settings';
import type { UserSettings } from './settings';

import type { TimerSession, ActiveTimerState, ActivityLogEvent } from '../features/timer/types';

export interface StoreEntityMap {
  pages: Page;
  tasks: Task;
  habits: Habit;
  habitLogs: HabitLog;
  events: CalendarEvent;
  dayColors: DayColor;
  settings: { key: string; value: any };
  journalEntries: JournalEntry;
  notes: Note;
  timerSessions: TimerSession;
  timerActiveState: ActiveTimerState;
  activityLogs: ActivityLogEvent;
}

export type SnapshotStoreName = keyof StoreEntityMap;

export interface TypedSnapshotRecord<K extends SnapshotStoreName = SnapshotStoreName> {
  storeName: K;
  key: string | number;
  type: 'insert' | 'update' | 'delete';
  before: StoreEntityMap[K] | null;
  after: StoreEntityMap[K] | null;
}

export type SnapshotRecord = {
  [K in SnapshotStoreName]: TypedSnapshotRecord<K>;
}[SnapshotStoreName];

export interface Snapshot {
  id?: number;
  timestamp: string;
  action: string;
  records: SnapshotRecord[];
}

export interface BackupData {
  app: 'my-workspace';
  schemaVersion: number;
  exportedAt: string;
  data: {
    pages: Page[];
    tasks: Task[];
    habits: Habit[];
    habitLogs: HabitLog[];
    events: CalendarEvent[];
    dayColors: DayColor[];
    settings: Partial<UserSettings> & Record<string, any>;
    journalEntries?: JournalEntry[];
    notes?: Note[];
    timerSessions?: TimerSession[];
    activityLogs?: ActivityLogEvent[];
  };
}

export type NavigationSection = 'dashboard' | 'todo' | 'calendar' | 'habits' | 'pages' | 'journal' | 'notes' | 'timer';

export type TaskFilter = 'all' | 'open' | 'important' | 'completed' | 'today';
export type CalendarView = 'month' | 'week' | 'day';
export type HabitViewTemplate = 'table' | 'card' | 'heatmap';

export * from './theme';


