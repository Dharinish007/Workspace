import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isValidTransition,
  startTimer,
  pauseTimer,
  resumeTimer,
  stopTimer,
  resetTimer,
} from '../src/features/timer/engine/stateMachine.ts';

import {
  calculateActiveDuration,
  formatTimerDisplay,
  formatDurationHuman,
  formatTimeOfDay,
  formatTimeRange,
  getLocalDateString,
  calculateDailySummary,
  detectClockJump,
} from '../src/features/timer/engine/calculations.ts';

import {
  getPlannedDurationMs,
  determineWorkOutcome,
  advancePomodoroCycle,
  getNextPhasePreview,
} from '../src/features/timer/engine/pomodoroEngine.ts';

import { validateTimerSession } from '../src/features/timer/services/validation.ts';

import {
  checkRecoveryNeeded,
  resolveRecoveryResume,
  resolveRecoveryEndAtHeartbeat,
  resolveRecoveryDiscard,
} from '../src/features/timer/services/crashRecovery.ts';

import { TabOwnershipManager } from '../src/features/timer/services/tabOwnership.ts';
import { DEFAULT_TIMER_CONFIG } from '../src/features/timer/types/index.ts';

function createMockState(status = 'idle') {
  return {
    id: 'current',
    status,
    mode: 'pomodoro',
    phase: 'work',
    label: 'Focus session',
    taskId: null,
    note: '',
    startedAt: null,
    plannedMs: 25 * 60 * 1000,
    segments: [],
    pauseCount: 0,
    pomodoroCycle: { completedWorkBlocks: 0, currentBlockIndex: 0 },
    lastHeartbeat: 1000000,
    ownerTabId: null,
    ownerLeaseExpiresAt: null,
  };
}

test('Timer Engine: State Machine Transitions', async (t) => {
  await t.test('Permits valid transitions', () => {
    assert.equal(isValidTransition('idle', 'running'), true);
    assert.equal(isValidTransition('running', 'paused'), true);
    assert.equal(isValidTransition('paused', 'running'), true);
    assert.equal(isValidTransition('running', 'review'), true);
    assert.equal(isValidTransition('paused', 'review'), true);
    assert.equal(isValidTransition('review', 'saved'), true);
    assert.equal(isValidTransition('review', 'discarded'), true);
    assert.equal(isValidTransition('review', 'idle'), true);
    assert.equal(isValidTransition('running', 'idle'), true);
  });

  await t.test('Rejects invalid transitions', () => {
    assert.equal(isValidTransition('idle', 'paused'), false);
    assert.equal(isValidTransition('idle', 'review'), false);
    assert.equal(isValidTransition('idle', 'saved'), false);
    assert.equal(isValidTransition('review', 'running'), false);
    assert.equal(isValidTransition('review', 'paused'), false);
  });

  await t.test('startTimer creates open segment and transitions to running', () => {
    const state = createMockState('idle');
    const startTs = 1000000;
    const next = startTimer(state, startTs);
    assert.equal(next.status, 'running');
    assert.equal(next.startedAt, startTs);
    assert.equal(next.segments.length, 1);
    assert.equal(next.segments[0].start, startTs);
    assert.equal(next.segments[0].end, null);
  });

  await t.test('pauseTimer closes open segment and increments pauseCount', () => {
    const runningState = {
      ...createMockState('running'),
      startedAt: 1000000,
      segments: [{ start: 1000000, end: null }],
    };
    const pauseTs = 1010000;
    const next = pauseTimer(runningState, pauseTs);
    assert.equal(next.status, 'paused');
    assert.equal(next.pauseCount, 1);
    assert.equal(next.segments[0].end, pauseTs);
  });

  await t.test('resumeTimer opens new active segment', () => {
    const pausedState = {
      ...createMockState('paused'),
      startedAt: 1000000,
      pauseCount: 1,
      segments: [{ start: 1000000, end: 1010000 }],
    };
    const resumeTs = 1015000;
    const next = resumeTimer(pausedState, resumeTs);
    assert.equal(next.status, 'running');
    assert.equal(next.segments.length, 2);
    assert.equal(next.segments[1].start, resumeTs);
    assert.equal(next.segments[1].end, null);
  });

  await t.test('stopTimer closes open segment and moves to review', () => {
    const runningState = {
      ...createMockState('running'),
      startedAt: 1000000,
      segments: [{ start: 1000000, end: null }],
    };
    const stopTs = 1025000;
    const next = stopTimer(runningState, stopTs);
    assert.equal(next.status, 'review');
    assert.equal(next.segments[0].end, stopTs);
  });

  await t.test('resetTimer clears session data back to idle', () => {
    const activeState = {
      ...createMockState('running'),
      startedAt: 1000000,
      pauseCount: 2,
      segments: [{ start: 1000000, end: 1010000 }, { start: 1020000, end: null }],
    };
    const reset = resetTimer(activeState, 1030000);
    assert.equal(reset.status, 'idle');
    assert.equal(reset.startedAt, null);
    assert.equal(reset.segments.length, 0);
    assert.equal(reset.pauseCount, 0);
  });
});

test('Timer Engine: Calculations & Durations', async (t) => {
  await t.test('calculateActiveDuration correctly excludes pauses', () => {
    // 10s work, 5s pause, 15s work = 25s total active time
    const segments = [
      { start: 1000, end: 11000 }, // 10,000 ms
      { start: 16000, end: 31000 }, // 15,000 ms
    ];
    const duration = calculateActiveDuration(segments);
    assert.equal(duration, 25000);
  });

  await t.test('calculateActiveDuration computes active open segment up to now', () => {
    const segments = [
      { start: 1000, end: 5000 }, // 4,000 ms
      { start: 10000, end: null }, // open segment
    ];
    const duration = calculateActiveDuration(segments, 16000); // 6,000 ms
    assert.equal(duration, 10000);
  });

  await t.test('formatTimerDisplay formats MM:SS and H:MM:SS', () => {
    assert.equal(formatTimerDisplay(0), '00:00');
    assert.equal(formatTimerDisplay(42000), '00:42');
    assert.equal(formatTimerDisplay(18 * 60 * 1000 + 24 * 1000), '18:24');
    assert.equal(formatTimerDisplay(25 * 60 * 1000), '25:00');
    assert.equal(formatTimerDisplay(3600 * 1000 + 19 * 60 * 1000), '1:19:00');
  });

  await t.test('formatDurationHuman formats readable text', () => {
    assert.equal(formatDurationHuman(45000), '45 s');
    assert.equal(formatDurationHuman(25 * 60 * 1000), '25 m');
    assert.equal(formatDurationHuman(79 * 60 * 1000), '1 h 19 m');
  });

  await t.test('detectClockJump triggers on skew above threshold', () => {
    // Expected 250ms tick, actual elapsed 5000ms
    assert.equal(detectClockJump(1000, 6000, 250, 4000), true);
    // Normal tick
    assert.equal(detectClockJump(1000, 1250, 250, 4000), false);
  });

  await t.test('calculateDailySummary aggregates only saved focus sessions', () => {
    const mockSessions = [
      {
        id: '1',
        status: 'saved',
        mode: 'pomodoro',
        phase: 'work',
        label: 'Work 1',
        startedAt: 1700000000000,
        endedAt: 1700001500000,
        segments: [{ start: 1700000000000, end: 1700001500000 }],
        outcome: 'completed',
        pauseCount: 0,
        localDate: '2026-11-08',
        timeZone: 'UTC',
        wasAdjusted: false,
        source: 'timer',
        createdAt: 1700000000000,
        updatedAt: 1700001500000,
      },
      {
        id: '2',
        status: 'discarded', // Should be excluded
        mode: 'pomodoro',
        phase: 'work',
        label: 'Discarded',
        startedAt: 1700002000000,
        endedAt: 1700002500000,
        segments: [{ start: 1700002000000, end: 1700002500000 }],
        outcome: 'abandoned',
        pauseCount: 0,
        localDate: '2026-11-08',
        timeZone: 'UTC',
        wasAdjusted: false,
        source: 'timer',
        createdAt: 1700002000000,
        updatedAt: 1700002500000,
      },
      {
        id: '3',
        status: 'saved',
        mode: 'stopwatch',
        label: 'Open focus',
        startedAt: 1700003000000,
        endedAt: 1700004200000,
        segments: [{ start: 1700003000000, end: 1700004200000 }],
        pauseCount: 0,
        localDate: '2026-11-08',
        timeZone: 'UTC',
        wasAdjusted: false,
        source: 'timer',
        createdAt: 1700003000000,
        updatedAt: 1700004200000,
      },
    ];

    const summary = calculateDailySummary(mockSessions, '2026-11-08');
    assert.equal(summary.date, '2026-11-08');
    assert.equal(summary.pomodoroCount, 1);
    assert.equal(summary.stopwatchCount, 1);
    assert.equal(summary.completedWorkBlocks, 1);
    assert.equal(summary.totalActiveMs, (1500000 + 1200000));
    assert.equal(summary.sessions.length, 2);
  });
});

test('Timer Engine: Pomodoro Rules & Cycles', async (t) => {
  const config = DEFAULT_TIMER_CONFIG;

  await t.test('getPlannedDurationMs returns correct milliseconds for phases', () => {
    assert.equal(getPlannedDurationMs('work', config), 25 * 60 * 1000);
    assert.equal(getPlannedDurationMs('shortBreak', config), 5 * 60 * 1000);
    assert.equal(getPlannedDurationMs('longBreak', config), 15 * 60 * 1000);
  });

  await t.test('determineWorkOutcome assigns completed or interrupted', () => {
    const planned = 25 * 60 * 1000;
    // Completed naturally without early manual stop
    assert.equal(determineWorkOutcome(planned, planned, false), 'completed');
    // Early stop by user
    assert.equal(determineWorkOutcome(15 * 60 * 1000, planned, true), 'interrupted');
    // Manual stop after target reached
    assert.equal(determineWorkOutcome(26 * 60 * 1000, planned, true), 'completed');
  });

  await t.test('advancePomodoroCycle advances work blocks 1-3 to shortBreak', () => {
    let cycle = { completedWorkBlocks: 0, currentBlockIndex: 0 };
    let result = advancePomodoroCycle(cycle, 'work', 'completed', config);
    assert.equal(result.nextPhase, 'shortBreak');
    assert.equal(result.nextCycle.completedWorkBlocks, 1);
    assert.equal(result.nextCycle.currentBlockIndex, 1);

    // After shortBreak, returns to work
    result = advancePomodoroCycle(result.nextCycle, 'shortBreak', 'completed', config);
    assert.equal(result.nextPhase, 'work');
    assert.equal(result.nextCycle.completedWorkBlocks, 1);
  });

  await t.test('advancePomodoroCycle triggers longBreak on 4th completed work block', () => {
    const cycle = { completedWorkBlocks: 3, currentBlockIndex: 3 };
    const result = advancePomodoroCycle(cycle, 'work', 'completed', config);
    assert.equal(result.nextPhase, 'longBreak');
    assert.equal(result.nextCycle.completedWorkBlocks, 0); // resets completed counter for new set
    assert.equal(result.nextCycle.currentBlockIndex, 0);
  });

  await t.test('advancePomodoroCycle with interrupted block does not advance completed counter', () => {
    const cycle = { completedWorkBlocks: 2, currentBlockIndex: 2 };
    const result = advancePomodoroCycle(cycle, 'work', 'interrupted', config);
    assert.equal(result.nextPhase, 'shortBreak');
    assert.equal(result.nextCycle.completedWorkBlocks, 2); // stays at 2
  });

  await t.test('getNextPhasePreview accurately previews upcoming phase', () => {
    const cycle1 = { completedWorkBlocks: 2, currentBlockIndex: 2 };
    assert.equal(getNextPhasePreview(cycle1, 'work', config), 'Next: Short Break (5 min)');

    const cycle3 = { completedWorkBlocks: 3, currentBlockIndex: 3 };
    assert.equal(getNextPhasePreview(cycle3, 'work', config), 'Next: Long Break (15 min)');

    assert.equal(getNextPhasePreview(cycle1, 'shortBreak', config), 'Next: Work (25 min)');
  });
});

test('Timer Engine: Validation Rules (All 10 Rules)', async (t) => {
  const baseValid = {
    label: 'Sprint Review',
    startedAt: 1000000,
    endedAt: 1025000,
    segments: [{ start: 1000000, end: 1025000 }],
  };

  await t.test('Valid session passes validation', () => {
    const res = validateTimerSession(baseValid, [], 1030000);
    assert.equal(res.isValid, true);
    assert.equal(res.errors.length, 0);
  });

  await t.test('Rule 9: Requires label or linked task', () => {
    const noLabel = { ...baseValid, label: '  ', taskId: null };
    const res = validateTimerSession(noLabel, [], 1030000);
    assert.equal(res.isValid, false);
    assert.ok(res.errors.some(e => e.field === 'label'));

    const withTask = { ...baseValid, label: '', taskId: 'task-123' };
    assert.equal(validateTimerSession(withTask, [], 1030000).isValid, true);
  });

  await t.test('Rule 1: End time must be after start time', () => {
    const invalid = { ...baseValid, startedAt: 1025000, endedAt: 1000000 };
    const res = validateTimerSession(invalid, [], 1030000);
    assert.equal(res.isValid, false);
    assert.ok(res.errors.some(e => e.field === 'endedAt'));
  });

  await t.test('Rule 2: At least one active segment required', () => {
    const invalid = { ...baseValid, segments: [] };
    const res = validateTimerSession(invalid, [], 1030000);
    assert.equal(res.isValid, false);
    assert.ok(res.errors.some(e => e.field === 'segments'));
  });

  await t.test('Rule 3: Positive segment duration required', () => {
    const invalid = { ...baseValid, segments: [{ start: 1000000, end: 1000000 }] };
    const res = validateTimerSession(invalid, [], 1030000);
    assert.equal(res.isValid, false);
    assert.ok(res.errors.some(e => e.message.includes('positive duration')));
  });

  await t.test('Rule 4: Segments cannot overlap within session', () => {
    const invalid = {
      ...baseValid,
      segments: [
        { start: 1000000, end: 1015000 },
        { start: 1010000, end: 1025000 }, // Overlaps first
      ],
    };
    const res = validateTimerSession(invalid, [], 1030000);
    assert.equal(res.isValid, false);
    assert.ok(res.errors.some(e => e.message.includes('overlap')));
  });

  await t.test('Rule 5: Segments must fall within session bounds', () => {
    const invalid = {
      ...baseValid,
      startedAt: 1005000,
      endedAt: 1025000,
      segments: [{ start: 1000000, end: 1025000 }], // Starts before session start
    };
    const res = validateTimerSession(invalid, [], 1030000);
    assert.equal(res.isValid, false);
  });

  await t.test('Rule 7: No open segment permitted on save', () => {
    const invalid = {
      ...baseValid,
      segments: [{ start: 1000000, end: null }],
    };
    const res = validateTimerSession(invalid, [], 1030000);
    assert.equal(res.isValid, false);
    assert.ok(res.errors.some(e => e.message.includes('still open')));
  });

  await t.test('Rule 8: No overlap with existing saved sessions', () => {
    const existing = [
      {
        id: 'sess-1',
        label: 'Existing Session',
        status: 'saved',
        startedAt: 1000000,
        endedAt: 1020000,
        segments: [{ start: 1000000, end: 1020000 }],
      },
    ];

    // Overlapping candidate
    const candidate = {
      ...baseValid,
      startedAt: 1010000,
      endedAt: 1030000,
      segments: [{ start: 1010000, end: 1030000 }],
    };

    const res = validateTimerSession(candidate, existing, 1040000);
    assert.equal(res.isValid, false);
    assert.ok(res.errors.some(e => e.message.includes('Existing Session')));
  });
});

test('Timer Engine: Crash Recovery & Tab Lease', async (t) => {
  await t.test('checkRecoveryNeeded detects stale heartbeat > 10s', () => {
    const state = {
      ...createMockState('running'),
      lastHeartbeat: 1000000,
    };
    // 5s later -> no recovery needed
    assert.equal(checkRecoveryNeeded(state, 1005000), false);
    // 15s later -> recovery required
    assert.equal(checkRecoveryNeeded(state, 1015000), true);
  });

  await t.test('resolveRecoveryResume closes old segment at heartbeat and opens new one', () => {
    const state = {
      ...createMockState('running'),
      segments: [{ start: 1000000, end: null }],
      lastHeartbeat: 1010000,
    };
    const now = 1050000;
    const recovered = resolveRecoveryResume(state, now);
    assert.equal(recovered.status, 'running');
    assert.equal(recovered.segments.length, 2);
    assert.equal(recovered.segments[0].end, 1010000);
    assert.equal(recovered.segments[1].start, now);
    assert.equal(recovered.segments[1].end, null);
  });

  await t.test('resolveRecoveryEndAtHeartbeat closes segment at heartbeat and transitions to review', () => {
    const state = {
      ...createMockState('running'),
      segments: [{ start: 1000000, end: null }],
      lastHeartbeat: 1010000,
    };
    const recovered = resolveRecoveryEndAtHeartbeat(state, 1050000);
    assert.equal(recovered.status, 'review');
    assert.equal(recovered.segments[0].end, 1010000);
  });

  await t.test('resolveRecoveryDiscard resets to clean idle state', () => {
    const recovered = resolveRecoveryDiscard(1050000);
    assert.equal(recovered.status, 'idle');
    assert.equal(recovered.startedAt, null);
    assert.equal(recovered.segments.length, 0);
  });

  await t.test('TabOwnershipManager recognizes lease expiration and ownership', () => {
    const mgr = TabOwnershipManager.getInstance();
    const myTab = mgr.tabId;

    const ownedByMe = {
      ...createMockState('running'),
      ownerTabId: myTab,
      ownerLeaseExpiresAt: 1050000,
    };
    assert.equal(mgr.isOwner(ownedByMe, 1040000), true);
    assert.equal(mgr.isOwnedByAnotherTab(ownedByMe, 1040000), false);

    const ownedByOther = {
      ...createMockState('running'),
      ownerTabId: 'other-tab-uuid',
      ownerLeaseExpiresAt: 1050000,
    };
    assert.equal(mgr.isOwner(ownedByOther, 1040000), false);
    assert.equal(mgr.isOwnedByAnotherTab(ownedByOther, 1040000), true);

    // After lease expires, fair game
    assert.equal(mgr.isOwner(ownedByOther, 1060000), true);
    assert.equal(mgr.isOwnedByAnotherTab(ownedByOther, 1060000), false);
  });
});

