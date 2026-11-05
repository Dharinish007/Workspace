import React from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { NavigationSection } from '../../types';
import { LayoutDashboard, CheckSquare, Calendar, Flame } from 'lucide-react';
import { motion } from 'framer-motion';

export const MobileNav: React.FC = () => {
  const { activeSection, setActiveSection, setSelectedPageId } = useWorkspace();

  const items = [
    { id: 'dashboard' as NavigationSection, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'todo' as NavigationSection, label: 'To-Do', icon: CheckSquare },
    { id: 'calendar' as NavigationSection, label: 'Calendar', icon: Calendar },
    { id: 'habits' as NavigationSection, label: 'Habits', icon: Flame },
  ];

  return (
    <nav 
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-bg-card/95 backdrop-blur-md border-t border-border flex items-center justify-around px-2 z-30 shadow-lg transition-colors duration-200"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeSection === item.id;

        return (
          <motion.button
            key={item.id}
            whileTap={{ scale: 0.92 }}
            onClick={() => {
              setActiveSection(item.id);
              if (item.id === 'todo') {
                setSelectedPageId(null);
              }
            }}
            aria-label={item.label}
            className={`relative flex flex-col items-center justify-center flex-1 h-full py-1 text-xs transition-colors cursor-pointer select-none ${
              isActive ? 'text-primary font-bold' : 'text-txt-muted hover:text-txt-primary'
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="mobileActiveIndicator"
                className="absolute top-0 w-10 h-1 bg-primary rounded-full"
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
            <Icon className={`w-5 h-5 mb-1 transition-colors ${isActive ? 'text-primary' : 'text-txt-muted'}`} />
            <span className="font-sans text-xs font-medium tracking-tight">{item.label}</span>
          </motion.button>
        );
      })}
    </nav>
  );
};
