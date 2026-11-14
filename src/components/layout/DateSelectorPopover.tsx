import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../../context/WorkspaceContext';
import { formatLocalDate } from '../../db/indexedDB';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface DateSelectorPopoverProps {
  isCollapsed?: boolean;
  onNavigate?: () => void;
}

export const DateSelectorPopover: React.FC<DateSelectorPopoverProps> = ({
  isCollapsed = false,
  onNavigate,
}) => {
  const { selectedDate, setSelectedDate } = useWorkspace();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Parse current selectedDate into Year/Month/Day
  const todayStr = useMemo(() => formatLocalDate(new Date()), []);
  const activeDateObj = useMemo(() => {
    try {
      if (selectedDate) {
        const [y, m, d] = selectedDate.split('-').map(Number);
        return new Date(y, m - 1, d);
      }
    } catch {}
    return new Date();
  }, [selectedDate]);

  // Calendar View Month/Year navigation state for expanded mode
  const [viewYear, setViewYear] = useState(activeDateObj.getFullYear());
  const [viewMonth, setViewMonth] = useState(activeDateObj.getMonth());

  // Keep view in sync when selectedDate changes externally
  useEffect(() => {
    setViewYear(activeDateObj.getFullYear());
    setViewMonth(activeDateObj.getMonth());
  }, [selectedDate, activeDateObj]);

  // Close on outside click or Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Navigation handlers for month view in expanded mode
  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(prev => prev - 1);
    } else {
      setViewMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(prev => prev + 1);
    } else {
      setViewMonth(prev => prev + 1);
    }
  };

  const handleSelectDate = (dateStr: string) => {
    setSelectedDate(dateStr);
    setIsOpen(false);
  };

  const handleSetToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    const today = new Date();
    setSelectedDate(formatLocalDate(today));
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setIsOpen(false);
  };

  const handleGoToCalendar = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
    navigate('/calendar');
    onNavigate?.();
  };

  // Month title, e.g. "November 2026"
  const monthTitle = useMemo(() => {
    const d = new Date(viewYear, viewMonth, 1);
    return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(d);
  }, [viewYear, viewMonth]);

  // Human-readable formatted selected date for the trigger button
  const triggerFormattedDate = useMemo(() => {
    if (!selectedDate) return 'Select Date';
    if (selectedDate === todayStr) {
      const d = new Date();
      return `Today, ${new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(d)}`;
    }
    const [y, m, d] = selectedDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
  }, [selectedDate, todayStr]);

  // Full formatted date strings for display in collapsed card
  const todayWeekday = useMemo(() => {
    return new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date());
  }, []);

  const todayFullDate = useMemo(() => {
    return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date());
  }, []);

  // Generate calendar grid days for expanded mode
  const calendarGrid = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
    const startDayIndex = firstDayOfMonth.getDay(); // 0 = Sun
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const days: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
    }> = [];

    // Prev month padding
    for (let i = startDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevDate = new Date(viewYear, viewMonth - 1, dayNum);
      const str = formatLocalDate(prevDate);
      days.push({
        dateStr: str,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: str === todayStr,
        isSelected: str === selectedDate,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const curDate = new Date(viewYear, viewMonth, d);
      const str = formatLocalDate(curDate);
      days.push({
        dateStr: str,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: str === todayStr,
        isSelected: str === selectedDate,
      });
    }

    // Next month padding to fill complete rows of 7
    const remaining = (7 - (days.length % 7)) % 7;
    for (let next = 1; next <= remaining; next++) {
      const nextDate = new Date(viewYear, viewMonth + 1, next);
      const str = formatLocalDate(nextDate);
      days.push({
        dateStr: str,
        dayNumber: next,
        isCurrentMonth: false,
        isToday: str === todayStr,
        isSelected: str === selectedDate,
      });
    }

    return days;
  }, [viewYear, viewMonth, selectedDate, todayStr]);

  const weekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger Button */}
      {isCollapsed ? (
        <button
          type="button"
          onClick={() => setIsOpen(prev => !prev)}
          title={`Date: ${triggerFormattedDate}`}
          aria-label={`View current date: ${triggerFormattedDate}`}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          className={`w-full h-10 rounded-xl flex items-center justify-center transition-colors cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
            isOpen
              ? 'bg-primary/10 text-primary'
              : 'text-txt-secondary hover:text-txt-primary hover:bg-bg-hover'
          }`}
        >
          <CalendarIcon className="w-4 h-4 shrink-0 transition-colors group-hover:text-primary" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(prev => !prev)}
          aria-label={`Select date. Currently ${triggerFormattedDate}`}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          className={`w-full flex items-center justify-between px-3 h-10 rounded-xl text-xs font-medium transition-colors cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
            isOpen
              ? 'bg-primary/10 text-primary font-semibold'
              : 'text-txt-secondary hover:text-txt-primary hover:bg-bg-hover'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <CalendarIcon className="w-4 h-4 shrink-0 text-txt-secondary group-hover:text-primary transition-colors" />
            <span className="truncate">{triggerFormattedDate}</span>
          </div>
          <span className="text-[10px] uppercase font-semibold tracking-wider text-txt-muted px-1.5 py-0.5 rounded bg-bg-main border border-border/80 shrink-0">
            {selectedDate === todayStr ? 'Today' : 'Date'}
          </span>
        </button>
      )}

      {/* Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: isCollapsed ? 0 : 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: isCollapsed ? 0 : 6 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            role="dialog"
            aria-label={isCollapsed ? "Current date display" : "Date selector calendar"}
            className={`absolute z-50 p-3 bg-bg-card border border-border rounded-2xl shadow-modal backdrop-blur-md select-none ${
              isCollapsed
                ? 'left-full ml-3 bottom-0 w-56'
                : 'bottom-full mb-2 left-0 w-72'
            }`}
          >
            {isCollapsed ? (
              /* Collapsed Mode: Shows the date alone (read-only date view, no date switching) */
              <div className="space-y-2">
                <div className="flex items-center gap-2 pb-2 border-b border-border/60">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <CalendarIcon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold text-txt-muted uppercase tracking-wider">
                      Current Date
                    </div>
                    <div className="text-xs font-bold text-txt-primary truncate">
                      {todayWeekday}
                    </div>
                  </div>
                </div>

                <div className="py-1">
                  <div className="text-sm font-semibold text-txt-primary leading-tight">
                    {todayFullDate}
                  </div>
                  <div className="text-[11px] text-txt-muted mt-1 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                    <span>Today</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/80">
                  <button
                    type="button"
                    onClick={handleGoToCalendar}
                    className="w-full py-1.5 px-2 rounded-xl text-xs font-medium text-primary hover:bg-primary/10 transition-colors text-center cursor-pointer"
                  >
                    Open Calendar →
                  </button>
                </div>
              </div>
            ) : (
              /* Expanded Mode: Full Interactive Month Calendar Grid */
              <>
                {/* Popover Header: Month & Navigation */}
                <div className="flex items-center justify-between mb-3 px-1">
                  <span className="text-sm font-semibold text-txt-primary font-serif">
                    {monthTitle}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handlePrevMonth}
                      aria-label="Previous month"
                      className="w-7 h-7 rounded-lg hover:bg-bg-hover text-txt-secondary hover:text-txt-primary flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleNextMonth}
                      aria-label="Next month"
                      className="w-7 h-7 rounded-lg hover:bg-bg-hover text-txt-secondary hover:text-txt-primary flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Weekday Row */}
                <div className="grid grid-cols-7 gap-1 text-center mb-1">
                  {weekdays.map(day => (
                    <span key={day} className="text-[11px] font-semibold text-txt-muted">
                      {day}
                    </span>
                  ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1 text-center">
                  {calendarGrid.map((cell) => {
                    const isSelected = cell.isSelected;
                    const isToday = cell.isToday;
                    const isCurrent = cell.isCurrentMonth;

                    return (
                      <button
                        key={cell.dateStr}
                        type="button"
                        onClick={() => handleSelectDate(cell.dateStr)}
                        className={`h-8 w-8 mx-auto rounded-lg text-xs flex items-center justify-center transition-colors cursor-pointer relative ${
                          isSelected
                            ? 'bg-primary text-white font-bold shadow-2xs'
                            : isToday
                            ? 'bg-primary/10 text-primary font-bold border border-primary/30'
                            : isCurrent
                            ? 'text-txt-primary hover:bg-bg-hover font-medium'
                            : 'text-txt-muted/50 hover:bg-bg-hover'
                        }`}
                      >
                        {cell.dayNumber}
                      </button>
                    );
                  })}
                </div>

                {/* Popover Footer: Today & View Calendar */}
                <div className="mt-3 pt-2.5 border-t border-border/80 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={handleSetToday}
                    className="px-2.5 py-1 rounded-lg text-primary hover:bg-primary/10 font-medium transition-colors cursor-pointer"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={handleGoToCalendar}
                    className="px-2.5 py-1 rounded-lg text-txt-secondary hover:text-txt-primary hover:bg-bg-hover font-medium transition-colors cursor-pointer"
                  >
                    Open Calendar →
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
