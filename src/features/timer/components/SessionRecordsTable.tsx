import React, { useState } from 'react';
import { TimerSession } from '../types';
import { formatTimerDisplay, formatTimeRange, calculateActiveDuration } from '../engine/calculations';
import { History, Plus, MoreHorizontal, Edit2, Trash2 } from 'lucide-react';
import { useWorkspace } from '../../../context/WorkspaceContext';
import { motion } from 'framer-motion';

interface SessionRecordsTableProps {
  sessions: TimerSession[];
  onOpenManualModal: () => void;
  onEditSession: (session: TimerSession) => void;
  onDeleteSession: (id: string) => void;
}

export type RecordFilter = 'all' | 'pomodoro' | 'stopwatch' | 'manual';

export const SessionRecordsTable: React.FC<SessionRecordsTableProps> = ({
  sessions,
  onOpenManualModal,
  onEditSession,
  onDeleteSession,
}) => {
  const [filter, setFilter] = useState<RecordFilter>('all');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const { tasks, pages } = useWorkspace();

  const taskMap = new Map(tasks.map(t => [t.id, t]));
  const pageMap = new Map(pages.map(p => [p.id, p.name]));

  const savedSessions = sessions.filter(s => s.status === 'saved');

  const filteredSessions = savedSessions.filter((s) => {
    if (filter === 'all') return true;
    if (filter === 'pomodoro') return s.mode === 'pomodoro' && s.source !== 'manual';
    if (filter === 'stopwatch') return s.mode === 'stopwatch' && s.source !== 'manual';
    if (filter === 'manual') return s.source === 'manual';
    return true;
  });

  const getSessionIcon = (session: TimerSession) => {
    if (session.source === 'manual') return '✍️';
    if (session.mode === 'pomodoro') return '🍅';
    return '⏱️';
  };

  const getOutcomeBadge = (session: TimerSession) => {
    if (!session.outcome) return null;
    if (session.outcome === 'completed') {
      return (
        <span className="text-[11px] text-primary font-semibold">
          Completed
        </span>
      );
    }
    if (session.outcome === 'interrupted') {
      return (
        <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
          Interrupted
        </span>
      );
    }
    return (
      <span className="text-[11px] text-red-500 font-semibold">
        Abandoned
      </span>
    );
  };

  return (
    <div className="bg-bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-card hover:shadow-card-hover transition-all space-y-4">
      {/* Top Header & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <History className="w-4 h-4" />
          </div>
          <h2 className="text-base font-bold text-txt-primary font-serif tracking-tight">
            Session Records
          </h2>
          <span className="text-xs font-mono text-txt-muted">
            ({filteredSessions.length})
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Filter Pills */}
          <div className="flex items-center h-9 bg-bg-card border border-border rounded-xl p-0.5 shadow-2xs relative">
            {(['all', 'pomodoro', 'stopwatch', 'manual'] as RecordFilter[]).map((tab) => {
              const isSelected = filter === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setFilter(tab)}
                  className={`relative px-3 py-1 text-xs font-sans font-bold capitalize rounded-lg transition-colors cursor-pointer z-10 ${
                    isSelected ? 'text-white' : 'text-txt-secondary hover:text-txt-primary'
                  }`}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="recordFilterPill"
                      className="absolute inset-0 bg-primary rounded-lg -z-10 shadow-xs"
                      transition={{ type: "spring", stiffness: 450, damping: 35 }}
                    />
                  )}
                  <span>{tab}</span>
                </button>
              );
            })}
          </div>

          {/* Add Manual Session Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            type="button"
            onClick={onOpenManualModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-card hover:bg-bg-hover text-txt-primary rounded-xl text-xs font-bold border border-border hover:border-primary shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-primary" />
            <span>Manual</span>
          </motion.button>
        </div>
      </div>

      {/* Session Rows */}
      {filteredSessions.length === 0 ? (
        <div className="text-center py-10 space-y-2">
          <div className="text-3xl">⏳</div>
          <div className="text-sm font-bold text-txt-primary font-serif">No focus sessions recorded yet</div>
          <p className="text-xs text-txt-muted max-w-sm mx-auto">
            Completed focus sessions will appear here with detailed active time, intervals, and notes.
          </p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            type="button"
            onClick={onOpenManualModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 mt-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-hover shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Manual Entry</span>
          </motion.button>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredSessions.map((session) => {
            const activeDuration = calculateActiveDuration(session.segments, session.endedAt);
            const task = session.taskId ? taskMap.get(session.taskId) : null;
            const pageName = task ? pageMap.get(task.pageId) : null;

            return (
              <div
                key={session.id}
                className="group relative flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-bg-subtle/50 hover:bg-bg-subtle border border-border hover:border-primary/50 transition-all gap-3 shadow-2xs"
              >
                {/* Left: Icon & Label & Task */}
                <div className="flex items-start gap-3 min-w-0">
                  <div className="text-xl shrink-0 mt-0.5" role="img" aria-hidden="true">
                    {getSessionIcon(session)}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-txt-primary truncate">
                        {session.label || 'Untitled Session'}
                      </span>
                      {session.wasAdjusted && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-700 dark:text-amber-400 font-bold uppercase tracking-wider">
                          Edited
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-txt-muted mt-0.5 flex-wrap">
                      <span className="capitalize font-medium">{session.mode}</span>
                      <span>•</span>
                      {getOutcomeBadge(session)}
                      {task && (
                        <>
                          <span>•</span>
                          <span className="text-txt-secondary font-medium truncate max-w-[180px]">
                            {pageName ? `${pageName} › ` : ''}{task.title}
                          </span>
                        </>
                      )}
                      {session.note && (
                        <>
                          <span>•</span>
                          <span className="italic truncate max-w-[150px] text-txt-muted">
                            "{session.note}"
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Duration, Time Range, Status Badge, Menu */}
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 self-end sm:self-center">
                  <div className="text-right">
                    <div className="font-mono text-xs font-bold text-txt-primary tabular-nums">
                      {formatTimerDisplay(activeDuration)}
                    </div>
                    <div className="text-[11px] text-txt-muted tabular-nums">
                      {formatTimeRange(session.startedAt, session.endedAt)}
                    </div>
                  </div>

                  {/* Saved Badge */}
                  <span className="text-[11px] font-bold text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full">
                    Saved
                  </span>

                  {/* Context Actions */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenMenuId(openMenuId === session.id ? null : session.id)}
                      className="p-1.5 rounded-lg text-txt-muted hover:text-txt-primary hover:bg-bg-hover transition-colors cursor-pointer"
                      aria-label="Session actions"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>

                    {openMenuId === session.id && (
                      <div className="absolute right-0 top-full mt-1 w-32 bg-bg-card border border-border rounded-xl shadow-modal z-20 py-1 text-xs">
                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuId(null);
                            onEditSession(session);
                          }}
                          className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-bg-hover text-txt-primary cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-primary" />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuId(null);
                            if (window.confirm('Delete this session record permanently?')) {
                              onDeleteSession(session.id);
                            }
                          }}
                          className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-red-50 text-red-600 dark:hover:bg-red-950/30 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
