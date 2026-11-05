import React, { useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Habit } from '../../types';
import { formatLocalDate } from '../../db/indexedDB';
import { getHeatmapDayIntensity } from '../../utils/habitCalculations';
import { ChevronLeft, ChevronRight, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

interface HabitHeatmapViewProps {
  habits: Habit[];
}

export const HabitHeatmapView: React.FC<HabitHeatmapViewProps> = ({ habits }) => {
  const { habitLogs } = useWorkspace();
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const now = new Date();
  const todayStr = formatLocalDate(now);

  // Calculate overall consistency % across all scheduled habit-days in the last 90 days
  let totalScheduled = 0;
  let totalCompleted = 0;

  for (let i = 0; i < 90; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const { scheduledCount, completedCount } = getHeatmapDayIntensity(habits, habitLogs, d);
    totalScheduled += scheduledCount;
    totalCompleted += completedCount;
  }

  const overallConsistency = totalScheduled > 0 ? Math.round((totalCompleted / totalScheduled) * 100) : 0;

  const startDate = new Date(selectedYear, 0, 1);
  const endDate = new Date(selectedYear, 11, 31);

  // Align start to Monday
  const startDay = startDate.getDay();
  const diffToMonday = startDate.getDate() - (startDay === 0 ? 6 : startDay - 1);
  const alignedStart = new Date(startDate.setDate(diffToMonday));

  const weeks: { dateStr: string; dateObj: Date; intensity: any }[][] = [];
  let currentWeek: { dateStr: string; dateObj: Date; intensity: any }[] = [];
  const iterDate = new Date(alignedStart);

  while (iterDate <= endDate || currentWeek.length > 0) {
    const d = new Date(iterDate);
    const dStr = formatLocalDate(d);
    const intensity = getHeatmapDayIntensity(habits, habitLogs, d);

    currentWeek.push({
      dateStr: dStr,
      dateObj: d,
      intensity,
    });

    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
      if (iterDate > endDate) break;
    }

    iterDate.setDate(iterDate.getDate() + 1);
  }

  const monthsLabels = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  return (
    <div className="bg-bg-card border border-border rounded-2xl shadow-card p-6 space-y-6">
      {/* Top Header with Overall Consistency in Corner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-serif font-bold text-txt-primary flex items-center gap-2 tracking-tight">
            <Activity className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <span>Habit Consistency Heatmap</span>
          </h2>
          <p className="text-xs font-sans text-txt-muted mt-0.5">
            Combined daily completion density across all scheduled habits
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Year selector */}
          <div className="flex items-center gap-1 bg-bg-subtle border border-border rounded-xl p-1 text-xs font-sans font-semibold">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setSelectedYear(selectedYear - 1)}
              className="p-1 rounded hover:bg-bg-hover text-txt-muted hover:text-txt-primary transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </motion.button>
            <span className="px-2 font-mono">{selectedYear}</span>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setSelectedYear(selectedYear + 1)}
              className="p-1 rounded hover:bg-bg-hover text-txt-muted hover:text-txt-primary transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </motion.button>
          </div>

          {/* Overall Consistency % */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-400">
            <span className="text-xs font-sans font-medium">Overall (90d):</span>
            <span className="text-base font-mono font-bold">{overallConsistency}%</span>
          </div>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="overflow-x-auto pb-2">
        <div className="min-w-[700px]">
          {/* Month labels */}
          <div className="flex text-[11px] font-sans font-semibold text-txt-muted mb-2 pl-6 justify-between pr-4 select-none">
            {monthsLabels.map(m => (
              <span key={m}>{m}</span>
            ))}
          </div>

          {/* Grid rows by day of week */}
          <div className="flex gap-1">
            {/* Day of week labels */}
            <div className="flex flex-col justify-between text-[10px] font-sans text-txt-muted font-medium pr-2 py-0.5 select-none">
              <span>Mon</span>
              <span>Wed</span>
              <span>Fri</span>
              <span>Sun</span>
            </div>

            {/* Week columns */}
            <div className="flex gap-1 flex-1">
              {weeks.map((week, wIdx) => (
                <div key={wIdx} className="flex flex-col gap-1 flex-1">
                  {week.map(day => {
                    const { level, percentage, scheduledCount, completedCount } = day.intensity;
                    const isToday = day.dateStr === todayStr;

                    let bgClass = 'bg-bg-subtle/80 border border-border/40';
                    if (scheduledCount > 0) {
                      if (level === 3) bgClass = 'bg-teal-600 dark:bg-teal-500 text-white shadow-2xs';
                      else if (level === 2) bgClass = 'bg-teal-400 dark:bg-teal-600/80';
                      else if (level === 1) bgClass = 'bg-teal-200 dark:bg-teal-900/50';
                      else bgClass = 'bg-bg-subtle border border-border';
                    }

                    return (
                      <motion.div
                        key={day.dateStr}
                        whileHover={{ scale: 1.45, zIndex: 10 }}
                        transition={{ type: "spring", stiffness: 600, damping: 25 }}
                        className={`w-3.5 h-3.5 rounded-xs cursor-pointer ${bgClass} ${
                          isToday ? 'ring-1.5 ring-primary' : ''
                        }`}
                        title={`${day.dateStr}: ${completedCount} / ${scheduledCount} completed (${percentage}%)`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between text-xs font-sans text-txt-muted pt-2 border-t border-border">
        <div className="flex items-center gap-2">
          <span>Less consistent</span>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-xs bg-bg-subtle border border-border" title="0% or unscheduled" />
            <span className="w-3 h-3 rounded-xs bg-teal-200 dark:bg-teal-900/50" title="1–49%" />
            <span className="w-3 h-3 rounded-xs bg-teal-400 dark:bg-teal-600/80" title="50–99%" />
            <span className="w-3 h-3 rounded-xs bg-teal-600 dark:bg-teal-500" title="100%" />
          </div>
          <span>More consistent</span>
        </div>

        <div>
          <span>Tip: Hover over any square to see exact completed / scheduled ratio.</span>
        </div>
      </div>
    </div>
  );
};
