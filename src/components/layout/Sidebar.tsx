import React, { useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useWorkspace } from '../../context/WorkspaceContext';
import { 
  LayoutDashboard, 
  CheckSquare, 
  Calendar, 
  Flame, 
  BookOpen,
  FileText,
  Timer,
  Search,
  Settings,
  PanelLeftClose, 
  PanelLeftOpen, 
  X,
  Menu
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DateSelectorPopover } from './DateSelectorPopover';
import { AppearancePopover } from './AppearancePopover';
import { ProfileDropdown } from './ProfileDropdown';

interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: React.FC<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { id: 'todo', label: 'To-Do', path: '/tasks', icon: CheckSquare },
  { id: 'calendar', label: 'Calendar', path: '/calendar', icon: Calendar },
  { id: 'habits', label: 'Habits', path: '/habits', icon: Flame },
  { id: 'journal', label: 'Journal', path: '/journal', icon: BookOpen },
  { id: 'notes', label: 'Notes', path: '/notes', icon: FileText },
  { id: 'timer', label: 'Timer', path: '/timer', icon: Timer },
];

export const Sidebar: React.FC = () => {
  const { 
    isSidebarCollapsed,
    toggleSidebar,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
    toggleMobileSidebar,
    setIsSearchOpen,
    setSelectedPageId,
    settings
  } = useWorkspace();
  const location = useLocation();
  const navigate = useNavigate();

  // Filter visible nav items by module enabled status
  const visibleNavItems = useMemo(() => {
    return NAV_ITEMS.filter((item) => {
      if (item.id === 'dashboard') return true;
      const mod = settings?.modules?.[item.id as keyof typeof settings.modules];
      return mod ? mod.enabled !== false : true;
    });
  }, [settings?.modules]);

  // Prevent background scrolling when mobile drawer is open
  useEffect(() => {
    if (isMobileSidebarOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isMobileSidebarOpen]);

  // Determine active item from current route
  const isItemActive = (path: string) => {
    if (path === '/tasks') {
      return (
        location.pathname === '/tasks' ||
        location.pathname === '/todo' ||
        location.pathname.startsWith('/pages')
      );
    }
    if (path === '/journal') {
      return location.pathname.startsWith('/journal');
    }
    if (path === '/notes') {
      return location.pathname.startsWith('/notes');
    }
    if (path === '/timer') {
      return location.pathname.startsWith('/timer') || location.pathname.startsWith('/activity');
    }
    return location.pathname === path;
  };

  const isSettingsActive = location.pathname.startsWith('/settings');

  const handleNavClick = (path: string) => {
    if (path === '/tasks') {
      setSelectedPageId(null);
    }
    navigate(path);
    if (isMobileSidebarOpen) {
      setIsMobileSidebarOpen(false);
    }
  };

  return (
    <>
      {/* Mobile Drawer Trigger (Floating button for mobile viewports) */}
      <button
        type="button"
        onClick={toggleMobileSidebar}
        className="md:hidden fixed top-3 left-3 z-30 w-9 h-9 rounded-xl bg-bg-card/95 backdrop-blur-md border border-border shadow-2xs flex items-center justify-center text-txt-secondary hover:text-txt-primary hover:bg-bg-hover transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label="Open navigation drawer"
      >
        <Menu className="w-4 h-4" />
      </button>

      {/* Desktop Stationary Sidebar */}
      <aside 
        aria-label="Main Navigation"
        className={`hidden md:flex flex-col h-full border-r border-border bg-bg-card transition-[width] duration-300 ease-in-out shrink-0 select-none z-30 ${
          isSidebarCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* 1. TOP SECTION: Logo, Workspace Name & Collapse Button */}
        {isSidebarCollapsed ? (
          <div className="h-16 flex items-center justify-center border-b border-border/60 shrink-0 px-2">
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
              className="flex items-center gap-2.5 cursor-pointer min-w-0 group"
              title="My Workspace"
            >
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-base shadow-2xs shrink-0 group-hover:bg-primary group-hover:text-white transition-all">
                <span className="font-serif">W</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-sm text-txt-primary tracking-tight truncate group-hover:text-primary transition-colors">
                  My Workspace
                </span>
              </div>
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

        {/* 2. SEARCH: Global Search Input / Command Palette Trigger */}
        {isSidebarCollapsed ? (
          <div className="p-2 shrink-0 flex justify-center">
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              title="Search workspace (Ctrl+K)"
              aria-label="Search workspace"
              className="w-10 h-10 rounded-xl hover:bg-bg-hover text-txt-secondary hover:text-primary flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="px-3 py-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              title="Search workspace (Ctrl+K)"
              aria-label="Search workspace"
              className="w-full h-9 px-2.5 rounded-xl border border-border bg-bg-card hover:bg-bg-hover hover:border-primary/50 text-txt-muted hover:text-txt-primary flex items-center justify-between text-xs transition-colors cursor-pointer shadow-2xs group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Search className="w-3.5 h-3.5 text-txt-muted group-hover:text-primary transition-colors shrink-0" />
                <span className="truncate">Search workspace</span>
              </div>
              <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-border bg-bg-main text-txt-muted shrink-0">
                Ctrl K
              </kbd>
            </button>
          </div>
        )}

        {/* 3. MAIN NAVIGATION: Scrollable Module Navigation */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-1 scrollbar-thin">
          {!isSidebarCollapsed && (
            <div className="px-2.5 pt-1 pb-1 text-[11px] font-semibold tracking-wider uppercase text-txt-muted/70 select-none">
              Navigation
            </div>
          )}

          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const active = isItemActive(item.path);

            return isSidebarCollapsed ? (
              <div key={item.id} className="flex justify-center">
                <button
                  type="button"
                  onClick={() => handleNavClick(item.path)}
                  title={item.label}
                  aria-label={item.label}
                  className={`relative w-10 h-10 rounded-xl flex items-center justify-center text-xs transition-colors cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    active
                      ? 'nav-item-active font-semibold shadow-2xs'
                      : 'text-txt-secondary hover:text-txt-primary hover:bg-bg-hover font-medium'
                  }`}
                >
                  <Icon 
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      active ? '' : 'text-txt-secondary group-hover:text-txt-primary'
                    }`} 
                  />
                </button>
              </div>
            ) : (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.path)}
                aria-label={item.label}
                className={`relative w-full flex items-center gap-3 px-3 h-9 rounded-xl text-xs transition-colors text-left cursor-pointer overflow-hidden group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  active
                    ? 'nav-item-active font-semibold shadow-2xs'
                    : 'text-txt-secondary hover:text-txt-primary hover:bg-bg-hover font-medium'
                }`}
              >
                <Icon 
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    active ? '' : 'text-txt-secondary group-hover:text-txt-primary'
                  }`} 
                />
                <span className="truncate tracking-tight">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* 4. WORKSPACE CONTROLS: Date Selector & Appearance Selector */}
        <div className="shrink-0 p-2 border-t border-border/60 overflow-visible relative space-y-1">
          {!isSidebarCollapsed && (
            <div className="px-2.5 pt-1 pb-0.5 text-[11px] font-semibold tracking-wider uppercase text-txt-muted/70 select-none">
              Workspace
            </div>
          )}
          <DateSelectorPopover isCollapsed={isSidebarCollapsed} />
          <AppearancePopover isCollapsed={isSidebarCollapsed} />
        </div>

        {/* 5. BOTTOM SECTION: Settings & Profile (Separated) */}
        <div className="shrink-0 p-2 border-t border-border/60 overflow-visible relative space-y-1">
          {/* Settings Navigation Item */}
          {isSidebarCollapsed ? (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => handleNavClick('/settings')}
                title="Settings"
                aria-label="Settings"
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs transition-colors cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  isSettingsActive
                    ? 'bg-primary/10 dark:bg-primary/20 text-primary font-semibold shadow-2xs'
                    : 'text-txt-secondary hover:text-txt-primary hover:bg-bg-hover font-medium'
                }`}
              >
                <Settings 
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isSettingsActive ? 'text-primary' : 'text-txt-secondary group-hover:text-txt-primary'
                  }`} 
                />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => handleNavClick('/settings')}
              aria-label="Settings"
              className={`relative w-full flex items-center gap-3 px-3 h-9 rounded-xl text-xs transition-colors text-left cursor-pointer overflow-hidden group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                isSettingsActive
                  ? 'bg-primary/10 dark:bg-primary/20 text-primary font-semibold'
                  : 'text-txt-secondary hover:text-txt-primary hover:bg-bg-hover font-medium'
              }`}
            >
              <Settings 
                className={`w-4 h-4 shrink-0 transition-colors ${
                  isSettingsActive ? 'text-primary' : 'text-txt-secondary group-hover:text-txt-primary'
                }`} 
              />
              <span className="truncate tracking-tight">Settings</span>
            </button>
          )}

          {/* User Profile with Avatar & Account Dropdown */}
          <ProfileDropdown isCollapsed={isSidebarCollapsed} onNavigate={() => {}} />
        </div>
      </aside>

      {/* Mobile Slide-Out Drawer (with backdrop) */}
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
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="relative z-50 w-72 max-w-[85vw] h-full bg-bg-card border-r border-border shadow-modal flex flex-col justify-between"
            >
              {/* Top Row: Workspace Brand & Close Button */}
              <div className="h-16 px-4 flex items-center justify-between border-b border-border/60 shrink-0">
                <div 
                  onClick={() => handleNavClick('/dashboard')}
                  className="flex items-center gap-2.5 cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-base shadow-2xs shrink-0">
                    <span className="font-serif">W</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-sm text-txt-primary tracking-tight">
                      My Workspace
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className="w-9 h-9 rounded-xl border border-border/60 hover:border-border bg-bg-card hover:bg-bg-hover text-txt-secondary flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label="Close navigation drawer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mobile Search */}
              <div className="px-3 pt-3 pb-1 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileSidebarOpen(false);
                    setIsSearchOpen(true);
                  }}
                  className="w-full h-9 px-2.5 rounded-xl border border-border bg-bg-main hover:bg-bg-hover text-txt-muted hover:text-txt-primary flex items-center justify-between text-xs transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Search className="w-3.5 h-3.5 text-txt-muted" />
                    <span>Search workspace...</span>
                  </div>
                  <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-border bg-bg-card text-txt-muted">
                    Ctrl K
                  </kbd>
                </button>
              </div>

              {/* Scrollable Navigation List */}
              <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 scrollbar-thin">
                <div className="px-2 pb-1 text-[11px] font-semibold tracking-wider uppercase text-txt-muted/70 select-none">
                  Navigation
                </div>
                {visibleNavItems.map((item) => {
                  const Icon = item.icon;
                  const active = isItemActive(item.path);

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNavClick(item.path)}
                      className={`relative w-full flex items-center gap-3 px-3 h-9 rounded-xl text-xs transition-colors text-left cursor-pointer ${
                        active
                          ? 'nav-item-active font-semibold shadow-2xs'
                          : 'text-txt-secondary hover:text-txt-primary hover:bg-bg-hover font-medium'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${active ? '' : 'text-txt-secondary'}`} />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Mobile Workspace Controls */}
              <div className="shrink-0 p-3 border-t border-border/60 space-y-1">
                <div className="px-2 pb-0.5 text-[11px] font-semibold tracking-wider uppercase text-txt-muted/70 select-none">
                  Workspace
                </div>
                <DateSelectorPopover isCollapsed={false} onNavigate={() => setIsMobileSidebarOpen(false)} />
                <AppearancePopover isCollapsed={false} />
              </div>

              {/* Mobile Bottom Section: Settings & Profile */}
              <div className="shrink-0 p-3 border-t border-border/60 space-y-1">
                <button
                  type="button"
                  onClick={() => handleNavClick('/settings')}
                  className={`relative w-full flex items-center gap-3 px-3 h-9 rounded-xl text-xs transition-colors text-left cursor-pointer ${
                    isSettingsActive
                      ? 'bg-primary/10 dark:bg-primary/20 text-primary font-semibold'
                      : 'text-txt-secondary hover:text-txt-primary hover:bg-bg-hover font-medium'
                  }`}
                >
                  <Settings className={`w-4 h-4 shrink-0 ${isSettingsActive ? 'text-primary' : 'text-txt-secondary'}`} />
                  <span className="truncate">Settings</span>
                </button>
                <ProfileDropdown isCollapsed={false} onNavigate={() => setIsMobileSidebarOpen(false)} />
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
