import React, { useState, useEffect, useMemo } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Page, Task, TaskFilter } from '../../types';
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
  Filter, 
  Star, 
  CheckCircle2, 
  Clock, 
  CheckSquare, 
  Layers 
} from 'lucide-react';

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
      <div className="p-8 text-center">
        <p className="text-txt-muted text-sm mb-4">Page not found or archived.</p>
        <button
          onClick={onBackToOverview}
          className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-semibold"
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
      return true; // 'all'
    });
  }, [allPageTasks, activeFilter, todayStr]);

  // Sort tasks: Section 6.6
  // 1. Incomplete before completed.
  // 2. Within incomplete: overdue first, then High > Medium > Low, then order.
  // 3. Within completed: most recently completed first.
  const sortedTasks = useMemo(() => {
    const priorityWeight: { [key: string]: number } = { high: 3, medium: 2, low: 1 };

    const incomplete = filteredTasks.filter(t => !t.completed).sort((a, b) => {
      const aOverdue = a.dueDate && a.dueDate < todayStr ? 1 : 0;
      const bOverdue = b.dueDate && b.dueDate < todayStr ? 1 : 0;
      if (aOverdue !== bOverdue) return bOverdue - aOverdue;

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
  }, [filteredTasks, todayStr]);

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
      <aside className="w-full lg:w-60 flex-shrink-0 space-y-4">
        <button
          onClick={onBackToOverview}
          className="flex items-center gap-2 text-xs font-semibold text-txt-secondary hover:text-primary transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>All Pages Overview</span>
        </button>

        <div className="bg-bg-card border border-border rounded-2xl p-3 shadow-xs space-y-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-txt-muted px-2 py-1.5 flex items-center justify-between">
            <span>Pages</span>
            <span className="text-[10px] bg-bg-subtle px-1.5 py-0.5 rounded text-txt-muted">
              {activePages.length}
            </span>
          </div>

          <div className="space-y-1">
            {activePages.map(p => {
              const isSelected = p.id === pageId;
              const count = tasks.filter(t => t.pageId === p.id && !t.completed).length;

              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPageId(p.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isSelected
                      ? 'bg-primary-light text-primary ring-1 ring-primary/20 shadow-xs'
                      : 'text-txt-secondary hover:text-txt-primary hover:bg-bg-hover'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <div
                      className="w-5 h-5 rounded-md flex items-center justify-center text-white flex-shrink-0"
                      style={{ backgroundColor: p.color }}
                    >
                      <IconRenderer name={p.icon} className="w-3 h-3" />
                    </div>
                    <span className="truncate">{p.name}</span>
                  </div>
                  {count > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-bg-card font-medium text-txt-muted border border-border-subtle">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <hr className="my-2 border-border" />

          {/* Archived Link */}
          <button
            onClick={onOpenArchived}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-txt-muted hover:text-txt-primary hover:bg-bg-hover transition-colors"
          >
            <Archive className="w-4 h-4" />
            <span>Archived Pages</span>
          </button>
        </div>
      </aside>

      {/* Main Page Content */}
      <div className="flex-1 space-y-5 min-w-0">
        {/* Page Header */}
        <div className="bg-bg-card border border-border rounded-2xl p-5 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-sm flex-shrink-0"
              style={{ backgroundColor: currentPage.color }}
            >
              <IconRenderer name={currentPage.icon} className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-txt-primary">{currentPage.name}</h1>
                <button
                  onClick={() => setIsPageModalOpen(true)}
                  className="p-1 text-txt-muted hover:text-txt-primary rounded transition-colors"
                  title="Edit page name, icon, or color"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-txt-muted mt-0.5">
                {totalTasks} total tasks · {completedTasks} completed ({progressPercent}%)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => archivePage(currentPage.id)}
              className="px-3 py-1.5 text-xs font-medium text-txt-muted hover:text-txt-primary bg-bg-subtle hover:bg-bg-hover border border-border rounded-xl flex items-center gap-1.5 transition-colors"
              title="Archive page"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Archive</span>
            </button>

            <button
              onClick={() => {
                setTaskToEdit(null);
                setIsTaskModalOpen(true);
              }}
              className="px-4 py-2 text-xs font-semibold text-white bg-primary hover:bg-primary-hover rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Task</span>
              <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.2 text-[10px] font-mono bg-white/20 rounded">
                N
              </kbd>
            </button>
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
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                activeFilter === f.id
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-bg-card hover:bg-bg-hover text-txt-secondary border border-border'
              }`}
            >
              <span>{f.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeFilter === f.id ? 'bg-white/20 text-white' : 'bg-bg-subtle text-txt-muted'
              }`}>
                {f.count}
              </span>
            </button>
          ))}
        </div>

        {/* Task List */}
        <div className="space-y-2">
          {sortedTasks.length === 0 ? (
            <div className="bg-bg-card border border-border rounded-2xl p-12 text-center">
              <CheckSquare className="w-8 h-8 text-txt-muted mx-auto mb-2 opacity-50" />
              <h3 className="text-sm font-semibold text-txt-primary">No tasks in this view</h3>
              <p className="text-xs text-txt-muted mt-1 max-w-xs mx-auto">
                {activeFilter === 'all'
                  ? 'Get started by creating your first task in this page.'
                  : `No tasks match the "${activeFilter}" filter.`}
              </p>
              <button
                onClick={() => {
                  setTaskToEdit(null);
                  setIsTaskModalOpen(true);
                }}
                className="mt-4 px-4 py-2 bg-primary text-white text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Task</span>
              </button>
            </div>
          ) : (
            sortedTasks.map((task, index) => (
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
            ))
          )}
        </div>

        {/* Add Task control at bottom (Section 6.3) */}
        {sortedTasks.length > 3 && (
          <div className="pt-2">
            <button
              onClick={() => {
                setTaskToEdit(null);
                setIsTaskModalOpen(true);
              }}
              className="w-full py-2.5 border border-dashed border-border hover:border-primary rounded-xl text-xs font-semibold text-txt-secondary hover:text-primary bg-bg-card hover:bg-bg-hover flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add another task to {currentPage.name}</span>
            </button>
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

