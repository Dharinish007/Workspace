import React from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { CalendarEvent } from '../../types';
import { Clock, Plus, Palette, CheckSquare, Activity, Calendar as CalendarIcon, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { getDayCellBackgroundStyle } from '../../utils/calendarColors';

interface DayViewProps {
  dateStr: string;
  onBackToMonth: () => void;
  onOpenCreateEvent: (dateStr: string) => void;
  onOpenEditEvent: (event: CalendarEvent) => void;
  onOpenDayColorPicker: (dateStr: string) => void;
  showTodos: boolean;
  showHabits: boolean;
  showEvents: boolean;
  showCompleted: boolean;
}

export const DayView: React.FC<DayViewProps> = ({
  dateStr,
  onBackToMonth,
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

  const d = new Date(dateStr);
  const formattedFullDate = d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const dayColorEntry = dayColors.find(item => item.date === dateStr);
  const dow = (d.getDay() + 6) % 7 + 1;

  // Separate all-day vs timed items
  const allDayItems: {
    id: string;
    type: 'task' | 'habit' | 'event';
    title: string;
    color: string;
    completed?: boolean;
    raw: any;
  }[] = [];

  const timedItems: {
    id: string;
    type: 'event';
    title: string;
    startTime: string;
    endTime?: string | null;
    color: string;
    raw: CalendarEvent;
  }[] = [];

  if (showTodos) {
    tasks.forEach(t => {
      if (t.dueDate === dateStr) {
        if (showCompleted || !t.completed) {
          const page = pages.find(p => p.id === t.pageId);
          allDayItems.push({
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
        const log = habitLogs.find(l => l.habitId === h.id && l.date === dateStr);
        const isDone = !!log?.completed;
        if (showCompleted || !isDone) {
          allDayItems.push({
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

  if (showEvents) {
    events.forEach(e => {
      if (e.date === dateStr) {
        if (e.startTime) {
          timedItems.push({
            id: e.id,
            type: 'event',
            title: e.title,
            startTime: e.startTime,
            endTime: e.endTime,
            color: e.color || '#F97316',
            raw: e,
          });
        } else {
          allDayItems.push({
            id: e.id,
            type: 'event',
            title: e.title,
            color: e.color || '#F97316',
            raw: e,
          });
        }
      }
    });
  }

  timedItems.sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <div className="space-y-4 font-sans">
      {/* Top Header */}
      <div 
        style={getDayCellBackgroundStyle(dayColorEntry?.color, isDark)}
        className="bg-bg-card border border-border rounded-2xl p-5 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors"
      >
        <div className="flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onBackToMonth}
            className="w-10 h-10 rounded-xl bg-bg-subtle hover:bg-bg-hover text-txt-secondary hover:text-txt-primary border border-border flex items-center justify-center transition-colors cursor-pointer"
            title="Back to Month View"
            aria-label="Back to Month View"
          >
            <ArrowLeft className="w-5 h-5" />
          </motion.button>
          <div>
            <h2 className="text-[24px] sm:text-[26px] font-bold text-txt-primary tracking-tight">{formattedFullDate}</h2>
            <p className="text-[13px] text-txt-muted">
              {allDayItems.length} all-day items · {timedItems.length} timed events
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => onOpenDayColorPicker(dateStr)}
            className="h-10 px-4 text-xs font-semibold text-txt-secondary hover:text-txt-primary bg-bg-card hover:bg-bg-hover border border-border-interactive/70 hover:border-primary rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
            title="Set Day Background Color"
            aria-label="Set Day Background Color"
          >
            <Palette className="w-4 h-4" />
            <span>Day Color</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
            onClick={() => onOpenCreateEvent(dateStr)}
            className="px-4 py-2 text-xs font-bold text-white bg-primary hover:bg-primary-hover rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Event</span>
          </motion.button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: All-Day Section */}
        <div className="bg-bg-card border border-border rounded-2xl p-5 shadow-card space-y-3">
          <h3 className="text-base font-serif font-bold text-txt-primary flex items-center justify-between border-b border-border pb-2 tracking-tight">
            <span>All-Day Activities</span>
            <span className="text-xs font-mono text-txt-muted">{allDayItems.length}</span>
          </h3>

          <div className="space-y-2">
            {allDayItems.length === 0 ? (
              <div className="py-8 text-center text-xs text-txt-muted">
                No all-day tasks, habits, or events for this date.
              </div>
            ) : (
              allDayItems.map(item => (
                <motion.div
                  key={`${item.type}-${item.id}`}
                  whileHover={{ x: 2 }}
                  onClick={() => {
                    if (item.type === 'task') {
                      navigateToTask(item.raw.pageId, item.id);
                    } else if (item.type === 'habit') {
                      navigateToHabit(item.id);
                    } else if (item.type === 'event') {
                      onOpenEditEvent(item.raw);
                    }
                  }}
                  className="p-3 rounded-xl border border-border hover:border-primary/50 flex items-center justify-between gap-2 transition-colors cursor-pointer group"
                  style={{ backgroundColor: `${item.color}10`, borderLeft: `4px solid ${item.color}` }}
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    {item.type === 'task' && <CheckSquare className="w-4 h-4 text-primary-hover flex-shrink-0" />}
                    {item.type === 'habit' && <Activity className="w-4 h-4 text-teal-600 flex-shrink-0" />}
                    {item.type === 'event' && <CalendarIcon className="w-4 h-4 text-txt-secondary flex-shrink-0" />}

                    <span className={`text-xs font-semibold truncate ${item.completed ? 'line-through text-txt-muted' : 'text-txt-primary'}`}>
                      {item.title}
                    </span>
                  </div>

                  <span className="text-[10px] uppercase font-bold text-txt-muted flex-shrink-0">
                    {item.type}
                  </span>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Right 2 Columns: Chronological Timed Schedule */}
        <div className="lg:col-span-2 bg-bg-card border border-border rounded-2xl p-5 shadow-card space-y-4">
          <h3 className="text-base font-serif font-bold text-txt-primary flex items-center justify-between border-b border-border pb-2 tracking-tight">
            <span>Timeline Schedule</span>
            <span className="text-xs font-mono text-txt-muted">{timedItems.length} scheduled</span>
          </h3>

          <div className="space-y-3">
            {timedItems.length === 0 ? (
              <div className="py-12 text-center text-xs text-txt-muted">
                No timed events on this date. Click "Add Event" to schedule meetings or time blocks.
              </div>
            ) : (
              timedItems.map(item => (
                <motion.div
                  key={item.id}
                  whileHover={{ x: 2 }}
                  onClick={() => onOpenEditEvent(item.raw)}
                  className="p-3.5 rounded-xl border border-border hover:border-primary/50 flex items-center justify-between gap-4 transition-colors cursor-pointer group bg-bg-subtle/50 hover:bg-bg-subtle"
                  style={{ borderLeft: `4px solid ${item.color}` }}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-bg-card border border-border text-xs font-mono font-semibold text-txt-primary">
                      <Clock className="w-3.5 h-3.5 text-txt-muted" />
                      <span>{item.startTime}</span>
                      {item.endTime && <span>– {item.endTime}</span>}
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-txt-primary group-hover:text-primary transition-colors">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-txt-muted">{item.raw.category || 'Event / Meeting'}</p>
                    </div>
                  </div>

                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
