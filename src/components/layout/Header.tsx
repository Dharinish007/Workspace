import React from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Search, Bell, Settings, Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';

export const Header: React.FC = () => {
  const { 
    settings, 
    toggleTheme, 
    setIsSettingsOpen, 
    setIsSearchOpen 
  } = useWorkspace();

  // Current real date formatted, e.g., "Sun, Nov 1, 2026"
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());

  const isDark = settings.theme === 'dark';

  return (
    <header className="h-16 px-4 md:px-6 border-b border-border bg-bg-card/90 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between transition-colors duration-200">
      {/* Brand logo & title */}
      <div className="flex items-center gap-3">
        <motion.div 
          whileHover={{ scale: 1.05, rotate: 2 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-serif font-bold text-lg shadow-sm cursor-pointer select-none"
        >
          W
        </motion.div>
        <span className="font-serif font-semibold text-xl text-txt-primary tracking-tight">
          My Workspace
        </span>
      </div>

      {/* Center / Search bar trigger */}
      <div className="hidden sm:flex items-center flex-1 max-w-md mx-4 lg:mx-8">
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          onClick={() => setIsSearchOpen(true)}
          className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-full bg-bg-subtle hover:bg-bg-hover text-txt-secondary text-sm border border-border transition-colors duration-150 cursor-pointer text-left shadow-xs"
          title="Search tasks and pages (Ctrl+K)"
        >
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-txt-muted" />
            <span className="text-xs sm:text-sm font-sans">Search tasks, pages, habits...</span>
          </div>
          <kbd className="hidden md:inline-block px-1.5 py-0.5 text-[11px] font-mono font-medium text-txt-muted bg-bg-card border border-border rounded shadow-xs">
            Ctrl+K
          </kbd>
        </motion.button>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile search trigger */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => setIsSearchOpen(true)}
          className="sm:hidden p-2 rounded-full hover:bg-bg-hover text-txt-secondary transition-colors"
          title="Search"
        >
          <Search className="w-5 h-5" />
        </motion.button>

        {/* Date pill */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-bg-subtle text-txt-secondary text-xs font-sans font-medium border border-border">
          <span className="text-xs">📅</span>
          <span>{formattedDate}</span>
        </div>

        {/* Notification bell (display) */}
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className="p-2 rounded-full hover:bg-bg-hover text-txt-secondary transition-colors relative cursor-pointer"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary ring-2 ring-bg-card" />
        </motion.button>

        {/* Sliding Theme Toggle with spring layout */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="w-14 h-7 flex items-center rounded-full p-1 transition-colors duration-200 border border-border bg-bg-subtle cursor-pointer relative"
        >
          <motion.div
            layout
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className={`w-5 h-5 rounded-full bg-primary flex items-center justify-center text-white shadow-sm ${
              isDark ? 'ml-auto' : 'mr-auto'
            }`}
          >
            {isDark ? (
              <Moon className="w-3 h-3" />
            ) : (
              <Sun className="w-3 h-3 text-amber-100" />
            )}
          </motion.div>
        </motion.button>

        {/* Settings Button */}
        <motion.button
          whileHover={{ scale: 1.08, rotate: 15 }}
          whileTap={{ scale: 0.92 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          onClick={() => setIsSettingsOpen(true)}
          className="p-2 rounded-full hover:bg-bg-hover text-txt-secondary transition-colors cursor-pointer"
          title="Settings"
          aria-label="Open Settings"
        >
          <Settings className="w-5 h-5" />
        </motion.button>
      </div>
    </header>
  );
};
