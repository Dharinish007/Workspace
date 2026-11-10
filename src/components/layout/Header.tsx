import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Search, Calendar, Sun, Moon, Menu, Settings } from 'lucide-react';
import { motion } from 'framer-motion';

export const Header: React.FC = () => {
  const {
    settings,
    toggleTheme,
    setIsSearchOpen,
    toggleMobileSidebar,
    pages,
    selectedPageId,
  } = useWorkspace();
  const location = useLocation();
  const navigate = useNavigate();

  const isDark = settings.theme === 'dark';

  // Dynamic real-world date, e.g. "Sat, Nov 7, 2026"
  const formattedDate = useMemo(() => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }).format(new Date());
  }, []);

  // Compute Page Title dynamically based on current route
  const pageTitle = useMemo(() => {
    const p = location.pathname;
    if (p === '/dashboard' || p === '/') return 'Dashboard';
    if (p === '/tasks' || p === '/todo') return 'To-Do';
    if (p.startsWith('/journal')) return 'Journal';
    if (p.startsWith('/notes')) return 'Notes';
    if (p.startsWith('/timer') || p.startsWith('/activity')) return 'Timer';
    if (p === '/pages') return 'Pages';
    if (p.startsWith('/pages/')) {
      const pageIdFromUrl = p.replace('/pages/', '');
      const activeId = pageIdFromUrl || selectedPageId;
      const foundPage = pages.find(item => item.id === activeId);
      return foundPage ? foundPage.name : 'Pages';
    }
    if (p === '/calendar') return 'Calendar';
    if (p === '/habits') return 'Habit Tracker';
    if (p === '/settings') return 'Settings';
    return 'My Workspace';
  }, [location.pathname, location.pathname.startsWith('/pages/') ? pages : null, selectedPageId]);

  return (
    <header className="h-16 px-4 md:px-6 lg:px-8 border-b border-border bg-bg-card/95 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between shrink-0 transition-colors duration-200">
      {/* Left: Mobile hamburger menu toggle + Dynamic Page Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={toggleMobileSidebar}
          aria-label="Open navigation drawer"
          title="Open navigation menu"
          className="md:hidden w-9 h-9 rounded-xl border border-border-interactive/60 hover:border-border-interactive bg-bg-card hover:bg-bg-hover text-txt-secondary hover:text-txt-primary flex items-center justify-center transition-colors cursor-pointer shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0"
        >
          <Menu className="w-5 h-5 text-txt-primary" />
        </button>

        <h1 className="text-lg sm:text-xl font-bold font-serif text-txt-primary tracking-tight truncate select-none">
          {pageTitle}
        </h1>
      </div>

      {/* Right: Global Search, Dynamic Date/Calendar Shortcut, and Theme Toggle */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Global Search Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => setIsSearchOpen(true)}
          className="h-9 px-3 rounded-xl border border-border bg-bg-card hover:bg-bg-hover hover:border-primary/50 text-txt-secondary hover:text-txt-primary flex items-center gap-2.5 transition-all cursor-pointer shadow-2xs group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          title="Search tasks, pages, habits, events (Ctrl+K)"
          aria-label="Search workspace"
        >
          <Search className="w-4 h-4 text-txt-muted group-hover:text-primary transition-colors shrink-0" />
          <span className="hidden sm:inline text-xs text-txt-muted group-hover:text-txt-secondary font-medium">
            {location.pathname.startsWith('/notes') ? 'Search notes...' : 'Search...'}
          </span>
          <kbd className="hidden sm:inline-flex items-center text-[10px] font-mono bg-bg-subtle border border-border px-1.5 py-0.5 rounded text-txt-muted">
            Ctrl K
          </kbd>
        </motion.button>

        {/* Dynamic Date / Calendar Shortcut */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => navigate('/calendar')}
          className="h-9 px-3 rounded-xl border border-border bg-bg-card hover:bg-bg-hover hover:border-primary/50 text-txt-secondary hover:text-primary flex items-center gap-2 transition-all cursor-pointer shadow-2xs group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          title={`Today: ${formattedDate} — Click to open Calendar`}
          aria-label="Open Calendar"
        >
          <Calendar className="w-4 h-4 text-txt-muted group-hover:text-primary transition-colors shrink-0" />
          <span className="hidden md:inline text-xs font-semibold text-txt-secondary group-hover:text-primary">
            {formattedDate}
          </span>
        </motion.button>

        {/* Light / Dark Mode Toggle */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleTheme}
          className="w-9 h-9 rounded-xl border border-border bg-bg-card hover:bg-bg-hover hover:border-primary/50 text-txt-secondary hover:text-txt-primary flex items-center justify-center transition-all cursor-pointer shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDark ? (
            <Sun className="w-4 h-4 text-amber-400 hover:text-amber-300 transition-colors" />
          ) : (
            <Moon className="w-4 h-4 text-txt-secondary hover:text-primary transition-colors" />
          )}
        </motion.button>

        {/* Settings Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/settings')}
          className="w-9 h-9 rounded-xl border border-border bg-bg-card hover:bg-bg-hover hover:border-primary/50 text-txt-secondary hover:text-txt-primary flex items-center justify-center transition-all cursor-pointer shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          title="Settings"
          aria-label="Settings"
        >
          <Settings className="w-4 h-4 text-txt-secondary hover:text-primary transition-colors" />
        </motion.button>
      </div>
    </header>
  );
};
