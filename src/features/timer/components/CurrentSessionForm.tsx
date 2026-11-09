import React, { useState } from 'react';
import { useWorkspace } from '../../../context/WorkspaceContext';
import { ActiveTimerState } from '../types';
import { formatTimerDisplay } from '../engine/calculations';
import { Tag, Link2, MessageSquare, Target, PauseCircle, Zap, Check, Trash2, X } from 'lucide-react';
import { motion } from 'framer-motion';

interface CurrentSessionFormProps {
  state: ActiveTimerState;
  activeDurationMs: number;
  onUpdateDraft: (fields: { label?: string; taskId?: string | null; note?: string }) => void;
  onTriggerSave: () => void;
  onTriggerDiscard: () => void;
  disabled?: boolean;
}

export const CurrentSessionForm: React.FC<CurrentSessionFormProps> = ({
  state,
  activeDurationMs,
  onUpdateDraft,
  onTriggerSave,
  onTriggerDiscard,
  disabled = false,
}) => {
  const { tasks, pages } = useWorkspace();
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  // Filter tasks to only active/open tasks or currently linked task
  const openTasks = tasks.filter(t => !t.completed || t.id === state.taskId);

  const handleTaskChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    onUpdateDraft({ taskId: val === '' ? null : val });
  };

  const handleClearTask = () => {
    onUpdateDraft({ taskId: null });
  };

  const isActive = state.status === 'running' || state.status === 'paused' || state.status === 'review';

  return (
    <div className="bg-bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-card hover:shadow-card-hover transition-all space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h2 className="text-base font-bold text-txt-primary font-serif tracking-tight">
          Current Session
        </h2>
        {isActive && (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 border border-primary/20 px-3 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span>Active Record</span>
          </span>
        )}
      </div>

      {/* Label Input */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-txt-secondary">
          <Tag className="w-3.5 h-3.5 text-primary" />
          <span>Label</span>
        </div>
        <input
          type="text"
          value={state.label}
          onChange={(e) => onUpdateDraft({ label: e.target.value })}
          placeholder="What are you focusing on?"
          disabled={disabled}
          className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl bg-bg-subtle border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none text-txt-primary placeholder:text-txt-muted transition-all"
        />
      </div>

      {/* Linked Task Selector */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-semibold text-txt-secondary">
          <div className="flex items-center gap-2">
            <Link2 className="w-3.5 h-3.5 text-primary" />
            <span>Linked Task</span>
          </div>
          {state.taskId && (
            <button
              type="button"
              onClick={handleClearTask}
              className="text-[11px] text-txt-muted hover:text-red-500 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <X className="w-3 h-3" />
              <span>Clear</span>
            </button>
          )}
        </div>

        <select
          value={state.taskId || ''}
          onChange={handleTaskChange}
          disabled={disabled}
          className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl bg-bg-subtle border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none text-txt-primary transition-all cursor-pointer"
        >
          <option value="">No task linked</option>
          {pages.map((page) => {
            const pageTasks = openTasks.filter(t => t.pageId === page.id);
            if (pageTasks.length === 0) return null;
            return (
              <optgroup key={page.id} label={page.name}>
                {pageTasks.map((task) => (
                  <option key={task.id} value={task.id}>
                    {page.name} › {task.title}
                  </option>
                ))}
              </optgroup>
            );
          })}
        </select>
      </div>

      {/* Note Input */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-txt-secondary">
          <MessageSquare className="w-3.5 h-3.5 text-primary" />
          <span>Note</span>
        </div>
        <textarea
          rows={2}
          value={state.note}
          onChange={(e) => onUpdateDraft({ note: e.target.value })}
          placeholder="Add an optional session note..."
          disabled={disabled}
          className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl bg-bg-subtle border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none text-txt-primary placeholder:text-txt-muted transition-all resize-none"
        />
      </div>

      {/* Live Metrics Strip */}
      <div className="grid grid-cols-3 gap-2 p-3 bg-bg-subtle rounded-xl border border-border text-center">
        <div>
          <div className="flex items-center justify-center gap-1 text-[11px] font-medium text-txt-muted mb-0.5">
            <Target className="w-3 h-3 text-primary" />
            <span>Elapsed</span>
          </div>
          <div className="font-mono text-xs font-bold text-txt-primary tabular-nums">
            {formatTimerDisplay(activeDurationMs)}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-center gap-1 text-[11px] font-medium text-txt-muted mb-0.5">
            <PauseCircle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            <span>Pauses</span>
          </div>
          <div className="font-mono text-xs font-bold text-txt-primary tabular-nums">
            {state.pauseCount}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-center gap-1 text-[11px] font-medium text-txt-muted mb-0.5">
            <Zap className="w-3 h-3 text-txt-muted" />
            <span>Blocks</span>
          </div>
          <div className="font-mono text-xs font-bold text-txt-primary tabular-nums">
            {state.mode === 'pomodoro' ? `${state.pomodoroCycle.completedWorkBlocks}/4` : '—'}
          </div>
        </div>
      </div>

      {/* Save / Discard Actions */}
      <div className="pt-2 flex items-center gap-2">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          type="button"
          disabled={!isActive || disabled}
          onClick={onTriggerSave}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-primary hover:bg-primary-hover text-white rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Check className="w-3.5 h-3.5" />
          <span>Save Session</span>
        </motion.button>

        {confirmDiscard ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                onTriggerDiscard();
                setConfirmDiscard(false);
              }}
              className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Confirm
            </button>
            <button
              type="button"
              onClick={() => setConfirmDiscard(false)}
              className="p-2 text-txt-muted hover:text-txt-primary transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={!isActive || disabled}
            onClick={() => setConfirmDiscard(true)}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3.5 border border-border hover:border-red-400 hover:text-red-500 text-txt-secondary rounded-xl font-semibold text-xs bg-bg-card transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Discard</span>
          </button>
        )}
      </div>
    </div>
  );
};
