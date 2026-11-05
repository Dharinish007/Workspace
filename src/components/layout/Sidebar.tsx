import React from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { NavigationSection } from '../../types';
import { LayoutDashboard, CheckSquare, Calendar, Flame } from 'lucide-react';
import { motion } from 'framer-motion';

interface NavItem {
  id: NavigationSection;
  label: string;
  subtitle: string;
  icon: React.FC<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', subtitle: 'Overview', icon: LayoutDashboard },
  { id: 'todo', label: 'To-Do', subtitle: 'Tasks & Pages', icon: CheckSquare },
  { id: 'calendar', label: 'Calendar', subtitle: 'Planning', icon: Calendar },
  { id: 'habits', label: 'Habit Tracker', subtitle: 'Consistency', icon: Flame },
];

export const Sidebar: React.FC = () => {
  const { activeSection, setActiveSection, setSelectedPageId } = useWorkspace();

  return (
    <aside className="hidden md:flex flex-col w-56 lg:w-64 border-r border-border bg-bg-card min-h-[calc(100vh-4rem)] p-3 transition-colors duration-200">
      <div className="space-y-1.5 flex-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;

          return (
            <motion.button
              key={item.id}
              whileTap={{ scale: 0.98 }}
              whileHover={{ x: 2 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              onClick={() => {
                setActiveSection(item.id);
                if (item.id === 'todo') {
                  setSelectedPageId(null);
                }
              }}
              className={`relative w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-colors duration-150 text-left cursor-pointer overflow-hidden ${
                isActive
                  ? 'text-primary font-semibold'
                  : 'text-txt-secondary hover:text-txt-primary hover:bg-bg-hover/60'
              }`}
            >
              {/* Floating active pill */}
              {isActive && (
                <motion.div
                  layoutId="sidebarActivePill"
                  className="absolute inset-0 bg-primary-light/70 dark:bg-primary-light/30 border border-primary/20 rounded-xl"
                  transition={{ type: "spring", stiffness: 450, damping: 35 }}
                />
              )}

              <Icon
                className={`w-5 h-5 flex-shrink-0 z-10 transition-colors ${
                  isActive ? 'text-primary' : 'text-txt-muted'
                }`}
              />
              <div className="flex flex-col overflow-hidden z-10">
                <span className={`truncate text-sm ${isActive ? 'font-medium' : 'font-normal'}`}>
                  {item.label}
                </span>
                <span className="text-[11px] font-sans text-txt-muted truncate">
                  {item.subtitle}
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </aside>
  );
};
