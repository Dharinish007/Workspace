import React from 'react';
import { TimerMode, TimerStatus } from '../types';
import { motion } from 'framer-motion';

interface ModeSelectorProps {
  mode: TimerMode;
  status: TimerStatus;
  onSelectMode: (mode: TimerMode) => void;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({
  mode,
  status,
  onSelectMode,
}) => {
  const isLocked = status === 'running' || status === 'paused';

  return (
    <div className="flex items-center justify-center mb-4">
      <div 
        className="inline-flex p-1 bg-bg-card border border-border rounded-xl shadow-2xs relative"
        role="tablist"
        aria-label="Timer Mode"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'pomodoro'}
          disabled={isLocked && mode !== 'pomodoro'}
          onClick={() => onSelectMode('pomodoro')}
          className={`relative flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold font-sans transition-colors cursor-pointer z-10 ${
            mode === 'pomodoro'
              ? 'text-white'
              : 'text-txt-secondary hover:text-txt-primary'
          } ${isLocked && mode !== 'pomodoro' ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          {mode === 'pomodoro' && (
            <motion.div
              layoutId="timerModePill"
              className="absolute inset-0 bg-primary rounded-lg -z-10 shadow-xs"
              transition={{ type: "spring", stiffness: 450, damping: 35 }}
            />
          )}
          <span>🍅</span>
          <span>Pomodoro</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={mode === 'stopwatch'}
          disabled={isLocked && mode !== 'stopwatch'}
          onClick={() => onSelectMode('stopwatch')}
          className={`relative flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold font-sans transition-colors cursor-pointer z-10 ${
            mode === 'stopwatch'
              ? 'text-white'
              : 'text-txt-secondary hover:text-txt-primary'
          } ${isLocked && mode !== 'stopwatch' ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          {mode === 'stopwatch' && (
            <motion.div
              layoutId="timerModePill"
              className="absolute inset-0 bg-primary rounded-lg -z-10 shadow-xs"
              transition={{ type: "spring", stiffness: 450, damping: 35 }}
            />
          )}
          <span>⏱️</span>
          <span>Stopwatch</span>
        </button>
      </div>
    </div>
  );
};
