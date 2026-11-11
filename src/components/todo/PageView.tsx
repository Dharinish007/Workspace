import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Task, TaskFilter } from '../../types';
import { IconRenderer } from '../common/IconRegistry';
import { TaskItem } from './TaskItem';
import { TaskModal } from './TaskModal';
import { PageModal } from './PageModal';
import { formatLocalDate } from '../../db/indexedDB';
import { 
  Plus, 
  ArrowLeft, 
  Archive, 
  Edit3, 
  CheckSquare,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PageViewProps {
  pageId: string;
  onBackToOverview: () => void;
  onOpenArchived: () => void;
}

export const PageView: React.FC<PageViewProps> = ({
  pageId,
  onBackToOverview,
  onOpenArchived,
}) => {
  const navigate = useNavigate();
  const { 
    pages, 
    tasks, 
    archivePage, 
    reorderTasksInPage, 
    setSelectedPageId 
  } = useWorkspace();

  const [activeFilter, setActiveFilter] = useState<TaskFilter>('all');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [isPageModalOpen, setIsPageModalOpen] = useState(false);
  const [moveTaskModalTarget, setMoveTaskModalTarget] = useState<Task | null>(null);

  const activePages = pages.filter(p => !p.archived);
  const currentPage = pages.find(p => p.id === pageId);

  // Keyboard shortcut: N for new task in page
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput = target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.getAttribute('role') === 'textbox'
      );

      if (!isInput && e.key.toLowerCase() === 'n' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setTaskToEdit(null);
        setIsTaskModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!currentPage) {
    return (
      <div className="p-8 text-center bg-bg-card border border-border rounded-2xl max-w-md mx-auto my-12">
        <p className="text-txt-secondary text-sm mb-4 font-medium">Page not found or archived.</p>
        <button
          onClick={onBackToOverview}
          className="h-10 px-4 bg-primary text-white rounded-xl text-xs font-bold shadow-xs hover:bg-primary-hover transition-colors"
        >
          Return to To-Do Overview
        </button>
      </div>
    );
  }

  const allPageTasks = tasks.filter(t => t.pageId === pageId);
  const totalTasks = allPageTasks.length;
  const completedTasks = allPageTasks.filter(t => t.completed).length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const todayStr = formatLocalDate(new Date());

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return allPageTasks.filter(task => {
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
  }, [allPageTasks, activeFilter, todayStr]);

  // Sort tasks
  const sortedTasks = useMemo(() => {
    const incomplete = filteredTasks.filter(t => !t.completed).sort((a, b) => {
      if (a.important !== b.important) return a.important ? -1 : 1;

      if (a.dueDate && b.dueDate) {
        const diff = a.dueDate.localeCompare(b.dueDate);
        if (diff !== 0) return diff;
      } else if (a.dueDate) return -1;
      else if (b.dueDate) return 1;

      const priorityWeight: Record<string, number> = { high: 3, medium: 2, low: 1 };
      const pDiff = priorityWeight[b.priority] - priorityWeight[a.priority];
      if (pDiff !== 0) return pDiff;

      return a.order - b.order;
    });

    const completed = filteredTasks.filter(t => t.completed).sort((a, b) => {
      const aTime = a.completedAt ? new Date(a.completedAt).getTime() : 0;
      const bTime = b.completedAt ? new Date(b.completedAt).getTime() : 0;
      return bTime - aTime;
    });

    return [...incomplete, ...completed];
  }, [filteredTasks]);

  // Counts for filter pills
  const filterCounts = useMemo(() => {
    return {
      all: allPageTasks.length,
      open: allPageTasks.filter(t => !t.completed).length,
      important: allPageTasks.filter(t => t.important).length,
      completed: allPageTasks.filter(t => t.completed).length,
      today: allPageTasks.filter(t => t.dueDate === todayStr || (t.dueDate && t.dueDate < todayStr && !t.completed)).length,
    };
  }, [allPageTasks, todayStr]);

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetTaskId: string) => {
    e.preventDefault();
    const sourceTaskId = e.dataTransfer.getData('text/plain');
    if (!sourceTaskId || sourceTaskId === targetTaskId) return;

    const currentIds = sortedTasks.map(t => t.id);
    const sourceIndex = currentIds.indexOf(sourceTaskId);
    const targetIndex = currentIds.indexOf(targetTaskId);

    if (sourceIndex === -1 || targetIndex === -1) return;

    const reordered = [...currentIds];
    const [moved] = reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    await reorderTasksInPage(pageId, reordered);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Secondary Navigation (inside To-Do section) */}
      <aside className="w-full lg:w-64 flex-shrink-0 space-y-4">
        <motion.button
          whileHover={{ x: -2 }}
          whileTap={{ scale: 0.97 }}
          onClick={onBackToOverview}
          className="h-10 px-3 rounded-xl flex items-center gap-2 text-xs font-sans font-bold text-txt-secondary hover:text-primary hover:bg-bg-card border border-transparent hover:border-border transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>All Pages Overview</span>
        </motion.button>

        <div className="bg-bg-card border border-border rounded-2xl p-4 shadow-card space-y-1.5">
          <div className="text-xs font-sans font-bold uppercase tracking-wider text-txt-muted px-2 py-1.5 flex items-center justify-between">
            <span>Pages</span>
            <span className="text-xs bg-bg-subtle px-2 py-0.5 rounded-full text-txt-secondary font-mono font-bold border border-border">
              {activePages.length}
            </span>
          </div>

          <div className="space-y-1">
            {activePages.map(p => {
              const isSelected = p.id === pageId;
              const count = tasks.filter(t => t.pageId === p.id && !t.completed).length;

              return (
                <motion.button
                  key={p.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedPageId(p.id)}
                  className={`w-full min-h-[44px] flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-sans font-medium transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-primary-light text-primary font-bold shadow-2xs border border-primary/20'
                      : 'text-txt-secondary hover:text-txt-primary hover:bg-bg-hover'
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-white flex-shrink-0 shadow-2xs"
                      style={{ backgroundColor: p.color }}
                    >
                      <IconRenderer name={p.icon} className="w-3.5 h-3.5" />
                    </div>
                    <span className="truncate">{p.name}</span>
                  </div>
                  {count > 0 && (
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-bg-card text-txt-muted border border-border">
                      {count}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>

          <hr className="my-2 border-border" />

          {/* Archived Link */}
          <button
            onClick={onOpenArchived}
            className="w-full h-10 flex items-center gap-2.5 px-3.5 rounded-xl text-xs font-sans font-semibold text-txt-muted hover:text-txt-primary hover:bg-bg-hover transition-colors cursor-pointer"
          >
            <Archive className="w-4 h-4 text-txt-muted" />
            <span>Archived Pages</span>
          </button>
        </div>
      </aside>

      {/* Main Page Content */}
      <div className="flex-1 space-y-6 min-w-0">
        {/* Page Header */}
        <div className="bg-bg-card border border-border rounded-2xl p-6 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-sm flex-shrink-0"
              style={{ backgroundColor: currentPage.color }}
            >
              <IconRenderer name={currentPage.icon} className="w-7 h-7" />
            </motion.div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-[26px] sm:text-[28px] font-bold text-txt-primary tracking-tight">{currentPage.name}</h1>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsPageModalOpen(true)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-txt-muted hover:text-txt-primary hover:bg-bg-subtle transition-colors cursor-pointer"
                  title="Edit page name, icon, or color"
                  aria-label="Edit page"
                >
                  <Edit3 className="w-4 h-4" />
                </motion.button>
              </div>
              <p className="text-[13px] sm:text-[14px] font-sans text-txt-secondary font-medium mt-1">
                {totalTasks} total tasks · {completedTasks} completed ({progressPercent}%)
              </p>
              {/* Progress Bar */}
              <div className="w-48 sm:w-64 h-2 bg-bg-subtle rounded-full mt-2.5 overflow-hidden border border-border">
                <motion.div
                  className="h-full bg-emerald-600 dark:bg-emerald-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-shrink-0">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => archivePage(currentPage.id)}
              className="h-10 px-4 text-xs font-sans font-bold text-txt-secondary hover:text-txt-primary bg-bg-subtle hover:bg-bg-hover border border-border rounded-xl flex items-center gap-2 transition-colors cursor-pointer shadow-2xs"
              title="Archive page"
            >
              <Archive className="w-4 h-4 text-txt-muted" />
              <span>Archive</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
              onClick={() => {
                setTaskToEdit(null);
                setIsTaskModalOpen(true);
              }}
              className="h-10 px-4 text-xs font-sans font-bold text-white bg-primary hover:bg-primary-hover rounded-xl flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Task</span>
              <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 text-xs font-mono font-bold bg-white/20 text-white rounded-md">
                N
              </kbd>
            </motion.button>

            {/* Module Settings Shortcut */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/settings?tab=todo')}
              className="h-10 w-10 bg-bg-card border border-border hover:bg-bg-hover text-txt-secondary hover:text-txt-primary rounded-xl flex items-center justify-center shadow-2xs transition-colors cursor-pointer"
              title="To-Do Settings"
              aria-label="To-Do Settings"
            >
              <Settings className="w-4 h-4" />
            </motion.button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {[
            { id: 'all' as TaskFilter, label: 'All Tasks', count: filterCounts.all },
            { id: 'open' as TaskFilter, label: 'Open', count: filterCounts.open },
            { id: 'important' as TaskFilter, label: 'Important ⭐', count: filterCounts.important },
            { id: 'completed' as TaskFilter, label: 'Completed', count: filterCounts.completed },
            { id: 'today' as TaskFilter, label: 'Today', count: filterCounts.today },
          ].map(f => (
            <motion.button
              key={f.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveFilter(f.id)}
              className={`h-9 px-4 rounded-full text-xs font-sans flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer shadow-2xs ${
                activeFilter === f.id
                  ? 'bg-primary text-white shadow-xs font-bold ring-1 ring-primary-hover/50'
                  : 'bg-bg-card hover:bg-bg-hover text-txt-secondary border border-border font-semibold'
              }`}
            >
              <span>{f.label}</span>
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                activeFilter === f.id ? 'bg-white/20 text-white' : 'bg-bg-subtle text-txt-secondary border border-border'
              }`}>
                {f.count}
              </span>
            </motion.button>
          ))}
        </div>

        {/* Task List */}
        <div className="space-y-2.5">
          {sortedTasks.length === 0 ? (
            <div className="bg-bg-card border border-border rounded-2xl p-12 text-center shadow-card">
              <CheckSquare className="w-10 h-10 text-txt-muted mx-auto mb-3 opacity-60" />
              <h3 className="text-lg font-bold text-txt-primary">No tasks in this view</h3>
              <p className="text-xs sm:text-sm font-sans text-txt-muted mt-1 max-w-sm mx-auto">
                {activeFilter === 'all'
                  ? 'Get started by creating your first task in this page.'
                  : `No tasks match the "${activeFilter}" filter.`}
              </p>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  setTaskToEdit(null);
                  setIsTaskModalOpen(true);
                }}
                className="mt-5 h-10 px-5 bg-primary text-white text-xs font-sans font-bold rounded-xl inline-flex items-center gap-2 shadow-xs hover:bg-primary-hover cursor-pointer transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Task</span>
              </motion.button>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {sortedTasks.map((task, index) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  serialNumber={index + 1}
                  isDraggable={activeFilter === 'all'}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onEdit={t => {
                    setTaskToEdit(t);
                    setIsTaskModalOpen(true);
                  }}
                  onMove={t => {
                    setMoveTaskModalTarget(t);
                    setIsTaskModalOpen(true);
                  }}
                />
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Add Task control at bottom */}
        {sortedTasks.length > 3 && (
          <div className="pt-2">
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setTaskToEdit(null);
                setIsTaskModalOpen(true);
              }}
              className="w-full h-12 border border-dashed border-border hover:border-primary rounded-xl text-sm font-sans font-bold text-txt-secondary hover:text-primary bg-bg-card hover:bg-bg-hover flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-2xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add another task to {currentPage.name}</span>
            </motion.button>
          </div>
        )}
      </div>

      {/* Task Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setTaskToEdit(null);
        }}
        taskToEdit={taskToEdit || moveTaskModalTarget}
        defaultPageId={pageId}
      />

      {/* Page Edit Modal */}
      <PageModal
        isOpen={isPageModalOpen}
        onClose={() => setIsPageModalOpen(false)}
        pageToEdit={currentPage}
      />
    </div>
  );
};
