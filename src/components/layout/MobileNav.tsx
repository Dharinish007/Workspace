import React from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { NavigationSection } from '../../types';
import { LayoutDashboard, CheckSquare, Calendar, Flame } from 'lucide-react';

export const MobileNav: React.FC = () => {
  const { activeSection, setActiveSection, setSelectedPageId } = useWorkspace();

  const items = [
    { id: 'dashboard' as NavigationSection, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'todo' as NavigationSection, label: 'To-Do', icon: CheckSquare },
    { id: 'calendar' as NavigationSection, label: 'Calendar', icon: Calendar },
    { id: 'habits' as NavigationSection, label: 'Habits', icon: Flame },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-bg-card border-t border-border flex items-center justify-around px-2 z-30 shadow-lg">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeSection === item.id;

        return (
          <button
            key={item.id}
            onClick={() => {
              setActiveSection(item.id);
              if (item.id === 'todo') {
                setSelectedPageId(null);
              }
            }}
            className={`flex flex-col items-center justify-center flex-1 py-1 text-xs transition-colors ${
              isActive ? 'text-primary font-semibold' : 'text-txt-muted hover:text-txt-primary'
            }`}
          >
            <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'text-primary' : 'text-txt-muted'}`} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

