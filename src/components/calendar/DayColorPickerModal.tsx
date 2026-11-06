import React, { useEffect } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { X, Check, Ban } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  DAY_COLOR_CATEGORIES, 
  resolveDayColorCategory 
} from '../../utils/calendarColors';

interface DayColorPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  dateStr: string;
}

export const DayColorPickerModal: React.FC<DayColorPickerModalProps> = ({
  isOpen,
  onClose,
  dateStr,
}) => {
  const { dayColors, setDayColor, removeDayColor, settings } = useWorkspace();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const currentEntry = dayColors.find(d => d.date === dateStr);
  const currentColor = currentEntry?.color;
  const isDark = settings.theme === 'dark';
  const selectedCategoryId = resolveDayColorCategory(currentColor);

  const handleSelectColor = (categoryId: string) => {
    setDayColor(dateStr, categoryId);
    onClose();
  };

  const handleRemoveColor = () => {
    removeDayColor(dateStr);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* Modal Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: 'spring', stiffness: 450, damping: 30 }}
            onClick={e => e.stopPropagation()}
            className="bg-bg-card border border-border shadow-modal rounded-2xl w-full max-w-sm overflow-hidden flex flex-col relative z-10"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h3 className="text-base font-serif font-bold text-txt-primary">Day Background Color</h3>
                <p className="text-xs font-mono text-txt-secondary mt-0.5">{dateStr}</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-txt-muted hover:text-txt-primary hover:bg-bg-subtle transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </motion.button>
            </div>

            <div className="p-5 space-y-4">
              {/* 3-Column x 2-Row Color Grid */}
              <div 
                role="radiogroup" 
                aria-label="Calendar day background colors"
                className="grid grid-cols-3 gap-3"
              >
                {DAY_COLOR_CATEGORIES.map(category => {
                  const appliedHex = isDark ? category.darkHex : category.lightHex;
                  const isSelected = selectedCategoryId === category.id;

                  return (
                    <motion.button
                      key={category.id}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.94 }}
                      transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      aria-label={`${category.name}${isSelected ? ', currently selected' : ''}`}
                      onClick={() => handleSelectColor(category.id)}
                      className={`h-14 rounded-xl flex items-center justify-center relative cursor-pointer shadow-2xs transition-all ring-1 ring-inset ring-black/10 dark:ring-white/10 ${
                        isSelected 
                          ? 'ring-2 ring-primary ring-offset-2 ring-offset-bg-card' 
                          : 'hover:shadow-xs'
                      } focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-card`}
                      style={{ backgroundColor: appliedHex }}
                      title={`${category.name} (${appliedHex})`}
                    >
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                          className="w-6 h-6 rounded-full bg-white/95 text-slate-900 dark:bg-slate-900/90 dark:text-white shadow-xs flex items-center justify-center"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3.5]" aria-hidden="true" />
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              <hr className="border-border" />

              {/* Reset to Default / Remove Color */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={handleRemoveColor}
                className={`w-full h-10 px-3.5 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                  !currentColor
                    ? 'bg-bg-subtle/80 text-txt-secondary border-border-interactive/80'
                    : 'bg-bg-card hover:bg-bg-subtle text-txt-secondary hover:text-red-600 dark:hover:text-red-400 border-border hover:border-red-300 dark:hover:border-red-800'
                }`}
              >
                <Ban className="w-3.5 h-3.5" />
                <span>{!currentColor ? 'Default Background (Active)' : 'No Color (Reset Default)'}</span>
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
