import React from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { formatLocalDate } from '../../db/indexedDB';
import { CalendarEvent } from '../../types';
import { Palette, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { getDayCellBackgroundStyle } from '../../utils/calendarColors';

interface MonthViewProps {
  currentDate: Date;
  selectedDate: string;
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

export const MonthView: React.FC<MonthViewProps> = ({
  currentDate,
  selectedDate,
  onSelectDate,
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
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  let firstDayOfWeek = firstDay.getDay();
  if (settings.weekStart === 'monday') {
    firstDayOfWeek = (firstDayOfWeek + 6) % 7;
  }

  const daysInMonth = lastDay.getDate();
  const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, prevMonthLastDay - i);
    days.push({
      dateStr: formatLocalDate(d),
      dayNum: prevMonthLastDay - i,
      isCurrentMonth: false,
    });
  }

  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month, i);
    days.push({
      dateStr: formatLocalDate(d),
      dayNum: i,
      isCurrentMonth: true,
    });
  }

  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(year, month + 1, i);
    days.push({
      dateStr: formatLocalDate(d),
      dayNum: i,
      isCurrentMonth: false,
    });
  }

  const dayHeaders = settings.weekStart === 'sunday'
    ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const todayStr = formatLocalDate(new Date());

  const pagesMap = React.useMemo(() => new Map(pages.map(p => [p.id, p])), [pages]);
  const dayColorsMap = React.useMemo(() => new Map(dayColors.map(c => [c.date, c])), [dayColors]);

  const tasksByDate = React.useMemo(() => {
    const map = new Map<string, typeof tasks>();
    for (const t of tasks) {
      if (t.dueDate) {
        const arr = map.get(t.dueDate) || [];
        arr.push(t);
        map.set(t.dueDate, arr);
      }
    }
    return map;
  }, [tasks]);

  const eventsByDate = React.useMemo(() => {
    const map = new Map<string, typeof events>();
    for (const e of events) {
      const arr = map.get(e.date) || [];
      arr.push(e);
      map.set(e.date, arr);
    }
    return map;
  }, [events]);

  const completedHabitLogKeys = React.useMemo(() => {
    const set = new Set<string>();
    for (const l of habitLogs) {
      if (l.completed) {
        set.add(`${l.habitId}_${l.date}`);
      }
    }
    return set;
  }, [habitLogs]);

  return (
    <div className="bg-bg-card border border-border rounded-2xl shadow-card overflow-hidden">
      {/* Day of Week Headers */}
      <div className="grid grid-cols-7 border-b border-border bg-bg-subtle text-txt-secondary text-xs font-sans font-semibold text-center select-none">
        {dayHeaders.map(dayName => (
          <div key={dayName} className="py-2.5">
            {dayName}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 divide-x divide-y divide-border">
        {days.map(day => {
          const isToday = day.dateStr === todayStr;
          const isSelected = day.dateStr === selectedDate;
          const dayColorEntry = dayColorsMap.get(day.dateStr);

          const cellDate = new Date(day.dateStr);
          const dow = (cellDate.getDay() + 6) % 7 + 1;

          const cellActivities: {
            id: string;
            type: 'task' | 'habit' | 'event';
            title: string;
            color: string;
            completed?: boolean;
            raw: any;
          }[] = [];

          if (showTodos) {
            const dateTasks = tasksByDate.get(day.dateStr);
            if (dateTasks) {
              dateTasks.forEach(t => {
                if (showCompleted || !t.completed) {
                  const page = pagesMap.get(t.pageId);
                  cellActivities.push({
                    id: t.id,
                    type: 'task',
                    title: t.title,
                    color: page?.color || '#4285F4',
                    completed: t.completed,
                    raw: t,
                  });
                }
              });
            }
          }

          if (showHabits) {
            habits.forEach(h => {
              const isScheduled =
                h.schedule.type === 'daily' ||
                (h.schedule.type === 'weekdays' && h.schedule.days.includes(dow));
              if (isScheduled) {
                const isDone = completedHabitLogKeys.has(`${h.id}_${day.dateStr}`);
                if (showCompleted || !isDone) {
                  cellActivities.push({
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
            const dateEvents = eventsByDate.get(day.dateStr);
            if (dateEvents) {
              dateEvents.forEach(e => {
                cellActivities.push({
                  id: e.id,
                  type: 'event',
                  title: e.startTime ? `${e.startTime} ${e.title}` : e.title,
                  color: e.color || '#F97316',
                  raw: e,
                });
              });
            }
          }

          const maxVisible = 3;
          const visibleActivities = cellActivities.slice(0, maxVisible);
          const overflowCount = cellActivities.length - maxVisible;

          return (
            <div
              key={day.dateStr}
              onClick={() => onSelectDate(day.dateStr)}
              style={day.isCurrentMonth ? getDayCellBackgroundStyle(dayColorEntry?.color, isDark) : {}}
              className={`min-h-[105px] p-1.5 transition-colors duration-100 flex flex-col justify-between group relative cursor-pointer ${
                !day.isCurrentMonth ? 'opacity-40 bg-bg-subtle/30' : 'hover:bg-bg-hover/30'
              } ${isSelected ? 'ring-2 ring-primary ring-inset z-10' : ''}`}
            >
              <div>
                {/* Date header */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-xs font-mono w-6 h-6 rounded-full flex items-center justify-center ${
                      isToday
                        ? 'bg-primary text-white font-bold shadow-xs'
                        : isSelected
                        ? 'text-txt-primary font-bold bg-primary/20'
                        : day.isCurrentMonth
                        ? 'text-txt-primary'
                        : 'text-txt-muted'
                    }`}
                  >
                    {day.dayNum}
                  </span>

                  {/* Date actions (hover) */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onOpenDayColorPicker(day.dateStr);
                      }}
                      className="p-1 rounded text-txt-muted hover:text-primary transition-colors cursor-pointer"
                      title="Set Day Background Color"
                    >
                      <Palette className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onOpenCreateEvent(day.dateStr);
                      }}
                      className="p-1 rounded text-txt-muted hover:text-primary transition-colors cursor-pointer"
                      title="Create Event on this date"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Activity Names inside Box */}
                <div className="space-y-1">
                  {visibleActivities.map(act => (
                    <motion.div
                      key={`${act.type}-${act.id}`}
                      whileHover={{ scale: 1.02 }}
                      onClick={e => {
                        e.stopPropagation();
                        if (act.type === 'task') {
                          navigateToTask(act.raw.pageId, act.id);
                        } else if (act.type === 'habit') {
                          navigateToHabit(act.id);
                        } else if (act.type === 'event') {
                          onOpenEditEvent(act.raw);
                        }
                      }}
                      className="px-1.5 py-0.5 rounded text-[11px] font-sans font-medium truncate flex items-center gap-1.5 transition-opacity hover:opacity-85 shadow-2xs cursor-pointer"
                      style={{
                        backgroundColor: `${act.color}20`,
                        borderLeft: `3px solid ${act.color}`,
                        color: act.color,
                      }}
                      title={`${act.type.toUpperCase()}: ${act.title}`}
                    >
                      <span
                        className={`truncate ${
                          act.completed ? 'line-through text-txt-muted' : 'text-txt-primary'
                        }`}
                      >
                        {act.title}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Overflow indicator: +N more */}
              {overflowCount > 0 && (
                <div className="mt-1">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onOpenDayView(day.dateStr);
                    }}
                    className="text-[10px] font-sans font-bold text-txt-primary hover:bg-primary-hover/30 px-2 py-0.5 rounded-md bg-primary/20 border border-primary/40 cursor-pointer transition-colors shadow-2xs block w-full text-center"
                  >
                    +{overflowCount} more
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
