import React, { useState } from 'react';
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
  FolderPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TodoLandingProps {
  onOpenPage: (pageId: string) => void;
}

export const TodoLanding: React.FC<TodoLandingProps> = ({ onOpenPage }) => {
  const { pages, tasks, reorderPages } = useWorkspace();

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
    <div className="space-y-6">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-txt-primary tracking-tight">To-Do</h1>
          <p className="text-xs font-sans text-txt-muted mt-0.5">
            Organize tasks by page, view pending items, and manage workflows.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {archivedPagesCount > 0 && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsArchivedModalOpen(true)}
              className="px-3.5 py-2 text-xs font-sans font-semibold text-txt-muted hover:text-txt-primary bg-bg-card hover:bg-bg-hover border border-border rounded-xl flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Archived ({archivedPagesCount})</span>
            </motion.button>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
            onClick={() => setIsPageModalOpen(true)}
            className="px-4 py-2 text-xs font-sans font-semibold text-white bg-primary hover:bg-primary-hover rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <FolderPlus className="w-4 h-4" />
            <span>New Page</span>
          </motion.button>
        </div>
      </div>

      {/* Filter Tabs across all pages */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {[
          { id: 'all' as TaskFilter, label: 'All Tasks', count: totalTasks },
          { id: 'open' as TaskFilter, label: 'Open', count: openTasks },
          { id: 'important' as TaskFilter, label: 'Important ⭐', count: importantTasks },
          { id: 'completed' as TaskFilter, label: 'Completed', count: completedTasks },
          { id: 'today' as TaskFilter, label: 'Today', count: todayTasks },
        ].map(f => (
          <motion.button
            key={f.id}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveFilter(f.id)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-sans font-medium flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
              activeFilter === f.id
                ? 'bg-primary text-white shadow-xs font-semibold'
                : 'bg-bg-card hover:bg-bg-hover text-txt-secondary border border-border'
            }`}
          >
            <span>{f.label}</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                activeFilter === f.id
                  ? 'bg-white/25 text-white'
                  : 'bg-bg-subtle text-txt-muted'
              }`}
            >
              {f.count}
            </span>
          </motion.button>
        ))}
      </div>

      {/* If a filter other than 'all' is selected, show cross-page filtered task view */}
      {activeFilter !== 'all' && (
        <div className="bg-bg-card border border-border rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-serif font-bold text-txt-primary flex items-center gap-2 tracking-tight">
              <span>Filtered Tasks: {activeFilter.toUpperCase()}</span>
              <span className="text-xs font-sans font-normal text-txt-muted">
                ({filteredTasksAcrossPages.length} tasks across all pages)
              </span>
            </h2>
            <button
              onClick={() => setActiveFilter('all')}
              className="text-xs font-sans text-primary font-semibold hover:underline cursor-pointer"
            >
              Back to All Pages
            </button>
          </div>

          <div className="space-y-2">
            {filteredTasksAcrossPages.length === 0 ? (
              <div className="py-8 text-center text-xs font-sans text-txt-muted">
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
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-sans font-bold uppercase tracking-wider text-txt-muted">
            Pages ({activePages.length})
          </h2>
          <span className="text-xs font-sans text-txt-muted hidden sm:inline">
            Drag cards to reorder
          </span>
        </div>

        {activePages.length === 0 ? (
          <div className="bg-bg-card border border-border rounded-2xl p-12 text-center space-y-3">
            <h3 className="text-lg font-serif font-bold text-txt-primary">No active pages</h3>
            <p className="text-xs font-sans text-txt-muted max-w-sm mx-auto">
              Create a page to start organizing your tasks, projects, and goals.
            </p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setIsPageModalOpen(true)}
              className="px-4 py-2 bg-primary text-white text-xs font-sans font-semibold rounded-xl inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Page</span>
            </motion.button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
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
