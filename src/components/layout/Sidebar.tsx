import React from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { NavigationSection } from '../../types';
import { LayoutDashboard, CheckSquare, Calendar, Flame } from 'lucide-react';

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
    <aside className="hidden md:flex flex-col w-56 lg:w-64 border-r border-border bg-bg-card min-h-[calc(100vh-4rem)] p-3">
      <div className="space-y-1.5 flex-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;

          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveSection(item.id);
                if (item.id === 'todo') {
                  // Going to To-Do landing (all pages overview)
                  setSelectedPageId(null);
                }
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 text-left ${
                isActive
                  ? 'bg-primary-light text-primary font-semibold shadow-xs'
                  : 'text-txt-secondary hover:text-txt-primary hover:bg-bg-hover'
              }`}
            >
              <Icon
                className={`w-5 h-5 flex-shrink-0 ${
                  isActive ? 'text-primary' : 'text-txt-muted'
                }`}
              />
              <div className="flex flex-col overflow-hidden">
                <span className="truncate">{item.label}</span>
                <span className="text-[11px] font-normal text-txt-muted truncate">
                  {item.subtitle}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
};

