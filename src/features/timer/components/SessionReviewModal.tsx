import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../../../context/WorkspaceContext';
import { TimerSession, SessionOutcome, TimeSegment } from '../types';
import { 
  formatTimerDisplay, 
  calculateActiveDuration 
} from '../engine/calculations';
import { validateTimerSession } from '../services/validation';
import { X, Tag, Link2, AlertCircle, Trash2, Save, Clock, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';

interface SessionReviewModalProps {
  isOpen: boolean;
  initialLabel: string;
  initialTaskId: string | null;
  initialNote: string;
  initialOutcome?: SessionOutcome;
  startedAt: number;
  endedAt: number;
  segments: TimeSegment[];
  mode: 'pomodoro' | 'stopwatch';
  phase?: string;
  existingSessions: TimerSession[];
  onSave: (sessionData: {
    label: string;
    taskId: string | null;
    note: string;
    outcome: SessionOutcome;
    startedAt: number;
    endedAt: number;
    segments: TimeSegment[];
  }) => Promise<{ success: boolean; errors?: any[] }>;
  onDiscard: () => Promise<void>;
  onClose: () => void;
}

export const SessionReviewModal: React.FC<SessionReviewModalProps> = ({
  isOpen,
  initialLabel,
  initialTaskId,
  initialNote,
  initialOutcome = 'completed',
  startedAt,
  endedAt,
  segments,
  existingSessions,
  onSave,
  onDiscard,
  onClose,
}) => {
  const { tasks, pages } = useWorkspace();

  const [label, setLabel] = useState(initialLabel);
  const [taskId, setTaskId] = useState<string | null>(initialTaskId);
  const [note, setNote] = useState(initialNote);
  const [outcome, setOutcome] = useState<SessionOutcome>(initialOutcome);
  const [sessionSegments, setSessionSegments] = useState<TimeSegment[]>(segments);
  const [startTimeMs, setStartTimeMs] = useState(startedAt);
  const [endTimeMs, setEndTimeMs] = useState(endedAt);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLabel(initialLabel);
      setTaskId(initialTaskId);
      setNote(initialNote);
      setOutcome(initialOutcome);
      setSessionSegments(segments.map(s => ({ start: s.start, end: s.end ?? endedAt })));
      setStartTimeMs(startedAt);
      setEndTimeMs(endedAt);
      setValidationErrors([]);
    }
  }, [isOpen, initialLabel, initialTaskId, initialNote, initialOutcome, startedAt, endedAt, segments]);

  if (!isOpen) return null;

  const totalActiveMs = calculateActiveDuration(sessionSegments, endTimeMs);
  const openTasks = tasks.filter(t => !t.completed || t.id === taskId);

  const toLocalISO = (timestamp: number) => {
    const date = new Date(timestamp);
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(timestamp - offset).toISOString().slice(0, 16);
  };

  const handleStartTimeChange = (val: string) => {
    const ts = new Date(val).getTime();
    if (!isNaN(ts)) {
      setStartTimeMs(ts);
      if (sessionSegments.length > 0) {
        setSessionSegments(prev => [
          { ...prev[0], start: ts },
          ...prev.slice(1)
        ]);
      }
    }
  };

  const handleEndTimeChange = (val: string) => {
    const ts = new Date(val).getTime();
    if (!isNaN(ts)) {
      setEndTimeMs(ts);
      if (sessionSegments.length > 0) {
        const lastIdx = sessionSegments.length - 1;
        setSessionSegments(prev => [
          ...prev.slice(0, lastIdx),
          { ...prev[lastIdx], end: ts }
        ]);
      }
    }
  };

  const handleSaveClick = async () => {
    const candidate: Partial<TimerSession> = {
      label: label.trim(),
      taskId,
      startedAt: startTimeMs,
      endedAt: endTimeMs,
      segments: sessionSegments,
      status: 'saved',
    };

    const validation = validateTimerSession(candidate, existingSessions, Date.now());
    if (!validation.isValid) {
      setValidationErrors(validation.errors.map(e => e.message));
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await onSave({
        label: label.trim(),
        taskId,
        note: note.trim(),
        outcome,
        startedAt: startTimeMs,
        endedAt: endTimeMs,
        segments: sessionSegments,
      });

      if (res.success) {
        onClose();
      } else if (res.errors) {
        setValidationErrors(res.errors.map(e => e.message || 'Validation error'));
      }
    } catch (err: any) {
      setValidationErrors([err?.message || 'Failed to save session.']);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-lg bg-bg-card border border-border rounded-2xl shadow-modal overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-bg-subtle/40">
          <div>
            <h2 id="review-modal-title" className="text-base font-bold text-txt-primary font-serif tracking-tight">
              Session Review
            </h2>
            <p className="text-xs text-txt-muted mt-0.5">
              Review and verify session details before saving to records.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-txt-muted hover:text-txt-primary hover:bg-bg-hover transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* Validation Errors Box */}
          {validationErrors.length > 0 && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Please correct the following:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 pl-2 text-[11px]">
                {validationErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Active Focus Time Highlight */}
          <div className="flex items-center justify-between p-3.5 bg-primary/10 border border-primary/20 rounded-xl">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <span className="font-semibold text-txt-primary">Total Active Focus</span>
            </div>
            <div className="font-mono text-base font-bold text-primary tabular-nums">
              {formatTimerDisplay(totalActiveMs)}
            </div>
          </div>

          {/* Label Field */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 font-semibold text-txt-secondary">
              <Tag className="w-3.5 h-3.5 text-primary" />
              <span>Session Label</span>
              <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Strategic Planning, Coding Review"
              className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl bg-bg-subtle border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none text-txt-primary"
            />
          </div>

          {/* Linked Task Field */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 font-semibold text-txt-secondary">
              <Link2 className="w-3.5 h-3.5 text-primary" />
              <span>Linked Task (Optional)</span>
            </label>
            <select
              value={taskId || ''}
              onChange={(e) => setTaskId(e.target.value === '' ? null : e.target.value)}
              className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl bg-bg-subtle border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none text-txt-primary cursor-pointer"
            >
              <option value="">No task linked</option>
              {pages.map((page) => {
                const pageTasks = openTasks.filter(t => t.pageId === page.id);
                if (pageTasks.length === 0) return null;
                return (
                  <optgroup key={page.id} label={page.name}>
                    {pageTasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {page.name} › {t.title}
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </select>
          </div>

          {/* Session Outcome */}
          <div className="space-y-1.5">
            <label className="font-semibold text-txt-secondary block">
              Session Outcome
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['completed', 'interrupted', 'abandoned'] as SessionOutcome[]).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setOutcome(opt)}
                  className={`py-2 px-2.5 rounded-xl capitalize font-bold border text-center transition-all cursor-pointer ${
                    outcome === opt
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-txt-secondary hover:bg-bg-hover'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Start Time & End Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="font-semibold text-txt-secondary block">
                Start Time
              </label>
              <input
                type="datetime-local"
                value={toLocalISO(startTimeMs)}
                onChange={(e) => handleStartTimeChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-bg-subtle border border-border focus:border-primary outline-none text-txt-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-txt-secondary block">
                End Time
              </label>
              <input
                type="datetime-local"
                value={toLocalISO(endTimeMs)}
                onChange={(e) => handleEndTimeChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-bg-subtle border border-border focus:border-primary outline-none text-txt-primary"
              />
            </div>
          </div>

          {/* Note Field */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 font-semibold text-txt-secondary">
              <MessageSquare className="w-3.5 h-3.5 text-primary" />
              <span>Notes (Optional)</span>
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Reflections or details on what was accomplished..."
              className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl bg-bg-subtle border border-border focus:border-primary outline-none text-txt-primary resize-none"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-bg-subtle/20 gap-3">
          <button
            type="button"
            onClick={async () => {
              if (window.confirm('Discard this focus session? It will not be saved to records.')) {
                await onDiscard();
                onClose();
              }
            }}
            className="flex items-center gap-1.5 px-4 py-2 border border-border hover:border-red-400 hover:text-red-500 text-txt-secondary rounded-xl font-semibold text-xs transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Discard</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-txt-muted hover:text-txt-primary rounded-xl font-medium text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              type="button"
              disabled={isSubmitting}
              onClick={handleSaveClick}
              className="flex items-center gap-1.5 px-5 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Saving...' : 'Save to Records'}</span>
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
};
