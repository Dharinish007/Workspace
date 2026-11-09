import React from 'react';
import { TimerMode, PomodoroPhase, TimerStatus } from '../types';

interface TimerDialProps {
  mode: TimerMode;
  phase: PomodoroPhase;
  status: TimerStatus;
  formattedTime: string;
  formattedPlannedTime: string;
  progressPercent: number;
}

export const TimerDial: React.FC<TimerDialProps> = ({
  mode,
  phase,
  status,
  formattedTime,
  formattedPlannedTime,
  progressPercent,
}) => {
  const size = 260;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  const getPhaseLabel = () => {
    if (mode === 'stopwatch') return 'Stopwatch';
    switch (phase) {
      case 'work':
        return 'Focus (Work)';
      case 'shortBreak':
        return 'Short Break';
      case 'longBreak':
        return 'Long Break';
    }
  };

  const getPhaseIcon = () => {
    if (mode === 'stopwatch') return '⏱️';
    switch (phase) {
      case 'work':
        return '🍅';
      case 'shortBreak':
        return '☕';
      case 'longBreak':
        return '🧘';
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center select-none py-2">
      <div className="relative w-[260px] h-[260px] flex items-center justify-center">
        <svg
          width={size}
          height={size}
          className="transform -rotate-90 drop-shadow-xs"
          aria-hidden="true"
        >
          {/* Background Track Circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="var(--color-border-subtle)"
            strokeWidth={strokeWidth}
            className="transition-colors duration-200"
          />

          {/* Active Accent Progress Ring */}
          {mode === 'pomodoro' ? (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke="var(--color-primary)"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-[stroke-dashoffset] duration-300 ease-out"
            />
          ) : (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke="var(--color-primary)"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={status === 'running' ? circumference * 0.25 : circumference}
              strokeLinecap="round"
              className={status === 'running' ? 'animate-spin origin-center' : ''}
              style={{ animationDuration: '6s' }}
            />
          )}
        </svg>

        {/* Center Text Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
          {/* Phase Badge */}
          <div className="flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full mb-1">
            <span role="img" aria-label={getPhaseLabel()}>
              {getPhaseIcon()}
            </span>
            <span>{getPhaseLabel()}</span>
          </div>

          {/* Time Display */}
          <div 
            className="font-bold text-5xl md:text-[56px] tracking-tight tabular-nums text-txt-primary my-1 font-mono leading-none"
            aria-live="polite"
          >
            {formattedTime}
          </div>

          {/* Subtitle */}
          <div className="text-xs text-txt-muted font-medium mt-1">
            {mode === 'pomodoro' && formattedPlannedTime ? (
              <span>of {formattedPlannedTime}</span>
            ) : status === 'running' ? (
              <span className="flex items-center gap-1.5 text-primary font-semibold">
                <span className="w-2 h-2 rounded-full bg-primary animate-ping inline-block" />
                Active Focus
              </span>
            ) : status === 'paused' ? (
              <span className="text-amber-600 dark:text-amber-400 font-semibold">Paused</span>
            ) : (
              <span>Ready</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
