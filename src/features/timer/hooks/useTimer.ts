import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  ActiveTimerState, 
  TimerConfig, 
  TimerMode, 
  PomodoroPhase, 
  TimerSession, 
  SessionOutcome,
  DailyFocusSummary 
} from '../types';
import { TimerService } from '../services/timerService';
import { TimerRepository } from '../repository/timerRepository';
import { 
  formatTimerDisplay, 
  calculateDailySummary, 
  getLocalDateString 
} from '../engine/calculations';
import { useWorkspace } from '../../../context/WorkspaceContext';

export function useTimer() {
  const service = useMemo(() => TimerService.getInstance(), []);
  const { settings } = useWorkspace();

  const [state, setState] = useState<ActiveTimerState>(service.getState());
  const [activeDurationMs, setActiveDurationMs] = useState<number>(service.calculateCurrentDuration());
  const [isRecoveryRequired, setIsRecoveryRequired] = useState<boolean>(service.isRecoveryRequired());
  const [isReadOnlyTab, setIsReadOnlyTab] = useState<boolean>(service.isReadOnlyTab());
  const [sessions, setSessions] = useState<TimerSession[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState<boolean>(true);

  // Initialize service on mount and bind settings config
  useEffect(() => {
    const customConfig = (settings as any)?.timerConfig || (settings as any)?.modules?.timer;
    service.initialize(customConfig).then(() => {
      setState(service.getState());
      setActiveDurationMs(service.calculateCurrentDuration());
      setIsRecoveryRequired(service.isRecoveryRequired());
      setIsReadOnlyTab(service.isReadOnlyTab());
    });
  }, [service]);

  // Subscribe to service state changes
  useEffect(() => {
    const unsubscribe = service.subscribe((newState, newDuration) => {
      setState({ ...newState });
      setActiveDurationMs(newDuration);
      setIsRecoveryRequired(service.isRecoveryRequired());
      setIsReadOnlyTab(service.isReadOnlyTab());
    });

    return () => {
      unsubscribe();
    };
  }, [service]);

  // Load saved sessions from IndexedDB
  const refreshSessions = useCallback(async () => {
    setIsLoadingSessions(true);
    try {
      const data = await TimerRepository.getAllSessions();
      setSessions(data);
    } catch (err) {
      console.error('Failed to load timer sessions:', err);
    } finally {
      setIsLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    refreshSessions();
  }, [refreshSessions]);

  // Sync settings config changes to service
  useEffect(() => {
    const customConfig = (settings as any)?.timerConfig || (settings as any)?.modules?.timer;
    if (customConfig) {
      service.updateConfig(customConfig);
    }
  }, [service, (settings as any)?.timerConfig, (settings as any)?.modules?.timer]);

  // Daily focus summary for today
  const todayStr = useMemo(() => getLocalDateString(Date.now()), []);
  const dailySummary = useMemo<DailyFocusSummary>(() => {
    return calculateDailySummary(sessions, todayStr);
  }, [sessions, todayStr]);

  // Formatted timer displays
  const formattedTime = useMemo(() => {
    if (state.mode === 'pomodoro' && state.plannedMs) {
      // In Pomodoro, display countdown remaining (or elapsed if passed)
      const remainingMs = Math.max(0, state.plannedMs - activeDurationMs);
      return formatTimerDisplay(Math.ceil(remainingMs / 1000) * 1000);
    }
    // In Stopwatch, count up
    return formatTimerDisplay(activeDurationMs);
  }, [state.mode, state.plannedMs, activeDurationMs]);

  const formattedPlannedTime = useMemo(() => {
    if (!state.plannedMs) return '';
    return formatTimerDisplay(state.plannedMs);
  }, [state.plannedMs]);

  const progressPercent = useMemo(() => {
    if (state.mode === 'pomodoro' && state.plannedMs && state.plannedMs > 0) {
      return Math.min(100, Math.max(0, (activeDurationMs / state.plannedMs) * 100));
    }
    return 0;
  }, [state.mode, state.plannedMs, activeDurationMs]);

  // Actions
  const start = useCallback(() => service.start(), [service]);
  const pause = useCallback(() => service.pause(), [service]);
  const resume = useCallback(() => service.resume(), [service]);
  const stop = useCallback(() => service.stop(), [service]);
  const reset = useCallback(() => service.reset(), [service]);

  const setMode = useCallback((mode: TimerMode) => service.setMode(mode), [service]);
  const setPhase = useCallback((phase: PomodoroPhase) => service.setPhase(phase), [service]);

  const updateDraft = useCallback((fields: { label?: string; taskId?: string | null; note?: string }) => {
    service.updateDraft(fields);
  }, [service]);

  const saveSession = useCallback(async (sessionData: {
    label: string;
    taskId?: string | null;
    note?: string;
    outcome?: SessionOutcome;
    segments?: { start: number; end: number | null }[];
    startedAt?: number;
    endedAt?: number;
  }) => {
    const result = await service.saveSession(sessionData);
    if (result.success) {
      await refreshSessions();
    }
    return result;
  }, [service, refreshSessions]);

  const discardSession = useCallback(async () => {
    await service.discardSession();
  }, [service]);

  const resolveCrashRecovery = useCallback(async (action: 'resume' | 'end' | 'discard') => {
    await service.resolveCrashRecovery(action);
    setIsRecoveryRequired(false);
  }, [service]);

  const takeOverOwnership = useCallback(() => {
    service.takeOverOwnership();
    setIsReadOnlyTab(false);
  }, [service]);

  const updateSession = useCallback(async (session: TimerSession) => {
    await TimerRepository.updateSession(session);
    await refreshSessions();
  }, [refreshSessions]);

  const deleteSession = useCallback(async (id: string) => {
    await TimerRepository.deleteSession(id);
    await refreshSessions();
  }, [refreshSessions]);

  return {
    state,
    config: service.getConfig(),
    activeDurationMs,
    formattedTime,
    formattedPlannedTime,
    progressPercent,
    isRecoveryRequired,
    isReadOnlyTab,
    sessions,
    isLoadingSessions,
    dailySummary,
    start,
    pause,
    resume,
    stop,
    reset,
    setMode,
    setPhase,
    updateDraft,
    saveSession,
    discardSession,
    resolveCrashRecovery,
    takeOverOwnership,
    updateSession,
    deleteSession,
    refreshSessions,
  };
}

