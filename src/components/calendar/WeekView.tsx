import React from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { formatLocalDate } from '../../db/indexedDB';
import { parseLocalDate } from '../../utils/dateUtils';
import { CalendarEvent } from '../../types';
import { Plus, Palette, Clock, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { getDayCellBackgroundStyle } from '../../utils/calendarColors';

interface WeekViewProps {
  currentDate: Date;
  onSelectDate: (dateStr: string) => void;
  onOpenDayView: (dateStr: string) => void;
  onOpenCreateEvent: (dateStr: string) => void;
  onOpenEditEvent: (event: CalendarEvent) => void;
  onOpenDayColorPicker: (dateStr: string) => void;
  showTodos: boolean;
  showHabits: boolean;
  showEvents: boolean;
  showCompleted: boolean;
}

export const WeekView: React.FC<WeekViewProps> = ({
  currentDate,
  onOpenDayView,
  onOpenCreateEvent,
  onOpenEditEvent,
  onOpenDayColorPicker,
  showTodos,
  showHabits,
  showEvents,
  showCompleted,
}) => {
  const { 
    pages, 
    tasks, 
    habits, 
    habitLogs, 
    events, 
    dayColors, 
    navigateToTask, 
    navigateToHabit,
    settings 
  } = useWorkspace();

  const isDark = settings.theme === 'dark';

  // Determine week range based on weekStart
  const curr = new Date(currentDate);
  const day = curr.getDay();
  let diff = curr.getDate() - day + (settings.weekStart === 'sunday' ? 0 : (day === 0 ? -6 : 1));
  const weekStart = new Date(curr.setDate(diff));

  const weekDays: { dateStr: string; dayNum: number; dayName: string }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    weekDays.push({
      dateStr: formatLocalDate(d),
      dayNum: d.getDate(),
      dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
    });
  }

  const todayStr = formatLocalDate(new Date());

  return (
    <div className="bg-bg-card border border-border rounded-2xl overflow-hidden shadow-card transition-all duration-200">
      <div className="grid grid-cols-1 sm:grid-cols-7 divide-y sm:divide-y-0 sm:divide-x divide-border">
        {weekDays.map(dayInfo => {
          const isToday = dayInfo.dateStr === todayStr;
          const dayColorEntry = dayColors.find(d => d.date === dayInfo.dateStr);

          const cellDate = parseLocalDate(dayInfo.dateStr);
          const dow = (cellDate.getDay() + 6) % 7 + 1;

          // Activities
          const activities: {
            id: string;
            type: 'task' | 'habit' | 'event';
            title: string;
            color: string;
            completed?: boolean;
            time?: string | null;
            raw: any;
          }[] = [];

          if (showTodos) {
            tasks.forEach(t => {
              if (t.dueDate === dayInfo.dateStr) {
                if (showCompleted || !t.completed) {
                  const page = pages.find(p => p.id === t.pageId);
                  activities.push({
                    id: t.id,
                    type: 'task',
                    title: t.title,
                    color: page?.color || '#4285F4',
                    completed: t.completed,
                    raw: t,
                  });
                }
              }
            });
          }

          if (showHabits) {
            habits.forEach(h => {
              const isScheduled =
                h.schedule.type === 'daily' ||
                (h.schedule.type === 'weekdays' && h.schedule.days.includes(dow));
              if (isScheduled) {
                const log = habitLogs.find(l => l.habitId === h.id && l.date === dayInfo.dateStr);
                const isDone = !!log?.completed;
                if (showCompleted || !isDone) {
                  activities.push({
                    id: h.id,
                    type: 'habit',
                    title: h.name,
                    color: h.color || '#1A73E8',
                    completed: isDone,
                    raw: h,
                  });
                }
              }
            });
          }

          if (showEvents) {
            events.forEach(e => {
              if (e.date === dayInfo.dateStr) {
                activities.push({
                  id: e.id,
                  type: 'event',
                  title: e.title,
                  color: e.color || '#F97316',
                  time: e.startTime,
                  raw: e,
                });
              }
            });
          }

          return (
            <div
              key={dayInfo.dateStr}
              style={getDayCellBackgroundStyle(dayColorEntry?.color, isDark)}
              className="min-h-[240px] p-3 flex flex-col justify-between group hover:bg-bg-hover/15 transition-colors relative"
            >
              <div>
                {/* Header */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/60">
                  <div>
                    <span className="text-[11px] font-medium uppercase tracking-wider text-txt-muted block">
                      {dayInfo.dayName}
                    </span>
                    <span
                      className={`text-base font-mono font-semibold inline-flex items-center justify-center w-7 h-7 rounded-full mt-0.5 transition-all ${
                        isToday 
                          ? 'bg-primary text-white shadow-xs font-bold' 
                          : 'text-txt-primary'
                      }`}
                    >
                      {dayInfo.dayNum}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => onOpenDayColorPicker(dayInfo.dateStr)}
                      className="p-1 rounded-md text-txt-muted hover:text-primary hover:bg-bg-card transition-colors shadow-2xs"
                      title="Set Day Background"
                    >
                      <Palette className="w-3.5 h-3.5" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => onOpenCreateEvent(dayInfo.dateStr)}
                      className="p-1 rounded-md text-txt-muted hover:text-primary hover:bg-bg-card transition-colors shadow-2xs"
                      title="Add Event"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </motion.button>
                  </div>
                </div>

                {/* Activities list */}
                <div className="space-y-1.5">
                  {activities.length === 0 ? (
                    <div className="text-[11px] text-txt-muted/70 italic pt-6 text-center font-serif">
                      No activities
                    </div>
                  ) : (
                    activities.map(act => (
                      <motion.div
                        key={`${act.type}-${act.id}`}
                        whileHover={{ scale: 1.02, y: -1 }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                        onClick={() => {
                          if (act.type === 'task') {
                            navigateToTask(act.raw.pageId, act.id);
                          } else if (act.type === 'habit') {
                            navigateToHabit(act.id);
                          } else if (act.type === 'event') {
                            onOpenEditEvent(act.raw);
                          }
                        }}
                        className="p-1.5 rounded-lg text-xs font-medium truncate flex flex-col gap-0.5 hover:shadow-xs transition-shadow cursor-pointer select-none border border-border/40"
                        style={{
                          backgroundColor: `${act.color}15`,
                          borderLeft: `3px solid ${act.color}`,
                        }}
                      >
                        <div className="flex items-center justify-between gap-1 overflow-hidden">
                          <span
                            className={`truncate ${
                              act.completed ? 'line-through text-txt-muted' : 'text-txt-primary font-medium'
                            }`}
                          >
                            {act.title}
                          </span>
                        </div>
                        {act.time && (
                          <span className="text-[10px] font-mono text-txt-muted flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            <span>{act.time}</span>
                          </span>
                        )}
                      </motion.div>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-2 text-right">
                <motion.button
                  whileHover={{ x: 2 }}
                  onClick={() => onOpenDayView(dayInfo.dateStr)}
                  className="text-[11px] text-primary font-medium hover:underline inline-flex items-center gap-1 group/btn"
                >
                  <span>View Day</span>
                  <ArrowRight className="w-3 h-3 group-hover/btn:translate-x-0.5 transition-transform" />
                </motion.button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
