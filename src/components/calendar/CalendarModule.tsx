import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../../context/WorkspaceContext';
import { formatLocalDate } from '../../db/indexedDB';
import { CalendarView, CalendarEvent } from '../../types';
import { MonthView } from './MonthView';
import { WeekView } from './WeekView';
import { DayView } from './DayView';
import { EventModal } from './EventModal';
import { DayColorPickerModal } from './DayColorPickerModal';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus,
  Settings
} from 'lucide-react';
import { motion } from 'framer-motion';

export const CalendarModule: React.FC = () => {
  const { pages, habits, settings } = useWorkspace();
  const navigate = useNavigate();

  const [currentView, setCurrentView] = useState<CalendarView>(() => {
    return (settings?.modules?.calendar?.defaultView as CalendarView) || 'month';
  });
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(formatLocalDate(new Date()));

  // Visibility Toggles
  const [showTodos, setShowTodos] = useState(true);
  const [showHabits, setShowHabits] = useState(true);
  const [showEvents, setShowEvents] = useState(true);
  const [showCompleted, setShowCompleted] = useState(() => {
    return settings?.modules?.calendar?.showCompletedTasks ?? true;
  });

  // Modals
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<CalendarEvent | null>(null);
  const [eventDefaultDate, setEventDefaultDate] = useState<string>(formatLocalDate(new Date()));
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [colorPickerDate, setColorPickerDate] = useState<string>(formatLocalDate(new Date()));

  // Navigation handlers
  const handlePrev = () => {
    const next = new Date(currentDate);
    if (currentView === 'month') {
      next.setMonth(next.getMonth() - 1);
    } else if (currentView === 'week') {
      next.setDate(next.getDate() - 7);
    } else if (currentView === 'day') {
      next.setDate(next.getDate() - 1);
      setSelectedDateStr(formatLocalDate(next));
    }
    setCurrentDate(next);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (currentView === 'month') {
      next.setMonth(next.getMonth() + 1);
    } else if (currentView === 'week') {
      next.setDate(next.getDate() + 7);
    } else if (currentView === 'day') {
      next.setDate(next.getDate() + 1);
      setSelectedDateStr(formatLocalDate(next));
    }
    setCurrentDate(next);
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDateStr(formatLocalDate(now));
  };

  const openCreateEventForDate = (dateStr: string) => {
    setEventToEdit(null);
    setEventDefaultDate(dateStr);
    setIsEventModalOpen(true);
  };

  const openEditEvent = (event: CalendarEvent) => {
    setEventToEdit(event);
    setEventDefaultDate(event.date);
    setIsEventModalOpen(true);
  };

  const openDayColorPicker = (dateStr: string) => {
    setColorPickerDate(dateStr);
    setIsColorPickerOpen(true);
  };

  const openDayView = (dateStr: string) => {
    setSelectedDateStr(dateStr);
    setCurrentDate(new Date(dateStr));
    setCurrentView('day');
  };

  // Header Title
  const monthYearTitle = currentDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-7">
      {/* Top Calendar Control Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-border-subtle">
        {/* Navigation & Month Title */}
        <div className="flex items-center gap-3.5">
          <div className="flex items-center gap-1 bg-bg-card border border-border rounded-xl p-1 shadow-2xs">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handlePrev}
              className="w-9 h-9 rounded-lg hover:bg-bg-hover text-txt-secondary hover:text-txt-primary flex items-center justify-center transition-colors cursor-pointer"
              title="Previous"
              aria-label="Previous period"
            >
              <ChevronLeft className="w-5 h-5" />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleToday}
              className="h-9 px-3.5 text-xs font-sans font-bold text-txt-primary hover:bg-bg-hover rounded-lg transition-colors cursor-pointer"
            >
              Today
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleNext}
              className="w-9 h-9 rounded-lg hover:bg-bg-hover text-txt-secondary hover:text-txt-primary flex items-center justify-center transition-colors cursor-pointer"
              title="Next"
              aria-label="Next period"
            >
              <ChevronRight className="w-5 h-5" />
            </motion.button>
          </div>

          <h1 className="text-[26px] sm:text-[28px] font-bold text-txt-primary tracking-tight">
            {monthYearTitle}
          </h1>
        </div>

        {/* View Switcher, Toggles & Add Event */}
        <div className="flex flex-wrap items-center gap-3">
          {/* View selector: Month, Week, Day with sliding spring pill */}
          <div className="flex items-center h-10 bg-bg-card border border-border rounded-xl p-1 shadow-2xs relative">
            {(['month', 'week', 'day'] as CalendarView[]).map(v => {
              const isSelected = currentView === v;
              return (
                <button
                  key={v}
                  onClick={() => setCurrentView(v)}
                  className={`relative h-8 px-4 text-xs font-sans font-bold rounded-lg capitalize transition-colors cursor-pointer z-10 ${
                    isSelected ? 'text-white font-bold' : 'text-txt-secondary hover:text-txt-primary'
                  }`}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="calendarViewPill"
                      className="absolute inset-0 bg-primary rounded-lg -z-10 shadow-xs"
                      transition={{ type: "spring", stiffness: 450, damping: 35 }}
                    />
                  )}
                  <span>{v}</span>
                </button>
              );
            })}
          </div>

          {/* Activity Category Toggles */}
          <div className="hidden sm:flex items-center h-10 gap-1.5 bg-bg-card border border-border rounded-xl px-2 text-xs font-sans shadow-2xs">
            <button
              onClick={() => setShowTodos(!showTodos)}
              className={`h-8 px-2.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                showTodos ? 'bg-blue-500/10 text-primary font-bold' : 'text-txt-muted hover:text-txt-primary'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span>To-Do</span>
            </button>

            <button
              onClick={() => setShowHabits(!showHabits)}
              className={`h-8 px-2.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                showHabits ? 'bg-teal-500/10 text-teal-700 dark:text-teal-400 font-bold' : 'text-txt-muted hover:text-txt-primary'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
              <span>Habits</span>
            </button>

            <button
              onClick={() => setShowEvents(!showEvents)}
              className={`h-8 px-2.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                showEvents ? 'bg-primary/20 text-txt-primary font-bold' : 'text-txt-muted hover:text-txt-primary'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-primary" />
              <span>Events</span>
            </button>

            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className={`h-8 px-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                showCompleted ? 'text-txt-primary' : 'text-txt-muted line-through'
              }`}
              title="Toggle show completed"
            >
              Done
            </button>
          </div>

          {/* Add Event Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
            onClick={() => openCreateEventForDate(selectedDateStr)}
            className="h-10 px-4 text-xs font-sans font-bold text-white bg-primary hover:bg-primary-hover rounded-xl flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Event</span>
          </motion.button>

          {/* Module Settings Shortcut */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/settings?tab=calendar')}
            className="h-10 w-10 bg-bg-card border border-border hover:bg-bg-hover text-txt-secondary hover:text-txt-primary rounded-xl flex items-center justify-center shadow-2xs transition-colors cursor-pointer"
            title="Calendar Settings"
            aria-label="Calendar Settings"
          >
            <Settings className="w-4 h-4" />
          </motion.button>
        </div>
      </div>

      {/* Main Calendar View */}
      {currentView === 'month' && (
        <MonthView
          currentDate={currentDate}
          selectedDate={selectedDateStr}
          onSelectDate={dStr => setSelectedDateStr(dStr)}
          onOpenDayView={openDayView}
          onOpenCreateEvent={openCreateEventForDate}
          onOpenEditEvent={openEditEvent}
          onOpenDayColorPicker={openDayColorPicker}
          showTodos={showTodos}
          showHabits={showHabits}
          showEvents={showEvents}
          showCompleted={showCompleted}
        />
      )}

      {currentView === 'week' && (
        <WeekView
          currentDate={currentDate}
          onSelectDate={dStr => setSelectedDateStr(dStr)}
          onOpenDayView={openDayView}
          onOpenCreateEvent={openCreateEventForDate}
          onOpenEditEvent={openEditEvent}
          onOpenDayColorPicker={openDayColorPicker}
          showTodos={showTodos}
          showHabits={showHabits}
          showEvents={showEvents}
          showCompleted={showCompleted}
        />
      )}

      {currentView === 'day' && (
        <DayView
          dateStr={selectedDateStr}
          onBackToMonth={() => setCurrentView('month')}
          onOpenCreateEvent={openCreateEventForDate}
          onOpenEditEvent={openEditEvent}
          onOpenDayColorPicker={openDayColorPicker}
          showTodos={showTodos}
          showHabits={showHabits}
          showEvents={showEvents}
          showCompleted={showCompleted}
        />
      )}

      {/* Category Legend & Colors Panel */}
      <div className="bg-bg-card border border-border rounded-2xl p-4 shadow-card flex flex-wrap items-center justify-between gap-4 text-xs font-sans">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-txt-secondary uppercase tracking-wider text-[11px]">Pages:</span>
            <div className="flex flex-wrap items-center gap-2">
              {pages.map(p => (
                <span key={p.id} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-bg-subtle text-txt-primary border border-border">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                  <span>{p.name}</span>
                </span>
              ))}
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 border-l border-border pl-4">
            <span className="font-bold text-txt-secondary uppercase tracking-wider text-[11px]">Types:</span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-bg-subtle text-txt-primary border border-border">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span>Tasks</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-bg-subtle text-txt-primary border border-border">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
              <span>Habits</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-bg-subtle text-txt-primary border border-border">
              <span className="w-2.5 h-2.5 rounded-full bg-primary" />
              <span>Events</span>
            </span>
          </div>
        </div>

        <div className="text-txt-muted text-[11px] font-medium">
          Tip: Click date to view day details, or hover to set custom day background color.
        </div>
      </div>

      {/* Event Modal */}
      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => {
          setIsEventModalOpen(false);
          setEventToEdit(null);
        }}
        eventToEdit={eventToEdit}
        defaultDate={eventDefaultDate}
      />

      {/* Day Background Color Picker */}
      <DayColorPickerModal
        isOpen={isColorPickerOpen}
        onClose={() => setIsColorPickerOpen(false)}
        dateStr={colorPickerDate}
      />
    </div>
  );
};
