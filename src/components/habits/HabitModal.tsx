import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Habit, HabitSchedule } from '../../types';
import { X, Check } from 'lucide-react';
import { BUILT_IN_ICON_NAMES, IconRenderer } from '../common/IconRegistry';
import { motion, AnimatePresence } from 'framer-motion';

interface HabitModalProps {
  isOpen: boolean;
  onClose: () => void;
  habitToEdit?: Habit | null;
}

const HABIT_COLORS = [
  '#1A73E8', // Blue (Primary)
  '#4285F4', // Sky Blue
  '#0D9488', // Teal
  '#34A853', // Green
  '#A142F4', // Purple
  '#EC4899', // Pink
  '#F97316', // Orange
  '#EF4444', // Red
  '#FBBF24', // Amber
];

const WEEKDAYS = [
  { day: 1, label: 'Mon' },
  { day: 2, label: 'Tue' },
  { day: 3, label: 'Wed' },
  { day: 4, label: 'Thu' },
  { day: 5, label: 'Fri' },
  { day: 6, label: 'Sat' },
  { day: 7, label: 'Sun' },
];

export const HabitModal: React.FC<HabitModalProps> = ({
  isOpen,
  onClose,
  habitToEdit,
}) => {
  const { createHabit, updateHabit } = useWorkspace();

  const [name, setName] = useState('');
  const [icon, setIcon] = useState('Flame');
  const [color, setColor] = useState('#1A73E8');
  const [scheduleType, setScheduleType] = useState<'daily' | 'weekdays'>('daily');
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (habitToEdit) {
      setName(habitToEdit.name);
      setIcon(habitToEdit.icon);
      setColor(habitToEdit.color || '#1A73E8');
      if (habitToEdit.schedule.type === 'weekdays') {
        setScheduleType('weekdays');
        setSelectedDays(habitToEdit.schedule.days);
      } else {
        setScheduleType('daily');
        setSelectedDays([1, 2, 3, 4, 5]);
      }
    } else {
      setName('');
      setIcon('Flame');
      setColor('#1A73E8');
      setScheduleType('daily');
      setSelectedDays([1, 2, 3, 4, 5]);
    }
    setError(null);
  }, [habitToEdit, isOpen]);

  const toggleDay = (day: number) => {
    if (selectedDays.includes(day)) {
      if (selectedDays.length === 1) return;
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day].sort());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Habit name is required');
      return;
    }

    const schedule: HabitSchedule =
      scheduleType === 'daily'
        ? { type: 'daily' }
        : { type: 'weekdays', days: selectedDays };

    try {
      if (habitToEdit) {
        await updateHabit(habitToEdit.id, {
          name: name.trim(),
          icon,
          color,
          schedule,
        });
      } else {
        await createHabit({
          name: name.trim(),
          icon,
          color,
          schedule,
        });
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Operation failed');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
          />

          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: "spring", stiffness: 450, damping: 32 }}
            className="bg-bg-card border border-border shadow-modal rounded-2xl w-full max-w-md overflow-hidden flex flex-col z-10 font-sans"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-xl font-serif font-bold text-txt-primary tracking-tight">
                {habitToEdit ? 'Edit Habit' : 'New Habit'}
              </h2>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-bg-subtle text-txt-muted hover:text-txt-primary transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-2.5 text-xs bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 rounded-lg">
                  {error}
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-txt-secondary mb-1">
                  Habit Name * (max 60 chars)
                </label>
                <input
                  type="text"
                  autoFocus
                  maxLength={60}
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Exercise, Read 20 pages, Meditate, DSA..."
                  className="w-full px-3.5 py-2 text-sm bg-bg-subtle border border-border rounded-xl text-txt-primary outline-hidden focus:border-primary"
                />
              </div>

              {/* Schedule */}
              <div>
                <label className="block text-xs font-semibold text-txt-secondary mb-1.5">
                  Frequency Schedule
                </label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setScheduleType('daily')}
                    className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
                      scheduleType === 'daily'
                        ? 'border-primary bg-primary/10 text-primary font-bold'
                        : 'border-border bg-bg-subtle text-txt-secondary hover:bg-bg-hover'
                    }`}
                  >
                    Every Day (Daily)
                  </button>
                  <button
                    type="button"
                    onClick={() => setScheduleType('weekdays')}
                    className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
                      scheduleType === 'weekdays'
                        ? 'border-primary bg-primary/10 text-primary font-bold'
                        : 'border-border bg-bg-subtle text-txt-secondary hover:bg-bg-hover'
                    }`}
                  >
                    Selected Weekdays
                  </button>
                </div>

                {/* Weekdays picker */}
                {scheduleType === 'weekdays' && (
                  <div className="flex items-center justify-between gap-1 p-2 bg-bg-subtle rounded-xl border border-border">
                    {WEEKDAYS.map(w => {
                      const isSelected = selectedDays.includes(w.day);
                      return (
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          key={w.day}
                          type="button"
                          onClick={() => toggleDay(w.day)}
                          className={`w-9 h-8 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-primary text-white shadow-xs'
                              : 'bg-bg-card text-txt-muted hover:text-txt-primary'
                          }`}
                        >
                          {w.label}
                        </motion.button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Color Palette */}
              <div>
                <label className="block text-xs font-semibold text-txt-secondary mb-2">
                  Habit Accent Color
                </label>
                <div className="flex flex-wrap gap-2.5">
                  {HABIT_COLORS.map(c => (
                    <motion.button
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.9 }}
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white shadow-xs cursor-pointer"
                      style={{ backgroundColor: c }}
                    >
                      {color === c && <Check className="w-4 h-4 stroke-[3]" />}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Icon Picker */}
              <div>
                <label className="block text-xs font-semibold text-txt-secondary mb-2">
                  Select Icon
                </label>
                <div className="grid grid-cols-6 gap-2 max-h-36 overflow-y-auto p-1.5 border border-border rounded-xl bg-bg-subtle">
                  {BUILT_IN_ICON_NAMES.map(iconName => (
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      key={iconName}
                      type="button"
                      onClick={() => setIcon(iconName)}
                      className={`p-2 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                        icon === iconName
                          ? 'bg-primary text-white shadow-xs'
                          : 'text-txt-secondary hover:bg-bg-hover hover:text-txt-primary'
                      }`}
                      title={iconName}
                    >
                      <IconRenderer name={iconName} className="w-4 h-4" />
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-txt-secondary hover:text-txt-primary hover:bg-bg-subtle rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-primary hover:bg-primary-hover rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  {habitToEdit ? 'Save Changes' : 'Create Habit'}
                </motion.button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
