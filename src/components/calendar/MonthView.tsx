import React from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { formatLocalDate } from '../../db/indexedDB';
import { Task, Habit, CalendarEvent } from '../../types';
import { Check, CheckSquare, Palette, Plus } from 'lucide-react';

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

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // First day of current month
  const firstDay = new Date(year, month, 1);
  // Last day of current month
  const lastDay = new Date(year, month + 1, 0);

  // Week start: Monday = 1, Sunday = 0
  const startDayIndex = settings.weekStart === 'sunday' ? 0 : 1;
  let firstDayOfWeek = firstDay.getDay(); // 0 is Sun, 1 is Mon...
  if (settings.weekStart === 'monday') {
    firstDayOfWeek = (firstDayOfWeek + 6) % 7; // 0 is Mon, 6 is Sun
  }

  // Days in calendar grid
  const daysInMonth = lastDay.getDate();
  const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

  // Previous month trailing days
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, prevMonthLastDay - i);
    days.push({
      dateStr: formatLocalDate(d),
      dayNum: prevMonthLastDay - i,
      isCurrentMonth: false,
    });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month, i);
    days.push({
      dateStr: formatLocalDate(d),
      dayNum: i,
      isCurrentMonth: true,
    });
  }

  // Next month leading days to complete grid (42 cells = 6 weeks)
  const remainingCells = 42 - days.length;
  for (let i = 1; i <= remainingCells; i++) {
    const d = new Date(year, month + 1, i);
    days.push({
      dateStr: formatLocalDate(d),
      dayNum: i,
      isCurrentMonth: false,
    });
  }

  const todayStr = formatLocalDate(new Date());

  // Weekday column headers
  const weekDayHeaders = settings.weekStart === 'sunday'
    ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="bg-bg-card border border-border rounded-2xl overflow-hidden shadow-card">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-border bg-bg-subtle text-center text-xs font-semibold text-txt-secondary py-2.5">
        {weekDayHeaders.map(h => (
          <div key={h}>{h}</div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-border border-b border-border">
        {days.map((day, idx) => {
          const isToday = day.dateStr === todayStr;
          const isSelected = day.dateStr === selectedDate;
          const dayColorEntry = dayColors.find(d => d.date === day.dateStr);

          // Get day of week for habit schedule (1 = Mon, ..., 7 = Sun)
          const cellDate = new Date(day.dateStr);
          const dow = (cellDate.getDay() + 6) % 7 + 1;

          // Collect activities for this cell
          const cellActivities: {
            id: string;
            type: 'task' | 'habit' | 'event';
            title: string;
            color: string;
            completed?: boolean;
            raw: any;
          }[] = [];

          // 1. Tasks
          if (showTodos) {
            tasks.forEach(t => {
              if (t.dueDate === day.dateStr) {
                if (showCompleted || !t.completed) {
                  const page = pages.find(p => p.id === t.pageId);
                  cellActivities.push({
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

          // 2. Habits
          if (showHabits) {
            habits.forEach(h => {
              const isScheduled =
                h.schedule.type === 'daily' ||
                (h.schedule.type === 'weekdays' && h.schedule.days.includes(dow));
              if (isScheduled) {
                const log = habitLogs.find(l => l.habitId === h.id && l.date === day.dateStr);
                const isDone = !!log?.completed;
                if (showCompleted || !isDone) {
                  cellActivities.push({
                    id: h.id,
                    type: 'habit',
                    title: h.name,
                    color: h.color || '#0D9488',
                    completed: isDone,
                    raw: h,
                  });
                }
              }
            });
          }

          // 3. Events
          if (showEvents) {
            events.forEach(e => {
              if (e.date === day.dateStr) {
                cellActivities.push({
                  id: e.id,
                  type: 'event',
                  title: e.startTime ? `${e.startTime} ${e.title}` : e.title,
                  color: e.color || '#F97316',
                  raw: e,
                });
              }
            });
          }

          // Overflow handling: up to 3 labels, then +N more (Section 7.2)
          const maxVisible = 3;
          const visibleActivities = cellActivities.slice(0, maxVisible);
          const overflowCount = cellActivities.length - maxVisible;

          return (
            <div
              key={day.dateStr}
              onClick={() => onSelectDate(day.dateStr)}
              style={dayColorEntry ? { backgroundColor: dayColorEntry.color } : {}}
              className={`min-h-[105px] p-1.5 transition-colors duration-100 flex flex-col justify-between group relative cursor-pointer ${
                !day.isCurrentMonth ? 'opacity-40 bg-bg-subtle/30' : 'hover:bg-bg-hover/30'
              } ${isSelected ? 'ring-2 ring-primary ring-inset z-10' : ''}`}
            >
              <div>
                {/* Date header */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-xs font-semibold w-6 h-6 rounded-full flex items-center justify-center ${
                      isToday
                        ? 'bg-primary text-white font-bold shadow-xs'
                        : isSelected
                        ? 'text-primary font-bold'
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
                      className="p-1 rounded text-txt-muted hover:text-primary transition-colors"
                      title="Set Day Background Color"
                    >
                      <Palette className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onOpenCreateEvent(day.dateStr);
                      }}
                      className="p-1 rounded text-txt-muted hover:text-primary transition-colors"
                      title="Create Event on this date"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Activity Names inside Box (Section 7.2) */}
                <div className="space-y-1">
                  {visibleActivities.map(act => (
                    <div
                      key={`${act.type}-${act.id}`}
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
                      className="px-1.5 py-0.5 rounded text-[11px] font-medium truncate flex items-center gap-1.5 transition-opacity hover:opacity-85 shadow-2xs cursor-pointer"
                      style={{
                        backgroundColor: `${act.color}20`,
                        borderLeft: `3px solid ${act.color}`,
                        color: act.color,
                      }}
                      title={`${act.type.toUpperCase()}: ${act.title}`}
                    >
                      <span
                        className={`truncate ${
                          act.completed ? 'line-through opacity-70 text-txt-muted' : 'text-txt-primary'
                        }`}
                      >
                        {act.title}
                      </span>
                    </div>
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
                    className="text-[10px] font-bold text-primary hover:underline px-1 py-0.5 rounded bg-primary-light/50"
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

