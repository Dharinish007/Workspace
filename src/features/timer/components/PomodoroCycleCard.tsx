import React from 'react';
import { PomodoroPhase, PomodoroCycleState, TimerConfig, TimerStatus } from '../types';
import { getNextPhasePreview } from '../engine/pomodoroEngine';
import { Check, Coffee, Brain, Moon } from 'lucide-react';

interface PomodoroCycleCardProps {
  cycle: PomodoroCycleState;
  currentPhase: PomodoroPhase;
  status: TimerStatus;
  config: TimerConfig;
  onSelectPhase: (phase: PomodoroPhase) => void;
}

export const PomodoroCycleCard: React.FC<PomodoroCycleCardProps> = ({
  cycle,
  currentPhase,
  status,
  config,
  onSelectPhase,
}) => {
  const isIdle = status === 'idle';
  const previewText = getNextPhasePreview(cycle, currentPhase, config);
  const totalBlocks = config.longBreakInterval || 4;

  return (
    <div className="flex flex-col justify-between h-full space-y-4">
      <div>
        <div className="text-xs font-medium text-txt-secondary mb-2.5 font-sans">
          Pomodoro Cycle
        </div>

        {/* 4 Steps Indicator Dots */}
        <div className="flex items-center gap-2 mb-2">
          {Array.from({ length: totalBlocks }).map((_, idx) => {
            const isCompleted = idx < cycle.completedWorkBlocks;
            const isCurrent = idx === cycle.completedWorkBlocks;

            if (isCompleted) {
              return (
                <div
                  key={idx}
                  className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center shadow-2xs text-xs font-bold"
                  title={`Block ${idx + 1}: Completed`}
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                </div>
              );
            }

            if (isCurrent) {
              return (
                <div
                  key={idx}
                  className="w-7 h-7 rounded-full border-2 border-primary bg-primary/15 flex items-center justify-center"
                  title={`Block ${idx + 1}: In Progress`}
                >
                  <div className="w-2 h-2 rounded-full bg-primary" />
                </div>
              );
            }

            return (
              <div
                key={idx}
                className="w-7 h-7 rounded-full bg-bg-subtle border border-border flex items-center justify-center text-txt-muted text-xs font-medium"
                title={`Block ${idx + 1}: Upcoming`}
              >
                {idx + 1}
              </div>
            );
          })}
        </div>

        {/* Cycle Count & Next Preview */}
        <div className="text-xs text-txt-secondary font-medium">
          <span className="font-semibold text-txt-primary">
            {cycle.completedWorkBlocks} / {totalBlocks}
          </span>
          <span className="mx-1.5">•</span>
          <span>{previewText}</span>
        </div>
      </div>

      {/* Phase Quick Reference & Idle Switcher */}
      <div className="space-y-1.5 pt-2 border-t border-border text-xs">
        {/* Work */}
        <button
          type="button"
          disabled={!isIdle}
          onClick={() => onSelectPhase('work')}
          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition-colors ${
            currentPhase === 'work'
              ? 'bg-primary/10 text-primary font-bold border border-primary/20'
              : 'text-txt-secondary hover:bg-bg-hover'
          } ${!isIdle ? 'cursor-default' : 'cursor-pointer'}`}
        >
          <div className="flex items-center gap-2">
            <Brain className="w-3.5 h-3.5 text-primary" />
            <span>Work</span>
          </div>
          <span className="tabular-nums font-mono text-[11px] text-txt-muted">
            {config.workMinutes} min
          </span>
        </button>

        {/* Short Break */}
        <button
          type="button"
          disabled={!isIdle}
          onClick={() => onSelectPhase('shortBreak')}
          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition-colors ${
            currentPhase === 'shortBreak'
              ? 'bg-primary/10 text-primary font-bold border border-primary/20'
              : 'text-txt-secondary hover:bg-bg-hover'
          } ${!isIdle ? 'cursor-default' : 'cursor-pointer'}`}
        >
          <div className="flex items-center gap-2">
            <Coffee className="w-3.5 h-3.5 text-primary" />
            <span>Short Break</span>
          </div>
          <span className="tabular-nums font-mono text-[11px] text-txt-muted">
            {config.shortBreakMinutes} min
          </span>
        </button>

        {/* Long Break */}
        <button
          type="button"
          disabled={!isIdle}
          onClick={() => onSelectPhase('longBreak')}
          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition-colors ${
            currentPhase === 'longBreak'
              ? 'bg-primary/10 text-primary font-bold border border-primary/20'
              : 'text-txt-secondary hover:bg-bg-hover'
          } ${!isIdle ? 'cursor-default' : 'cursor-pointer'}`}
        >
          <div className="flex items-center gap-2">
            <Moon className="w-3.5 h-3.5 text-primary" />
            <span>Long Break</span>
          </div>
          <span className="tabular-nums font-mono text-[11px] text-txt-muted">
            {config.longBreakMinutes} min
          </span>
        </button>
      </div>
    </div>
  );
};
