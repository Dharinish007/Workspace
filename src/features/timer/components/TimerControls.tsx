import React from 'react';
import { TimerStatus } from '../types';
import { Play, Pause, Square, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';

interface TimerControlsProps {
  status: TimerStatus;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onReset: () => void;
  disabled?: boolean;
}

export const TimerControls: React.FC<TimerControlsProps> = ({
  status,
  onStart,
  onPause,
  onResume,
  onStop,
  onReset,
  disabled = false,
}) => {
  if (status === 'idle') {
    return (
      <div className="flex items-center justify-center gap-3 mt-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          type="button"
          disabled={disabled}
          onClick={onStart}
          className="flex items-center justify-center gap-2 px-8 py-3 bg-primary hover:bg-primary-hover text-white rounded-xl font-bold text-sm shadow-xs transition-colors cursor-pointer disabled:opacity-50"
        >
          <Play className="w-4 h-4 fill-white" />
          <span>Start Focus</span>
        </motion.button>
      </div>
    );
  }

  if (status === 'running') {
    return (
      <div className="flex items-center justify-center gap-3 mt-4">
        {/* Pause Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          type="button"
          disabled={disabled}
          onClick={onPause}
          className="flex items-center justify-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl font-bold text-sm shadow-xs transition-colors cursor-pointer"
        >
          <Pause className="w-4 h-4 fill-white" />
          <span>Pause</span>
        </motion.button>

        {/* Stop Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          type="button"
          disabled={disabled}
          onClick={onStop}
          className="flex items-center justify-center gap-2 px-5 py-2.5 border border-border hover:border-primary text-txt-primary rounded-xl font-semibold text-sm bg-bg-card hover:bg-bg-hover transition-colors shadow-2xs cursor-pointer"
        >
          <Square className="w-4 h-4" />
          <span>Stop</span>
        </motion.button>

        {/* Reset Button */}
        <button
          type="button"
          disabled={disabled}
          onClick={onReset}
          className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-txt-muted hover:text-txt-primary rounded-xl font-medium text-xs transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>
    );
  }

  if (status === 'paused') {
    return (
      <div className="flex items-center justify-center gap-3 mt-4">
        {/* Resume Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          type="button"
          disabled={disabled}
          onClick={onResume}
          className="flex items-center justify-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl font-bold text-sm shadow-xs transition-colors cursor-pointer"
        >
          <Play className="w-4 h-4 fill-white" />
          <span>Resume</span>
        </motion.button>

        {/* Stop Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          type="button"
          disabled={disabled}
          onClick={onStop}
          className="flex items-center justify-center gap-2 px-5 py-2.5 border border-border hover:border-primary text-txt-primary rounded-xl font-semibold text-sm bg-bg-card hover:bg-bg-hover transition-colors shadow-2xs cursor-pointer"
        >
          <Square className="w-4 h-4" />
          <span>Stop</span>
        </motion.button>

        {/* Reset Button */}
        <button
          type="button"
          disabled={disabled}
          onClick={onReset}
          className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-txt-muted hover:text-txt-primary rounded-xl font-medium text-xs transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>
    );
  }

  return null;
};
