import React from 'react';
import { TimerMode, TimerStatus } from '../types';
import { Target, Timer } from 'lucide-react';
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
        className="inline-flex p-1 bg-bg-subtle border border-border rounded-xl shadow-2xs relative"
        role="tablist"
        aria-label="Timer Mode"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'pomodoro'}
          disabled={isLocked && mode !== 'pomodoro'}
          onClick={() => onSelectMode('pomodoro')}
          className={`relative flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-medium font-sans transition-colors cursor-pointer z-10 ${
            mode === 'pomodoro'
              ? 'text-white'
              : 'text-txt-secondary hover:text-txt-primary'
          } ${isLocked && mode !== 'pomodoro' ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          {mode === 'pomodoro' && (
            <motion.div
              layoutId="timerModePill"
              className="absolute inset-0 bg-primary rounded-lg -z-10 shadow-xs"
              transition={{ duration: 0.15 }}
            />
          )}
          <Target className="w-3.5 h-3.5" />
          <span>Pomodoro</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={mode === 'stopwatch'}
          disabled={isLocked && mode !== 'stopwatch'}
          onClick={() => onSelectMode('stopwatch')}
          className={`relative flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-medium font-sans transition-colors cursor-pointer z-10 ${
            mode === 'stopwatch'
              ? 'text-white'
              : 'text-txt-secondary hover:text-txt-primary'
          } ${isLocked && mode !== 'stopwatch' ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          {mode === 'stopwatch' && (
            <motion.div
              layoutId="timerModePill"
              className="absolute inset-0 bg-primary rounded-lg -z-10 shadow-xs"
              transition={{ duration: 0.15 }}
            />
          )}
          <Timer className="w-3.5 h-3.5" />
          <span>Stopwatch</span>
        </button>
      </div>
    </div>
  );
};
