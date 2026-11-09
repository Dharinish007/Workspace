import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { WorkspaceProvider, useWorkspace } from './context/WorkspaceContext';
import { AuthProvider } from './context/AuthContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { MobileNav } from './components/layout/MobileNav';
import { Toast } from './components/common/Toast';
import { SearchModal } from './components/modals/SearchModal';
import { DashboardModule } from './components/dashboard/DashboardModule';
import { TodoModule } from './components/todo/TodoModule';
import { CalendarModule } from './components/calendar/CalendarModule';
import { HabitModule } from './components/habits/HabitModule';
import { JournalModule } from './components/journal/JournalModule';
import { NotesModule } from './components/notes/NotesModule';
import { SettingsView } from './components/settings/SettingsView';
import { TimerModule } from './features/timer/pages/TimerModule';
import { NotFoundPage } from './components/common/NotFoundPage';
import { motion, AnimatePresence } from 'framer-motion';

const WorkspaceContent: React.FC = () => {
  const { isInitialized, errorMessage } = useWorkspace();
  const location = useLocation();

  if (errorMessage) {
    return (
      <div className="min-h-screen bg-bg-main flex items-center justify-center p-4">
        <div className="bg-bg-card border border-red-500/30 rounded-2xl p-6 max-w-md w-full shadow-modal text-center space-y-3">
          <div className="text-red-500 font-bold text-base font-serif">Database Error</div>
          <p className="text-xs text-txt-secondary leading-relaxed">{errorMessage}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-txt-primary text-xs font-semibold rounded-xl shadow-xs hover:bg-primary-hover transition-colors"
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
          <div className="w-10 h-10 rounded-xl bg-primary animate-pulse flex items-center justify-center text-txt-primary font-serif font-bold text-xl shadow-md">
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
    <div className="h-screen w-screen overflow-hidden bg-bg-main flex transition-colors duration-200">
      {/* Stationary Full-Height Sidebar */}
      <Sidebar />

      {/* Main Layout Column: Sticky Header + Independently Scrollable Content */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        <Header />

        <main className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 pb-16 md:pb-6 scrollbar-thin">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
            >
              <Routes location={location}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardModule />} />
                <Route path="/tasks" element={<TodoModule />} />
                <Route path="/pages" element={<TodoModule />} />
                <Route path="/pages/:pageId" element={<TodoModule />} />
                <Route path="/calendar" element={<CalendarModule />} />
                <Route path="/habits" element={<HabitModule />} />
                <Route path="/journal" element={<JournalModule />} />
                <Route path="/journal/:date" element={<JournalModule />} />
                <Route path="/notes" element={<NotesModule />} />
                <Route path="/notes/:noteId" element={<NotesModule />} />
                <Route path="/timer" element={<TimerModule />} />
                <Route path="/activity" element={<TimerModule />} />
                <Route path="/settings" element={<SettingsView />} />
                <Route path="/todo" element={<Navigate to="/tasks" replace />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <MobileNav />
      <SearchModal />
      <Toast />
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <WorkspaceProvider>
        <WorkspaceContent />
      </WorkspaceProvider>
    </AuthProvider>
  );
}

export default App;
