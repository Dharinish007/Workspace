export type TimerMode = 'pomodoro' | 'stopwatch';
export type PomodoroPhase = 'work' | 'shortBreak' | 'longBreak';
export type TimerStatus = 'idle' | 'running' | 'paused' | 'review';
export type SessionStatus = 'saved' | 'discarded';
export type SessionOutcome = 'completed' | 'interrupted' | 'abandoned';
export type SessionSource = 'timer' | 'manual';

export interface TimeSegment {
  start: number; // epoch ms
  end: number | null; // epoch ms (null only while actively running)
}

export interface TimerSession {
  id: string; // UUID
  status: SessionStatus;
  mode: TimerMode;
  phase?: PomodoroPhase;
  taskId?: string | null;
  label: string;
  startedAt: number; // epoch ms
  endedAt: number; // epoch ms
  segments: TimeSegment[];
  plannedMs?: number | null;
  outcome?: SessionOutcome;
  pauseCount: number;
  note?: string;
  localDate: string; // YYYY-MM-DD
  timeZone: string;
  wasAdjusted: boolean;
  source: SessionSource;
  createdAt: number;
  updatedAt: number;
}

export interface PomodoroCycleState {
  completedWorkBlocks: number; // 0 to 4
  currentBlockIndex: number;   // 0 to 3
}

export interface ActiveTimerState {
  id: 'current';
  status: TimerStatus;
  mode: TimerMode;
  phase: PomodoroPhase;
  label: string;
  taskId: string | null;
  note: string;
  startedAt: number | null; // session start timestamp
  plannedMs: number | null;
  segments: TimeSegment[];
  pauseCount: number;
  pomodoroCycle: PomodoroCycleState;
  lastHeartbeat: number; // epoch ms
  ownerTabId: string | null;
  ownerLeaseExpiresAt: number | null;
  wallClockBaseline?: number;
  monotonicBaseline?: number;
}

export interface TimerConfig {
  workMinutes: number;          // default 25
  shortBreakMinutes: number;     // default 5
  longBreakMinutes: number;      // default 15
  longBreakInterval: number;     // default 4
  dailyGoalMinutes: number | null; // optional, null by default
}

export const DEFAULT_TIMER_CONFIG: TimerConfig = {
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakInterval: 4,
  dailyGoalMinutes: null,
};

export type ActivityAction =
  | 'session.started'
  | 'session.paused'
  | 'session.resumed'
  | 'session.stopped'
  | 'session.saved'
  | 'session.updated'
  | 'session.discarded'
  | 'session.reset'
  | 'session.recovered';

export interface ActivityLogEvent {
  id: string;
  timestamp: number;
  entity: 'timer_session' | 'timer_cycle' | 'task' | 'settings';
  entityId: string;
  action: ActivityAction;
  diff?: {
    before?: any;
    after?: any;
  };
  source: SessionSource | 'system';
}

export interface DailyFocusSummary {
  date: string; // YYYY-MM-DD
  totalActiveMs: number;
  pomodoroCount: number;
  stopwatchCount: number;
  completedWorkBlocks: number;
  sessions: TimerSession[];
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

