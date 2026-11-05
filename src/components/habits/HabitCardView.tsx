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
  const { habitLogs } = useWorkspace();
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {habits.length === 0 ? (
        <div className="col-span-full bg-bg-card border border-border rounded-2xl p-12 text-center text-txt-muted text-sm font-sans">
          No habits to display in Card view. Click "+ Add Habit" to create one.
        </div>
      ) : (
        habits.map(habit => {
          const stats = calculateHabitStats(habit, habitLogs, 28, now);

          return (
            <motion.div
              key={habit.id}
              whileHover={{ y: -3, transition: { type: "spring", stiffness: 450, damping: 25 } }}
              className="bg-bg-card border border-border hover:border-teal-500/50 shadow-card hover:shadow-card-hover rounded-2xl p-5 flex flex-col justify-between transition-colors duration-150 group select-none"
            >
              <div>
                {/* Header: Icon, Name & Menu */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <motion.div
                      whileHover={{ scale: 1.08 }}
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xs"
                      style={{ backgroundColor: habit.color }}
                    >
                      <IconRenderer name={habit.icon} className="w-5 h-5" />
                    </motion.div>
                    <div>
                      <h3 className="font-serif font-bold text-base text-txt-primary group-hover:text-teal-600 transition-colors tracking-tight">
                        {habit.name}
                      </h3>
                      <p className="text-[11px] font-sans text-txt-muted">
                        {habit.schedule.type === 'daily'
                          ? 'Every Day'
                          : `${habit.schedule.days.length} days/week`}
                      </p>
                    </div>
                  </div>

                  <div className="relative">
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setActiveMenuId(activeMenuId === habit.id ? null : habit.id)}
                      className="p-1 rounded text-txt-muted hover:text-txt-primary hover:bg-bg-subtle transition-colors cursor-pointer"
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
                            className="absolute right-0 top-8 w-28 bg-bg-card border border-border shadow-modal rounded-xl py-1 z-30 text-xs font-sans"
                          >
                            <button
                              onClick={() => {
                                setActiveMenuId(null);
                                onEditHabit(habit);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-txt-primary hover:bg-bg-hover text-left cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                            <hr className="my-1 border-border" />
                            <button
                              onClick={() => {
                                setActiveMenuId(null);
                                onDeleteHabit(habit.id);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-red-600 dark:text-red-400 hover:bg-red-500/10 text-left font-medium cursor-pointer"
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
                  <span className="text-xs font-sans font-medium text-txt-muted">
                    {stats.completedDays} / {stats.scheduledDays} completed
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-bg-subtle rounded-full h-2 mb-4 overflow-hidden border border-border-subtle">
                  <motion.div
                    className="h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${stats.completionPercentage}%` }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    style={{ backgroundColor: habit.color }}
                  />
                </div>

                {/* Stats Breakdown */}
                <div className="grid grid-cols-2 gap-2 text-xs mb-4 font-sans">
                  <div className="p-2.5 rounded-xl bg-bg-subtle border border-border-subtle flex items-center gap-2">
                    <Flame className="w-4 h-4 text-orange-500 fill-orange-500 flex-shrink-0" />
                    <div>
                      <div className="text-[10px] text-txt-muted font-medium">Current Streak</div>
                      <div className="font-mono font-bold text-txt-primary">{stats.currentStreak} days</div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-bg-subtle border border-border-subtle flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <div>
                      <div className="text-[10px] text-txt-muted font-medium">Longest Streak</div>
                      <div className="font-mono font-bold text-txt-primary">{stats.longestStreak} days</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mini Frequency Activity Bars (Last 14 days) */}
              <div>
                <div className="text-[10px] uppercase font-sans font-bold text-txt-muted tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Last 14 Days Activity</span>
                  <span>Missed: {stats.missedDays}</span>
                </div>
                <div className="flex items-end justify-between gap-1 h-9 p-1 bg-bg-subtle/50 rounded-lg border border-border-subtle">
                  {last14Days.map(col => {
                    const scheduled = isHabitScheduledOnDate(habit, col.dateObj);
                    const done = habitLogs.some(
                      l => l.habitId === habit.id && l.date === col.dateStr && l.completed
                    );

                    return (
                      <div
                        key={col.dateStr}
                        className="flex-1 h-full flex flex-col justify-end items-center"
                        title={`${col.dateStr}: ${!scheduled ? 'Unscheduled' : done ? 'Completed' : 'Missed'}`}
                      >
                        <div
                          className={`w-full rounded-xs transition-all ${
                            !scheduled
                              ? 'h-1 bg-border/50'
                              : done
                              ? 'h-full bg-teal-500 shadow-2xs'
                              : 'h-2 bg-red-400/40'
                          }`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          );
        })
      )}
    </div>
  );
};
