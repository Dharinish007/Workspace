import React, { useState, useEffect } from 'react';
import { ActivityLogEvent, ActivityAction } from '../types';
import { TimerRepository } from '../repository/timerRepository';
import { formatTimeOfDay, getLocalDateString } from '../engine/calculations';
import { X, Activity, Filter, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

interface ActivityLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ActivityLogModal: React.FC<ActivityLogModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [logs, setLogs] = useState<ActivityLogEvent[]>([]);
  const [filterAction, setFilterAction] = useState<string>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const data = await TimerRepository.getAllActivityLogs();
      setLogs(data);
    } catch (err) {
      console.error('Failed to load activity logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredLogs = logs.filter(l => {
    if (filterAction === 'all') return true;
    return l.action.includes(filterAction);
  });

  const getActionBadge = (action: ActivityAction) => {
    switch (action) {
      case 'session.started':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">Started</span>;
      case 'session.paused':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-700 dark:text-amber-400">Paused</span>;
      case 'session.resumed':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-500/15 text-blue-700 dark:text-blue-400">Resumed</span>;
      case 'session.stopped':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-500/15 text-purple-700 dark:text-purple-400">Stopped</span>;
      case 'session.saved':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-primary/15 text-primary">Saved</span>;
      case 'session.discarded':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-500/15 text-red-700 dark:text-red-400">Discarded</span>;
      case 'session.recovered':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-orange-500/15 text-orange-700 dark:text-orange-400">Recovered</span>;
      case 'session.reset':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-neutral-500/15 text-neutral-700 dark:text-neutral-400">Reset</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-bg-subtle text-txt-secondary">{action}</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-2xl bg-bg-card border border-border rounded-2xl shadow-modal overflow-hidden flex flex-col max-h-[85vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="activity-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-bg-subtle/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h2 id="activity-modal-title" className="text-base font-bold text-txt-primary font-serif tracking-tight">
                Timer Activity Log
              </h2>
              <p className="text-xs text-txt-muted">
                Complete audit trail of all timer session events, pauses, saves, and discards.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchLogs}
              title="Refresh logs"
              className="p-1.5 rounded-lg text-txt-muted hover:text-txt-primary hover:bg-bg-hover transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-txt-muted hover:text-txt-primary hover:bg-bg-hover transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-1.5 px-6 py-2.5 border-b border-border bg-bg-subtle/20 text-xs overflow-x-auto">
          <Filter className="w-3.5 h-3.5 text-txt-muted shrink-0 mr-1" />
          {[
            { id: 'all', label: 'All' },
            { id: 'saved', label: 'Saved' },
            { id: 'discarded', label: 'Discarded' },
            { id: 'paused', label: 'Paused' },
            { id: 'stopped', label: 'Stopped' },
            { id: 'recovered', label: 'Recovered' },
          ].map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilterAction(f.id)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                filterAction === f.id
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-txt-secondary hover:text-txt-primary hover:bg-bg-hover'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Timeline Log List */}
        <div className="p-6 overflow-y-auto space-y-3 text-xs divide-y divide-border">
          {isLoading ? (
            <div className="text-center py-10 text-txt-muted">Loading activity events...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-10 text-txt-muted">No activity logs found.</div>
          ) : (
            filteredLogs.map(log => {
              const dateStr = getLocalDateString(log.timestamp);
              const timeStr = formatTimeOfDay(log.timestamp);

              return (
                <div key={log.id} className="pt-3 first:pt-0 flex items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {getActionBadge(log.action)}
                      <span className="font-mono text-[11px] text-txt-muted">
                        {log.entity}:{log.entityId}
                      </span>
                    </div>

                    {log.diff && (
                      <div className="text-[11px] text-txt-secondary bg-bg-subtle p-2 rounded-lg font-mono overflow-x-auto border border-border">
                        {log.diff.after && <div>after: {JSON.stringify(log.diff.after)}</div>}
                        {log.diff.before && <div>before: {JSON.stringify(log.diff.before)}</div>}
                      </div>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-mono text-xs font-bold text-txt-primary">{timeStr}</div>
                    <div className="text-[11px] text-txt-muted">{dateStr}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-border bg-bg-subtle/20 text-xs text-txt-muted">
          <span>{filteredLogs.length} events logged</span>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-bg-card hover:bg-bg-hover border border-border text-txt-primary rounded-xl font-bold transition-colors cursor-pointer"
          >
            Close
          </motion.button>
        </div>
      </div>
    </div>
  );
};
