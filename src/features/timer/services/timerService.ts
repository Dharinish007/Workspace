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

class AsyncQueue {
  private queue: (() => Promise<void>)[] = [];
  private isProcessing = false;

  public enqueue(fn: () => Promise<void>): void {
    this.queue.push(fn);
    this.process();
  }

  private async process(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) {
        try {
          await next();
        } catch (err) {
          console.error('Error processing timer queue task:', err);
        }
      }
    }

    this.isProcessing = false;
  }
}

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
  private persistQueue = new AsyncQueue();
  private isHandlingTargetReached = false;
  private draftDebounceTimeout: any = null;
  private visibilityListener: (() => void) | null = null;

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
    if (customConfig) {
      this.updateConfig(customConfig);
    }

    if (this.isInitialized) return;

    try {
      const persistedState = await TimerRepository.getActiveState();
      const now = Date.now();

      if (persistedState) {
        // Check if recovery is needed
        if (checkRecoveryNeeded(persistedState, now)) {
          this.recoveryRequired = true;
          this.state = persistedState;
        } else {
          if (persistedState.status === 'idle') {
            this.state = {
              ...persistedState,
              plannedMs: persistedState.mode === 'pomodoro'
                ? getPlannedDurationMs(persistedState.phase, this.config)
                : null,
            };
          } else if (this.tabManager.isOwner(persistedState, now)) {
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
    this.setupVisibilityListener();
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
      const newPlanned = this.state.mode === 'pomodoro' 
        ? getPlannedDurationMs(this.state.phase, this.config)
        : null;
      this.state = {
        ...this.state,
        plannedMs: newPlanned,
      };
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
      this.tick();
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

  private tick(): void {
    const now = Date.now();

    // Check clock jump
    if (detectClockJump(this.lastWallClock, now, 250, 4000)) {
      console.warn('System clock jump detected');
    }
    this.lastWallClock = now;

    if (this.state.status === 'running') {
      const activeMs = this.calculateCurrentDuration();
      const isOwner = this.tabManager.isOwner(this.state, now);

      // Check Pomodoro planned completion - ONLY the owner tab executes target reached
      if (isOwner && this.state.mode === 'pomodoro' && this.state.plannedMs && activeMs >= this.state.plannedMs) {
        this.handlePomodoroTargetReached();
        return;
      }

      this.notifySubscribers();
    }
  }

  private setupVisibilityListener(): void {
    if (typeof document !== 'undefined' && !this.visibilityListener) {
      this.visibilityListener = () => {
        if (!document.hidden) {
          this.tick();
        }
      };
      document.addEventListener('visibilitychange', this.visibilityListener);
    }
  }

  private handlePomodoroTargetReached(): void {
    if (this.isHandlingTargetReached) return;
    this.isHandlingTargetReached = true;

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
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
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

        setTimeout(() => {
          try {
            ctx.close().catch(() => {});
          } catch {}
        }, 1000);
      }
    } catch {
      // Audio playback fails gracefully if unpermitted by browser
    }
  }

  // User Actions

  public async start(): Promise<void> {
    if (this.state.status === 'running') return;

    const now = Date.now();
    if (!this.tabManager.isOwner(this.state, now)) {
      this.takeOverOwnership();
    }

    const claimState = this.tabManager.prepareOwnershipClaim(this.state, now);
    let next = startTimer(claimState, now);
    
    // Set plannedMs if not set
    if (next.mode === 'pomodoro' && !next.plannedMs) {
      next = {
        ...next,
        plannedMs: getPlannedDurationMs(next.phase, this.config),
      };
    }

    this.state = next;
    this.isHandlingTargetReached = false;
    this.notifySubscribers();

    this.persistQueue.enqueue(async () => {
      const activity = createActivityLogEvent(
        'session.started',
        'active',
        { diff: { after: { mode: this.state.mode, phase: this.state.phase, label: this.state.label } } }
      );
      await TimerRepository.logActivity(activity);
      await this.persistState();
      this.tabManager.broadcast({ type: 'STATE_UPDATE', state: this.state });
    });
  }

  public async pause(): Promise<void> {
    if (this.state.status !== 'running') return;

    const now = Date.now();
    this.state = pauseTimer(this.state, now);
    this.notifySubscribers();

    this.persistQueue.enqueue(async () => {
      const activity = createActivityLogEvent(
        'session.paused',
        'active',
        { diff: { after: { pauseCount: this.state.pauseCount } } }
      );
      await TimerRepository.logActivity(activity);
      await this.persistState();
      this.tabManager.broadcast({ type: 'STATE_UPDATE', state: this.state });
    });
  }

  public async resume(): Promise<void> {
    if (this.state.status !== 'paused') return;

    const now = Date.now();
    if (!this.tabManager.isOwner(this.state, now)) {
      this.takeOverOwnership();
    }
    const claimState = this.tabManager.prepareOwnershipClaim(this.state, now);
    this.state = resumeTimer(claimState, now);
    this.notifySubscribers();

    this.persistQueue.enqueue(async () => {
      const activity = createActivityLogEvent(
        'session.resumed',
        'active'
      );
      await TimerRepository.logActivity(activity);
      await this.persistState();
      this.tabManager.broadcast({ type: 'STATE_UPDATE', state: this.state });
    });
  }

  public async stop(): Promise<void> {
    if (this.state.status === 'idle') return;

    const now = Date.now();
    this.state = stopTimer(this.state, now);
    this.notifySubscribers();

    this.persistQueue.enqueue(async () => {
      const activity = createActivityLogEvent(
        'session.stopped',
        'active',
        { diff: { after: { segments: this.state.segments } } }
      );
      await TimerRepository.logActivity(activity);
      await this.persistState();
      this.tabManager.broadcast({ type: 'STATE_UPDATE', state: this.state });
    });
  }

  public async reset(): Promise<void> {
    const now = Date.now();
    let next = resetTimer(this.state, now);
    if (next.mode === 'pomodoro') {
      next = {
        ...next,
        plannedMs: getPlannedDurationMs(next.phase, this.config),
      };
    }

    this.state = next;
    this.isHandlingTargetReached = false;
    this.notifySubscribers();

    this.persistQueue.enqueue(async () => {
      const activity = createActivityLogEvent(
        'session.reset',
        'active'
      );
      await TimerRepository.logActivity(activity);
      await this.persistState();
      this.tabManager.broadcast({ type: 'STATE_UPDATE', state: this.state });
    });
  }

  public async setMode(mode: TimerMode): Promise<void> {
    if (this.state.status !== 'idle') return;
    this.state = {
      ...this.state,
      mode,
      plannedMs: mode === 'pomodoro' 
        ? getPlannedDurationMs(this.state.phase, this.config) 
        : null,
    };
    this.notifySubscribers();

    this.persistQueue.enqueue(async () => {
      await this.persistState();
      this.tabManager.broadcast({ type: 'STATE_UPDATE', state: this.state });
    });
  }

  public async setPhase(phase: PomodoroPhase): Promise<void> {
    if (this.state.status !== 'idle') return;
    this.state = {
      ...this.state,
      phase,
      plannedMs: getPlannedDurationMs(phase, this.config),
    };
    this.notifySubscribers();

    this.persistQueue.enqueue(async () => {
      await this.persistState();
      this.tabManager.broadcast({ type: 'STATE_UPDATE', state: this.state });
    });
  }

  public updateDraft(fields: { label?: string; taskId?: string | null; note?: string }): void {
    let changed = false;
    const nextState = { ...this.state };
    if (fields.label !== undefined && fields.label !== nextState.label) {
      nextState.label = fields.label;
      changed = true;
    }
    if (fields.taskId !== undefined && fields.taskId !== nextState.taskId) {
      nextState.taskId = fields.taskId;
      changed = true;
    }
    if (fields.note !== undefined && fields.note !== nextState.note) {
      nextState.note = fields.note;
      changed = true;
    }
    if (!changed) return;

    this.state = nextState;
    this.notifySubscribers();

    if (this.draftDebounceTimeout) clearTimeout(this.draftDebounceTimeout);
    this.draftDebounceTimeout = setTimeout(() => {
      this.persistState();
    }, 250);
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

  public async createManualSession(session: TimerSession): Promise<ValidationResult> {
    const existingSessions = await TimerRepository.getAllSessions();
    const validation = validateTimerSession(session, existingSessions, Date.now());
    if (!validation.isValid) {
      return validation;
    }

    const activity = createActivityLogEvent(
      'session.saved',
      session.id,
      { diff: { after: session }, source: 'manual' }
    );
    await TimerRepository.saveSession(session, activity);
    return { isValid: true, errors: [] };
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

  public destroy(): void {
    if (this.tickerInterval) clearInterval(this.tickerInterval);
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.draftDebounceTimeout) clearTimeout(this.draftDebounceTimeout);
    if (this.visibilityListener && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.visibilityListener);
      this.visibilityListener = null;
    }
    this.subscribers.clear();
    this.isInitialized = false;
  }
}

