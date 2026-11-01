import React from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Search, Bell, Settings, Sun, Moon } from 'lucide-react';

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
    <header className="h-16 px-4 md:px-6 border-b border-border bg-bg-card flex items-center justify-between sticky top-0 z-20">
      {/* Brand logo & title for mobile or desktop breadcrumb */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-lg shadow-sm">
          W
        </div>
        <span className="font-bold text-lg text-txt-primary tracking-tight">
          My Workspace
        </span>
      </div>

      {/* Center / Search bar trigger */}
      <div className="hidden sm:flex items-center flex-1 max-w-md mx-4 lg:mx-8">
        <button
          onClick={() => setIsSearchOpen(true)}
          className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-full bg-bg-subtle hover:bg-bg-hover text-txt-secondary text-sm border border-border transition-colors duration-150 cursor-pointer text-left"
          title="Search tasks and pages (Ctrl+K)"
        >
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-txt-muted" />
            <span className="text-xs sm:text-sm">Search tasks, pages, habits...</span>
          </div>
          <kbd className="hidden md:inline-block px-1.5 py-0.5 text-[11px] font-semibold text-txt-muted bg-bg-card border border-border rounded shadow-xs">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile search trigger */}
        <button
          onClick={() => setIsSearchOpen(true)}
          className="sm:hidden p-2 rounded-full hover:bg-bg-hover text-txt-secondary transition-colors"
          title="Search"
        >
          <Search className="w-5 h-5" />
        </button>

        {/* Date pill */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-bg-subtle text-txt-secondary text-xs font-medium border border-border">
          <span>📅</span>
          <span>{formattedDate}</span>
        </div>

        {/* Notification bell (display) */}
        <button
          className="p-2 rounded-full hover:bg-bg-hover text-txt-secondary transition-colors relative"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary ring-2 ring-bg-card" />
        </button>

        {/* Sliding Theme Toggle */}
        <div className="flex items-center">
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className={`w-14 h-7 flex items-center rounded-full p-1 transition-colors duration-200 border border-border cursor-pointer ${
              isDark ? 'bg-bg-subtle justify-end' : 'bg-bg-subtle justify-start'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-primary flex items-center justify-center text-white shadow-sm transform transition-transform duration-200`}
            >
              {isDark ? <Moon className="w-3 h-3" /> : <Sun className="w-3 h-3 text-yellow-300" />}
            </div>
          </button>
        </div>

        {/* Settings Button */}
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="p-2 rounded-full hover:bg-bg-hover text-txt-secondary transition-colors"
          title="Settings"
          aria-label="Open Settings"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};

