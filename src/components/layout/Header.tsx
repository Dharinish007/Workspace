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
    <header className="h-16 px-4 md:px-6 lg:px-8 border-b border-border bg-bg-card/95 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between transition-colors duration-200">
      {/* Brand logo & title */}
      <div className="flex items-center gap-3">
        <motion.div 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white font-serif font-bold text-xl shadow-sm select-none cursor-pointer"
          title="My Workspace"
        >
          W
        </motion.div>
        <span className="font-serif font-bold text-xl sm:text-2xl text-txt-primary tracking-tight">
          My Workspace
        </span>
      </div>

      {/* Center / Search bar trigger */}
      <div className="hidden sm:flex items-center flex-1 max-w-md mx-4 lg:mx-8">
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          onClick={() => setIsSearchOpen(true)}
          className="w-full h-10 flex items-center justify-between px-4 rounded-xl bg-bg-subtle hover:bg-bg-hover text-txt-secondary text-sm border border-border hover:border-primary/40 transition-all duration-150 cursor-pointer text-left shadow-2xs group"
          title="Search tasks, pages, habits (Ctrl+K)"
          aria-label="Search tasks and pages"
        >
          <div className="flex items-center gap-2.5">
            <Search className="w-4 h-4 text-txt-muted group-hover:text-primary transition-colors flex-shrink-0" />
            <span className="text-sm font-sans text-txt-secondary group-hover:text-txt-primary font-medium">
              Search tasks, pages, habits...
            </span>
          </div>
          <kbd className="hidden md:inline-flex items-center px-2 py-0.5 text-xs font-mono font-semibold text-txt-muted bg-bg-card border border-border rounded-md shadow-2xs">
            Ctrl+K
          </kbd>
        </motion.button>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Mobile search trigger */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => setIsSearchOpen(true)}
          className="sm:hidden w-10 h-10 rounded-xl hover:bg-bg-hover text-txt-secondary flex items-center justify-center transition-colors"
          title="Search"
          aria-label="Search"
        >
          <Search className="w-5 h-5" />
        </motion.button>

        {/* Date pill */}
        <div className="hidden lg:flex items-center gap-2 h-9 px-3.5 rounded-xl bg-bg-subtle text-txt-secondary text-xs font-sans font-medium border border-border select-none">
          <span className="text-sm">📅</span>
          <span className="font-semibold text-txt-secondary">{formattedDate}</span>
        </div>

        {/* Notification bell (display) */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.92 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className="w-10 h-10 rounded-xl hover:bg-bg-hover text-txt-secondary flex items-center justify-center transition-colors relative cursor-pointer"
          title="Notifications"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary ring-2 ring-bg-card" />
        </motion.button>

        {/* Sliding Theme Toggle */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={toggleTheme}
          aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
          title={isDark ? "Switch to light theme" : "Switch to dark theme"}
          className="w-16 h-9 flex items-center rounded-xl p-1 transition-colors duration-200 border border-border bg-bg-subtle hover:bg-bg-hover cursor-pointer relative"
        >
          <motion.div
            layout
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className={`w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-white shadow-xs ${
              isDark ? 'ml-auto' : 'mr-auto'
            }`}
          >
            {isDark ? (
              <Moon className="w-4 h-4 text-white" />
            ) : (
              <Sun className="w-4 h-4 text-white" />
            )}
          </motion.div>
        </motion.button>

        {/* Settings Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.92 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          onClick={() => setIsSettingsOpen(true)}
          className="w-10 h-10 rounded-xl hover:bg-bg-hover text-txt-secondary flex items-center justify-center transition-colors cursor-pointer"
          title="Settings"
          aria-label="Open Settings"
        >
          <Settings className="w-5 h-5" />
        </motion.button>
      </div>
    </header>
  );
};
