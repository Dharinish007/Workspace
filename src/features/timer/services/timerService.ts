import { 
  ActiveTimerState, 
  TimerConfig, 
  DEFAULT_TIMER_CONFIG, 
  TimerMode, 
  PomodoroPhase, 
  TimerSession,
  SessionOutcome,
  ActivityLogEvent,
  ValidationResult
} from '../types';
import { 
  startTimer, 
  pauseTimer, 
  resumeTimer, 
  stopTimer, 
  resetTimer 
} from '../engine/stateMachine';
import { 
  calculateActiveDuration, 
  detectClockJump, 
  getLocalDateString 
} from '../engine/calculations';
import { 
  getPlannedDurationMs, 
  determineWorkOutcome, 
  advancePomodoroCycle 
} from '../engine/pomodoroEngine';
import { TimerRepository } from '../repository/timerRepository';
import { TabOwnershipManager, HEARTBEAT_INTERVAL_MS } from './tabOwnership';
import { 
  checkRecoveryNeeded, 
  resolveRecoveryResume, 
  resolveRecoveryEndAtHeartbeat, 
  resolveRecoveryDiscard 
} from './crashRecovery';
import { validateTimerSession } from './validation';
import { createActivityLogEvent } from './activityLogger';

export type TimerServiceSubscriber = (state: ActiveTimerState, activeDurationMs: number) => void;

function createDefaultState(config: TimerConfig = DEFAULT_TIMER_CONFIG): ActiveTimerState {
  const now = Date.now();
  return {
    id: 'current',
    status: 'idle',
    mode: 'pomodoro',
    phase: 'work',
    label: '',
    taskId: null,
    note: '',
    startedAt: null,
    plannedMs: getPlannedDurationMs('work', config),
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

export class TimerService {
  private static instance: TimerService;
  private state: ActiveTimerState;
  private config: TimerConfig = DEFAULT_TIMER_CONFIG;
  private subscribers: Set<TimerServiceSubscriber> = new Set();
  private tickerInterval: any = null;
  private heartbeatInterval: any = null;
  private tabManager: TabOwnershipManager;
  private isInitialized = false;
  private recoveryRequired = false;
  private lastWallClock = Date.now();

  private constructor() {
    this.state = createDefaultState(this.config);
    this.tabManager = TabOwnershipManager.getInstance();
  }

  public static getInstance(): TimerService {
    if (!TimerService.instance) {
      TimerService.instance = new TimerService();
    }
    return TimerService.instance;
  }

  public async initialize(customConfig?: Partial<TimerConfig>): Promise<void> {
    if (this.isInitialized) return;

    if (customConfig) {
      this.config = { ...DEFAULT_TIMER_CONFIG, ...customConfig };
    }

    try {
      const persistedState = await TimerRepository.getActiveState();
      const now = Date.now();

      if (persistedState) {
        // Check if recovery is needed
        if (checkRecoveryNeeded(persistedState, now)) {
          this.recoveryRequired = true;
          this.state = persistedState;
        } else {
          // If state is valid and was running, verify lease
          if (this.tabManager.isOwner(persistedState, now)) {
            this.state = this.tabManager.prepareOwnershipClaim(persistedState, now);
            await TimerRepository.saveActiveState(this.state);
          } else {
            this.state = persistedState;
          }
        }
      } else {
        this.state = createDefaultState(this.config);
        await TimerRepository.saveActiveState(this.state);
      }
    } catch (e) {
      console.error('Failed to initialize TimerService from repository:', e);
      this.state = createDefaultState(this.config);
    }

    // Subscribe to cross-tab broadcasts
    this.tabManager.subscribe((msg) => {
      this.handleBroadcastMessage(msg);
    });

    this.startTicker();
    this.isInitialized = true;
    this.notifySubscribers();
  }

  public getState(): ActiveTimerState {
    return this.state;
  }

  public getConfig(): TimerConfig {
    return this.config;
  }

  public updateConfig(newConfig: Partial<TimerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    if (this.state.status === 'idle') {
      this.state.plannedMs = this.state.mode === 'pomodoro' 
        ? getPlannedDurationMs(this.state.phase, this.config)
        : null;
      this.persistState();
      this.notifySubscribers();
    }
  }

  public isRecoveryRequired(): boolean {
    return this.recoveryRequired;
  }

  public isReadOnlyTab(): boolean {
    return this.tabManager.isOwnedByAnotherTab(this.state, Date.now());
  }

  public subscribe(fn: TimerServiceSubscriber): () => void {
    this.subscribers.add(fn);
    fn(this.state, this.calculateCurrentDuration());
    return () => {
      this.subscribers.delete(fn);
    };
  }

  private notifySubscribers(): void {
    const duration = this.calculateCurrentDuration();
    this.subscribers.forEach((fn) => {
      try {
        fn(this.state, duration);
      } catch (err) {
        console.error('Error in TimerService subscriber callback:', err);
      }
    });
  }

  public calculateCurrentDuration(): number {
    return calculateActiveDuration(this.state.segments, Date.now());
  }

  private async persistState(): Promise<void> {
    try {
      await TimerRepository.saveActiveState(this.state);
    } catch (e) {
      console.error('Failed to persist active timer state:', e);
    }
  }

  private handleBroadcastMessage(msg: any): void {
    if (!msg || !msg.type) return;

    if (msg.type === 'CLAIM_OWNERSHIP') {
      if (this.state.ownerTabId === this.tabManager.tabId && msg.senderTabId !== this.tabManager.tabId) {
        // Yield ownership
        this.state = {
          ...this.state,
          ownerTabId: msg.senderTabId,
          ownerLeaseExpiresAt: msg.expiresAt,
        };
        this.notifySubscribers();
      }
    } else if (msg.type === 'STATE_UPDATE') {
      if (msg.senderTabId !== this.tabManager.tabId && msg.state) {
        this.state = msg.state;
        this.notifySubscribers();
      }
    }
  }

  private startTicker(): void {
    if (this.tickerInterval) clearInterval(this.tickerInterval);
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);

    // High frequency UI ticker
    this.tickerInterval = setInterval(() => {
      const now = Date.now();

      // Check clock jump
      if (detectClockJump(this.lastWallClock, now, 250, 4000)) {
        console.warn('System clock jump detected');
      }
      this.lastWallClock = now;

      if (this.state.status === 'running') {
        const activeMs = this.calculateCurrentDuration();

        // Check Pomodoro planned completion
        if (this.state.mode === 'pomodoro' && this.state.plannedMs && activeMs >= this.state.plannedMs) {
          this.handlePomodoroTargetReached();
          return;
        }

        this.notifySubscribers();
      }
    }, 250);

    // Heartbeat persistence & lease renewal
    this.heartbeatInterval = setInterval(async () => {
      const now = Date.now();
      if (this.state.status === 'running' || this.state.status === 'paused') {
        if (this.tabManager.isOwner(this.state, now)) {
          this.state = this.tabManager.prepareOwnershipClaim(this.state, now);
          await this.persistState();
          this.tabManager.broadcast({
            type: 'STATE_UPDATE',
            state: this.state,
          });
        }
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  private handlePomodoroTargetReached(): void {
    const now = Date.now();
    this.playChime();

    if (this.state.phase === 'work') {
      // Transition work phase into review
      this.state = stopTimer(this.state, now);
      this.persistState();
      this.notifySubscribers();
      this.tabManager.broadcast({ type: 'STATE_UPDATE', state: this.state });
    } else {
      // Break completed -> reset to work phase idle
      this.state = {
        ...this.state,
        status: 'idle',
        phase: 'work',
        startedAt: null,
        plannedMs: getPlannedDurationMs('work', this.config),
        segments: [],
        pauseCount: 0,
        lastHeartbeat: now,
      };
      this.persistState();
      this.notifySubscribers();
      this.tabManager.broadcast({ type: 'STATE_UPDATE', state: this.state });
    }
  }

  private playChime(): void {
    try {
      if (typeof window !== 'undefined' && (window.AudioContext || (window as any).webkitAudioContext)) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
      }
    } catch {
      // Audio playback fails gracefully if unpermitted by browser
    }
  }

  // User Actions

  public async start(): Promise<void> {
    const now = Date.now();
    if (!this.tabManager.isOwner(this.state, now)) {
      this.takeOverOwnership();
    }

    const claimState = this.tabManager.prepareOwnershipClaim(this.state, now);
    this.state = startTimer(claimState, now);
    
    // Set plannedMs if not set
    if (this.state.mode === 'pomodoro' && !this.state.plannedMs) {
      this.state.plannedMs = getPlannedDurationMs(this.state.phase, this.config);
    }

    const activity = createActivityLogEvent(
      'session.started',
      'active',
      { diff: { after: { mode: this.state.mode, phase: this.state.phase, label: this.state.label } } }
    );

    await TimerRepository.logActivity(activity);
    await this.persistState();
    this.tabManager.broadcast({ type: 'STATE_UPDATE', state: this.state });
    this.notifySubscribers();
  }

  public async pause(): Promise<void> {
    const now = Date.now();
    this.state = pauseTimer(this.state, now);

    const activity = createActivityLogEvent(
      'session.paused',
      'active',
      { diff: { after: { pauseCount: this.state.pauseCount } } }
    );

    await TimerRepository.logActivity(activity);
    await this.persistState();
    this.tabManager.broadcast({ type: 'STATE_UPDATE', state: this.state });
    this.notifySubscribers();
  }

  public async resume(): Promise<void> {
    const now = Date.now();
    this.state = resumeTimer(this.state, now);

    const activity = createActivityLogEvent(
      'session.resumed',
      'active'
    );

    await TimerRepository.logActivity(activity);
    await this.persistState();
    this.tabManager.broadcast({ type: 'STATE_UPDATE', state: this.state });
    this.notifySubscribers();
  }

  public async stop(): Promise<void> {
    const now = Date.now();
    this.state = stopTimer(this.state, now);

    const activity = createActivityLogEvent(
      'session.stopped',
      'active',
      { diff: { after: { segments: this.state.segments } } }
    );

    await TimerRepository.logActivity(activity);
    await this.persistState();
    this.tabManager.broadcast({ type: 'STATE_UPDATE', state: this.state });
    this.notifySubscribers();
  }

  public async reset(): Promise<void> {
    const now = Date.now();
    this.state = resetTimer(this.state, now);
    if (this.state.mode === 'pomodoro') {
      this.state.plannedMs = getPlannedDurationMs(this.state.phase, this.config);
    }

    const activity = createActivityLogEvent(
      'session.reset',
      'active'
    );

    await TimerRepository.logActivity(activity);
    await this.persistState();
    this.tabManager.broadcast({ type: 'STATE_UPDATE', state: this.state });
    this.notifySubscribers();
  }

  public async setMode(mode: TimerMode): Promise<void> {
    if (this.state.status !== 'idle') return;
    this.state.mode = mode;
    this.state.plannedMs = mode === 'pomodoro' 
      ? getPlannedDurationMs(this.state.phase, this.config) 
      : null;
    await this.persistState();
    this.notifySubscribers();
  }

  public async setPhase(phase: PomodoroPhase): Promise<void> {
    if (this.state.status !== 'idle') return;
    this.state.phase = phase;
    this.state.plannedMs = getPlannedDurationMs(phase, this.config);
    await this.persistState();
    this.notifySubscribers();
  }

  public updateDraft(fields: { label?: string; taskId?: string | null; note?: string }): void {
    if (fields.label !== undefined) this.state.label = fields.label;
    if (fields.taskId !== undefined) this.state.taskId = fields.taskId;
    if (fields.note !== undefined) this.state.note = fields.note;
    this.persistState();
    this.notifySubscribers();
  }

  public async saveSession(sessionData: {
    label: string;
    taskId?: string | null;
    note?: string;
    outcome?: SessionOutcome;
    segments?: { start: number; end: number | null }[];
    startedAt?: number;
    endedAt?: number;
  }): Promise<{ success: boolean; errors?: any[]; session?: TimerSession }> {
    const now = Date.now();
    const finalSegments = sessionData.segments || this.state.segments;
    const finalStartedAt = sessionData.startedAt || this.state.startedAt || now;
    const finalEndedAt = sessionData.endedAt || now;
    const activeMs = calculateActiveDuration(finalSegments, finalEndedAt);

    const outcome: SessionOutcome = sessionData.outcome || (
      this.state.mode === 'pomodoro'
        ? determineWorkOutcome(activeMs, this.state.plannedMs, false)
        : 'completed'
    );

    const candidateSession: Partial<TimerSession> = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'sess_' + Math.random().toString(36).substring(2, 11),
      status: 'saved',
      mode: this.state.mode,
      phase: this.state.mode === 'pomodoro' ? this.state.phase : undefined,
      taskId: sessionData.taskId !== undefined ? sessionData.taskId : this.state.taskId,
      label: sessionData.label.trim(),
      startedAt: finalStartedAt,
      endedAt: finalEndedAt,
      segments: finalSegments.map(s => ({ start: s.start, end: s.end ?? finalEndedAt })),
      plannedMs: this.state.plannedMs,
      outcome,
      pauseCount: this.state.pauseCount,
      note: sessionData.note ?? this.state.note,
      localDate: getLocalDateString(finalStartedAt),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      wasAdjusted: false,
      source: 'timer',
      createdAt: now,
      updatedAt: now,
    };

    const existingSessions = await TimerRepository.getAllSessions();
    const validation = validateTimerSession(candidateSession, existingSessions, now);

    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }

    const finalizedSession = candidateSession as TimerSession;
    const activity = createActivityLogEvent(
      'session.saved',
      finalizedSession.id,
      { diff: { after: finalizedSession }, source: 'timer' }
    );

    await TimerRepository.saveSession(finalizedSession, activity);

    // Advance Pomodoro cycle if pomodoro mode
    let nextPhase: PomodoroPhase = 'work';
    let nextCycle = this.state.pomodoroCycle;

    if (this.state.mode === 'pomodoro') {
      const advanced = advancePomodoroCycle(
        this.state.pomodoroCycle,
        this.state.phase,
        outcome,
        this.config
      );
      nextPhase = advanced.nextPhase;
      nextCycle = advanced.nextCycle;
    }

    // Reset active timer to idle ready for next cycle
    this.state = {
      ...this.state,
      status: 'idle',
      phase: nextPhase,
      startedAt: null,
      plannedMs: getPlannedDurationMs(nextPhase, this.config),
      segments: [],
      pauseCount: 0,
      label: '',
      taskId: null,
      note: '',
      pomodoroCycle: nextCycle,
      lastHeartbeat: now,
    };

    await this.persistState();
    this.tabManager.broadcast({ type: 'STATE_UPDATE', state: this.state });
    this.notifySubscribers();

    return { success: true, session: finalizedSession };
  }

  public async discardSession(): Promise<void> {
    const now = Date.now();
    const activity = createActivityLogEvent(
      'session.discarded',
      'active',
      { diff: { before: { segments: this.state.segments, label: this.state.label } } }
    );

    await TimerRepository.logActivity(activity);

    // Reset to idle
    this.state = resetTimer(this.state, now);
    if (this.state.mode === 'pomodoro') {
      this.state.plannedMs = getPlannedDurationMs(this.state.phase, this.config);
    }

    await this.persistState();
    this.tabManager.broadcast({ type: 'STATE_UPDATE', state: this.state });
    this.notifySubscribers();
  }

  public async resolveCrashRecovery(action: 'resume' | 'end' | 'discard'): Promise<void> {
    const now = Date.now();

    if (action === 'resume') {
      this.state = resolveRecoveryResume(this.state, now);
    } else if (action === 'end') {
      this.state = resolveRecoveryEndAtHeartbeat(this.state, now);
    } else {
      this.state = resolveRecoveryDiscard(now);
    }

    this.recoveryRequired = false;

    const activity = createActivityLogEvent(
      'session.recovered',
      'active',
      { diff: { after: { action, status: this.state.status } } }
    );

    await TimerRepository.logActivity(activity);
    await this.persistState();
    this.notifySubscribers();
  }

  public takeOverOwnership(): void {
    const now = Date.now();
    this.state = this.tabManager.prepareOwnershipClaim(this.state, now);
    this.tabManager.broadcast({
      type: 'CLAIM_OWNERSHIP',
      senderTabId: this.tabManager.tabId,
      expiresAt: this.state.ownerLeaseExpiresAt,
    });
    this.persistState();
    this.notifySubscribers();
  }
}

