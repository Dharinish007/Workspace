import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useWorkspace } from '../../context/WorkspaceContext';
import { 
  LayoutDashboard, 
  CheckSquare, 
  Calendar, 
  Flame, 
  BookOpen,
  FileText,
  PanelLeftClose, 
  PanelLeftOpen, 
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
];

export const Sidebar: React.FC = () => {
  const { 
    isSidebarCollapsed,
    toggleSidebar,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
    setSelectedPageId
  } = useWorkspace();
  const location = useLocation();
  const navigate = useNavigate();

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
    return location.pathname === path;
  };

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
                      isSidebarCollapsed ? 'border border-primary/30' : ''
                    }`}
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}

                <Icon 
                  className={`relative z-10 shrink-0 transition-colors ${
                    isSidebarCollapsed ? 'w-5 h-5' : 'w-5 h-5'
                  } ${
                    active 
                      ? 'text-primary' 
                      : 'text-txt-secondary group-hover:text-txt-primary'
                  }`} 
                />

                {!isSidebarCollapsed && (
                  <span className="relative z-10 truncate tracking-tight">
                    {item.label}
                  </span>
                )}
              </motion.button>
            );
          })}
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
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="relative z-50 w-72 max-w-[85vw] h-full bg-bg-card border-r border-border shadow-modal flex flex-col justify-between"
            >
              {/* Drawer Header */}
              <div className="h-16 px-4 flex items-center justify-between border-b border-border/60 shrink-0">
                <div 
                  onClick={() => handleNavClick('/dashboard')}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-lg shadow-xs">
                    W
                  </div>
                  <span className="font-bold text-[15px] text-txt-primary tracking-tight">
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
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
