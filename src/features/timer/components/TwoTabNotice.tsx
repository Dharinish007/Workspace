import React from 'react';
import { ShieldAlert, ArrowRightLeft } from 'lucide-react';
import { motion } from 'framer-motion';

interface TwoTabNoticeProps {
  onTakeOver: () => void;
}

export const TwoTabNotice: React.FC<TwoTabNoticeProps> = ({ onTakeOver }) => {
  return (
    <div className="mb-4 flex items-center justify-between p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs shadow-2xs">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
          <ShieldAlert className="w-4 h-4" />
        </div>
        <div>
          <div className="font-bold text-txt-primary">Timer active in another tab</div>
          <div className="text-txt-secondary mt-0.5">
            This tab is running in read-only mode to prevent conflicting timers and data loss.
          </div>
        </div>
      </div>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.96 }}
        type="button"
        onClick={onTakeOver}
        className="flex items-center gap-1.5 px-3.5 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold shadow-xs transition-colors shrink-0 ml-3 cursor-pointer"
      >
        <ArrowRightLeft className="w-3.5 h-3.5" />
        <span>Take Over Here</span>
      </motion.button>
    </div>
  );
};
