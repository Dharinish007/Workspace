import React, { useEffect } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { X, Check, Ban } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface DayColorPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  dateStr: string;
}

// 8 soft pastel colors suitable for day background tinting
const SOFT_DAY_COLORS = [
  { name: 'Soft Blue', hex: '#E8F0FE', darkHex: '#1E293B' },
  { name: 'Soft Green', hex: '#E6F4EA', darkHex: '#143823' },
  { name: 'Soft Yellow', hex: '#FEF7E0', darkHex: '#3A2E12' },
  { name: 'Soft Purple', hex: '#F3E8FD', darkHex: '#2E1A47' },
  { name: 'Soft Pink', hex: '#FCE8E6', darkHex: '#3D1B1B' },
  { name: 'Soft Teal', hex: '#E0F2F1', darkHex: '#133535' },
  { name: 'Soft Orange', hex: '#FFE8D6', darkHex: '#3D2514' },
  { name: 'Soft Indigo', hex: '#EDE9FE', darkHex: '#211E4A' },
];

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

  const handleSelectColor = (color: string) => {
    setDayColor(dateStr, color);
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
            className="fixed inset-0 bg-black/40 backdrop-blur-md"
          />

          {/* Modal Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: 'spring', stiffness: 450, damping: 30 }}
            onClick={e => e.stopPropagation()}
            className="bg-bg-card border border-border shadow-modal rounded-2xl w-full max-w-xs overflow-hidden flex flex-col relative z-10"
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
              <div>
                <h3 className="text-base font-serif font-bold text-txt-primary">Day Background</h3>
                <p className="text-[11px] font-mono text-txt-muted">{dateStr}</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="p-1 rounded text-txt-muted hover:text-txt-primary transition-colors"
              >
                <X className="w-4 h-4" />
              </motion.button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-4 gap-2.5">
                {SOFT_DAY_COLORS.map(c => {
                  const appliedColor = isDark ? c.darkHex : c.hex;
                  const isSelected = currentColor === appliedColor || currentColor === c.hex || currentColor === c.darkHex;

                  return (
                    <motion.button
                      key={c.name}
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.92 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                      type="button"
                      onClick={() => handleSelectColor(appliedColor)}
                      className="w-12 h-12 rounded-xl border border-border flex items-center justify-center shadow-2xs hover:shadow-xs transition-shadow"
                      style={{ backgroundColor: appliedColor }}
                      title={c.name}
                    >
                      {isSelected && <Check className="w-4 h-4 text-txt-primary stroke-[3]" />}
                    </motion.button>
                  );
                })}
              </div>

              <hr className="border-border" />

              {/* Remove / No Color */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={handleRemoveColor}
                className="w-full py-2 px-3 text-xs font-medium text-txt-secondary hover:text-red-500 bg-bg-subtle hover:bg-bg-hover rounded-xl flex items-center justify-center gap-1.5 transition-colors"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>No Color (Reset Default)</span>
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
