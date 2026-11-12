import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../../context/WorkspaceContext';
import { JournalMood } from '../../types';
import { formatLocalDate } from '../../db/indexedDB';
import { 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  ChevronDown, 
  Calendar,
  PenLine,
  Award,
  BookOpen,
  Frown,
  Meh,
  Smile,
  Laugh,
  Trash2,
  Edit2,
  Settings
} from 'lucide-react';
import { motion } from 'framer-motion';

const MOOD_ICONS: Record<JournalMood, React.ComponentType<{ className?: string }>> = {
  terrible: Frown,
  bad: Frown,
  neutral: Meh,
  good: Smile,
  great: Laugh,
};

const MOOD_LABELS: Record<JournalMood, string> = {
  terrible: 'Terrible',
  bad: 'Low',
  neutral: 'Neutral',
  good: 'Good',
  great: 'Great',
};

const MOOD_BG: Record<JournalMood, string> = {
  terrible: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  bad: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  neutral: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20',
  good: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  great: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
};

interface JournalListProps {
  onOpenDate: (date: string) => void;
}

export const JournalList: React.FC<JournalListProps> = ({ onOpenDate }) => {
  const { journalEntries, deleteJournalEntry, settings } = useWorkspace();
  const navigate = useNavigate();

  // Search query & sort order
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  // Mini calendar month navigation state
  const [currentCalendarDate, setCurrentCalendarDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => formatLocalDate(new Date()));

  // Today date string (YYYY-MM-DD)
  const todayDateStr = useMemo(() => formatLocalDate(new Date()), []);

  // Filtered & sorted journal entries (search matches title and body)
  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = [...journalEntries];

    if (q) {
      list = list.filter(item => {
        const titleMatch = item.title ? item.title.toLowerCase().includes(q) : false;
        const bodyMatch = item.body ? item.body.toLowerCase().includes(q) : false;
        const tagMatch = item.tags ? item.tags.some(t => t.toLowerCase().includes(q)) : false;
        return titleMatch || bodyMatch || tagMatch;
      });
    }

    list.sort((a, b) => {
      if (sortOrder === 'newest') {
        return b.date.localeCompare(a.date);
      }
      return a.date.localeCompare(b.date);
    });

    return list;
  }, [journalEntries, searchQuery, sortOrder]);

  // Set of dates that have entries for O(1) mini calendar lookup
  const entryDateSet = useMemo(() => {
    return new Set(journalEntries.map(e => e.date));
  }, [journalEntries]);

  // Calendar calculations for current calendar month
  const calYear = currentCalendarDate.getFullYear();
  const calMonth = currentCalendarDate.getMonth(); // 0-based

  const monthName = useMemo(() => {
    return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(currentCalendarDate);
  }, [currentCalendarDate]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(calYear, calMonth, 1).getDay(); // 0 = Sun, ..., 6 = Sat
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const days: ({ day: number; dateStr: string; isCurrentMonth: boolean })[] = [];

    // Blank cells before first day
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ day: 0, dateStr: '', isCurrentMonth: false });
    }

    // Days in current month
    for (let d = 1; d <= daysInMonth; d++) {
      const monthStr = String(calMonth + 1).padStart(2, '0');
      const dayStr = String(d).padStart(2, '0');
      const dateStr = `${calYear}-${monthStr}-${dayStr}`;
      days.push({ day: d, dateStr, isCurrentMonth: true });
    }

    return days;
  }, [calYear, calMonth]);

  // "This Month" counts only: entries, active days, total (no streak stat!)
  const monthStats = useMemo(() => {
    const monthPrefix = `${calYear}-${String(calMonth + 1).padStart(2, '0')}`;
    const thisMonthEntries = journalEntries.filter(e => e.date.startsWith(monthPrefix));
    const activeDays = new Set(thisMonthEntries.map(e => e.date)).size;

    return {
      entriesCount: thisMonthEntries.length,
      activeDaysCount: activeDays,
      totalEntriesCount: journalEntries.length
    };
  }, [journalEntries, calYear, calMonth]);

  // Selected date entry check
  const selectedDateEntry = useMemo(() => {
    return journalEntries.find(e => e.date === selectedDate);
  }, [journalEntries, selectedDate]);

  // Formatter for display dates: "Nov 7, Sat" (Remove time from rows, keep date)
  const formatRowDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      weekday: 'short'
    }).format(dateObj);
  };

  const formatHeaderDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(dateObj);
  };

  const handlePrevMonth = () => {
    setCurrentCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleSelectDay = (dateStr: string) => {
    if (!dateStr) return;
    setSelectedDate(dateStr);
  };

  const handleDeleteEntry = async (e: React.MouseEvent, dateStr: string) => {
    e.stopPropagation();
    const shouldConfirm = settings?.globalPreferences?.confirmBeforeDelete ?? true;
    if (!shouldConfirm || window.confirm(`Delete journal entry for ${formatRowDate(dateStr)}?`)) {
      await deleteJournalEntry(dateStr);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8 space-y-6 sm:space-y-8">
      {/* Top Banner Row: Title, Subtitle & Action buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-txt-primary">
            Your Journal
          </h1>
          <p className="text-xs sm:text-sm text-txt-secondary mt-1">
            A space to write, reflect and keep track of your journey.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-center">
          {/* "+ New Entry" Button (opens or creates today's entry) */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => onOpenDate(todayDateStr)}
            className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Entry</span>
          </motion.button>

          {/* Module Settings Shortcut */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/settings?tab=journal_notes')}
            className="h-10 w-10 bg-bg-card border border-border hover:bg-bg-hover text-txt-secondary hover:text-txt-primary rounded-xl flex items-center justify-center shadow-2xs transition-colors cursor-pointer"
            title="Journal & Notes Settings"
            aria-label="Journal & Notes Settings"
          >
            <Settings className="w-4 h-4" />
          </motion.button>
        </div>
      </div>

      {/* Two Summary Cards: Mini Calendar & This Month Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Left: Mini Calendar (takes 2 cols on md) */}
        <div className="md:col-span-2 bg-bg-card border border-border rounded-2xl p-5 shadow-card">
          {/* Calendar Header with Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handlePrevMonth}
              aria-label="Previous month"
              className="w-8 h-8 rounded-lg hover:bg-bg-hover text-txt-secondary hover:text-txt-primary flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="font-serif font-bold text-sm sm:text-base text-txt-primary">
              {monthName}
            </span>

            <button
              onClick={handleNextMonth}
              aria-label="Next month"
              className="w-8 h-8 rounded-lg hover:bg-bg-hover text-txt-secondary hover:text-txt-primary flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 text-center text-xs font-medium text-txt-secondary mb-2">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Day Cells Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {calendarDays.map((c, i) => {
              if (!c.isCurrentMonth) {
                return <div key={`empty-${i}`} className="h-9" />;
              }

              const hasEntry = entryDateSet.has(c.dateStr);
              const isSelected = selectedDate === c.dateStr;
              const isToday = todayDateStr === c.dateStr;

              return (
                <button
                  key={c.dateStr}
                  type="button"
                  onClick={() => handleSelectDay(c.dateStr)}
                  className={`h-9 rounded-xl text-xs font-medium flex flex-col items-center justify-center relative transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-primary text-white font-bold shadow-xs'
                      : isToday
                      ? 'border border-primary text-primary font-bold hover:bg-primary/10'
                      : 'hover:bg-bg-hover text-txt-primary'
                  }`}
                >
                  <span>{c.day}</span>
                  {/* Dot on days with entries */}
                  {hasEntry && (
                    <span 
                      className={`w-1 h-1 rounded-full mt-0.5 ${
                        isSelected ? 'bg-white' : 'bg-primary'
                      }`} 
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: "This Month" Stats Card (counts only: entries, active days, total entries) */}
        <div className="bg-bg-card border border-border rounded-2xl p-5 shadow-card flex flex-col justify-between">
          <div>
            <h2 className="font-serif font-bold text-base text-txt-primary mb-4">
              This Month
            </h2>

            <div className="space-y-4">
              {/* Entries count */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-primary flex items-center justify-center">
                  <PenLine className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-bold text-txt-primary">
                    {monthStats.entriesCount} {monthStats.entriesCount === 1 ? 'entry' : 'entries'}
                  </div>
                  <div className="text-xs text-txt-muted">Written this month</div>
                </div>
              </div>

              {/* Active days */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-bold text-txt-primary">
                    {monthStats.activeDaysCount} {monthStats.activeDaysCount === 1 ? 'day active' : 'days active'}
                  </div>
                  <div className="text-xs text-txt-muted">Reflection consistency</div>
                </div>
              </div>

              {/* Total entries */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-bold text-txt-primary">
                    {monthStats.totalEntriesCount} total {monthStats.totalEntriesCount === 1 ? 'entry' : 'entries'}
                  </div>
                  <div className="text-xs text-txt-muted">All-time collection</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Empty Past Day Alert Banner: "No entry for [date]. Write one?" */}
      {!selectedDateEntry && selectedDate <= todayDateStr && (
        <motion.div 
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl border border-dashed border-border bg-bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm"
        >
          <div className="flex items-center gap-2.5 text-txt-secondary">
            <Calendar className="w-4 h-4 text-primary" />
            <span>
              No entry for <strong className="text-txt-primary">{formatHeaderDate(selectedDate)}</strong>. Write one?
            </span>
          </div>

          <button
            onClick={() => onOpenDate(selectedDate)}
            className="self-start sm:self-center px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            Write one
          </button>
        </motion.div>
      )}

      {/* All Journal Entries Header & Filter */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-serif font-bold text-txt-primary">
              All Journal Entries
            </h2>
            <span className="text-xs font-bold text-txt-muted bg-bg-subtle px-2 py-0.5 rounded-full">
              {filteredEntries.length}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Search Input: Matches Title & Body */}
            <div className="relative flex-1 sm:w-56">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-txt-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search journal..."
                className="w-full pl-9 pr-3 py-1.5 bg-bg-card border border-border rounded-xl text-xs text-txt-primary placeholder:text-txt-muted focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            {/* Sort Toggle: Newest First / Oldest First */}
            <button
              onClick={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
              className="px-3 py-1.5 rounded-xl border border-border bg-bg-card hover:bg-bg-hover text-xs font-medium text-txt-secondary flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              <span>{sortOrder === 'newest' ? 'Newest first' : 'Oldest first'}</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Entries List */}
        {filteredEntries.length === 0 ? (
          <div className="p-12 text-center bg-bg-card border border-border rounded-2xl text-txt-muted space-y-3">
            <BookOpen className="w-10 h-10 text-txt-muted/60 mx-auto" />
            <p className="text-sm font-medium text-txt-secondary">
              {searchQuery ? 'No journal entries match your search.' : 'No journal entries yet.'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => onOpenDate(todayDateStr)}
                className="px-4 py-2 bg-primary text-white text-xs font-semibold rounded-xl hover:bg-primary-hover transition-colors cursor-pointer"
              >
                Write your first entry
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEntries.map(entry => {
              const MoodIcon = entry.mood ? MOOD_ICONS[entry.mood] : BookOpen;
              const moodStyle = entry.mood ? MOOD_BG[entry.mood] : 'bg-primary/10 text-primary border-primary/20';
              const displayTitle = entry.title || formatRowDate(entry.date);
              const previewText = entry.body.trim().replace(/^[#\->\*\`\s]+/gm, '').substring(0, 110) || 'Empty entry...';

              return (
                <div
                  key={entry.date}
                  onClick={() => onOpenDate(entry.date)}
                  className="bg-bg-card border border-border hover:border-primary/50 shadow-card hover:shadow-card-hover rounded-2xl p-4 sm:p-5 flex items-start gap-4 transition-all duration-150 cursor-pointer group"
                >
                  {/* Mood Icon in tinted container */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${moodStyle}`}>
                    <MoodIcon className="w-5 h-5" />
                  </div>

                  {/* Middle Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-serif font-bold text-sm sm:text-base text-txt-primary truncate group-hover:text-primary transition-colors">
                        {displayTitle}
                      </h3>
                      {entry.mood && (
                        <span className={`px-2 py-0.5 rounded-md text-xs font-medium border ${moodStyle}`}>
                          {MOOD_LABELS[entry.mood]}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-txt-secondary line-clamp-2 mt-0.5 leading-relaxed">
                      {previewText}
                    </p>

                    {/* Tag chips */}
                    {entry.tags && entry.tags.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                        {entry.tags.map(t => (
                          <span
                            key={t}
                            className="px-2 py-0.5 rounded-md text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right side: Date only (NO time), and actions */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="text-xs font-semibold text-txt-secondary">
                      {formatRowDate(entry.date)}
                    </span>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenDate(entry.date);
                        }}
                        title="Edit entry"
                        aria-label="Edit entry"
                        className="w-7 h-7 rounded-lg hover:bg-bg-hover text-txt-secondary hover:text-primary flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteEntry(e, entry.date)}
                        title="Delete entry"
                        aria-label="Delete entry"
                        className="w-7 h-7 rounded-lg hover:bg-red-500/10 text-txt-secondary hover:text-red-500 flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

