import React from 'react';
import { DailyFocusSummary, TimerConfig } from '../types';
import { formatDurationHuman } from '../engine/calculations';
import { BarChart2, Flame } from 'lucide-react';

interface TodayFocusCardProps {
  summary: DailyFocusSummary;
  config: TimerConfig;
}

export const TodayFocusCard: React.FC<TodayFocusCardProps> = ({
  summary,
  config,
}) => {
  const totalMinutes = Math.floor(summary.totalActiveMs / 60000);
  const goalMinutes = config.dailyGoalMinutes;

  const progressPercent = goalMinutes && goalMinutes > 0
    ? Math.min(100, Math.round((totalMinutes / goalMinutes) * 100))
    : null;

  return (
    <div className="bg-bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <BarChart2 className="w-4 h-4" />
          </div>
          <h2 className="text-sm sm:text-base font-bold text-txt-primary font-serif tracking-tight">
            Today's Focus
          </h2>
        </div>

        {goalMinutes && progressPercent !== null && (
          <div className="flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full">
            <Flame className="w-3 h-3 text-primary" />
            <span>{progressPercent}% of Goal</span>
          </div>
        )}
      </div>

      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-[28px] sm:text-[32px] font-mono font-bold text-txt-primary tracking-tight leading-none">
            {formatDurationHuman(summary.totalActiveMs)}
          </div>
          <div className="text-xs text-txt-muted mt-1">
            Total focus time today
          </div>
        </div>

        <div className="text-right space-y-1 text-xs text-txt-secondary font-medium">
          <div className="flex items-center justify-end gap-1.5">
            <span>🍅</span>
            <span className="font-semibold text-txt-primary">{summary.pomodoroCount}</span>
            <span>Pomodoro {summary.pomodoroCount === 1 ? 'session' : 'sessions'}</span>
          </div>

          <div className="flex items-center justify-end gap-1.5">
            <span>⏱️</span>
            <span className="font-semibold text-txt-primary">{summary.stopwatchCount}</span>
            <span>Stopwatch {summary.stopwatchCount === 1 ? 'session' : 'sessions'}</span>
          </div>
        </div>
      </div>

      {/* Progress Bar (if goal configured in settings) */}
      {goalMinutes && goalMinutes > 0 ? (
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[11px] text-txt-muted font-medium">
            <span>Daily Goal ({goalMinutes} min)</span>
            <span className="tabular-nums font-mono font-semibold text-txt-primary">{totalMinutes} / {goalMinutes} min</span>
          </div>
          <div className="w-full h-2 rounded-full bg-bg-subtle overflow-hidden border border-border">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="text-[11px] text-txt-muted border-t border-border pt-2 flex items-center justify-between">
          <span>Set a daily focus goal in Settings</span>
          <span className="font-medium text-txt-secondary">{summary.sessions.length} sessions logged</span>
        </div>
      )}
    </div>
  );
};
