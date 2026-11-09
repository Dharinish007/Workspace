import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../../../context/WorkspaceContext';
import { TimerSession, TimerMode, SessionOutcome } from '../types';
import { validateTimerSession } from '../services/validation';
import { getLocalDateString } from '../engine/calculations';
import { X, Tag, Link2, Clock, AlertCircle, Save } from 'lucide-react';
import { motion } from 'framer-motion';

interface ManualSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (session: TimerSession) => Promise<void>;
  existingSessions: TimerSession[];
  editingSession?: TimerSession | null;
}

export const ManualSessionModal: React.FC<ManualSessionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingSessions,
  editingSession = null,
}) => {
  const { tasks, pages } = useWorkspace();

  const now = Date.now();
  const defaultStart = now - 25 * 60 * 1000;
  const defaultEnd = now;

  const [mode, setMode] = useState<TimerMode>('pomodoro');
  const [label, setLabel] = useState('');
  const [taskId, setTaskId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [outcome, setOutcome] = useState<SessionOutcome>('completed');
  const [startTimeMs, setStartTimeMs] = useState<number>(defaultStart);
  const [endTimeMs, setEndTimeMs] = useState<number>(defaultEnd);
  const [pauseMinutes, setPauseMinutes] = useState<number>(0);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      if (editingSession) {
        setMode(editingSession.mode);
        setLabel(editingSession.label);
        setTaskId(editingSession.taskId || null);
        setNote(editingSession.note || '');
        setOutcome(editingSession.outcome || 'completed');
        setStartTimeMs(editingSession.startedAt);
        setEndTimeMs(editingSession.endedAt);
        const activeMs = editingSession.segments.reduce((acc, s) => acc + ((s.end ?? editingSession.endedAt) - s.start), 0);
        const totalMs = editingSession.endedAt - editingSession.startedAt;
        const pauseMs = Math.max(0, totalMs - activeMs);
        setPauseMinutes(Math.round(pauseMs / 60000));
      } else {
        const currentNow = Date.now();
        setMode('pomodoro');
        setLabel('');
        setTaskId(null);
        setNote('');
        setOutcome('completed');
        setStartTimeMs(currentNow - 25 * 60 * 1000);
        setEndTimeMs(currentNow);
        setPauseMinutes(0);
      }
      setValidationErrors([]);
    }
  }, [isOpen, editingSession]);

  if (!isOpen) return null;

  const openTasks = tasks.filter(t => !t.completed || t.id === taskId);

  const toLocalISO = (timestamp: number) => {
    const d = new Date(timestamp);
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(timestamp - offset).toISOString().slice(0, 16);
  };

  const handleSave = async () => {
    let segments = [];
    if (pauseMinutes > 0 && (endTimeMs - startTimeMs) > pauseMinutes * 60000) {
      const pauseMs = pauseMinutes * 60000;
      const totalSpan = endTimeMs - startTimeMs;
      const firstSegmentSpan = Math.floor((totalSpan - pauseMs) / 2);
      const seg1End = startTimeMs + firstSegmentSpan;
      const seg2Start = seg1End + pauseMs;
      segments = [
        { start: startTimeMs, end: seg1End },
        { start: seg2Start, end: endTimeMs },
      ];
    } else {
      segments = [{ start: startTimeMs, end: endTimeMs }];
    }

    const candidate: Partial<TimerSession> = {
      id: editingSession ? editingSession.id : (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'man_' + Math.random().toString(36).substring(2, 9)),
      status: 'saved',
      mode,
      phase: mode === 'pomodoro' ? 'work' : undefined,
      label: label.trim(),
      taskId,
      note: note.trim(),
      outcome,
      startedAt: startTimeMs,
      endedAt: endTimeMs,
      segments,
      pauseCount: pauseMinutes > 0 ? 1 : 0,
      plannedMs: mode === 'pomodoro' ? 25 * 60 * 1000 : null,
      localDate: getLocalDateString(startTimeMs),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      wasAdjusted: !!editingSession,
      source: editingSession ? editingSession.source : 'manual',
      createdAt: editingSession ? editingSession.createdAt : Date.now(),
      updatedAt: Date.now(),
    };

    const validation = validateTimerSession(candidate, existingSessions, Date.now());
    if (!validation.isValid) {
      setValidationErrors(validation.errors.map(e => e.message));
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(candidate as TimerSession);
      onClose();
    } catch (err: any) {
      setValidationErrors([err?.message || 'Failed to save manual session.']);
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
        aria-labelledby="manual-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-bg-subtle/40">
          <div>
            <h2 id="manual-modal-title" className="text-base font-bold text-txt-primary font-serif tracking-tight">
              {editingSession ? 'Edit Session Record' : 'Manual Session Entry'}
            </h2>
            <p className="text-xs text-txt-muted mt-0.5">
              {editingSession ? 'Update details for this saved session.' : 'Log a completed focus session directly into your records.'}
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

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* Validation Alert */}
          {validationErrors.length > 0 && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Errors:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 pl-2 text-[11px]">
                {validationErrors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Mode Selector */}
          <div className="flex items-center gap-2 p-1 bg-bg-card border border-border rounded-xl shadow-2xs w-fit">
            <button
              type="button"
              onClick={() => setMode('pomodoro')}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                mode === 'pomodoro'
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-txt-secondary hover:text-txt-primary'
              }`}
            >
              🍅 Pomodoro
            </button>
            <button
              type="button"
              onClick={() => setMode('stopwatch')}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                mode === 'stopwatch'
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-txt-secondary hover:text-txt-primary'
              }`}
            >
              ⏱️ Stopwatch
            </button>
          </div>

          {/* Label */}
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
              placeholder="e.g. Architecture RFC Draft"
              className="w-full px-3.5 py-2 rounded-xl bg-bg-subtle border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none text-txt-primary"
            />
          </div>

          {/* Linked Task */}
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
              {pages.map((p) => {
                const pageTasks = openTasks.filter(t => t.pageId === p.id);
                if (pageTasks.length === 0) return null;
                return (
                  <optgroup key={p.id} label={p.name}>
                    {pageTasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {p.name} › {t.title}
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </select>
          </div>

          {/* Timestamps */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="font-semibold text-txt-secondary block">
                Start Time
              </label>
              <input
                type="datetime-local"
                value={toLocalISO(startTimeMs)}
                onChange={(e) => {
                  const ts = new Date(e.target.value).getTime();
                  if (!isNaN(ts)) setStartTimeMs(ts);
                }}
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
                onChange={(e) => {
                  const ts = new Date(e.target.value).getTime();
                  if (!isNaN(ts)) setEndTimeMs(ts);
                }}
                className="w-full px-3 py-2 rounded-xl bg-bg-subtle border border-border focus:border-primary outline-none text-txt-primary"
              />
            </div>
          </div>

          {/* Pause Minutes */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 font-semibold text-txt-secondary">
              <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Total Pause Time (Minutes)</span>
            </label>
            <input
              type="number"
              min="0"
              max="240"
              value={pauseMinutes}
              onChange={(e) => setPauseMinutes(Math.max(0, parseInt(e.target.value, 10) || 0))}
              className="w-full px-3.5 py-2 rounded-xl bg-bg-subtle border border-border focus:border-primary outline-none text-txt-primary"
            />
          </div>

          {/* Outcome */}
          <div className="space-y-1.5">
            <label className="font-semibold text-txt-secondary block">
              Outcome
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

          {/* Note */}
          <div className="space-y-1.5">
            <label className="font-semibold text-txt-secondary block">
              Notes
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Session summary..."
              className="w-full px-3.5 py-2 rounded-xl bg-bg-subtle border border-border focus:border-primary outline-none text-txt-primary resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-border bg-bg-subtle/20 gap-2">
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
            onClick={handleSave}
            className="flex items-center gap-1.5 px-5 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Saving...' : editingSession ? 'Update Session' : 'Save Session'}</span>
          </motion.button>
        </div>
      </div>
    </div>
  );
};
