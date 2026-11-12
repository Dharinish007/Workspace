import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Task, TaskFilter } from '../../types';
import { PageCard } from './PageCard';
import { PageModal } from './PageModal';
import { TaskModal } from './TaskModal';
import { ArchivedPagesModal } from './ArchivedPagesModal';
import { TaskItem } from './TaskItem';
import { formatLocalDate } from '../../db/indexedDB';
import { 
  Plus, 
  Archive, 
  FolderPlus,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TodoLandingProps {
  onOpenPage: (pageId: string) => void;
}

export const TodoLanding: React.FC<TodoLandingProps> = ({ onOpenPage }) => {
  const { pages, tasks, reorderPages } = useWorkspace();
  const navigate = useNavigate();

  const [activeFilter, setActiveFilter] = useState<TaskFilter>('all');
  const [isPageModalOpen, setIsPageModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isArchivedModalOpen, setIsArchivedModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  const activePages = pages.filter(p => !p.archived);
  const archivedPagesCount = pages.filter(p => p.archived).length;

  const todayStr = formatLocalDate(new Date());

  // Global counts across active pages
  const activePageIds = new Set(activePages.map(p => p.id));
  const activeTasks = tasks.filter(t => activePageIds.has(t.pageId));

  const totalTasks = activeTasks.length;
  const openTasks = activeTasks.filter(t => !t.completed).length;
  const importantTasks = activeTasks.filter(t => t.important && !t.completed).length;
  const completedTasks = activeTasks.filter(t => t.completed).length;
  const todayTasks = activeTasks.filter(t => t.dueDate === todayStr || (t.dueDate && t.dueDate < todayStr && !t.completed)).length;

  // Filtered tasks across all pages (when filter != 'all')
  const filteredTasksAcrossPages = activeTasks.filter(task => {
    if (activeFilter === 'open') return !task.completed;
    if (activeFilter === 'completed') return task.completed;
    if (activeFilter === 'important') return task.important;
    if (activeFilter === 'today') {
      return (
        (task.dueDate === todayStr) ||
        (task.dueDate && task.dueDate < todayStr && !task.completed)
      );
    }
    return true;
  });

  // Drag and drop for page cards
  const handleCardDragStart = (e: React.DragEvent, pageId: string) => {
    e.dataTransfer.setData('text/plain', pageId);
  };

  const handleCardDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleCardDrop = async (e: React.DragEvent, targetPageId: string) => {
    e.preventDefault();
    const sourcePageId = e.dataTransfer.getData('text/plain');
    if (!sourcePageId || sourcePageId === targetPageId) return;

    const currentIds = activePages.map(p => p.id);
    const sourceIndex = currentIds.indexOf(sourcePageId);
    const targetIndex = currentIds.indexOf(targetPageId);

    if (sourceIndex === -1 || targetIndex === -1) return;

    const reordered = [...currentIds];
    const [moved] = reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    await reorderPages(reordered);
  };

  return (
    <div className="space-y-7">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border-subtle">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-txt-primary tracking-tight">To-Do</h1>
          <p className="text-xs sm:text-sm font-sans text-txt-secondary font-medium mt-1">
            Organize tasks by page, view pending items, and manage workflows.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {archivedPagesCount > 0 && (
            <button
              onClick={() => setIsArchivedModalOpen(true)}
              className="h-10 px-4 text-xs font-sans font-bold text-txt-secondary hover:text-txt-primary bg-bg-card hover:bg-bg-hover border border-border rounded-xl flex items-center gap-2 transition-colors shadow-2xs cursor-pointer"
            >
              <Archive className="w-4 h-4 text-txt-muted" />
              <span>Archived ({archivedPagesCount})</span>
            </button>
          )}

          <button
            onClick={() => setIsPageModalOpen(true)}
            className="h-10 px-4 text-xs font-sans font-bold text-white bg-primary hover:bg-primary-hover rounded-xl flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <FolderPlus className="w-4 h-4" />
            <span>New Page</span>
          </button>

          {/* Module Settings Shortcut */}
          <button
            onClick={() => navigate('/settings?tab=todo')}
            className="h-10 w-10 bg-bg-card border border-border hover:bg-bg-hover text-txt-secondary hover:text-txt-primary rounded-xl flex items-center justify-center shadow-2xs transition-colors cursor-pointer"
            title="To-Do Settings"
            aria-label="To-Do Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Tabs across all pages */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {[
          { id: 'all' as TaskFilter, label: 'All Tasks', count: totalTasks },
          { id: 'open' as TaskFilter, label: 'Open', count: openTasks },
          { id: 'important' as TaskFilter, label: 'Important', count: importantTasks },
          { id: 'completed' as TaskFilter, label: 'Completed', count: completedTasks },
          { id: 'today' as TaskFilter, label: 'Today', count: todayTasks },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setActiveFilter(f.id)}
            className={`h-9 px-4 rounded-full text-xs font-sans flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer shadow-2xs ${
              activeFilter === f.id
                ? 'bg-primary text-white shadow-xs font-bold ring-1 ring-primary-hover/50'
                : 'bg-bg-card hover:bg-bg-hover text-txt-secondary border border-border font-semibold'
            }`}
          >
            <span>{f.label}</span>
            <span
              className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                activeFilter === f.id
                  ? 'bg-white/20 text-white'
                  : 'bg-bg-subtle text-txt-secondary border border-border'
              }`}
            >
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {/* If a filter other than 'all' is selected, show cross-page filtered task view */}
      {activeFilter !== 'all' && (
        <div className="bg-bg-card border border-border rounded-2xl p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <h2 className="text-lg font-serif font-bold text-txt-primary flex items-center gap-2 tracking-tight">
              <span>Filtered tasks: {activeFilter}</span>
              <span className="text-xs font-sans font-normal text-txt-muted">
                ({filteredTasksAcrossPages.length} tasks across all pages)
              </span>
            </h2>
            <button
              onClick={() => setActiveFilter('all')}
              className="text-xs font-sans text-primary font-bold hover:underline cursor-pointer"
            >
              Back to All Pages
            </button>
          </div>

          <div className="space-y-2.5">
            {filteredTasksAcrossPages.length === 0 ? (
              <div className="py-10 text-center text-sm font-sans text-txt-muted">
                No tasks match the "{activeFilter}" filter.
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {filteredTasksAcrossPages.map((task, idx) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    serialNumber={idx + 1}
                    onEdit={t => {
                      setTaskToEdit(t);
                      setIsTaskModalOpen(true);
                    }}
                    onMove={t => {
                      setTaskToEdit(t);
                      setIsTaskModalOpen(true);
                    }}
                  />
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>
      )}

      {/* Pages Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-sans font-bold uppercase tracking-wider text-txt-muted">
            Pages ({activePages.length})
          </h2>
          <span className="text-xs font-sans text-txt-muted hidden sm:inline">
            Drag cards to reorder
          </span>
        </div>

        {activePages.length === 0 ? (
          <div className="bg-bg-card border border-border rounded-2xl p-12 text-center space-y-3 shadow-card">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2">
              <FolderPlus className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-serif font-bold text-txt-primary">No active pages</h3>
            <p className="text-sm font-sans text-txt-muted max-w-sm mx-auto">
              Create your first page to start organizing tasks, projects, and personal routines.
            </p>
            <button
              onClick={() => setIsPageModalOpen(true)}
              className="mt-3 h-10 px-5 bg-primary text-white text-xs font-sans font-bold rounded-xl inline-flex items-center gap-2 shadow-xs hover:bg-primary-hover cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Create Page</span>
            </button>
          </div>
        ) : (
          <div className={`grid gap-5 ${
            activePages.length === 4
              ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4'
              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
          }`}>
            {activePages.map(page => (
              <div
                key={page.id}
                draggable
                onDragStart={e => handleCardDragStart(e, page.id)}
                onDragOver={handleCardDragOver}
                onDrop={e => handleCardDrop(e, page.id)}
              >
                <PageCard
                  page={page}
                  onOpenPage={onOpenPage}
                  onEditPage={() => {}}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <PageModal
        isOpen={isPageModalOpen}
        onClose={() => setIsPageModalOpen(false)}
      />

      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setTaskToEdit(null);
        }}
        taskToEdit={taskToEdit}
      />

      <ArchivedPagesModal
        isOpen={isArchivedModalOpen}
        onClose={() => setIsArchivedModalOpen(false)}
      />
    </div>
  );
};
