import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../../context/WorkspaceContext';
import { formatLocalDate } from '../../db/indexedDB';
import { Habit } from '../../types';
import { IconRenderer } from '../common/IconRegistry';
import { HabitModal } from '../habits/HabitModal';
import { 
  CheckCircle2, 
  Square, 
  Activity, 
  Calendar, 
  Layers, 
  Plus, 
  ArrowRight, 
  Check,
  Clock,
  Sparkles,
  Flame,
  CalendarDays
} from 'lucide-react';
import { motion } from 'framer-motion';

export const DashboardModule: React.FC = () => {
  const { 
    settings, 
    pages, 
    tasks, 
    habits, 
    habitLogs, 
    events, 
    toggleTaskCompleted, 
    toggleHabitLog, 
    navigateToTask, 
    setActiveSection, 
    createTask 
  } = useWorkspace();
  const navigate = useNavigate();

  const [isHabitModalOpen, setIsHabitModalOpen] = useState(false);
  const [inlineTaskTitle, setInlineTaskTitle] = useState('');
  const [inlineTaskPageId, setInlineTaskPageId] = useState('');
  const [showInlineAdd, setShowInlineAdd] = useState(false);

  const activePages = pages.filter(p => !p.archived);
  const now = new Date();
  const todayStr = formatLocalDate(now);

  // Time-based greeting
  const hour = now.getHours();
  let greeting = 'Good morning';
  if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
  else if (hour >= 17) greeting = 'Good evening';

  // Day of week (1 = Mon, ..., 7 = Sun)
  const currentDayOfWeek = (now.getDay() + 6) % 7 + 1;

  // 1. Tasks Card: Tasks due today & Overdue
  const tasksDueToday = tasks.filter(t => t.dueDate === todayStr);
  const tasksDueTodayCompleted = tasksDueToday.filter(t => t.completed).length;
  const overdueTasks = tasks.filter(t => !t.completed && t.dueDate && t.dueDate < todayStr);
  const tasksDueTodayPercent = tasksDueToday.length > 0
    ? Math.round((tasksDueTodayCompleted / tasksDueToday.length) * 100)
    : 100;

  // 2. Habits Card: Habits scheduled today
  const isHabitScheduledForDate = (habit: Habit, _dateStr: string, dayOfWeek: number) => {
    if (habit.schedule.type === 'daily') return true;
    if (habit.schedule.type === 'weekdays') {
      return habit.schedule.days.includes(dayOfWeek);
    }
    return false;
  };

  const habitsScheduledToday = habits.filter(h => isHabitScheduledForDate(h, todayStr, currentDayOfWeek));
  const habitsCompletedToday = habitsScheduledToday.filter(h => {
    const log = habitLogs.find(l => l.habitId === h.id && l.date === todayStr);
    return log?.completed;
  }).length;
  const habitsTodayPercent = habitsScheduledToday.length > 0
    ? Math.round((habitsCompletedToday / habitsScheduledToday.length) * 100)
    : 100;

  // 3. Events Card: Count of events today
  const eventsToday = events.filter(e => e.date === todayStr);

  // 4. Pages Card: Non-archived pages
  const activePagesCount = activePages.length;

  // 5. Today's Tasks: top 3
  const todaysTasksCandidates = useMemo(() => {
    const priorityWeight: { [key: string]: number } = { high: 3, medium: 2, low: 1 };

    return tasks.filter(t => {
      if (t.completed) return false;
      const isDue = t.dueDate === todayStr;
      const isOverdue = !!t.dueDate && t.dueDate < todayStr;
      const isHighPriority = t.priority === 'high';
      return isDue || isOverdue || isHighPriority;
    }).sort((a, b) => {
      const aOverdue = a.dueDate && a.dueDate < todayStr ? 1 : 0;
      const bOverdue = b.dueDate && b.dueDate < todayStr ? 1 : 0;
      if (aOverdue !== bOverdue) return bOverdue - aOverdue;

      const pDiff = priorityWeight[b.priority] - priorityWeight[a.priority];
      if (pDiff !== 0) return pDiff;

      return a.order - b.order;
    });
  }, [tasks, todayStr]);

  const top3TodaysTasks = todaysTasksCandidates.slice(0, 3);

  // 6. Upcoming (Next 7 days)
  const next7DaysItems = useMemo(() => {
    const items: Array<{
      id: string;
      title: string;
      date: string;
      time?: string | null;
      type: 'task' | 'event';
      color?: string;
      pageId?: string;
    }> = [];

    const start = new Date(now);
    const end = new Date(now);
    end.setDate(end.getDate() + 7);
    const endStr = formatLocalDate(end);

    tasks.forEach(t => {
      if (!t.completed && t.dueDate && t.dueDate >= todayStr && t.dueDate <= endStr) {
        const page = pages.find(p => p.id === t.pageId);
        items.push({
          id: t.id,
          title: t.title,
          date: t.dueDate,
          type: 'task',
          color: page?.color || '#4285F4',
          pageId: t.pageId,
        });
      }
    });

    events.forEach(e => {
      if (e.date >= todayStr && e.date <= endStr) {
        items.push({
          id: e.id,
          title: e.title,
          date: e.date,
          time: e.startTime ? `${e.startTime}${e.endTime ? ` - ${e.endTime}` : ''}` : null,
          type: 'event',
          color: e.color,
        });
      }
    });

    return items.sort((a, b) => a.date.localeCompare(b.date));
  }, [events, now, pages, tasks, todayStr]);

  // 7. Weekly Progress
  const weekProgressData = useMemo(() => {
    const monday = new Date(now);
    const day = (now.getDay() + 6) % 7;
    monday.setDate(now.getDate() - day);

    const weekDates: Array<{ dateStr: string; dayOfWeek: number }> = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      weekDates.push({
        dateStr: formatLocalDate(d),
        dayOfWeek: i + 1,
      });
    }

    const weekDateSet = new Set(weekDates.map(w => w.dateStr));

    const weekTasks = tasks.filter(t => t.dueDate && weekDateSet.has(t.dueDate));
    const tasksDueThisWeek = weekTasks.length;
    const tasksCompletedThisWeek = weekTasks.filter(t => t.completed).length;

    let habitOccurrencesThisWeek = 0;
    let habitCompletionsThisWeek = 0;

    habits.forEach(h => {
      weekDates.forEach(({ dateStr, dayOfWeek }) => {
        if (isHabitScheduledForDate(h, dateStr, dayOfWeek)) {
          habitOccurrencesThisWeek++;
          const log = habitLogs.find(l => l.habitId === h.id && l.date === dateStr);
          if (log?.completed) {
            habitCompletionsThisWeek++;
          }
        }
      });
    });

    const eventsThisWeek = events.filter(e => weekDateSet.has(e.date)).length;

    const numerator = tasksCompletedThisWeek + habitCompletionsThisWeek;
    const denominator = tasksDueThisWeek + habitOccurrencesThisWeek;
    const overallPercent = denominator > 0 ? Math.round((numerator / denominator) * 100) : 0;

    return {
      overallPercent,
      tasksDueThisWeek,
      tasksCompletedThisWeek,
      habitOccurrencesThisWeek,
      habitCompletionsThisWeek,
      eventsThisWeek,
    };
  }, [events, habitLogs, habits, now, tasks]);

  // Handle inline quick add task
  const handleInlineAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineTaskTitle.trim()) return;
    const targetPageId = inlineTaskPageId || activePages[0]?.id;
    if (!targetPageId) return;

    await createTask({
      pageId: targetPageId,
      title: inlineTaskTitle.trim(),
      dueDate: todayStr,
      priority: 'high',
    });

    setInlineTaskTitle('');
    setShowInlineAdd(false);
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-border">
        <div>
          <h1 className="text-[26px] sm:text-[28px] lg:text-[30px] font-bold text-txt-primary tracking-tight">
            {greeting}, {settings.displayName || 'Friend'} 👋
          </h1>
          <p className="text-[14px] sm:text-[15px] font-sans text-txt-secondary mt-1 font-normal">
            Here's your day at a glance. Everything is focused and organized.
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-2.5 px-4 py-2 rounded-xl bg-bg-card border border-border shadow-2xs">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-[13px] font-sans font-semibold text-txt-secondary">
            {tasksDueToday.length - tasksDueTodayCompleted} tasks remaining today
          </span>
        </div>
      </div>

      {/* 4 Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Tasks Card */}
        <motion.div 
          whileHover={{ y: -3, transition: { type: "spring", stiffness: 450, damping: 25 } }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/tasks')}
          className="bg-bg-card border border-border hover:border-primary shadow-card hover:shadow-card-hover rounded-2xl p-5 sm:p-6 transition-all duration-150 cursor-pointer group select-none flex flex-col justify-between"
          role="button"
          tabIndex={0}
          aria-label="View Tasks Due Today"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[14px] sm:text-[15px] font-sans font-bold text-txt-secondary group-hover:text-primary transition-colors">
                Tasks
              </span>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-primary flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div className="text-[28px] sm:text-[30px] font-mono font-bold text-txt-primary tracking-tight">
              {tasksDueTodayCompleted} <span className="text-xl font-normal text-txt-muted">/ {tasksDueToday.length}</span>
            </div>
            <div className="text-[13px] font-sans font-medium text-txt-secondary mt-1.5 flex flex-wrap items-center justify-between gap-1">
              <span>{tasksDueToday.length === 0 ? 'No tasks due today' : 'Due today'}</span>
              {overdueTasks.length > 0 && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800">
                  {overdueTasks.length} overdue
                </span>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border-subtle">
            <div className="w-full bg-bg-subtle h-2.5 rounded-full overflow-hidden border border-border-subtle">
              <div 
                className="bg-primary h-full rounded-full transition-all duration-300"
                style={{ width: `${tasksDueToday.length > 0 ? tasksDueTodayPercent : 100}%` }}
              />
            </div>
            <div className="mt-2 text-xs font-sans font-medium text-txt-secondary flex items-center justify-between">
              <span>{todaysTasksCandidates.length} total pending</span>
              <span>{tasksDueToday.length > 0 ? `${tasksDueTodayPercent}%` : '100%'}</span>
            </div>
          </div>
        </motion.div>

        {/* Habits Card */}
        <motion.div 
          whileHover={{ y: -3, transition: { type: "spring", stiffness: 450, damping: 25 } }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/habits')}
          className="bg-bg-card border border-border hover:border-primary shadow-card hover:shadow-card-hover rounded-2xl p-5 sm:p-6 transition-all duration-150 cursor-pointer group select-none flex flex-col justify-between"
          role="button"
          tabIndex={0}
          aria-label="View Habits Scheduled Today"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[14px] sm:text-[15px] font-sans font-bold text-txt-secondary group-hover:text-primary transition-colors">
                Habits
              </span>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-primary flex items-center justify-center">
                <Activity className="w-5 h-5" />
              </div>
            </div>
            <div className="text-[28px] sm:text-[30px] font-mono font-bold text-txt-primary tracking-tight">
              {habitsCompletedToday} <span className="text-xl font-normal text-txt-muted">/ {habitsScheduledToday.length}</span>
            </div>
            <div className="text-[13px] font-sans font-medium text-txt-secondary mt-1.5">
              {habitsScheduledToday.length === 0 ? 'None scheduled' : 'Scheduled today'}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border-subtle">
            <div className="w-full bg-bg-subtle h-2.5 rounded-full overflow-hidden border border-border-subtle">
              <div 
                className="bg-primary h-full rounded-full transition-all duration-300"
                style={{ width: `${habitsScheduledToday.length > 0 ? habitsTodayPercent : 100}%` }}
              />
            </div>
            <div className="mt-2 text-xs font-sans font-medium text-txt-secondary flex items-center justify-between">
              <span>{habitsScheduledToday.length} targets</span>
              <span>{habitsScheduledToday.length > 0 ? `${habitsTodayPercent}%` : '100%'}</span>
            </div>
          </div>
        </motion.div>

        {/* Events Card */}
        <motion.div 
          whileHover={{ y: -3, transition: { type: "spring", stiffness: 450, damping: 25 } }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/calendar')}
          className="bg-bg-card border border-border hover:border-primary shadow-card hover:shadow-card-hover rounded-2xl p-5 sm:p-6 transition-all duration-150 cursor-pointer group select-none flex flex-col justify-between"
          role="button"
          tabIndex={0}
          aria-label="View Events Today"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[14px] sm:text-[15px] font-sans font-bold text-txt-secondary group-hover:text-primary transition-colors">
                Events
              </span>
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
            </div>
            <div className="text-[28px] sm:text-[30px] font-mono font-bold text-txt-primary tracking-tight">
              {eventsToday.length}
            </div>
            <div className="text-[13px] font-sans font-medium text-txt-secondary mt-1.5">
              {eventsToday.length === 1 ? '1 event scheduled today' : `${eventsToday.length} events today`}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between text-xs font-sans text-txt-secondary font-medium">
            <span>Calendar schedule</span>
            <ArrowRight className="w-4 h-4 text-txt-secondary group-hover:text-primary transition-colors" />
          </div>
        </motion.div>

        {/* Pages Card */}
        <motion.div 
          whileHover={{ y: -3, transition: { type: "spring", stiffness: 450, damping: 25 } }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/tasks')}
          className="bg-bg-card border border-border hover:border-purple-500 shadow-card hover:shadow-card-hover rounded-2xl p-5 sm:p-6 transition-all duration-150 cursor-pointer group select-none flex flex-col justify-between"
          role="button"
          tabIndex={0}
          aria-label="View Active Pages"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[14px] sm:text-[15px] font-sans font-bold text-txt-secondary group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                Pages
              </span>
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
            </div>
            <div className="text-[28px] sm:text-[30px] font-mono font-bold text-txt-primary tracking-tight">
              {activePagesCount}
            </div>
            <div className="text-[13px] font-sans font-medium text-txt-secondary mt-1.5">
              Active project pages
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between text-xs font-sans text-txt-secondary font-medium">
            <span>Folders & lists</span>
            <ArrowRight className="w-4 h-4 text-txt-secondary group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors" />
          </div>
        </motion.div>
      </div>

      {/* Middle row: Today's Tasks & Habit Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Tasks Card */}
        <div className="bg-bg-card border border-border shadow-card rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
                <span className="text-[17px] sm:text-[18px] font-serif font-bold text-txt-primary tracking-tight">Today's Tasks</span>
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-bg-subtle text-txt-secondary border border-border-interactive/80">
                  {todaysTasksCandidates.length} pending
                </span>
                {overdueTasks.length > 0 && (
                  <span className="text-xs font-sans font-bold px-2.5 py-0.5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800">
                    {overdueTasks.length} overdue
                  </span>
                )}
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setShowInlineAdd(!showInlineAdd)}
                className={`h-10 px-4 text-xs font-sans font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                  showInlineAdd
                    ? 'bg-bg-subtle text-txt-primary border border-border-interactive'
                    : 'bg-primary hover:bg-primary-hover text-white'
                }`}
                aria-label={showInlineAdd ? "Close Add Task form" : "Add a task"}
                title="Add task"
              >
                <Plus className={`w-4 h-4 transition-transform ${showInlineAdd ? 'rotate-45' : ''}`} />
                <span>{showInlineAdd ? 'Close' : 'Add Task'}</span>
              </motion.button>
            </div>

            {/* Inline Add Task Form */}
            {showInlineAdd && (
              <form onSubmit={handleInlineAddTask} className="mb-4 p-4 bg-bg-subtle border border-border-interactive rounded-xl space-y-3 shadow-2xs">
                <input
                  type="text"
                  autoFocus
                  placeholder="Task title..."
                  value={inlineTaskTitle}
                  onChange={e => setInlineTaskTitle(e.target.value)}
                  className="w-full h-10 px-3.5 text-sm font-sans bg-bg-card border-2 border-border-interactive rounded-xl text-txt-primary placeholder:text-txt-muted outline-hidden focus:border-border-focus focus:ring-2 focus:ring-border-focus/20 transition-all"
                />
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                  <select
                    value={inlineTaskPageId || activePages[0]?.id || ''}
                    onChange={e => setInlineTaskPageId(e.target.value)}
                    className="h-10 px-3 text-xs font-sans font-medium bg-bg-card border-2 border-border-interactive rounded-xl text-txt-primary outline-hidden cursor-pointer focus:border-border-focus"
                  >
                    {activePages.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowInlineAdd(false)}
                      className="h-10 px-4 text-xs font-sans font-semibold text-txt-secondary hover:text-txt-primary hover:bg-bg-hover bg-bg-card border border-border-interactive/60 rounded-xl transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!inlineTaskTitle.trim()}
                      className="h-10 px-4 text-xs font-sans font-bold text-white bg-primary rounded-xl hover:bg-primary-hover active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs transition-all cursor-pointer"
                    >
                      Save Task
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Top tasks list */}
            <div className="space-y-2.5">
              {top3TodaysTasks.length === 0 ? (
                /* Structured Empty State */
                <div className="py-8 px-4 text-center rounded-xl bg-bg-subtle/50 border border-dashed border-border-interactive flex flex-col items-center">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center mb-3">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-serif font-bold text-txt-primary">All caught up for today!</h4>
                  <p className="text-xs font-sans text-txt-secondary max-w-sm mt-1 mb-4">
                    No pending tasks due today or overdue. Enjoy your free time or plan ahead.
                  </p>
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowInlineAdd(true)}
                    className="h-10 px-4 text-xs font-sans font-semibold text-primary bg-bg-card hover:bg-bg-hover border border-border-interactive rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create a Task</span>
                  </motion.button>
                </div>
              ) : (
                top3TodaysTasks.map(task => {
                  const isOverdue = !!task.dueDate && task.dueDate < todayStr;
                  const page = pages.find(p => p.id === task.pageId);

                  return (
                    <motion.div
                      key={task.id}
                      whileHover={{ x: 2 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      className="flex items-center justify-between p-3.5 rounded-xl bg-bg-card hover:bg-bg-subtle/70 border border-border-interactive/70 hover:border-primary/70 transition-all duration-150 shadow-2xs group"
                    >
                      <div className="flex items-center gap-3 overflow-hidden flex-1">
                        <motion.button
                          whileTap={{ scale: 0.85 }}
                          onClick={() => toggleTaskCompleted(task.id)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center border-2 border-border-interactive hover:border-primary bg-bg-subtle/40 text-txt-muted hover:text-primary transition-colors flex-shrink-0 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary"
                          aria-label={`Mark task ${task.title} as completed`}
                          title="Mark task completed"
                        >
                          <Square className="w-4 h-4 sm:w-5 sm:h-5" />
                        </motion.button>
                        <button
                          onClick={() => navigateToTask(task.pageId, task.id)}
                          className="text-[14px] sm:text-[15px] font-sans font-semibold text-txt-primary group-hover:text-primary break-words line-clamp-2 text-left transition-colors cursor-pointer leading-snug"
                          title={task.title}
                        >
                          {task.title}
                        </button>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        {isOverdue && (
                          <span className="text-xs font-sans font-bold px-2 py-0.5 rounded-md bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800">
                            Overdue
                          </span>
                        )}
                        {task.priority === 'high' && (
                          <span className="text-xs font-sans font-bold px-2 py-0.5 rounded-md bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
                            High
                          </span>
                        )}
                        {task.priority === 'medium' && (
                          <span className="text-xs font-sans font-semibold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            Medium
                          </span>
                        )}
                        {page && (
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0 ring-1 ring-border"
                            style={{ backgroundColor: page.color }}
                            title={page.name}
                          />
                        )}
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-5 pt-3.5 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-sans">
            <span className="text-[13px] text-txt-secondary font-medium">
              {tasksDueToday.length} due today, {overdueTasks.length} overdue from past days ({todaysTasksCandidates.length} total pending)
            </span>
            <button
              onClick={() => navigate('/tasks')}
              className="h-10 px-3.5 rounded-xl border border-border-interactive/60 hover:border-primary text-primary font-bold hover:bg-primary-light/50 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs self-start sm:self-auto"
            >
              <span>View all tasks</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Habit Summary Card */}
        <div className="bg-bg-card border border-border shadow-card rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <span className="text-[17px] sm:text-[18px] font-serif font-bold text-txt-primary tracking-tight">Habit Summary</span>
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-bg-subtle text-txt-secondary border border-border-interactive/80">
                  {habitsScheduledToday.length} today
                </span>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsHabitModalOpen(true)}
                className="h-10 px-4 text-xs font-sans font-bold text-primary bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title="Add Habit"
                aria-label="Add Habit"
              >
                <Plus className="w-4 h-4" />
                <span>New Habit</span>
              </motion.button>
            </div>

            <div className="space-y-2.5">
              {habitsScheduledToday.length === 0 ? (
                /* Structured Empty State */
                <div className="py-8 px-4 text-center rounded-xl bg-bg-subtle/50 border border-dashed border-border-interactive flex flex-col items-center">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center mb-3">
                    <Flame className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-serif font-bold text-txt-primary">No habits scheduled today</h4>
                  <p className="text-xs font-sans text-txt-secondary max-w-sm mt-1 mb-4">
                    Take a rest day or establish a new daily routine to keep up your momentum.
                  </p>
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setIsHabitModalOpen(true)}
                    className="h-10 px-4 text-xs font-sans font-semibold text-primary bg-bg-card hover:bg-bg-hover border border-border-interactive rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Habit</span>
                  </motion.button>
                </div>
              ) : (
                habitsScheduledToday.map(habit => {
                  const isChecked = !!habitLogs.find(
                    l => l.habitId === habit.id && l.date === todayStr && l.completed
                  );

                  return (
                    <motion.div
                      key={habit.id}
                      whileHover={{ x: 2 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      className="flex items-center justify-between p-3.5 rounded-xl bg-bg-card hover:bg-bg-subtle/70 border border-border-interactive/70 hover:border-primary/70 transition-all duration-150 shadow-2xs"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs shadow-2xs ring-1 ring-border-interactive/50"
                          style={{ backgroundColor: habit.color }}
                        >
                          <IconRenderer name={habit.icon} className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div>
                          <span className={`text-[14px] sm:text-[15px] font-sans font-semibold ${isChecked ? 'text-txt-muted line-through' : 'text-txt-primary'}`}>
                            {habit.name}
                          </span>
                          <div className="text-[13px] font-sans text-txt-secondary">
                            {habit.schedule.type === 'daily' ? 'Every day' : 'Scheduled day'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <span className={`text-xs font-sans font-semibold px-2.5 py-1 rounded-md border ${
                          isChecked
                            ? 'bg-primary/15 text-primary border-primary/30'
                            : 'bg-bg-card text-txt-secondary border-border-interactive'
                        }`}>
                          {isChecked ? 'Done' : 'Check In'}
                        </span>
                        <motion.button
                          whileTap={{ scale: 0.88 }}
                          transition={{ type: "spring", stiffness: 500, damping: 25 }}
                          onClick={() => toggleHabitLog(habit.id, todayStr)}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer border-2 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary ${
                            isChecked
                              ? 'bg-primary border-primary text-white shadow-xs'
                              : 'border-border-interactive bg-bg-card hover:border-primary text-transparent'
                          }`}
                          title={isChecked ? 'Mark incomplete' : 'Mark completed'}
                          aria-label={isChecked ? `Mark ${habit.name} incomplete` : `Mark ${habit.name} complete`}
                        >
                          <Check className="w-5 h-5 stroke-[3]" />
                        </motion.button>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-5 pt-3.5 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-sans">
            <span className="text-[13px] text-txt-secondary font-semibold">
              {habitsScheduledToday.length > 0
                ? `${habitsCompletedToday} / ${habitsScheduledToday.length} completed (${Math.round(
                    (habitsCompletedToday / habitsScheduledToday.length) * 100
                  )}%)`
                : '0 scheduled today'}
            </span>
            <button
              onClick={() => navigate('/habits')}
              className="h-10 px-3.5 rounded-xl border border-primary/30 hover:border-primary text-primary font-bold hover:bg-primary/10 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs self-start sm:self-auto"
            >
              <span>Habit Tracker</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom row: Upcoming & Weekly Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming (Next 7 Days) Card */}
        <div className="bg-bg-card border border-border shadow-card rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <CalendarDays className="w-5 h-5 text-primary" />
                <span className="text-[17px] sm:text-[18px] font-serif font-bold text-txt-primary tracking-tight">Upcoming (Next 7 Days)</span>
              </div>
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-bg-subtle text-txt-secondary border border-border-interactive/80">
                {next7DaysItems.length} items
              </span>
            </div>

            <div className="space-y-2.5">
              {next7DaysItems.length === 0 ? (
                /* Structured Empty State */
                <div className="py-8 px-4 text-center rounded-xl bg-bg-subtle/50 border border-dashed border-border-interactive flex flex-col items-center">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center mb-3">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-serif font-bold text-txt-primary">No upcoming items</h4>
                  <p className="text-xs font-sans text-txt-secondary max-w-sm mt-1 mb-4">
                    Your agenda is clear for the next 7 days. Schedule an event or due date to stay on track.
                  </p>
                  <button
                    onClick={() => navigate('/calendar')}
                    className="h-10 px-4 text-xs font-sans font-semibold text-primary bg-bg-card hover:bg-bg-hover border border-border-interactive rounded-xl transition-colors shadow-2xs"
                  >
                    Open Calendar
                  </button>
                </div>
              ) : (
                next7DaysItems.slice(0, 5).map(item => (
                  <motion.div
                    key={`${item.type}-${item.id}`}
                    whileHover={{ x: 2 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    onClick={() => {
                      if (item.type === 'task' && item.pageId) {
                        navigateToTask(item.pageId, item.id);
                      } else {
                        navigate('/calendar');
                      }
                    }}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-bg-card hover:bg-bg-subtle/70 border border-border-interactive/70 hover:border-primary/70 transition-all duration-150 shadow-2xs cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-lg bg-bg-subtle border border-border-interactive text-txt-secondary flex-shrink-0">
                        {item.date}
                      </span>
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0 ring-1 ring-border"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-[14px] sm:text-[15px] font-sans font-medium text-txt-primary group-hover:text-primary truncate">
                        {item.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 text-xs font-sans text-txt-muted ml-2">
                      {item.time && (
                        <span className="flex items-center gap-1 font-mono text-txt-secondary">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{item.time}</span>
                        </span>
                      )}
                      <span className="text-xs uppercase font-bold text-txt-muted px-2 py-0.5 rounded bg-bg-card border border-border-interactive/80">
                        {item.type}
                      </span>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>

          <div className="mt-5 pt-3.5 border-t border-border flex items-center justify-between text-xs font-sans">
            <span className="text-[13px] text-txt-secondary font-medium">
              {next7DaysItems.length > 5 ? `+${next7DaysItems.length - 5} more scheduled` : '7-day overview'}
            </span>
            <button
              onClick={() => navigate('/calendar')}
              className="h-10 px-3.5 rounded-xl border border-border-interactive/60 hover:border-primary text-primary font-bold hover:bg-primary-light/50 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <span>Open Calendar</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Weekly Progress Card */}
        <div className="bg-bg-card border border-border shadow-card rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5">
              <span className="text-[17px] sm:text-[18px] font-serif font-bold text-txt-primary tracking-tight">Weekly Progress</span>
              <span className="text-xs font-mono font-semibold text-txt-secondary bg-bg-subtle border border-border-interactive/80 px-2.5 py-1 rounded-lg">
                Mon - Sun
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-2">
              {/* Circular Progress Ring */}
              <div className="relative w-36 h-36 flex items-center justify-center flex-shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    className="stroke-bg-subtle"
                    strokeWidth="10"
                    fill="transparent"
                  />
                  <motion.circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="var(--color-primary)"
                    strokeWidth="10"
                    strokeDasharray={251.2}
                    initial={{ strokeDashoffset: 251.2 }}
                    animate={{ strokeDashoffset: 251.2 - (251.2 * weekProgressData.overallPercent) / 100 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-[28px] sm:text-[30px] font-mono font-bold text-txt-primary">
                    {weekProgressData.overallPercent}%
                  </span>
                  <span className="text-xs font-sans text-txt-secondary font-bold uppercase tracking-wider">
                    Completed
                  </span>
                </div>
              </div>

              {/* Progress breakdown bars */}
              <div className="space-y-3.5 flex-1 w-full max-w-xs font-sans">
                {/* Tasks breakdown */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-[13px] text-txt-secondary font-semibold">Tasks this week</span>
                    <span className="text-[13px] font-mono font-bold text-txt-primary">
                      {weekProgressData.tasksCompletedThisWeek} / {weekProgressData.tasksDueThisWeek}
                    </span>
                  </div>
                  <div className="w-full bg-bg-subtle h-2.5 rounded-full overflow-hidden border border-border-interactive/60">
                    <div 
                      className="bg-primary h-full rounded-full transition-all duration-300"
                      style={{ 
                        width: `${weekProgressData.tasksDueThisWeek > 0 
                          ? Math.round((weekProgressData.tasksCompletedThisWeek / weekProgressData.tasksDueThisWeek) * 100) 
                          : 0}%` 
                      }}
                    />
                  </div>
                </div>

                {/* Habits breakdown */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-[13px] text-txt-secondary font-semibold">Habits this week</span>
                    <span className="text-[13px] font-mono font-bold text-txt-primary">
                      {weekProgressData.habitCompletionsThisWeek} / {weekProgressData.habitOccurrencesThisWeek}
                    </span>
                  </div>
                  <div className="w-full bg-bg-subtle h-2.5 rounded-full overflow-hidden border border-border-interactive/60">
                    <div 
                      className="bg-primary h-full rounded-full transition-all duration-300"
                      style={{ 
                        width: `${weekProgressData.habitOccurrencesThisWeek > 0 
                          ? Math.round((weekProgressData.habitCompletionsThisWeek / weekProgressData.habitOccurrencesThisWeek) * 100) 
                          : 0}%` 
                      }}
                    />
                  </div>
                </div>

                {/* Events count */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-bg-subtle border border-border-interactive/80 text-xs">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-txt-secondary" />
                    <span className="text-[13px] font-semibold text-txt-secondary">Events scheduled</span>
                  </div>
                  <span className="text-[13px] font-mono font-bold text-txt-primary">
                    {weekProgressData.eventsThisWeek}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3.5 border-t border-border text-[13px] font-sans text-txt-secondary text-center sm:text-left leading-relaxed">
            Overall score combines task completions and habit streak check-ins across the current 7-day week.
          </div>
        </div>
      </div>

      {/* Modals */}
      <HabitModal
        isOpen={isHabitModalOpen}
        onClose={() => setIsHabitModalOpen(false)}
      />
    </div>
  );
};
