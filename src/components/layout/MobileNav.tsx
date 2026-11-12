import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../../context/WorkspaceContext';
import { NavigationSection } from '../../types';
import { LayoutDashboard, CheckSquare, Calendar, Flame, BookOpen, FileText, Timer } from 'lucide-react';
import { motion } from 'framer-motion';

export const MobileNav: React.FC = () => {
  const navigate = useNavigate();
  const { activeSection, settings } = useWorkspace();

  const items = [
    { id: 'dashboard' as NavigationSection, label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { id: 'todo' as NavigationSection, label: 'Tasks', icon: CheckSquare, path: '/tasks' },
    { id: 'calendar' as NavigationSection, label: 'Calendar', icon: Calendar, path: '/calendar' },
    { id: 'habits' as NavigationSection, label: 'Habits', icon: Flame, path: '/habits' },
    { id: 'journal' as NavigationSection, label: 'Journal', icon: BookOpen, path: '/journal' },
    { id: 'notes' as NavigationSection, label: 'Notes', icon: FileText, path: '/notes' },
    { id: 'timer' as NavigationSection, label: 'Timer', icon: Timer, path: '/timer' },
  ].filter((item) => {
    if (item.id === 'dashboard') return true;
    const mod = settings?.modules?.[item.id as keyof typeof settings.modules];
    return mod ? mod.enabled !== false : true;
  });

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
                className="absolute top-0 w-8 h-1 bg-primary rounded-full"
                transition={{ duration: 0.15, ease: 'easeOut' }}
              />
            )}
            <Icon className={`w-5 h-5 mb-0.5 transition-colors ${isActive ? 'text-primary' : 'text-txt-muted'}`} />
            <span className="font-sans text-xs font-medium tracking-tight truncate max-w-full px-0.5">{item.label}</span>
          </motion.button>
        );
      })}
    </nav>
  );
};
