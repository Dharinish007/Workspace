import React, { useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Habit } from '../../types';
import { IconRenderer } from '../common/IconRegistry';
import { formatLocalDate } from '../../db/indexedDB';
import { 
  isHabitScheduledOnDate, 
  calculateHabitStats 
} from '../../utils/habitCalculations';
import { Check, Edit2, Trash2, MoreVertical, Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface HabitTableViewProps {
  habits: Habit[];
  timeframe: 'week' | 'month';
  currentDate: Date;
  onEditHabit: (habit: Habit) => void;
  onDeleteHabit: (habitId: string) => void;
}

export const HabitTableView: React.FC<HabitTableViewProps> = ({
  habits,
  timeframe,
  currentDate,
  onEditHabit,
  onDeleteHabit,
}) => {
  const { 
    habitLogs, 
    toggleHabitLog, 
    highlightedHabitId, 
    settings 
  } = useWorkspace();

  const [activeMenuHabitId, setActiveMenuHabitId] = useState<string | null>(null);

  // Generate date columns
  const dateColumns: { dateStr: string; dayNum: number; dayName: string; isToday: boolean; dateObj: Date }[] = [];
  const todayStr = formatLocalDate(new Date());

  if (timeframe === 'week') {
    const curr = new Date(currentDate);
    const day = curr.getDay();
    const diff = curr.getDate() - day + (settings.weekStart === 'sunday' ? 0 : (day === 0 ? -6 : 1));
    const weekStart = new Date(curr.setDate(diff));

    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      const dStr = formatLocalDate(d);
      dateColumns.push({
        dateStr: dStr,
        dayNum: d.getDate(),
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        isToday: dStr === todayStr,
        dateObj: d,
      });
    }
  } else {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      const dStr = formatLocalDate(d);
      dateColumns.push({
        dateStr: dStr,
        dayNum: i,
        dayName: d.toLocaleDateString('en-US', { weekday: 'narrow' }),
        isToday: dStr === todayStr,
        dateObj: d,
      });
    }
  }

  return (
    <div className="bg-bg-card border border-border rounded-2xl shadow-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs font-sans">
          <thead>
            <tr className="border-b border-border bg-bg-subtle text-txt-secondary font-bold select-none">
              <th className="py-3.5 px-4 min-w-[200px]">Habit</th>
              {dateColumns.map(col => (
                <th
                  key={col.dateStr}
                  className={`py-2 px-1 text-center font-semibold min-w-[40px] ${
                    col.isToday ? 'bg-primary/10 text-primary font-bold' : ''
                  }`}
                >
                  <div className="text-xs font-sans font-medium text-txt-secondary">{col.dayName}</div>
                  <div className={`text-xs font-mono font-bold ${col.isToday ? 'text-primary' : 'text-txt-primary'}`}>{col.dayNum}</div>
                </th>
              ))}
              <th className="py-3.5 px-3 text-center min-w-[80px]">Streak</th>
              <th className="py-3.5 px-4 text-center min-w-[120px]">Progress</th>
              <th className="py-3.5 px-2 text-center w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {habits.length === 0 ? (
              <tr>
                <td colSpan={dateColumns.length + 4} className="py-12 text-center text-sm font-sans text-txt-muted">
                  No habits added yet. Click "+ Add Habit" to start building your routines!
                </td>
              </tr>
            ) : (
              habits.map(habit => {
                const isHighlighted = highlightedHabitId === habit.id;
                const stats = calculateHabitStats(habit, habitLogs, 28, new Date());

                return (
                  <tr
                    key={habit.id}
                    className={`transition-colors ${
                      isHighlighted
                        ? 'bg-primary/15'
                        : 'hover:bg-bg-hover/40'
                    }`}
                  >
                    {/* Habit name & icon */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white flex-shrink-0 shadow-2xs"
                          style={{ backgroundColor: habit.color }}
                        >
                          <IconRenderer name={habit.icon} className="w-4 h-4" />
                        </div>
                        <div className="overflow-hidden">
                          <span className="font-semibold text-txt-primary truncate block text-sm">
                            {habit.name}
                          </span>
                          <span className="text-xs font-medium text-txt-muted block">
                            {habit.schedule.type === 'daily'
                              ? 'Daily'
                              : `${habit.schedule.days.length} days/week`}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Date checkboxes */}
                    {dateColumns.map(col => {
                      const isScheduled = isHabitScheduledOnDate(habit, col.dateObj);
                      const isCompleted = habitLogs.some(
                        l => l.habitId === habit.id && l.date === col.dateStr && l.completed
                      );
                      const isPast = col.dateStr < todayStr;
                      const isFuture = col.dateStr > todayStr;

                      return (
                        <td
                          key={col.dateStr}
                          className={`py-2 px-1 text-center ${
                            col.isToday ? 'bg-primary/5' : ''
                          }`}
                        >
                          {isScheduled ? (
                            <motion.button
                              whileTap={{ scale: 0.95 }}
                              transition={{ duration: 0.15 }}
                              onClick={() => toggleHabitLog(habit.id, col.dateStr)}
                              className={`w-7 h-7 mx-auto rounded-lg flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                                isCompleted
                                  ? 'bg-primary text-white shadow-2xs'
                                  : col.isToday
                                  ? 'border-2 border-primary bg-primary/10 text-transparent hover:border-primary-hover'
                                  : isPast
                                  ? 'border border-border/80 bg-bg-subtle/50 text-txt-muted/40 hover:border-border'
                                  : 'border border-dashed border-border/70 bg-transparent text-transparent hover:border-border'
                              }`}
                              title={`${habit.name} - ${col.dateStr}: ${
                                isCompleted
                                  ? 'Completed'
                                  : col.isToday
                                  ? 'Pending (Today)'
                                  : isPast
                                  ? 'Missed (Past)'
                                  : 'Scheduled (Future)'
                              }`}
                              aria-label={`${habit.name} - ${col.dateStr}: ${
                                isCompleted
                                  ? 'Completed'
                                  : col.isToday
                                  ? 'Pending (Today)'
                                  : isPast
                                  ? 'Missed (Past)'
                                  : 'Scheduled (Future)'
                              }`}
                            >
                              {isCompleted ? (
                                <Check className="w-4 h-4 stroke-[3]" />
                              ) : isPast ? (
                                <span className="text-xs text-txt-muted/60 font-mono">·</span>
                              ) : null}
                            </motion.button>
                          ) : (
                            <span
                              className="text-txt-muted opacity-40 font-mono text-xs select-none"
                              title="Not scheduled for this day"
                            >
                              –
                            </span>
                          )}
                        </td>
                      );
                    })}

                    {/* Streak */}
                    <td className="py-3 px-3 text-center">
                      <div className="inline-flex items-center gap-1 font-bold text-xs text-txt-primary font-mono bg-bg-subtle px-2 py-0.5 rounded-md border border-border">
                        <Flame className={`w-3.5 h-3.5 ${stats.currentStreak > 0 ? 'text-orange-500 fill-orange-500' : 'text-txt-muted'}`} />
                        <span>{stats.currentStreak}d</span>
                      </div>
                    </td>

                    {/* Progress Bar & % */}
                    <td className="py-3 px-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-semibold text-txt-secondary">
                          <span className="font-mono">{stats.completedDays} / {stats.scheduledDays}</span>
                          <span className="font-mono font-bold text-txt-primary">{stats.completionPercentage}%</span>
                        </div>
                        <div className="w-full bg-bg-subtle rounded-full h-2 overflow-hidden border border-border">
                          <motion.div
                            className="h-full rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${stats.completionPercentage}%` }}
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            style={{ backgroundColor: habit.color }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Row Menu */}
                    <td className="py-3 px-2 text-center relative">
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={() =>
                          setActiveMenuHabitId(activeMenuHabitId === habit.id ? null : habit.id)
                        }
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-txt-muted hover:text-txt-primary hover:bg-bg-subtle transition-colors cursor-pointer"
                        title="Habit options"
                        aria-label="Habit options"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </motion.button>

                      <AnimatePresence>
                        {activeMenuHabitId === habit.id && (
                          <>
                            <div
                              className="fixed inset-0 z-20"
                              onClick={() => setActiveMenuHabitId(null)}
                            />
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.92, y: -4 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.92, y: -4 }}
                              transition={{ type: "spring", stiffness: 500, damping: 30 }}
                              className="absolute right-2 top-8 w-36 bg-bg-card border border-border shadow-modal rounded-xl py-1 z-30 text-xs font-sans"
                            >
                              <button
                                onClick={() => {
                                  setActiveMenuHabitId(null);
                                  onEditHabit(habit);
                                }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-txt-primary hover:bg-bg-hover text-left cursor-pointer font-medium"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-txt-muted" />
                                <span>Edit habit</span>
                              </button>
                              <hr className="my-1 border-border" />
                              <button
                                onClick={() => {
                                  setActiveMenuHabitId(null);
                                  onDeleteHabit(habit.id);
                                }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-500/10 text-left font-semibold cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete</span>
                              </button>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Status Legend and Progress Calculation explanation */}
      <div className="border-t border-border bg-bg-subtle/50 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs font-sans">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-semibold text-txt-secondary text-xs">Legend:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-md bg-primary text-white flex items-center justify-center text-xs shadow-2xs font-bold">
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            </span>
            <span className="text-txt-primary font-medium">Completed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-md border-2 border-primary bg-primary/10 inline-block" />
            <span className="text-txt-primary font-medium">Pending (Today)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-md border border-border/80 bg-bg-card flex items-center justify-center text-txt-muted text-xs font-mono">·</span>
            <span className="text-txt-secondary font-medium">Missed (Past)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-txt-muted font-mono font-bold w-4 text-center">–</span>
            <span className="text-txt-muted font-medium">Not Scheduled</span>
          </div>
        </div>

        <div className="text-txt-muted text-xs font-medium">
          Progress = Completed days ÷ Scheduled days in active {timeframe}
        </div>
      </div>
    </div>
  );
};
