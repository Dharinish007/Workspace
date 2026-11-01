import React from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { X, Check, Ban } from 'lucide-react';

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

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div 
        className="bg-bg-card border border-border shadow-modal rounded-2xl w-full max-w-xs overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div>
            <h3 className="text-sm font-bold text-txt-primary">Day Background</h3>
            <p className="text-[11px] text-txt-muted">{dateStr}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-txt-muted hover:text-txt-primary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <div className="grid grid-cols-4 gap-2.5">
            {SOFT_DAY_COLORS.map(c => {
              const appliedColor = isDark ? c.darkHex : c.hex;
              const isSelected = currentColor === appliedColor || currentColor === c.hex || currentColor === c.darkHex;

              return (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => handleSelectColor(appliedColor)}
                  className="w-12 h-12 rounded-xl border border-border hover:scale-105 transition-all flex items-center justify-center shadow-xs"
                  style={{ backgroundColor: appliedColor }}
                  title={c.name}
                >
                  {isSelected && <Check className="w-4 h-4 text-txt-primary stroke-[3]" />}
                </button>
              );
            })}
          </div>

          <hr className="my-2 border-border" />

          {/* Remove / No Color */}
          <button
            type="button"
            onClick={handleRemoveColor}
            className="w-full py-2 px-3 text-xs font-semibold text-txt-secondary hover:text-red-500 bg-bg-subtle hover:bg-bg-hover rounded-xl flex items-center justify-center gap-1.5 transition-colors"
          >
            <Ban className="w-3.5 h-3.5" />
            <span>No Color (Reset Default)</span>
          </button>
        </div>
      </div>
    </div>
  );
};

