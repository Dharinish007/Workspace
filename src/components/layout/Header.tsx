import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Menu, ChevronRight } from 'lucide-react';

export const Header: React.FC = () => {
  const {
    toggleMobileSidebar,
    pages,
    selectedPageId,
    notes,
  } = useWorkspace();
  const location = useLocation();
  const navigate = useNavigate();

  // Compute Page Title dynamically based on current route
  const pageTitle = useMemo(() => {
    const p = location.pathname;
    if (p === '/dashboard' || p === '/') return 'Dashboard';
    if (p === '/tasks' || p === '/todo') return 'To-Do';
    if (p.startsWith('/journal')) return 'Journal';
    if (p.startsWith('/notes')) return 'Notes';
    if (p.startsWith('/timer') || p.startsWith('/activity')) return 'Timer';
    if (p === '/pages') return 'Pages';
    if (p.startsWith('/pages/')) {
      const pageIdFromUrl = p.replace('/pages/', '');
      const activeId = pageIdFromUrl || selectedPageId;
      const foundPage = pages.find(item => item.id === activeId);
      return foundPage ? foundPage.name : 'Pages';
    }
    if (p === '/calendar') return 'Calendar';
    if (p === '/habits') return 'Habit Tracker';
    if (p === '/settings') return 'Settings';
    return 'My Workspace';
  }, [location.pathname, location.pathname.startsWith('/pages/') ? pages : null, selectedPageId]);

  // Compute Breadcrumb Trail if on a detail or nested sub-route
  const breadcrumb = useMemo(() => {
    const p = location.pathname;
    if (p.startsWith('/pages/')) {
      const pageIdFromUrl = p.replace('/pages/', '');
      const activeId = pageIdFromUrl || selectedPageId;
      const foundPage = pages.find(item => item.id === activeId);
      return {
        parent: 'To-Do',
        parentPath: '/tasks',
        current: foundPage ? foundPage.name : 'Page Details',
      };
    }
    if (p.startsWith('/journal/')) {
      const dateParam = p.replace('/journal/', '');
      return {
        parent: 'Journal',
        parentPath: '/journal',
        current: dateParam,
      };
    }
    if (p.startsWith('/notes/')) {
      const noteId = p.replace('/notes/', '');
      const foundNote = notes.find(n => n.id === noteId);
      return {
        parent: 'Notes',
        parentPath: '/notes',
        current: foundNote?.title || 'Note',
      };
    }
    if (p.startsWith('/settings')) {
      const searchParams = new URLSearchParams(location.search);
      const tab = searchParams.get('tab');
      if (tab) {
        const tabNames: Record<string, string> = {
          general: 'General',
          appearance: 'Appearance',
          todo: 'To-Do',
          calendar: 'Calendar',
          habits: 'Habits',
          journal_notes: 'Journal & Notes',
          timer: 'Timer',
          cloud: 'Cloud Sync',
          backup: 'Backup & Restore',
          security: 'Security',
        };
        return {
          parent: 'Settings',
          parentPath: '/settings',
          current: tabNames[tab] || tab,
        };
      }
    }
    return null;
  }, [location.pathname, location.search, pages, selectedPageId, notes]);

  return (
    <header className="h-16 px-4 md:px-6 lg:px-8 border-b border-border bg-bg-card/95 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between shrink-0 transition-colors duration-200">
      {/* Left: Mobile hamburger menu toggle + Dynamic Page Title & Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={toggleMobileSidebar}
          aria-label="Open navigation drawer"
          title="Open navigation menu"
          className="md:hidden w-9 h-9 rounded-xl border border-border-interactive/60 hover:border-border-interactive bg-bg-card hover:bg-bg-hover text-txt-secondary hover:text-txt-primary flex items-center justify-center transition-colors cursor-pointer shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0"
        >
          <Menu className="w-5 h-5 text-txt-primary" />
        </button>

        <div className="min-w-0">
          {breadcrumb ? (
            <div className="flex items-center gap-1.5 text-xs sm:text-sm">
              <button
                onClick={() => navigate(breadcrumb.parentPath)}
                className="text-txt-muted hover:text-txt-primary font-medium transition-colors cursor-pointer truncate"
              >
                {breadcrumb.parent}
              </button>
              <ChevronRight className="w-3.5 h-3.5 text-txt-muted shrink-0" />
              <h1 className="font-bold font-serif text-txt-primary tracking-tight truncate select-none text-base sm:text-lg">
                {breadcrumb.current}
              </h1>
            </div>
          ) : (
            <h1 className="text-lg sm:text-xl font-bold font-serif text-txt-primary tracking-tight truncate select-none">
              {pageTitle}
            </h1>
          )}
        </div>
      </div>

      {/* Right: Reserved for page-specific actions where necessary */}
      <div id="page-header-actions" className="flex items-center gap-2 shrink-0 empty:hidden" />
    </header>
  );
};
