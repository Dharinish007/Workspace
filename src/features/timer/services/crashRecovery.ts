import { ActiveTimerState, TimeSegment } from '../types';

export const HEARTBEAT_TIMEOUT_MS = 10000; // 10 seconds without heartbeat implies crash / tab kill

/**
 * Checks if a stored active timer state represents an abandoned or crashed session
 * requiring user intervention via the recovery dialog.
 */
export function checkRecoveryNeeded(
  activeState: ActiveTimerState | null,
  now: number = Date.now()
): boolean {
  if (!activeState) return false;
  if (activeState.status !== 'running' && activeState.status !== 'paused') {
    return false;
  }
  // If no heartbeat recorded or heartbeat is older than timeout threshold
  const lastBeat = activeState.lastHeartbeat || 0;
  return (now - lastBeat) > HEARTBEAT_TIMEOUT_MS;
}

/**
 * Recovers an abandoned session by closing the crashed segment at the last recorded heartbeat,
 * then opening a fresh active segment starting now.
 */
export function resolveRecoveryResume(
  state: ActiveTimerState,
  now: number = Date.now()
): ActiveTimerState {
  const lastHeartbeat = state.lastHeartbeat || now;

  // Close any open segment at last recorded heartbeat
  const closedSegments = state.segments.map((seg, idx) => {
    if (idx === state.segments.length - 1 && seg.end === null) {
      return { ...seg, end: Math.max(seg.start, lastHeartbeat) };
    }
    return seg;
  });

  // Open a new active segment for current time
  const newSegments: TimeSegment[] = [
    ...closedSegments,
    { start: now, end: null }
  ];

  return {
    ...state,
    status: 'running',
    segments: newSegments,
    lastHeartbeat: now,
  };
}

/**
 * Recovers an abandoned session by closing the open segment at the last recorded heartbeat
 * and immediately transitioning into Review.
 */
export function resolveRecoveryEndAtHeartbeat(
  state: ActiveTimerState,
  now: number = Date.now()
): ActiveTimerState {
  const lastHeartbeat = state.lastHeartbeat || now;

  const closedSegments = state.segments.map((seg, idx) => {
    if (idx === state.segments.length - 1 && seg.end === null) {
      return { ...seg, end: Math.max(seg.start, lastHeartbeat) };
    }
    return seg;
  });

  return {
    ...state,
    status: 'review',
    segments: closedSegments,
    lastHeartbeat: now,
  };
}

/**
 * Discards the unfinished session and returns clean idle state.
 */
export function resolveRecoveryDiscard(now: number = Date.now()): ActiveTimerState {
  return {
    id: 'current',
    status: 'idle',
    mode: 'pomodoro',
    phase: 'work',
    label: '',
    taskId: null,
    note: '',
    startedAt: null,
    plannedMs: null,
    segments: [],
    pauseCount: 0,
    pomodoroCycle: {
      completedWorkBlocks: 0,
      currentBlockIndex: 0,
    },
    lastHeartbeat: now,
    ownerTabId: null,
    ownerLeaseExpiresAt: null,
  };
}

