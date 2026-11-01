import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Habit, HabitSchedule } from '../../types';
import { X, Check } from 'lucide-react';
import { BUILT_IN_ICON_NAMES, IconRenderer } from '../common/IconRegistry';

interface HabitModalProps {
  isOpen: boolean;
  onClose: () => void;
  habitToEdit?: Habit | null;
}

const HABIT_COLORS = [
  '#0D9488', // Teal (Default for habits per README D1)
  '#34A853', // Green
  '#4285F4', // Blue
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
  const [color, setColor] = useState('#0D9488');
  const [scheduleType, setScheduleType] = useState<'daily' | 'weekdays'>('daily');
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (habitToEdit) {
      setName(habitToEdit.name);
      setIcon(habitToEdit.icon);
      setColor(habitToEdit.color || '#0D9488');
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
      setColor('#0D9488');
      setScheduleType('daily');
      setSelectedDays([1, 2, 3, 4, 5]);
    }
    setError(null);
  }, [habitToEdit, isOpen]);

  if (!isOpen) return null;

  const toggleDay = (day: number) => {
    if (selectedDays.includes(day)) {
      if (selectedDays.length === 1) return; // Must have at least 1 day
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
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div 
        className="bg-bg-card border border-border shadow-modal rounded-2xl w-full max-w-md overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-bold text-txt-primary">
            {habitToEdit ? 'Edit Habit' : 'New Habit'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-bg-subtle text-txt-muted hover:text-txt-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
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
              className="w-full px-3.5 py-2 text-sm bg-bg-subtle border border-border rounded-xl text-txt-primary outline-hidden focus:border-teal-500"
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
                className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-colors ${
                  scheduleType === 'daily'
                    ? 'border-teal-500 bg-teal-500/10 text-teal-600 dark:text-teal-400'
                    : 'border-border bg-bg-subtle text-txt-secondary hover:bg-bg-hover'
                }`}
              >
                Every Day (Daily)
              </button>
              <button
                type="button"
                onClick={() => setScheduleType('weekdays')}
                className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-colors ${
                  scheduleType === 'weekdays'
                    ? 'border-teal-500 bg-teal-500/10 text-teal-600 dark:text-teal-400'
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
                    <button
                      key={w.day}
                      type="button"
                      onClick={() => toggleDay(w.day)}
                      className={`w-9 h-8 text-xs font-semibold rounded-lg transition-all ${
                        isSelected
                          ? 'bg-teal-500 text-white shadow-xs'
                          : 'bg-bg-card text-txt-muted hover:text-txt-primary'
                      }`}
                    >
                      {w.label}
                    </button>
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
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white transition-transform transform hover:scale-110 shadow-xs"
                  style={{ backgroundColor: c }}
                >
                  {color === c && <Check className="w-4 h-4 stroke-[3]" />}
                </button>
              ))}
            </div>
          </div>

          {/* Icon Picker */}
          <div>
            <label className="block text-xs font-semibold text-txt-secondary mb-2">
              Select Icon
            </label>
            <div className="grid grid-cols-6 gap-2 max-h-36 overflow-y-auto p-1 border border-border rounded-xl bg-bg-subtle">
              {BUILT_IN_ICON_NAMES.map(iconName => (
                <button
                  key={iconName}
                  type="button"
                  onClick={() => setIcon(iconName)}
                  className={`p-2 rounded-lg flex items-center justify-center transition-colors ${
                    icon === iconName
                      ? 'bg-teal-500 text-white shadow-xs'
                      : 'text-txt-secondary hover:bg-bg-hover hover:text-txt-primary'
                  }`}
                  title={iconName}
                >
                  <IconRenderer name={iconName} className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-txt-secondary hover:text-txt-primary hover:bg-bg-subtle rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs transition-colors"
            >
              {habitToEdit ? 'Save Changes' : 'Create Habit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

