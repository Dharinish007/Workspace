import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTimer } from '../hooks/useTimer';
import { TimerSession } from '../types';

// Components
import { TimerDial } from '../components/TimerDial';
import { ModeSelector } from '../components/ModeSelector';
import { TimerControls } from '../components/TimerControls';
import { PomodoroCycleCard } from '../components/PomodoroCycleCard';
import { CurrentSessionForm } from '../components/CurrentSessionForm';
import { TodayFocusCard } from '../components/TodayFocusCard';
import { SessionRecordsTable } from '../components/SessionRecordsTable';
import { TwoTabNotice } from '../components/TwoTabNotice';
import { SessionReviewModal } from '../components/SessionReviewModal';
import { ManualSessionModal } from '../components/ManualSessionModal';
import { CrashRecoveryDialog } from '../components/CrashRecoveryDialog';
import { ActivityLogModal } from '../components/ActivityLogModal';

import { 
  Activity, 
  Timer as TimerIcon, 
  ListFilter,
  Settings
} from 'lucide-react';
import { motion } from 'framer-motion';

export type TimerPageTab = 'focus' | 'records';

export const TimerModule: React.FC = () => {
  const navigate = useNavigate();
  const {
    state,
    config,
    activeDurationMs,
    formattedTime,
    formattedPlannedTime,
    progressPercent,
    isRecoveryRequired,
    isReadOnlyTab,
    sessions,
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
  } = useTimer();

  const [activeTab, setActiveTab] = useState<TimerPageTab>('focus');
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<TimerSession | null>(null);
  const [isActivityLogOpen, setIsActivityLogOpen] = useState(false);

  const handleStop = async () => {
    await stop();
    setIsReviewOpen(true);
  };

  const handleTriggerSave = async () => {
    if (state.status === 'running') {
      await stop();
    }
    setIsReviewOpen(true);
  };

  const handleTriggerDiscard = async () => {
    await discardSession();
    setIsReviewOpen(false);
  };

  const handleOpenEditSession = (session: TimerSession) => {
    setEditingSession(session);
    setIsManualModalOpen(true);
  };

  const handleSaveManualSession = async (session: TimerSession) => {
    if (editingSession) {
      await updateSession(session);
    } else {
      await saveSession({
        label: session.label,
        taskId: session.taskId,
        note: session.note,
        outcome: session.outcome,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        segments: session.segments,
      });
    }
    setEditingSession(null);
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8">
      {/* Read-Only Notice if another tab owns the timer */}
      {isReadOnlyTab && <TwoTabNotice onTakeOver={takeOverOwnership} />}

      {/* Crash Recovery Alert Dialog */}
      <CrashRecoveryDialog
        isOpen={isRecoveryRequired}
        state={state}
        onResolve={resolveCrashRecovery}
      />

      {/* Top Header & View Controls (Consistent with Dashboard & Habit modules) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <TimerIcon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-txt-primary tracking-tight font-sans">
              Focus Timer
            </h1>
            <p className="text-sm font-sans text-txt-secondary font-normal mt-0.5">
              Track focus sessions, use Pomodoro intervals or an open stopwatch, and review session records.
            </p>
          </div>
        </div>

        {/* View Controls: Activity Log & Tab Switcher */}
        <div className="flex flex-wrap items-center gap-3">
          {/* View Activity Log */}
          <button
            type="button"
            onClick={() => setIsActivityLogOpen(true)}
            className="h-9 px-3.5 rounded-lg bg-bg-card border border-border hover:border-border-interactive text-txt-secondary hover:text-txt-primary flex items-center gap-2 text-xs font-medium shadow-xs transition-colors cursor-pointer active:scale-[0.98]"
            title="Open Activity Audit Log"
          >
            <Activity className="w-4 h-4 text-primary" />
            <span>Activity Log</span>
          </button>

          {/* Segmented Tab Switcher */}
          <div className="inline-flex items-center p-1 bg-bg-subtle border border-border rounded-xl relative">
            <button
              type="button"
              onClick={() => setActiveTab('focus')}
              className={`relative flex items-center gap-1.5 h-7 px-3 text-xs font-sans font-medium rounded-lg transition-colors cursor-pointer z-10 ${
                activeTab === 'focus' ? 'text-txt-primary shadow-xs font-semibold' : 'text-txt-secondary hover:text-txt-primary'
              }`}
            >
              {activeTab === 'focus' && (
                <motion.div
                  layoutId="timerMainTabPill"
                  className="absolute inset-0 bg-bg-card rounded-lg -z-10 shadow-xs border border-border/40"
                  transition={{ duration: 0.15 }}
                />
              )}
              <TimerIcon className="w-3.5 h-3.5 text-primary" />
              <span>Focus Timer</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('records')}
              className={`relative flex items-center gap-1.5 h-7 px-3 text-xs font-sans font-medium rounded-lg transition-colors cursor-pointer z-10 ${
                activeTab === 'records' ? 'text-txt-primary shadow-xs font-semibold' : 'text-txt-secondary hover:text-txt-primary'
              }`}
            >
              {activeTab === 'records' && (
                <motion.div
                  layoutId="timerMainTabPill"
                  className="absolute inset-0 bg-bg-card rounded-lg -z-10 shadow-xs border border-border/40"
                  transition={{ duration: 0.15 }}
                />
              )}
              <ListFilter className="w-3.5 h-3.5 text-txt-secondary" />
              <span>Records ({sessions.filter(s => s.status === 'saved').length})</span>
            </button>
          </div>

          {/* Module Settings Shortcut */}
          <button
            type="button"
            onClick={() => navigate('/settings?tab=timer')}
            className="h-9 w-9 bg-bg-card border border-border hover:bg-bg-hover text-txt-secondary hover:text-txt-primary rounded-lg flex items-center justify-center shadow-xs transition-colors cursor-pointer active:scale-[0.98]"
            title="Focus Timer Settings"
            aria-label="Focus Timer Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tab 1: Focus Timer Dashboard View */}
      {activeTab === 'focus' && (
        <div className="space-y-6 sm:space-y-8">
          {/* Main Top Grid: Timer Card (Left) & Current Session Form (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Timer Card */}
            <div className="lg:col-span-7 bg-bg-card border border-border rounded-2xl p-6 sm:p-7 shadow-card hover:shadow-card-hover transition-all space-y-4">
              {/* Pomodoro vs Stopwatch Toggle */}
              <ModeSelector
                mode={state.mode}
                status={state.status}
                onSelectMode={setMode}
              />

              {/* Main Timer Display & Optional Pomodoro Cycle Sidecar */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                <div className={state.mode === 'pomodoro' ? 'md:col-span-7' : 'md:col-span-12'}>
                  <TimerDial
                    mode={state.mode}
                    phase={state.phase}
                    status={state.status}
                    formattedTime={formattedTime}
                    formattedPlannedTime={formattedPlannedTime}
                    progressPercent={progressPercent}
                  />
                </div>

                {state.mode === 'pomodoro' && (
                  <div className="md:col-span-5 border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6 h-full">
                    <PomodoroCycleCard
                      cycle={state.pomodoroCycle}
                      currentPhase={state.phase}
                      status={state.status}
                      config={config}
                      onSelectPhase={setPhase}
                    />
                  </div>
                )}
              </div>

              {/* Controls: Start/Pause/Resume, Stop, Reset */}
              <TimerControls
                status={state.status}
                onStart={start}
                onPause={pause}
                onResume={resume}
                onStop={handleStop}
                onReset={reset}
                disabled={isReadOnlyTab}
              />
            </div>

            {/* Right Column: Current Session Form */}
            <div className="lg:col-span-5">
              <CurrentSessionForm
                state={state}
                activeDurationMs={activeDurationMs}
                onUpdateDraft={updateDraft}
                onTriggerSave={handleTriggerSave}
                onTriggerDiscard={handleTriggerDiscard}
                disabled={isReadOnlyTab}
              />
            </div>
          </div>

          {/* Bottom Grid: Session Records Preview & Today's Focus Card */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-8">
              <SessionRecordsTable
                sessions={sessions}
                onOpenManualModal={() => {
                  setEditingSession(null);
                  setIsManualModalOpen(true);
                }}
                onEditSession={handleOpenEditSession}
                onDeleteSession={deleteSession}
              />
            </div>

            <div className="lg:col-span-4">
              <TodayFocusCard
                summary={dailySummary}
                config={config}
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Dedicated Full Records View */}
      {activeTab === 'records' && (
        <div className="space-y-6">
          <SessionRecordsTable
            sessions={sessions}
            onOpenManualModal={() => {
              setEditingSession(null);
              setIsManualModalOpen(true);
            }}
            onEditSession={handleOpenEditSession}
            onDeleteSession={deleteSession}
          />
        </div>
      )}

      {/* Session Review Modal (Explicit Gate on Stop / Save) */}
      <SessionReviewModal
        isOpen={isReviewOpen || state.status === 'review'}
        initialLabel={state.label}
        initialTaskId={state.taskId}
        initialNote={state.note}
        startedAt={state.startedAt || (Date.now() - activeDurationMs)}
        endedAt={Date.now()}
        segments={state.segments}
        mode={state.mode}
        phase={state.phase}
        existingSessions={sessions}
        onSave={async (data) => {
          const res = await saveSession(data);
          if (res.success) {
            setIsReviewOpen(false);
          }
          return res;
        }}
        onDiscard={async () => {
          await discardSession();
          setIsReviewOpen(false);
        }}
        onClose={() => setIsReviewOpen(false)}
      />

      {/* Manual Session Entry / Edit Modal */}
      <ManualSessionModal
        isOpen={isManualModalOpen}
        existingSessions={sessions}
        editingSession={editingSession}
        onClose={() => {
          setIsManualModalOpen(false);
          setEditingSession(null);
        }}
        onSave={handleSaveManualSession}
      />

      {/* Activity Log Timeline Modal */}
      <ActivityLogModal
        isOpen={isActivityLogOpen}
        onClose={() => setIsActivityLogOpen(false)}
      />
    </div>
  );
};
