import React, { Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { WorkspaceProvider, useWorkspace } from './context/WorkspaceContext';
import { AuthProvider } from './context/AuthContext';
import { Sidebar } from './components/layout/Sidebar';
import { MobileNav } from './components/layout/MobileNav';
import { Toast } from './components/common/Toast';
import { NotFoundPage } from './components/common/NotFoundPage';
import { motion, AnimatePresence } from 'framer-motion';

// Code-split route modules to drastically reduce initial bundle size and optimize startup time
const DashboardModule = React.lazy(() => import('./components/dashboard/DashboardModule').then(m => ({ default: m.DashboardModule })));
const TodoModule = React.lazy(() => import('./components/todo/TodoModule').then(m => ({ default: m.TodoModule })));
const CalendarModule = React.lazy(() => import('./components/calendar/CalendarModule').then(m => ({ default: m.CalendarModule })));
const HabitModule = React.lazy(() => import('./components/habits/HabitModule').then(m => ({ default: m.HabitModule })));
const JournalModule = React.lazy(() => import('./components/journal/JournalModule').then(m => ({ default: m.JournalModule })));
const NotesModule = React.lazy(() => import('./components/notes/NotesModule').then(m => ({ default: m.NotesModule })));
const SettingsView = React.lazy(() => import('./components/settings/SettingsView').then(m => ({ default: m.SettingsView })));
const TimerModule = React.lazy(() => import('./features/timer/pages/TimerModule').then(m => ({ default: m.TimerModule })));
const SearchModal = React.lazy(() => import('./components/modals/SearchModal').then(m => ({ default: m.SearchModal })));

const ModuleLoadingFallback: React.FC = () => (
  <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-pulse">
    <div className="h-8 bg-bg-card/70 rounded-xl w-48 border border-border/40" />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="h-28 bg-bg-card/70 rounded-2xl border border-border/40" />
      <div className="h-28 bg-bg-card/70 rounded-2xl border border-border/40" />
      <div className="h-28 bg-bg-card/70 rounded-2xl border border-border/40" />
    </div>
    <div className="h-72 bg-bg-card/70 rounded-2xl border border-border/40" />
  </div>
);

const RootRedirect: React.FC = () => {
  const { settings } = useWorkspace();
  const startupBehavior = settings.globalPreferences?.startupBehavior ?? 'landing_page';

  if (startupBehavior === 'last_visited') {
    const lastRoute = localStorage.getItem('my_workspace_last_route');
    if (lastRoute && lastRoute !== '/' && !lastRoute.startsWith('/settings')) {
      return <Navigate to={lastRoute} replace />;
    }
  }

  const landing = settings.general?.defaultLandingPage || 'dashboard';
  const target = landing === 'tasks' ? '/tasks' : `/${landing}`;
  return <Navigate to={target} replace />;
};

const WorkspaceContent: React.FC = () => {
  const { isInitialized, errorMessage } = useWorkspace();
  const location = useLocation();

  // Track last visited route for 'last_visited' startup behavior
  React.useEffect(() => {
    if (location.pathname && location.pathname !== '/' && !location.pathname.startsWith('/settings')) {
      localStorage.setItem('my_workspace_last_route', location.pathname + location.search);
    }
  }, [location.pathname, location.search]);

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
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white font-serif font-bold text-xl shadow-xs">
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

      {/* Main Layout Column: Independently Scrollable Content */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        <main className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 pb-16 md:pb-6 scrollbar-thin">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
            >
              <Suspense fallback={<ModuleLoadingFallback />}>
                <Routes location={location}>
                  <Route path="/" element={<RootRedirect />} />
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
                  <Route path="/activity" element={<Navigate to="/timer" replace />} />
                  <Route path="/settings" element={<SettingsView />} />
                  <Route path="/todo" element={<Navigate to="/tasks" replace />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <MobileNav />
      <Suspense fallback={null}>
        <SearchModal />
      </Suspense>
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
