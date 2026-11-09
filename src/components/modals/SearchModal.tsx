import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Search, X, CheckSquare, Folder, Calendar, ArrowRight, BookOpen, FileText } from 'lucide-react';
import { IconRenderer } from '../common/IconRegistry';
import { motion, AnimatePresence } from 'framer-motion';

export const SearchModal: React.FC = () => {
  const navigate = useNavigate();
  const { 
    isSearchOpen, 
    setIsSearchOpen, 
    pages, 
    tasks, 
    habits, 
    events, 
    journalEntries,
    notes,
    navigateToTask, 
    navigateToHabit,
    setActiveSection,
    setSelectedPageId 
  } = useWorkspace();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSearchOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isSearchOpen]);

  const trimmedQuery = query.trim().toLowerCase();

  // Search logic
  const matchingPages = trimmedQuery
    ? pages.filter(p => p.name.toLowerCase().includes(trimmedQuery))
    : [];

  const matchingTasks = trimmedQuery
    ? tasks.filter(t => t.title.toLowerCase().includes(trimmedQuery))
    : [];

  const matchingHabits = trimmedQuery
    ? habits.filter(h => h.name.toLowerCase().includes(trimmedQuery))
    : [];

  const matchingEvents = trimmedQuery
    ? events.filter(e => e.title.toLowerCase().includes(trimmedQuery))
    : [];

  const matchingJournal = trimmedQuery
    ? journalEntries.filter(j => 
        (j.title && j.title.toLowerCase().includes(trimmedQuery)) ||
        (j.body && j.body.toLowerCase().includes(trimmedQuery))
      )
    : [];

  const matchingNotes = trimmedQuery
    ? notes.filter(n =>
        n.title.toLowerCase().includes(trimmedQuery) ||
        n.content.toLowerCase().includes(trimmedQuery) ||
        (n.tags && n.tags.some(t => t.toLowerCase().includes(trimmedQuery)))
      )
    : [];

  // Flattened list for keyboard navigation
  const flatResults = React.useMemo(() => {
    const list: {
      id: string;
      type: 'page' | 'task' | 'habit' | 'event' | 'journal' | 'note';
      onSelect: () => void;
    }[] = [];

    matchingPages.forEach(p =>
      list.push({
        id: `page-${p.id}`,
        type: 'page',
        onSelect: () => {
          setActiveSection('todo');
          setSelectedPageId(p.id);
          setIsSearchOpen(false);
        },
      })
    );

    matchingTasks.forEach(t =>
      list.push({
        id: `task-${t.id}`,
        type: 'task',
        onSelect: () => navigateToTask(t.pageId, t.id),
      })
    );

    matchingJournal.forEach(j =>
      list.push({
        id: `journal-${j.date}`,
        type: 'journal',
        onSelect: () => {
          navigate(`/journal/${j.date}`);
          setIsSearchOpen(false);
        },
      })
    );

    matchingNotes.forEach(n =>
      list.push({
        id: `note-${n.id}`,
        type: 'note',
        onSelect: () => {
          navigate(`/notes/${n.id}`);
          setIsSearchOpen(false);
        },
      })
    );

    matchingHabits.forEach(h =>
      list.push({
        id: `habit-${h.id}`,
        type: 'habit',
        onSelect: () => navigateToHabit(h.id),
      })
    );

    matchingEvents.forEach(e =>
      list.push({
        id: `event-${e.id}`,
        type: 'event',
        onSelect: () => {
          setActiveSection('calendar');
          setIsSearchOpen(false);
        },
      })
    );

    return list;
  }, [matchingPages, matchingTasks, matchingJournal, matchingNotes, matchingHabits, matchingEvents, setActiveSection, setSelectedPageId, setIsSearchOpen, navigateToTask, navigateToHabit, navigate]);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [trimmedQuery]);

  // Handle Keyboard Navigation (Arrow keys, Enter, ESC)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isSearchOpen) return;

      if (e.key === 'Escape') {
        setIsSearchOpen(false);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (flatResults.length > 0 ? (prev + 1) % flatResults.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (flatResults.length > 0 ? (prev - 1 + flatResults.length) % flatResults.length : 0));
      } else if (e.key === 'Enter') {
        if (flatResults.length > 0 && flatResults[selectedIndex]) {
          e.preventDefault();
          flatResults[selectedIndex].onSelect();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, setIsSearchOpen, flatResults, selectedIndex]);

  // Group tasks by page
  const tasksByPage: { [pageId: string]: typeof matchingTasks } = {};
  matchingTasks.forEach(t => {
    if (!tasksByPage[t.pageId]) tasksByPage[t.pageId] = [];
    tasksByPage[t.pageId].push(t);
  });

  const hasResults = flatResults.length > 0;

  return (
    <AnimatePresence>
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 md:pt-24 p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSearchOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
          />

          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ type: "spring", stiffness: 500, damping: 32 }}
            className="bg-bg-card border border-border shadow-modal rounded-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[75vh] z-10"
            onClick={e => e.stopPropagation()}
          >
            {/* Search Input Bar */}
            <div className="flex items-center px-4 py-3 border-b border-border gap-3">
              <Search className="w-5 h-5 text-txt-muted flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search tasks, pages, habits, events... (Esc to close)"
                className="flex-1 bg-transparent text-txt-primary placeholder-txt-muted outline-hidden text-[15px] font-sans"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="p-1 text-txt-muted hover:text-txt-primary rounded cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <kbd className="px-2 py-1 text-xs font-mono text-txt-muted bg-bg-subtle rounded border border-border select-none">
                Esc
              </kbd>
            </div>

            {/* Results area */}
            <div className="p-4 overflow-y-auto space-y-4 flex-1 font-sans">
              {!trimmedQuery && (
                <div className="py-12 text-center text-txt-muted text-sm">
                  Type to search across all your pages, tasks, habits, and events.
                </div>
              )}

              {trimmedQuery && !hasResults && (
                <div className="py-12 text-center text-txt-muted text-sm">
                  No results found for "<span className="text-txt-primary font-medium">{query}</span>"
                </div>
              )}

              {/* Pages */}
              {matchingPages.length > 0 && (
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-txt-muted px-2 mb-1.5">
                    Pages ({matchingPages.length})
                  </div>
                  <div className="space-y-1">
                    {matchingPages.map(p => {
                      const isSelected = flatResults[selectedIndex]?.id === `page-${p.id}`;
                      return (
                        <motion.button
                          key={p.id}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            setActiveSection('todo');
                            setSelectedPageId(p.id);
                            setIsSearchOpen(false);
                          }}
                          className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all group cursor-pointer ${
                            isSelected
                              ? 'ring-2 ring-primary bg-bg-hover shadow-2xs'
                              : 'hover:bg-bg-hover'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div 
                              className="w-6 h-6 rounded flex items-center justify-center text-white"
                              style={{ backgroundColor: p.color }}
                            >
                              <IconRenderer name={p.icon} className="w-3.5 h-3.5" />
                            </div>
                            <span className="font-medium text-sm text-txt-primary">{p.name}</span>
                            {p.archived && (
                              <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-bg-subtle text-txt-muted border border-border">
                                Archived
                              </span>
                            )}
                          </div>
                          <ArrowRight className={`w-4 h-4 text-txt-muted transition-opacity ${isSelected ? 'opacity-100 text-primary' : 'opacity-0 group-hover:opacity-100'}`} />
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tasks Grouped by Page */}
              {matchingTasks.length > 0 && (
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-txt-muted px-2 mb-1.5">
                    Tasks ({matchingTasks.length})
                  </div>
                  <div className="space-y-3">
                    {Object.entries(tasksByPage).map(([pageId, pTasks]) => {
                      const page = pages.find(p => p.id === pageId);
                      return (
                        <div key={pageId} className="bg-bg-subtle rounded-xl p-2.5 border border-border">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-txt-secondary mb-2 px-1">
                            <Folder className="w-3.5 h-3.5" />
                            <span>{page ? page.name : 'Unknown Page'}</span>
                            {page?.archived && (
                              <span className="text-[10px] px-1 bg-bg-card border border-border rounded text-txt-muted font-mono">
                                Archived
                              </span>
                            )}
                          </div>
                          <div className="space-y-1">
                            {pTasks.map(t => {
                              const isSelected = flatResults[selectedIndex]?.id === `task-${t.id}`;
                              return (
                                <motion.button
                                  key={t.id}
                                  whileTap={{ scale: 0.98 }}
                                  onClick={() => navigateToTask(t.pageId, t.id)}
                                  className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-all border cursor-pointer ${
                                    isSelected
                                      ? 'ring-2 ring-primary bg-bg-hover border-primary shadow-2xs'
                                      : 'bg-bg-card hover:bg-bg-hover border-border'
                                  }`}
                                  title={t.title}
                                >
                                  <div className="flex items-center gap-2 overflow-hidden flex-1 mr-2">
                                    <CheckSquare className={`w-4 h-4 flex-shrink-0 ${t.completed ? 'text-green-500' : 'text-txt-muted'}`} />
                                    <span className={`text-sm break-words line-clamp-1 ${t.completed ? 'line-through text-txt-muted' : 'text-txt-primary'}`}>
                                      {t.title}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5 flex-shrink-0 text-xs">
                                    {t.dueDate && (
                                      <span className="text-txt-muted font-mono text-[11px]">{t.dueDate}</span>
                                    )}
                                    {t.priority === 'high' && (
                                      <span className="px-1.5 py-0.5 text-[10px] font-semibold text-red-600 bg-red-100 dark:bg-red-950/40 rounded">
                                        High
                                      </span>
                                    )}
                                  </div>
                                </motion.button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Journal Entries */}
              {matchingJournal.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold text-txt-muted uppercase tracking-wider mb-2 px-1">
                    Journal ({matchingJournal.length})
                  </div>
                  <div className="space-y-1">
                    {matchingJournal.map(j => {
                      const isSelected = flatResults[selectedIndex]?.id === `journal-${j.date}`;
                      return (
                        <motion.button
                          key={j.date}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            navigate(`/journal/${j.date}`);
                            setIsSearchOpen(false);
                          }}
                          className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'ring-2 ring-primary bg-bg-hover shadow-2xs'
                              : 'hover:bg-bg-hover'
                          }`}
                        >
                          <div className="flex items-center gap-2 overflow-hidden flex-1 mr-2">
                            <BookOpen className="w-4 h-4 text-primary shrink-0" />
                            <span className="font-medium text-sm text-txt-primary truncate">
                              {j.title || `Journal Entry (${j.date})`}
                            </span>
                          </div>
                          <span className="text-xs font-mono text-txt-muted shrink-0">{j.date}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Notes */}
              {matchingNotes.length > 0 && (
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-txt-muted px-2 mb-1.5">
                    Notes ({matchingNotes.length})
                  </div>
                  <div className="space-y-1">
                    {matchingNotes.map(n => {
                      const isSelected = flatResults[selectedIndex]?.id === `note-${n.id}`;
                      return (
                        <motion.button
                          key={n.id}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            navigate(`/notes/${n.id}`);
                            setIsSearchOpen(false);
                          }}
                          className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'ring-2 ring-primary bg-bg-hover shadow-2xs'
                              : 'hover:bg-bg-hover'
                          }`}
                        >
                          <div className="flex items-center gap-2 overflow-hidden flex-1 mr-2">
                            <FileText className="w-4 h-4 text-primary shrink-0" />
                            <span className="font-medium text-sm text-txt-primary truncate">
                              {n.title || 'Untitled Note'}
                            </span>
                          </div>
                          {n.tags && n.tags.length > 0 && (
                            <span className="text-[11px] text-txt-muted shrink-0">
                              #{n.tags[0]}
                            </span>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Habits */}
              {matchingHabits.length > 0 && (
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-txt-muted px-2 mb-1.5">
                    Habits ({matchingHabits.length})
                  </div>
                  <div className="space-y-1">
                    {matchingHabits.map(h => {
                      const isSelected = flatResults[selectedIndex]?.id === `habit-${h.id}`;
                      return (
                        <motion.button
                          key={h.id}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => navigateToHabit(h.id)}
                          className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all group cursor-pointer ${
                            isSelected
                              ? 'ring-2 ring-primary bg-bg-hover shadow-2xs'
                              : 'hover:bg-bg-hover'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div 
                              className="w-6 h-6 rounded flex items-center justify-center text-white"
                              style={{ backgroundColor: h.color }}
                            >
                              <IconRenderer name={h.icon} className="w-3.5 h-3.5" />
                            </div>
                            <span className="font-medium text-sm text-txt-primary">{h.name}</span>
                          </div>
                          <ArrowRight className={`w-4 h-4 text-txt-muted transition-opacity ${isSelected ? 'opacity-100 text-primary' : 'opacity-0 group-hover:opacity-100'}`} />
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Events */}
              {matchingEvents.length > 0 && (
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-txt-muted px-2 mb-1.5">
                    Events ({matchingEvents.length})
                  </div>
                  <div className="space-y-1">
                    {matchingEvents.map(e => {
                      const isSelected = flatResults[selectedIndex]?.id === `event-${e.id}`;
                      return (
                        <motion.button
                          key={e.id}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            setActiveSection('calendar');
                            setIsSearchOpen(false);
                          }}
                          className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'ring-2 ring-primary bg-bg-hover shadow-2xs'
                              : 'hover:bg-bg-hover'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-txt-secondary" />
                            <span className="font-medium text-sm text-txt-primary">{e.title}</span>
                            <span className="text-xs font-mono text-txt-muted">({e.date})</span>
                          </div>
                          {e.startTime && (
                            <span className="text-xs font-mono text-txt-muted">{e.startTime}</span>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Keyboard navigation hints footer */}
            <div className="border-t border-border bg-bg-subtle/50 px-4 py-2.5 flex items-center justify-between text-xs font-sans text-txt-muted">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-bg-card rounded border border-border">↑</kbd>
                  <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-bg-card rounded border border-border">↓</kbd>
                  <span>Navigate</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-bg-card rounded border border-border">Enter</kbd>
                  <span>Select</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-bg-card rounded border border-border">Esc</kbd>
                  <span>Close</span>
                </span>
              </div>
              {hasResults && (
                <span className="font-mono text-[11px]">
                  {selectedIndex + 1} of {flatResults.length}
                </span>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
