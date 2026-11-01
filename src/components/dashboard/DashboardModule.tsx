import React, { useState, useMemo } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { formatLocalDate } from '../../db/indexedDB';
import { Task, Habit, Priority } from '../../types';
import { IconRenderer } from '../common/IconRegistry';
import { TaskModal } from '../todo/TaskModal';
import { HabitModal } from '../habits/HabitModal';
import { 
  CheckCircle2, 
  Square, 
  CheckSquare, 
  Activity, 
  Calendar, 
  Layers, 
  Plus, 
  ArrowRight, 
  AlertCircle, 
  Check,
  Flame,
  Clock
} from 'lucide-react';

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

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
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

  // 1. Tasks Card: Tasks due today
  const tasksDueToday = tasks.filter(t => t.dueDate === todayStr);
  const tasksDueTodayCompleted = tasksDueToday.filter(t => t.completed).length;

  // 2. Habits Card: Habits scheduled today
  const isHabitScheduledForDate = (habit: Habit, dateStr: string, dayOfWeek: number) => {
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

  // 3. Events Card: Count of events today
  const eventsToday = events.filter(e => e.date === todayStr);

  // 4. Pages Card: Non-archived pages
  const activePagesCount = activePages.length;

  // 5. Today's Tasks: top 3
  // Incomplete tasks that are due today, overdue, or High priority
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

  // 6. Upcoming (Next 7 days, starting today)
  const next7DaysItems = useMemo(() => {
    const items: {
      id: string;
      title: string;
      date: string;
      type: 'task' | 'event';
      color: string;
      pageId?: string;
      time?: string | null;
    }[] = [];

    // Construct 7 dates
    const dateStrings: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      dateStrings.push(formatLocalDate(d));
    }
    const dateSet = new Set(dateStrings);

    // Incomplete tasks with a due date in next 7 days
    tasks.forEach(t => {
      if (!t.completed && t.dueDate && dateSet.has(t.dueDate)) {
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

    // Events in next 7 days
    events.forEach(e => {
      if (dateSet.has(e.date)) {
        items.push({
          id: e.id,
          title: e.title,
          date: e.date,
          type: 'event',
          color: e.color || '#F97316',
          time: e.startTime,
        });
      }
    });

    // Sort chronologically
    return items.sort((a, b) => a.date.localeCompare(b.date));
  }, [events, now, pages, tasks]);

  // 7. Weekly Progress
  // Monday to Sunday of the current week
  const weekProgressData = useMemo(() => {
    // Determine start of week
    const current = new Date(now);
    const day = current.getDay();
    // Monday as start (or based on settings)
    const diffToMonday = current.getDate() - (day === 0 ? 6 : day - 1);
    const monday = new Date(current.setDate(diffToMonday));

    const weekDates: { dateStr: string; dayOfWeek: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dStr = formatLocalDate(d);
      const dow = (d.getDay() + 6) % 7 + 1;
      weekDates.push({ dateStr: dStr, dayOfWeek: dow });
    }

    const weekDateSet = new Set(weekDates.map(w => w.dateStr));

    // Tasks due this week & completed this week
    const weekTasks = tasks.filter(t => t.dueDate && weekDateSet.has(t.dueDate));
    const tasksDueThisWeek = weekTasks.length;
    const tasksCompletedThisWeek = weekTasks.filter(t => t.completed).length;

    // Habit occurrences this week
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

    // Events this week
    const eventsThisWeek = events.filter(e => weekDateSet.has(e.date)).length;

    // Formula from Section 5.5:
    // (tasks completed this week + habit completions this week) / (tasks due this week + habit occurrences this week) * 100
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
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-txt-primary tracking-tight">
            {greeting}, {settings.displayName || 'Friend'} 👋
          </h1>
          <p className="text-xs text-txt-muted mt-0.5">
            Here's your day at a glance.
          </p>
        </div>
      </div>

      {/* 4 Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Tasks Card */}
        <div 
          onClick={() => setActiveSection('todo')}
          className="bg-bg-card border border-border hover:border-primary/50 shadow-card rounded-2xl p-4 transition-all duration-150 cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-txt-secondary group-hover:text-primary transition-colors">
              Tasks
            </span>
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-primary">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-txt-primary">
            {tasksDueTodayCompleted} / {tasksDueToday.length}
          </div>
          <div className="text-[11px] text-txt-muted mt-0.5">
            {tasksDueToday.length === 0 ? 'No tasks due today' : 'Due today'}
          </div>
        </div>

        {/* Habits Card */}
        <div 
          onClick={() => setActiveSection('habits')}
          className="bg-bg-card border border-border hover:border-teal-500/50 shadow-card rounded-2xl p-4 transition-all duration-150 cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-txt-secondary group-hover:text-teal-600 transition-colors">
              Habits
            </span>
            <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-txt-primary">
            {habitsCompletedToday} / {habitsScheduledToday.length}
          </div>
          <div className="text-[11px] text-txt-muted mt-0.5">
            {habitsScheduledToday.length === 0 ? 'None scheduled' : 'Scheduled today'}
          </div>
        </div>

        {/* Events Card */}
        <div 
          onClick={() => setActiveSection('calendar')}
          className="bg-bg-card border border-border hover:border-orange-500/50 shadow-card rounded-2xl p-4 transition-all duration-150 cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-txt-secondary group-hover:text-orange-500 transition-colors">
              Events
            </span>
            <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-500">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-txt-primary">
            {eventsToday.length}
          </div>
          <div className="text-[11px] text-txt-muted mt-0.5">
            {eventsToday.length === 1 ? '1 Event today' : `${eventsToday.length} Events today`}
          </div>
        </div>

        {/* Pages Card */}
        <div 
          onClick={() => setActiveSection('todo')}
          className="bg-bg-card border border-border hover:border-purple-500/50 shadow-card rounded-2xl p-4 transition-all duration-150 cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-txt-secondary group-hover:text-purple-600 transition-colors">
              Pages
            </span>
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-txt-primary">
            {activePagesCount}
          </div>
          <div className="text-[11px] text-txt-muted mt-0.5">
            Active Pages
          </div>
        </div>
      </div>

      {/* Middle row: Today's Tasks & Habit Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Tasks (Section 5.2) */}
        <div className="bg-bg-card border border-border shadow-card rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-txt-primary">Today's Tasks</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-bg-subtle text-txt-muted font-medium">
                  {todaysTasksCandidates.length}
                </span>
              </div>
              <button
                onClick={() => setShowInlineAdd(!showInlineAdd)}
                className="px-2.5 py-1 text-xs font-semibold text-primary bg-primary-light hover:bg-bg-hover rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Task</span>
              </button>
            </div>

            {/* Inline Add Task Form */}
            {showInlineAdd && (
              <form onSubmit={handleInlineAddTask} className="mb-3 p-3 bg-bg-subtle border border-border rounded-xl space-y-2">
                <input
                  type="text"
                  autoFocus
                  placeholder="Task title..."
                  value={inlineTaskTitle}
                  onChange={e => setInlineTaskTitle(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-bg-card border border-border rounded-lg text-txt-primary outline-hidden focus:border-primary"
                />
                <div className="flex items-center justify-between gap-2">
                  <select
                    value={inlineTaskPageId || activePages[0]?.id || ''}
                    onChange={e => setInlineTaskPageId(e.target.value)}
                    className="px-2 py-1 text-xs bg-bg-card border border-border rounded-lg text-txt-primary outline-hidden"
                  >
                    {activePages.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setShowInlineAdd(false)}
                      className="px-2.5 py-1 text-xs text-txt-muted hover:text-txt-primary rounded"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 text-xs font-semibold text-white bg-primary rounded-lg hover:bg-primary-hover"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Top 3 tasks */}
            <div className="space-y-2">
              {top3TodaysTasks.length === 0 ? (
                <div className="py-8 text-center text-xs text-txt-muted">
                  No pending tasks due today or overdue. You're all caught up!
                </div>
              ) : (
                top3TodaysTasks.map(task => {
                  const isOverdue = !!task.dueDate && task.dueDate < todayStr;
                  const page = pages.find(p => p.id === task.pageId);

                  return (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-bg-subtle/50 hover:bg-bg-subtle border border-border transition-colors group"
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden flex-1">
                        <button
                          onClick={() => toggleTaskCompleted(task.id)}
                          className="text-txt-muted hover:text-primary transition-colors flex-shrink-0 cursor-pointer"
                        >
                          <Square className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => navigateToTask(task.pageId, task.id)}
                          className="text-xs font-medium text-txt-primary group-hover:text-primary truncate text-left transition-colors"
                        >
                          {task.title}
                        </button>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isOverdue && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                            Overdue
                          </span>
                        )}
                        {task.priority === 'high' && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                            High
                          </span>
                        )}
                        {task.priority === 'medium' && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                            Medium
                          </span>
                        )}
                        {page && (
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: page.color }}
                            title={page.name}
                          />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs">
            <span className="text-txt-muted">
              {todaysTasksCandidates.length > 3
                ? `Showing top 3 of ${todaysTasksCandidates.length} items`
                : `${todaysTasksCandidates.length} total pending`}
            </span>
            <button
              onClick={() => setActiveSection('todo')}
              className="text-primary font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Habit Summary (Section 5.3) */}
        <div className="bg-bg-card border border-border shadow-card rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-txt-primary">Habit Summary</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-bg-subtle text-txt-muted font-medium">
                  {habitsScheduledToday.length}
                </span>
              </div>
              <button
                onClick={() => setIsHabitModalOpen(true)}
                className="p-1 rounded-lg text-teal-600 bg-teal-500/10 hover:bg-teal-500/20 transition-colors cursor-pointer"
                title="Add Habit"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              {habitsScheduledToday.length === 0 ? (
                <div className="py-8 text-center text-xs text-txt-muted">
                  No habits scheduled today.
                </div>
              ) : (
                habitsScheduledToday.map(habit => {
                  const isChecked = !!habitLogs.find(
                    l => l.habitId === habit.id && l.date === todayStr && l.completed
                  );

                  return (
                    <div
                      key={habit.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-bg-subtle/50 hover:bg-bg-subtle border border-border transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs shadow-2xs"
                          style={{ backgroundColor: habit.color }}
                        >
                          <IconRenderer name={habit.icon} className="w-3.5 h-3.5" />
                        </div>
                        <span className={`text-xs font-semibold ${isChecked ? 'text-txt-primary' : 'text-txt-secondary'}`}>
                          {habit.name}
                        </span>
                      </div>

                      <button
                        onClick={() => toggleHabitLog(habit.id, todayStr)}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                          isChecked
                            ? 'bg-teal-500 text-white shadow-xs'
                            : 'border border-border bg-bg-card hover:bg-bg-hover text-transparent'
                        }`}
                        title={isChecked ? 'Mark incomplete' : 'Mark completed'}
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs">
            <span className="text-txt-muted">
              {habitsScheduledToday.length > 0
                ? `${habitsCompletedToday} / ${habitsScheduledToday.length} · ${Math.round(
                    (habitsCompletedToday / habitsScheduledToday.length) * 100
                  )}%`
                : '0 / 0 · 0%'}
            </span>
            <button
              onClick={() => setActiveSection('habits')}
              className="text-teal-600 dark:text-teal-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Habit Tracker</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom row: Upcoming (Next 7 days) & Weekly Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming (Section 5.4) */}
        <div className="bg-bg-card border border-border shadow-card rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="text-base font-bold text-txt-primary">Upcoming (Next 7 Days)</span>
              </div>
              <span className="text-xs text-txt-muted">
                {next7DaysItems.length} items
              </span>
            </div>

            <div className="space-y-2">
              {next7DaysItems.length === 0 ? (
                <div className="py-8 text-center text-xs text-txt-muted">
                  No tasks or events scheduled in the next 7 days.
                </div>
              ) : (
                next7DaysItems.slice(0, 6).map(item => (
                  <div
                    key={`${item.type}-${item.id}`}
                    onClick={() => {
                      if (item.type === 'task' && item.pageId) {
                        navigateToTask(item.pageId, item.id);
                      } else {
                        setActiveSection('calendar');
                      }
                    }}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-bg-subtle/50 hover:bg-bg-subtle border border-border transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-bg-card border border-border text-txt-secondary flex-shrink-0">
                        {item.date}
                      </span>
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-xs font-medium text-txt-primary group-hover:text-primary truncate">
                        {item.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 text-xs text-txt-muted">
                      {item.time && <span>{item.time}</span>}
                      <span className="text-[10px] uppercase font-semibold text-txt-muted">
                        {item.type}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs">
            <span className="text-txt-muted">
              {next7DaysItems.length > 6 ? `+${next7DaysItems.length - 6} more` : 'Next 7 days'}
            </span>
            <button
              onClick={() => setActiveSection('calendar')}
              className="text-primary font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Open Calendar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Weekly Progress (Section 5.5) */}
        <div className="bg-bg-card border border-border shadow-card rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-base font-bold text-txt-primary">Weekly Progress</span>
              <span className="text-xs text-txt-muted font-medium">Mon – Sun</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-2">
              {/* Circular Progress Ring */}
              <div className="relative w-32 h-32 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    className="stroke-bg-subtle"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#4285F4"
                    strokeWidth="8"
                    strokeDasharray={251.2}
                    strokeDashoffset={251.2 - (251.2 * weekProgressData.overallPercent) / 100}
                    strokeLinecap="round"
                    fill="transparent"
                    className="transition-all duration-500 ease-out"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-2xl font-bold text-txt-primary">
                    {weekProgressData.overallPercent}%
                  </span>
                  <span className="text-[10px] text-txt-muted font-medium uppercase">
                    Done
                  </span>
                </div>
              </div>

              {/* Legend with breakdown */}
              <div className="space-y-3 flex-1 max-w-xs">
                <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-bg-subtle border border-border-subtle">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <span className="font-medium text-txt-secondary">Tasks</span>
                  </div>
                  <span className="font-bold text-txt-primary">
                    {weekProgressData.tasksCompletedThisWeek} / {weekProgressData.tasksDueThisWeek}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-bg-subtle border border-border-subtle">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                    <span className="font-medium text-txt-secondary">Habits</span>
                  </div>
                  <span className="font-bold text-txt-primary">
                    {weekProgressData.habitCompletionsThisWeek} / {weekProgressData.habitOccurrencesThisWeek}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-bg-subtle border border-border-subtle">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                    <span className="font-medium text-txt-secondary">Events</span>
                  </div>
                  <span className="font-bold text-txt-primary">
                    {weekProgressData.eventsThisWeek}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border text-[11px] text-txt-muted text-center sm:text-left">
            Formula: (Tasks completed + Habits completed) ÷ (Tasks due + Habits scheduled)
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

