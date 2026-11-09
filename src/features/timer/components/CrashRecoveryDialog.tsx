import React from 'react';
import { ActiveTimerState } from '../types';
import { formatTimeOfDay, formatTimerDisplay, calculateActiveDuration } from '../engine/calculations';
import { AlertTriangle, Play, CheckCircle, Trash2 } from 'lucide-react';

interface CrashRecoveryDialogProps {
  isOpen: boolean;
  state: ActiveTimerState;
  onResolve: (action: 'resume' | 'end' | 'discard') => Promise<void>;
}

export const CrashRecoveryDialog: React.FC<CrashRecoveryDialogProps> = ({
  isOpen,
  state,
  onResolve,
}) => {
  if (!isOpen) return null;

  const durationUpToHeartbeat = calculateActiveDuration(
    state.segments,
    state.lastHeartbeat || Date.now()
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-md bg-bg-card border border-amber-500/30 rounded-2xl shadow-modal overflow-hidden p-6 space-y-4"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="recovery-title"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h2 id="recovery-title" className="text-base font-bold text-txt-primary font-serif tracking-tight">
              Recover Interrupted Session
            </h2>
            <p className="text-xs text-txt-muted">
              A previous timer was unexpectedly interrupted.
            </p>
          </div>
        </div>

        {/* Stored Session Snapshot */}
        <div className="p-3.5 bg-bg-subtle rounded-xl border border-border text-xs space-y-1.5">
          <div className="flex justify-between">
            <span className="text-txt-muted">Session:</span>
            <span className="font-semibold text-txt-primary truncate max-w-[200px]">
              {state.label || 'Untitled Session'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-txt-muted">Started:</span>
            <span className="font-mono text-txt-secondary">
              {state.startedAt ? formatTimeOfDay(state.startedAt) : 'Unknown'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-txt-muted">Last Recorded Heartbeat:</span>
            <span className="font-mono text-txt-secondary">
              {state.lastHeartbeat ? formatTimeOfDay(state.lastHeartbeat) : 'Unknown'}
            </span>
          </div>
          <div className="flex justify-between border-t border-border pt-1.5">
            <span className="text-txt-muted font-medium">Logged Duration:</span>
            <span className="font-mono font-bold text-primary">
              {formatTimerDisplay(durationUpToHeartbeat)}
            </span>
          </div>
        </div>

        <p className="text-xs text-txt-secondary leading-relaxed">
          How would you like to handle this session?
        </p>

        {/* 3 Resolution Options */}
        <div className="space-y-2 pt-1 text-xs">
          {/* Option 1: Resume */}
          <button
            type="button"
            onClick={() => onResolve('resume')}
            className="w-full flex items-center justify-between p-3 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all text-left group cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Play className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
              <div>
                <div className="font-bold text-txt-primary">Resume Session</div>
                <div className="text-[11px] text-txt-muted">Continue timing now; gap is recorded as a pause.</div>
              </div>
            </div>
          </button>

          {/* Option 2: End at Heartbeat */}
          <button
            type="button"
            onClick={() => onResolve('end')}
            className="w-full flex items-center justify-between p-3 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all text-left group cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
              <div>
                <div className="font-bold text-txt-primary">End at Last Heartbeat</div>
                <div className="text-[11px] text-txt-muted">Close at last recorded heartbeat and open review.</div>
              </div>
            </div>
          </button>

          {/* Option 3: Discard */}
          <button
            type="button"
            onClick={() => onResolve('discard')}
            className="w-full flex items-center justify-between p-3 rounded-xl border border-border hover:border-red-400 hover:bg-red-500/5 transition-all text-left group cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Trash2 className="w-4 h-4 text-red-500 group-hover:scale-110 transition-transform" />
              <div>
                <div className="font-bold text-txt-primary">Discard Session</div>
                <div className="text-[11px] text-txt-muted">Clear this interrupted session without saving.</div>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
