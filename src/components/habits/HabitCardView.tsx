import React from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Habit } from '../../types';
import { IconRenderer } from '../common/IconRegistry';
import { formatLocalDate } from '../../db/indexedDB';
import { calculateHabitStats, isHabitScheduledOnDate } from '../../utils/habitCalculations';
import { Flame, Award, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface HabitCardViewProps {
  habits: Habit[];
  onEditHabit: (habit: Habit) => void;
  onDeleteHabit: (habitId: string) => void;
}

export const HabitCardView: React.FC<HabitCardViewProps> = ({
  habits,
  onEditHabit,
  onDeleteHabit,
}) => {
  const { habitLogs, highlightedHabitId } = useWorkspace();
  const [activeMenuId, setActiveMenuId] = React.useState<string | null>(null);

  const now = new Date();

  // Generate last 14 days activity bars for mini frequency graph
  const last14Days: { dateStr: string; dateObj: Date; dayName: string }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    last14Days.push({
      dateStr: formatLocalDate(d),
      dateObj: d,
      dayName: d.toLocaleDateString('en-US', { weekday: 'narrow' }),
    });
  }

  return (
    <div className={`grid gap-5 ${
      habits.length === 4
        ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
        : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
    }`}>
      {habits.length === 0 ? (
        <div className="col-span-full bg-bg-card border border-border rounded-2xl p-12 text-center text-txt-muted text-sm font-sans shadow-card">
          No habits to display in Card view. Click "+ Add Habit" to create one.
        </div>
      ) : (
        habits.map(habit => {
          const stats = calculateHabitStats(habit, habitLogs, 28, now);
          const isHighlighted = highlightedHabitId === habit.id;

          return (
            <div
              key={habit.id}
              className={`bg-bg-card border shadow-card hover:shadow-card-hover rounded-2xl p-6 flex flex-col justify-between transition-all duration-150 group select-none min-h-[300px] ${
                isHighlighted
                  ? 'ring-2 ring-primary border-primary bg-primary/5 shadow-md'
                  : 'border-border hover:border-primary/60'
              }`}
            >
              <div>
                {/* Header: Icon, Name & Menu */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3.5">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-xs flex-shrink-0"
                      style={{ backgroundColor: habit.color }}
                    >
                      <IconRenderer name={habit.icon} className="w-5 h-5" />
                    </div>
                    <div className="overflow-hidden">
                      <h3 className="font-bold text-base text-txt-primary group-hover:text-primary transition-colors tracking-tight truncate">
                        {habit.name}
                      </h3>
                      <p className="text-sm font-sans text-txt-secondary font-medium">
                        {habit.schedule.type === 'daily'
                          ? 'Every Day'
                          : `${habit.schedule.days.length} days/week`}
                      </p>
                    </div>
                  </div>

                  <div className="relative">
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setActiveMenuId(activeMenuId === habit.id ? null : habit.id)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-txt-muted hover:text-txt-primary hover:bg-bg-subtle transition-colors cursor-pointer"
                      title="Habit options"
                      aria-label="Habit options"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </motion.button>

                    <AnimatePresence>
                      {activeMenuId === habit.id && (
                        <>
                          <div
                            className="fixed inset-0 z-20"
                            onClick={() => setActiveMenuId(null)}
                          />
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.92, y: -4 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.92, y: -4 }}
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            className="absolute right-0 top-8 w-32 bg-bg-card border border-border shadow-modal rounded-xl py-1 z-30 text-xs font-sans"
                          >
                            <button
                              onClick={() => {
                                setActiveMenuId(null);
                                onEditHabit(habit);
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-txt-primary hover:bg-bg-hover text-left cursor-pointer font-medium"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-txt-muted" />
                              <span>Edit</span>
                            </button>
                            <hr className="my-1 border-border" />
                            <button
                              onClick={() => {
                                setActiveMenuId(null);
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
                  </div>
                </div>

                {/* Big Percentage & Counter */}
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-3xl font-mono font-bold text-txt-primary tracking-tight">
                    {stats.completionPercentage}%
                  </span>
                  <span className="text-xs font-sans font-semibold text-txt-secondary">
                    {stats.completedDays} / {stats.scheduledDays} completed
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-bg-subtle rounded-full h-2 mb-4 overflow-hidden border border-border">
                  <motion.div
                    className="h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${stats.completionPercentage}%` }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    style={{ backgroundColor: habit.color }}
                  />
                </div>

                {/* Stats Breakdown */}
                <div className="grid grid-cols-2 gap-2.5 text-xs mb-4 font-sans">
                  <div className="p-3 rounded-xl bg-bg-subtle border border-border flex items-center gap-2.5">
                    <Flame className="w-4 h-4 text-orange-600 fill-orange-600 flex-shrink-0" />
                    <div>
                      <div className="text-xs text-txt-muted font-medium">Current Streak</div>
                      <div className="font-mono font-bold text-txt-primary">
                        {stats.currentStreak === 0 ? '0d (Start today!)' : `${stats.currentStreak} days`}
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-bg-subtle border border-border flex items-center gap-2.5">
                    <Award className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <div>
                      <div className="text-xs text-txt-muted font-medium">Longest Streak</div>
                      <div className="font-mono font-bold text-txt-primary">{stats.longestStreak} days</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mini Frequency Activity Bars (Last 14 days) */}
              <div>
                <div className="text-xs font-sans font-semibold text-txt-secondary mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>Last 14 Days</span>
                    <span className="text-xs text-txt-muted font-normal lowercase">(14d ago → today)</span>
                  </div>
                  <span className="font-mono text-txt-secondary font-bold">Missed: {stats.missedDays}</span>
                </div>
                <div className="flex items-end justify-between gap-1.5 h-10 p-1.5 bg-bg-subtle rounded-xl border border-border">
                  {last14Days.map((col, idx) => {
                    const scheduled = isHabitScheduledOnDate(habit, col.dateObj);
                    const done = habitLogs.some(
                      l => l.habitId === habit.id && l.date === col.dateStr && l.completed
                    );
                    const isToday = idx === last14Days.length - 1;

                    return (
                      <div
                        key={col.dateStr}
                        className={`flex-1 h-full flex flex-col justify-end items-center ${isToday ? 'relative' : ''}`}
                        title={`${col.dateStr} (${col.dayName}): ${!scheduled ? 'Unscheduled' : done ? 'Completed' : 'Missed'}`}
                      >
                        <div
                          className={`w-full rounded-sm transition-all ${
                            !scheduled
                              ? 'h-1 bg-border'
                              : done
                              ? 'h-full bg-primary shadow-2xs'
                              : 'h-2 bg-red-400/50'
                          } ${isToday ? 'ring-1 ring-primary' : ''}`}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between items-center text-xs font-mono text-txt-muted mt-1 px-1">
                  <span>14d ago</span>
                  <span className="font-bold text-primary">Today</span>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};
