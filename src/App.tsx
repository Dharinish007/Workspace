import React from 'react';
import { WorkspaceProvider, useWorkspace } from './context/WorkspaceContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { MobileNav } from './components/layout/MobileNav';
import { Toast } from './components/common/Toast';
import { SearchModal } from './components/modals/SearchModal';
import { SettingsModal } from './components/modals/SettingsModal';
import { DashboardModule } from './components/dashboard/DashboardModule';
import { TodoModule } from './components/todo/TodoModule';
import { CalendarModule } from './components/calendar/CalendarModule';
import { HabitModule } from './components/habits/HabitModule';
import { motion, AnimatePresence } from 'framer-motion';

const WorkspaceContent: React.FC = () => {
  const { isInitialized, activeSection, errorMessage } = useWorkspace();

  if (errorMessage) {
    return (
      <div className="min-h-screen bg-bg-main flex items-center justify-center p-4">
        <div className="bg-bg-card border border-red-500/30 rounded-2xl p-6 max-w-md w-full shadow-modal text-center space-y-3">
          <div className="text-red-500 font-bold text-base font-serif">Database Error</div>
          <p className="text-xs text-txt-secondary leading-relaxed">{errorMessage}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-white text-xs font-semibold rounded-xl shadow-xs hover:bg-primary-hover transition-colors"
          >
            Reload Workspace
          </button>
        </div>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-bg-main flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary animate-pulse flex items-center justify-center text-white font-serif font-bold text-xl shadow-md">
            W
          </div>
          <span className="text-xs font-medium text-txt-muted tracking-wider uppercase font-sans">
            Loading Workspace...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-main flex flex-col transition-colors duration-200">
      <Header />

      <div className="flex-1 flex pb-16 md:pb-0">
        <Sidebar />

        <main className="flex-1 overflow-x-hidden min-h-[calc(100vh-4rem)]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
            >
              {activeSection === 'dashboard' && <DashboardModule />}
              {activeSection === 'todo' && <TodoModule />}
              {activeSection === 'calendar' && <CalendarModule />}
              {activeSection === 'habits' && <HabitModule />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <MobileNav />
      <SearchModal />
      <SettingsModal />
      <Toast />
    </div>
  );
};

export function App() {
  return (
    <WorkspaceProvider>
      <WorkspaceContent />
    </WorkspaceProvider>
  );
}

export default App;
