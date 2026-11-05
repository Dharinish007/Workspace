import React, { useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { NavigationSection } from '../../types';
import { LayoutDashboard, CheckSquare, Calendar, Flame, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface NavItem {
  id: NavigationSection;
  label: string;
  subtitle: string;
  icon: React.FC<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', subtitle: 'Overview & metrics', icon: LayoutDashboard },
  { id: 'todo', label: 'To-Do', subtitle: 'Tasks & Pages', icon: CheckSquare },
  { id: 'calendar', label: 'Calendar', subtitle: 'Schedule & events', icon: Calendar },
  { id: 'habits', label: 'Habit Tracker', subtitle: 'Consistency streaks', icon: Flame },
];

export const Sidebar: React.FC = () => {
  const { activeSection, setActiveSection, setSelectedPageId } = useWorkspace();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem('sidebar_collapsed', String(next));
  };

  return (
    <aside 
      className={`hidden md:flex flex-col border-r border-border bg-bg-card min-h-[calc(100vh-4rem)] p-3 transition-all duration-200 ${
        isCollapsed ? 'w-20' : 'w-60 lg:w-64'
      }`}
    >
      <div className="space-y-1.5 flex-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;

          return (
            <motion.button
              key={item.id}
              whileTap={{ scale: 0.98 }}
              whileHover={{ x: isCollapsed ? 0 : 2 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              onClick={() => {
                setActiveSection(item.id);
                if (item.id === 'todo') {
                  setSelectedPageId(null);
                }
              }}
              title={isCollapsed ? `${item.label} — ${item.subtitle}` : undefined}
              aria-label={item.label}
              className={`relative w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl min-h-[48px] text-sm transition-all duration-150 text-left cursor-pointer overflow-hidden ${
                isActive
                  ? 'text-primary font-bold'
                  : 'text-txt-secondary hover:text-txt-primary hover:bg-bg-hover'
              } ${isCollapsed ? 'justify-center px-0' : ''}`}
            >
              {/* Floating active pill */}
              {isActive && (
                <motion.div
                  layoutId="sidebarActivePill"
                  className="absolute inset-0 bg-primary-light/80 dark:bg-primary-light/40 border-l-4 border-primary rounded-xl"
                  transition={{ type: "spring", stiffness: 450, damping: 35 }}
                />
              )}

              <Icon
                className={`w-5 h-5 flex-shrink-0 z-10 transition-colors ${
                  isActive ? 'text-primary' : 'text-txt-secondary'
                }`}
              />

              {!isCollapsed && (
                <div className="flex flex-col overflow-hidden z-10">
                  <span className={`truncate text-sm ${isActive ? 'font-bold text-primary' : 'font-semibold text-txt-primary'}`}>
                    {item.label}
                  </span>
                  <span className={`text-xs font-sans truncate ${isActive ? 'text-primary/80 font-medium' : 'text-txt-muted'}`}>
                    {item.subtitle}
                  </span>
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Collapse toggle at bottom */}
      <div className="pt-3 border-t border-border">
        <button
          onClick={toggleCollapse}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-txt-muted hover:text-txt-primary hover:bg-bg-hover transition-colors ${
            isCollapsed ? 'justify-center px-0' : ''
          }`}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4 flex-shrink-0" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};
