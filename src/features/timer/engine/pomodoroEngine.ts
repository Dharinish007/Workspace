import { PomodoroPhase, PomodoroCycleState, TimerConfig, SessionOutcome } from '../types';

/**
 * Returns planned duration in milliseconds for a Pomodoro phase based on config.
 */
export function getPlannedDurationMs(phase: PomodoroPhase, config: TimerConfig): number {
  switch (phase) {
    case 'work':
      return config.workMinutes * 60 * 1000;
    case 'shortBreak':
      return config.shortBreakMinutes * 60 * 1000;
    case 'longBreak':
      return config.longBreakMinutes * 60 * 1000;
  }
}

/**
 * Determines outcome of a work block.
 */
export function determineWorkOutcome(
  activeMs: number,
  plannedMs: number | null,
  wasStoppedManually: boolean
): SessionOutcome {
  if (!plannedMs) return 'completed';
  if (!wasStoppedManually && activeMs >= plannedMs) {
    return 'completed';
  }
  if (wasStoppedManually && activeMs < plannedMs) {
    return 'interrupted';
  }
  return 'completed';
}

/**
 * Calculates next phase and cycle state after a session or break concludes.
 * Discarded or interrupted blocks do NOT increment completed work blocks.
 */
export function advancePomodoroCycle(
  currentCycle: PomodoroCycleState,
  currentPhase: PomodoroPhase,
  outcome: SessionOutcome,
  config: TimerConfig
): { nextPhase: PomodoroPhase; nextCycle: PomodoroCycleState } {
  if (currentPhase === 'work') {
    if (outcome === 'completed') {
      const nextCompleted = currentCycle.completedWorkBlocks + 1;
      const isLongBreakDue = nextCompleted >= config.longBreakInterval;

      return {
        nextPhase: isLongBreakDue ? 'longBreak' : 'shortBreak',
        nextCycle: {
          completedWorkBlocks: isLongBreakDue ? 0 : nextCompleted,
          currentBlockIndex: isLongBreakDue ? 0 : (currentCycle.currentBlockIndex + 1) % config.longBreakInterval,
        },
      };
    } else {
      // Interrupted or abandoned: stay on current work block index, offer short break or retry
      return {
        nextPhase: 'shortBreak',
        nextCycle: currentCycle,
      };
    }
  }

  // After short or long break, always return to work phase
  return {
    nextPhase: 'work',
    nextCycle: currentCycle,
  };
}

/**
 * Returns user-facing preview of what follows the current block, e.g. "Next: Work (25 min)" or "Next: Long Break (15 min)".
 */
export function getNextPhasePreview(
  currentCycle: PomodoroCycleState,
  currentPhase: PomodoroPhase,
  config: TimerConfig
): string {
  if (currentPhase === 'work') {
    const willBeLongBreak = (currentCycle.completedWorkBlocks + 1) >= config.longBreakInterval;
    if (willBeLongBreak) {
      return `Next: Long Break (${config.longBreakMinutes} min)`;
    }
    return `Next: Short Break (${config.shortBreakMinutes} min)`;
  }
  return `Next: Work (${config.workMinutes} min)`;
}

