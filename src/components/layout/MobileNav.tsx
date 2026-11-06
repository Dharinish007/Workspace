import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../../context/WorkspaceContext';
import { NavigationSection } from '../../types';
import { LayoutDashboard, CheckSquare, Calendar, Flame } from 'lucide-react';
import { motion } from 'framer-motion';

export const MobileNav: React.FC = () => {
  const navigate = useNavigate();
  const { activeSection } = useWorkspace();

  const items = [
    { id: 'dashboard' as NavigationSection, label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { id: 'todo' as NavigationSection, label: 'To-Do', icon: CheckSquare, path: '/tasks' },
    { id: 'calendar' as NavigationSection, label: 'Calendar', icon: Calendar, path: '/calendar' },
    { id: 'habits' as NavigationSection, label: 'Habits', icon: Flame, path: '/habits' },
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
            onClick={() => navigate(item.path)}
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
            <span className="font-sans text-[12px] font-medium tracking-tight">{item.label}</span>
          </motion.button>
        );
      })}
    </nav>
  );
};
