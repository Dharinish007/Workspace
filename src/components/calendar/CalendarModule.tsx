import React, { useState } from 'react';
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
  Calendar as CalendarIcon, 
  Plus, 
  Eye, 
  EyeOff, 
  Check, 
  Palette,
  Edit2
} from 'lucide-react';

export const CalendarModule: React.FC = () => {
  const { pages, habits, events } = useWorkspace();

  const [currentView, setCurrentView] = useState<CalendarView>('month');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(formatLocalDate(new Date()));

  // Visibility Toggles (Section 7.6)
  const [showTodos, setShowTodos] = useState(true);
  const [showHabits, setShowHabits] = useState(true);
  const [showEvents, setShowEvents] = useState(true);
  const [showCompleted, setShowCompleted] = useState(true);

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
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Calendar Control Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Navigation & Month Title */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-bg-card border border-border rounded-xl p-1 shadow-xs">
            <button
              onClick={handlePrev}
              className="p-1.5 rounded-lg hover:bg-bg-hover text-txt-secondary hover:text-txt-primary transition-colors cursor-pointer"
              title="Previous"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-1 text-xs font-bold text-txt-primary hover:bg-bg-hover rounded-lg transition-colors cursor-pointer"
            >
              Today
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 rounded-lg hover:bg-bg-hover text-txt-secondary hover:text-txt-primary transition-colors cursor-pointer"
              title="Next"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-txt-primary tracking-tight">
            {monthYearTitle}
          </h1>
        </div>

        {/* View Switcher, Toggles & Add Event */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* View selector: Month, Week, Day */}
          <div className="flex items-center bg-bg-card border border-border rounded-xl p-1 shadow-xs">
            {(['month', 'week', 'day'] as CalendarView[]).map(v => (
              <button
                key={v}
                onClick={() => setCurrentView(v)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all cursor-pointer ${
                  currentView === v
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-txt-secondary hover:text-txt-primary hover:bg-bg-hover'
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Activity Category Toggles (Section 7.6) */}
          <div className="hidden sm:flex items-center gap-1.5 bg-bg-card border border-border rounded-xl p-1 text-xs shadow-xs">
            <button
              onClick={() => setShowTodos(!showTodos)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1 cursor-pointer ${
                showTodos ? 'bg-blue-500/10 text-primary font-semibold' : 'text-txt-muted hover:text-txt-primary'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span>To-Do</span>
            </button>

            <button
              onClick={() => setShowHabits(!showHabits)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1 cursor-pointer ${
                showHabits ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400 font-semibold' : 'text-txt-muted hover:text-txt-primary'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-teal-500" />
              <span>Habits</span>
            </button>

            <button
              onClick={() => setShowEvents(!showEvents)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1 cursor-pointer ${
                showEvents ? 'bg-orange-500/10 text-orange-500 font-semibold' : 'text-txt-muted hover:text-txt-primary'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-orange-500" />
              <span>Events</span>
            </button>

            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                showCompleted ? 'text-txt-primary' : 'text-txt-muted line-through'
              }`}
              title="Toggle show completed"
            >
              Done
            </button>
          </div>

          {/* Add Event Button */}
          <button
            onClick={() => openCreateEventForDate(selectedDateStr)}
            className="px-4 py-2 text-xs font-semibold text-white bg-primary hover:bg-primary-hover rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Event</span>
          </button>
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

      {/* Category Legend & Colors Panel (README Section 7.4) */}
      <div className="bg-bg-card border border-border rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-bold text-txt-primary uppercase tracking-wider text-[11px]">
            Categories & Colors:
          </span>

          {pages.filter(p => !p.archived).map(page => (
            <div key={page.id} className="flex items-center gap-1.5">
              <span
                className="w-3 h-3 rounded-md shadow-2xs"
                style={{ backgroundColor: page.color }}
              />
              <span className="text-txt-secondary">{page.name}</span>
            </div>
          ))}

          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-teal-500 shadow-2xs" />
            <span className="text-txt-secondary">Habits (Teal)</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-orange-500 shadow-2xs" />
            <span className="text-txt-secondary">Events / Meetings</span>
          </div>
        </div>

        <div className="text-txt-muted text-[11px]">
          Tip: Hover over any day box and click 🎨 to set custom day background colors.
        </div>
      </div>

      {/* Modals */}
      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => {
          setIsEventModalOpen(false);
          setEventToEdit(null);
        }}
        eventToEdit={eventToEdit}
        defaultDate={eventDefaultDate}
      />

      <DayColorPickerModal
        isOpen={isColorPickerOpen}
        onClose={() => setIsColorPickerOpen(false)}
        dateStr={colorPickerDate}
      />
    </div>
  );
};

