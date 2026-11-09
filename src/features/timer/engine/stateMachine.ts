import { TimerStatus, SessionStatus, TimeSegment, ActiveTimerState } from '../types';

export const ALLOWED_TRANSITIONS: Record<TimerStatus, (TimerStatus | SessionStatus)[]> = {
  idle: ['running'],
  running: ['paused', 'review', 'idle'],
  paused: ['running', 'review', 'idle'],
  review: ['saved', 'discarded', 'idle'],
};

/**
 * Validates whether a state transition is permitted.
 */
export function isValidTransition(from: TimerStatus, to: TimerStatus | SessionStatus): boolean {
  const allowed = ALLOWED_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

/**
 * Pure state reducer helpers for timer actions
 */

export function startTimer(state: ActiveTimerState, now: number = Date.now()): ActiveTimerState {
  if (!isValidTransition(state.status, 'running')) {
    throw new Error(`Cannot start timer from state: ${state.status}`);
  }

  const newSegments: TimeSegment[] = [
    ...state.segments,
    { start: now, end: null }
  ];

  return {
    ...state,
    status: 'running',
    startedAt: state.startedAt ?? now,
    segments: newSegments,
    lastHeartbeat: now,
  };
}

export function pauseTimer(state: ActiveTimerState, now: number = Date.now()): ActiveTimerState {
  if (!isValidTransition(state.status, 'paused')) {
    throw new Error(`Cannot pause timer from state: ${state.status}`);
  }

  // Close the open segment
  const updatedSegments = state.segments.map((seg, idx) => {
    if (idx === state.segments.length - 1 && seg.end === null) {
      return { ...seg, end: now };
    }
    return seg;
  });

  return {
    ...state,
    status: 'paused',
    segments: updatedSegments,
    pauseCount: state.pauseCount + 1,
    lastHeartbeat: now,
  };
}

export function resumeTimer(state: ActiveTimerState, now: number = Date.now()): ActiveTimerState {
  if (!isValidTransition(state.status, 'running')) {
    throw new Error(`Cannot resume timer from state: ${state.status}`);
  }

  const newSegments: TimeSegment[] = [
    ...state.segments,
    { start: now, end: null }
  ];

  return {
    ...state,
    status: 'running',
    segments: newSegments,
    lastHeartbeat: now,
  };
}

export function stopTimer(state: ActiveTimerState, now: number = Date.now()): ActiveTimerState {
  if (!isValidTransition(state.status, 'review')) {
    throw new Error(`Cannot stop timer from state: ${state.status}`);
  }

  // Close open segment if any
  const updatedSegments = state.segments.map((seg, idx) => {
    if (idx === state.segments.length - 1 && seg.end === null) {
      return { ...seg, end: now };
    }
    return seg;
  });

  return {
    ...state,
    status: 'review',
    segments: updatedSegments,
    lastHeartbeat: now,
  };
}

export function resetTimer(state: ActiveTimerState, now: number = Date.now()): ActiveTimerState {
  return {
    ...state,
    status: 'idle',
    startedAt: null,
    plannedMs: null,
    segments: [],
    pauseCount: 0,
    lastHeartbeat: now,
  };
}

