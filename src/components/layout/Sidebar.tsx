import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useWorkspace } from '../../context/WorkspaceContext';
import { 
  LayoutDashboard, 
  CheckSquare, 
  Calendar, 
  Flame, 
  Folder,
  Plus, 
  Settings, 
  PanelLeftClose, 
  PanelLeftOpen, 
  X,
  FileText,
  CalendarDays
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TaskModal } from '../todo/TaskModal';
import { PageModal } from '../todo/PageModal';
import { EventModal } from '../calendar/EventModal';
import { HabitModal } from '../habits/HabitModal';

interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: React.FC<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { id: 'tasks', label: 'Tasks', path: '/tasks', icon: CheckSquare },
  { id: 'calendar', label: 'Calendar', path: '/calendar', icon: Calendar },
  { id: 'habits', label: 'Habits', path: '/habits', icon: Flame },
  { id: 'pages', label: 'Pages', path: '/pages', icon: Folder },
];

export const Sidebar: React.FC = () => {
  const { 
    settings,
    isSidebarCollapsed,
    toggleSidebar,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
    setSelectedPageId
  } = useWorkspace();
  const location = useLocation();
  const navigate = useNavigate();

  // Quick Add popup state and modal controls
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isPageModalOpen, setIsPageModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isHabitModalOpen, setIsHabitModalOpen] = useState(false);

  const quickAddRef = useRef<HTMLDivElement>(null);

  // Close Quick Add dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (quickAddRef.current && !quickAddRef.current.contains(e.target as Node)) {
        setIsQuickAddOpen(false);
      }
    };
    if (isQuickAddOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isQuickAddOpen]);

  // Quick Add keyboard shortcut: Q (when not inside an input)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput = target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.getAttribute('role') === 'textbox'
      );
      if (!isInput && e.key.toLowerCase() === 'q' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setIsQuickAddOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Prevent background scrolling and handle Escape when mobile drawer is open
  useEffect(() => {
    if (isMobileSidebarOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setIsMobileSidebarOpen(false);
        }
      };
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        document.body.style.overflow = prevOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isMobileSidebarOpen, setIsMobileSidebarOpen]);

  // Determine active item from current route
  const isItemActive = (path: string) => {
    if (path === '/tasks') {
      return location.pathname === '/tasks' || location.pathname === '/todo';
    }
    if (path === '/pages') {
      return location.pathname.startsWith('/pages');
    }
    return location.pathname === path;
  };

  const handleNavClick = (path: string) => {
    if (path === '/tasks' || path === '/pages') {
      setSelectedPageId(null);
    }
    navigate(path);
    if (isMobileSidebarOpen) {
      setIsMobileSidebarOpen(false);
    }
  };

  return (
    <>
      {/* Desktop Stationary Sidebar */}
      <aside 
        aria-label="Main Navigation"
        className={`hidden md:flex flex-col h-full border-r border-border bg-bg-card transition-[width] duration-300 ease-in-out shrink-0 select-none z-10 ${
          isSidebarCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        {/* Top Header Row: Logo, Workspace Name & Collapse/Expand Button */}
        {isSidebarCollapsed ? (
          <div className="h-16 flex flex-col items-center justify-center border-b border-border/60 shrink-0 gap-1">
            <button
              onClick={toggleSidebar}
              title="Expand sidebar (Ctrl+B)"
              aria-label="Expand sidebar"
              className="w-10 h-10 rounded-xl hover:bg-bg-hover text-txt-secondary hover:text-primary flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <PanelLeftOpen className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="h-16 px-4 flex items-center justify-between border-b border-border/60 shrink-0">
            <div 
              onClick={() => handleNavClick('/dashboard')}
              className="flex items-center gap-3 cursor-pointer min-w-0 group"
              title="My Workspace - Dashboard"
            >
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-lg shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                W
              </div>
              <span className="font-bold text-[15px] text-txt-primary tracking-tight truncate group-hover:text-primary transition-colors">
                My Workspace
              </span>
            </div>
            <button
              onClick={toggleSidebar}
              title="Collapse sidebar (Ctrl+B)"
              aria-label="Collapse sidebar"
              className="w-8 h-8 rounded-lg hover:bg-bg-hover text-txt-secondary hover:text-primary flex items-center justify-center transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Quick Add Button & Action Menu */}
        <div ref={quickAddRef} className={`relative shrink-0 ${isSidebarCollapsed ? 'p-2 flex justify-center' : 'p-3 pb-2'}`}>
          {isSidebarCollapsed ? (
            <button
              onClick={() => setIsQuickAddOpen(prev => !prev)}
              title="Quick Add (Q)"
              aria-label="Quick Add"
              className="w-10 h-10 rounded-xl bg-primary hover:bg-primary-hover text-white flex items-center justify-center shadow-xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Plus className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={() => setIsQuickAddOpen(prev => !prev)}
              aria-label="Quick Add"
              title="Quick Add (Q)"
              className="w-full h-10 px-3.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold flex items-center justify-between shadow-xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                <span>Quick Add</span>
              </span>
              <kbd className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-mono font-medium">Q</kbd>
            </button>
          )}

          {/* Quick Add Dropdown Menu */}
          <AnimatePresence>
            {isQuickAddOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.14 }}
                className={`absolute z-30 bg-bg-card border border-border shadow-modal rounded-xl py-1.5 w-48 text-txt-primary ${
                  isSidebarCollapsed ? 'left-16 top-2' : 'left-3 right-3 top-14'
                }`}
              >
                <button
                  onClick={() => {
                    setIsQuickAddOpen(false);
                    setIsTaskModalOpen(true);
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-medium hover:bg-bg-hover flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <CheckSquare className="w-4 h-4 text-primary" />
                  <span>New Task</span>
                </button>
                <button
                  onClick={() => {
                    setIsQuickAddOpen(false);
                    setIsPageModalOpen(true);
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-medium hover:bg-bg-hover flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <Folder className="w-4 h-4 text-purple-500" />
                  <span>New Page</span>
                </button>
                <button
                  onClick={() => {
                    setIsQuickAddOpen(false);
                    setIsEventModalOpen(true);
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-medium hover:bg-bg-hover flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <CalendarDays className="w-4 h-4 text-amber-500" />
                  <span>New Event</span>
                </button>
                <button
                  onClick={() => {
                    setIsQuickAddOpen(false);
                    setIsHabitModalOpen(true);
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-medium hover:bg-bg-hover flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <Flame className="w-4 h-4 text-teal-500" />
                  <span>New Habit</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Scrollable Workspace Navigation List */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-1.5 scrollbar-thin">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isItemActive(item.path);

            return (
              <motion.button
                key={item.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleNavClick(item.path)}
                title={isSidebarCollapsed ? item.label : undefined}
                aria-label={item.label}
                className={`relative w-full flex items-center rounded-xl min-h-[42px] text-sm transition-all duration-150 text-left cursor-pointer overflow-hidden group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  active
                    ? 'text-primary font-bold'
                    : 'text-txt-secondary hover:text-txt-primary hover:bg-bg-hover font-medium'
                } ${isSidebarCollapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2.5'}`}
              >
                {/* Active Pill Indicator */}
                {active && (
                  <motion.div
                    layoutId="sidebarActivePill"
                    className={`absolute inset-0 bg-primary/15 dark:bg-primary/25 rounded-xl ${
                      isSidebarCollapsed ? 'border-2 border-primary' : 'border-l-4 border-primary'
                    }`}
                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  />
                )}

                <Icon
                  className={`w-5 h-5 flex-shrink-0 z-10 transition-colors ${
                    active ? 'text-primary' : 'text-txt-secondary group-hover:text-txt-primary'
                  }`}
                />

                {!isSidebarCollapsed && (
                  <span className="truncate z-10 text-[14px]">
                    {item.label}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Pinned Bottom: Settings & User Profile */}
        <div className="shrink-0 p-2 border-t border-border space-y-1 bg-bg-card">
          {/* Settings Button */}
          <button
            onClick={() => handleNavClick('/settings')}
            aria-label="Settings"
            title="Settings"
            className={`w-full flex items-center rounded-xl min-h-[40px] text-xs sm:text-[13px] font-medium text-txt-secondary hover:text-txt-primary hover:bg-bg-hover transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              isSidebarCollapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2'
            }`}
          >
            <Settings className="w-5 h-5 text-txt-secondary hover:text-primary transition-colors shrink-0" />
            {!isSidebarCollapsed && <span className="truncate">Settings</span>}
          </button>

          {/* User Profile */}
          <div
            onClick={() => handleNavClick('/settings')}
            title={`Profile: ${settings.displayName || 'User'}`}
            aria-label={`User Profile: ${settings.displayName || 'User'}`}
            role="button"
            tabIndex={0}
            className={`w-full flex items-center rounded-xl min-h-[42px] hover:bg-bg-hover transition-colors cursor-pointer select-none group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              isSidebarCollapsed ? 'justify-center p-1.5' : 'gap-3 px-3 py-1.5'
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-xs ring-1 ring-primary/30 shrink-0 group-hover:scale-105 transition-transform">
              {(settings.displayName || 'U').charAt(0).toUpperCase()}
            </div>
            {!isSidebarCollapsed && (
              <div className="flex flex-col min-w-0 overflow-hidden">
                <span className="text-xs font-semibold text-txt-primary truncate group-hover:text-primary transition-colors">
                  {settings.displayName || 'Dharinish'}
                </span>
                <span className="text-[11px] text-txt-muted truncate">
                  Personal Workspace
                </span>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Drawer (with backdrop) */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <motion.div
              key="mobile-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsMobileSidebarOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs cursor-pointer z-40"
              aria-label="Close navigation backdrop"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
                  setIsMobileSidebarOpen(false);
                }
              }}
            />

            {/* Slide-out Drawer */}
            <motion.aside
              key="mobile-drawer"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: "spring", stiffness: 350, damping: 32 }}
              className="relative w-72 max-w-[85vw] bg-bg-card border-r border-border h-full flex flex-col shadow-2xl z-50"
            >
              {/* Drawer Header */}
              <div className="h-16 px-4 border-b border-border flex items-center justify-between shrink-0">
                <div 
                  onClick={() => handleNavClick('/dashboard')}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-lg shadow-xs select-none">
                    W
                  </div>
                  <span className="font-bold text-lg text-txt-primary tracking-tight">
                    My Workspace
                  </span>
                </div>
                <button
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className="w-9 h-9 rounded-xl border border-border-interactive/60 hover:border-border-interactive bg-bg-card hover:bg-bg-hover text-txt-secondary flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label="Close navigation drawer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mobile Quick Add Button */}
              <div className="p-3 pb-1 shrink-0">
                <button
                  onClick={() => {
                    setIsMobileSidebarOpen(false);
                    setIsTaskModalOpen(true);
                  }}
                  className="w-full h-10 px-3.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Quick Add Task</span>
                </button>
              </div>

              {/* Drawer Navigation List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const active = isItemActive(item.path);

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.path)}
                      className={`relative w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-[14px] transition-colors text-left cursor-pointer ${
                        active
                          ? 'bg-primary/15 text-primary font-bold'
                          : 'text-txt-secondary hover:text-txt-primary hover:bg-bg-hover font-medium'
                      }`}
                    >
                      <Icon className={`w-5 h-5 shrink-0 ${active ? 'text-primary' : 'text-txt-secondary'}`} />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Drawer Footer: Settings & Profile */}
              <div className="shrink-0 p-3 border-t border-border space-y-2 bg-bg-card">
                <button
                  onClick={() => handleNavClick('/settings')}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-[13px] font-medium text-txt-secondary hover:text-txt-primary hover:bg-bg-hover transition-colors cursor-pointer"
                >
                  <Settings className="w-5 h-5 text-txt-secondary" />
                  <span>Settings</span>
                </button>

                <div
                  onClick={() => handleNavClick('/settings')}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left hover:bg-bg-hover transition-colors cursor-pointer select-none"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-xs ring-1 ring-primary/30 shrink-0">
                    {(settings.displayName || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold text-txt-primary truncate">
                      {settings.displayName || 'Dharinish'}
                    </span>
                    <span className="text-[11px] text-txt-muted truncate">
                      Personal Workspace
                    </span>
                  </div>
                </div>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Quick Add Modals */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
      />
      <PageModal
        isOpen={isPageModalOpen}
        onClose={() => setIsPageModalOpen(false)}
      />
      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
      />
      <HabitModal
        isOpen={isHabitModalOpen}
        onClose={() => setIsHabitModalOpen(false)}
      />
    </>
  );
};
