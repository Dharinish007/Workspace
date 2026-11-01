import React, { useState, useEffect, useRef } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Search, X, CheckSquare, Folder, Flame, Calendar, ArrowRight } from 'lucide-react';
import { IconRenderer } from '../common/IconRegistry';

export const SearchModal: React.FC = () => {
  const { 
    isSearchOpen, 
    setIsSearchOpen, 
    pages, 
    tasks, 
    habits, 
    events, 
    navigateToTask, 
    navigateToHabit,
    setActiveSection,
    setSelectedPageId 
  } = useWorkspace();

  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSearchOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isSearchOpen]);

  if (!isSearchOpen) return null;

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

  // Group tasks by page
  const tasksByPage: { [pageId: string]: typeof matchingTasks } = {};
  matchingTasks.forEach(t => {
    if (!tasksByPage[t.pageId]) tasksByPage[t.pageId] = [];
    tasksByPage[t.pageId].push(t);
  });

  const hasResults =
    matchingPages.length > 0 ||
    matchingTasks.length > 0 ||
    matchingHabits.length > 0 ||
    matchingEvents.length > 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-start justify-center pt-16 md:pt-24 p-4 animate-in fade-in duration-150">
      <div 
        className="bg-bg-card border border-border shadow-modal rounded-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[75vh]"
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
            className="flex-1 bg-transparent text-txt-primary placeholder-txt-muted outline-hidden text-base"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-txt-muted hover:text-txt-primary rounded"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setIsSearchOpen(false)}
            className="px-2 py-1 text-xs text-txt-muted bg-bg-subtle hover:bg-bg-hover rounded border border-border"
          >
            Esc
          </button>
        </div>

        {/* Results area */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
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
              <div className="text-xs font-semibold uppercase tracking-wider text-txt-muted px-2 mb-1.5">
                Pages ({matchingPages.length})
              </div>
              <div className="space-y-1">
                {matchingPages.map(p => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setActiveSection('todo');
                      setSelectedPageId(p.id);
                      setIsSearchOpen(false);
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-bg-hover text-left transition-colors group"
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
                    <ArrowRight className="w-4 h-4 text-txt-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tasks Grouped by Page */}
          {matchingTasks.length > 0 && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-txt-muted px-2 mb-1.5">
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
                          <span className="text-[10px] px-1 bg-bg-card border border-border rounded text-txt-muted">
                            Archived
                          </span>
                        )}
                      </div>
                      <div className="space-y-1">
                        {pTasks.map(t => (
                          <button
                            key={t.id}
                            onClick={() => navigateToTask(t.pageId, t.id)}
                            className="w-full flex items-center justify-between p-2 rounded-lg bg-bg-card hover:bg-bg-hover text-left transition-colors border border-border-subtle"
                          >
                            <div className="flex items-center gap-2 overflow-hidden">
                              <CheckSquare className={`w-4 h-4 flex-shrink-0 ${t.completed ? 'text-green-500' : 'text-txt-muted'}`} />
                              <span className={`text-sm truncate ${t.completed ? 'line-through text-txt-muted' : 'text-txt-primary'}`}>
                                {t.title}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0 text-xs">
                              {t.dueDate && (
                                <span className="text-txt-muted text-[11px]">{t.dueDate}</span>
                              )}
                              {t.priority === 'high' && (
                                <span className="px-1.5 py-0.5 text-[10px] font-semibold text-red-600 bg-red-100 dark:bg-red-900/30 rounded">
                                  High
                                </span>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Habits */}
          {matchingHabits.length > 0 && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-txt-muted px-2 mb-1.5">
                Habits ({matchingHabits.length})
              </div>
              <div className="space-y-1">
                {matchingHabits.map(h => (
                  <button
                    key={h.id}
                    onClick={() => navigateToHabit(h.id)}
                    className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-bg-hover text-left transition-colors group"
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
                    <ArrowRight className="w-4 h-4 text-txt-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Events */}
          {matchingEvents.length > 0 && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-txt-muted px-2 mb-1.5">
                Events ({matchingEvents.length})
              </div>
              <div className="space-y-1">
                {matchingEvents.map(e => (
                  <button
                    key={e.id}
                    onClick={() => {
                      setActiveSection('calendar');
                      setIsSearchOpen(false);
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-bg-hover text-left transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-orange-500" />
                      <span className="font-medium text-sm text-txt-primary">{e.title}</span>
                      <span className="text-xs text-txt-muted">({e.date})</span>
                    </div>
                    {e.startTime && (
                      <span className="text-xs text-txt-muted">{e.startTime}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

