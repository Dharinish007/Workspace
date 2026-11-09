import { TimeSegment, TimerSession, DailyFocusSummary } from '../types';

/**
 * Calculates active duration strictly by summing durations of active segments.
 * Does not include paused periods.
 */
export function calculateActiveDuration(segments: TimeSegment[], now: number = Date.now()): number {
  if (!segments || segments.length === 0) return 0;

  return segments.reduce((total, seg) => {
    if (seg.start == null || isNaN(seg.start)) return total;
    const end = seg.end != null ? seg.end : now;
    const duration = Math.max(0, end - seg.start);
    return total + duration;
  }, 0);
}

/**
 * Formats milliseconds into standard digital timer display: "MM:SS" or "H:MM:SS" if >= 1 hour.
 */
export function formatTimerDisplay(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const paddedM = String(minutes).padStart(2, '0');
  const paddedS = String(seconds).padStart(2, '0');

  if (hours > 0) {
    return `${hours}:${paddedM}:${paddedS}`;
  }
  return `${paddedM}:${paddedS}`;
}

/**
 * Formats duration into human readable summary e.g. "1 h 19 m", "25 m", "42 s".
 */
export function formatDurationHuman(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours} h ${minutes} m`;
  }
  if (minutes > 0) {
    return `${minutes} m`;
  }
  return `${totalSeconds} s`;
}

/**
 * Formats timestamp to 12-hour time string: "11:10 PM".
 */
export function formatTimeOfDay(timestamp: number): string {
  if (!timestamp || isNaN(timestamp)) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
}

/**
 * Formats time range: "11:10 PM – 11:35 PM".
 */
export function formatTimeRange(start: number, end: number): string {
  return `${formatTimeOfDay(start)} – ${formatTimeOfDay(end)}`;
}

/**
 * Returns YYYY-MM-DD for a given epoch ms in the local timezone.
 */
export function getLocalDateString(timestamp: number = Date.now()): string {
  const d = new Date(timestamp);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Derives daily focus summary from saved sessions.
 * Sessions belong to the date on which they started.
 */
export function calculateDailySummary(sessions: TimerSession[], targetDate: string): DailyFocusSummary {
  const daySessions = sessions.filter(s => s.status === 'saved' && s.localDate === targetDate);

  let totalActiveMs = 0;
  let pomodoroCount = 0;
  let stopwatchCount = 0;
  let completedWorkBlocks = 0;

  for (const session of daySessions) {
    const active = calculateActiveDuration(session.segments, session.endedAt);
    totalActiveMs += active;

    if (session.mode === 'pomodoro') {
      pomodoroCount++;
      if (session.outcome === 'completed' && session.phase === 'work') {
        completedWorkBlocks++;
      }
    } else if (session.mode === 'stopwatch') {
      stopwatchCount++;
    }
  }

  return {
    date: targetDate,
    totalActiveMs,
    pomodoroCount,
    stopwatchCount,
    completedWorkBlocks,
    sessions: daySessions,
  };
}

/**
 * Detects significant wall-clock jumps (e.g. system sleep/wake, manual clock adjustments).
 */
export function detectClockJump(
  lastWallClock: number,
  currentWallClock: number,
  expectedIntervalMs: number = 1000,
  thresholdMs: number = 5000
): boolean {
  if (!lastWallClock || !currentWallClock) return false;
  const elapsed = currentWallClock - lastWallClock;
  return Math.abs(elapsed - expectedIntervalMs) > thresholdMs;
}

