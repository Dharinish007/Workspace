import React from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Page, Task } from '../../types';
import { IconRenderer } from '../common/IconRegistry';
import { ChevronRight, CheckSquare, Square, Flag } from 'lucide-react';

interface PageCardProps {
  page: Page;
  onOpenPage: (pageId: string) => void;
  onEditPage: (page: Page) => void;
}

export const PageCard: React.FC<PageCardProps> = ({ page, onOpenPage }) => {
  const { tasks, toggleTaskCompleted } = useWorkspace();

  const pageTasks = tasks.filter(t => t.pageId === page.id);
  const totalCount = pageTasks.length;
  const completedCount = pageTasks.filter(t => t.completed).length;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Pending task previews: up to 5, ordered by:
  // 1. Incomplete High-priority tasks
  // 2. Other incomplete tasks, by manual order
  const pendingTasks = pageTasks.filter(t => !t.completed);
  const highPriority = pendingTasks.filter(t => t.priority === 'high').sort((a, b) => a.order - b.order);
  const otherPriority = pendingTasks.filter(t => t.priority !== 'high').sort((a, b) => a.order - b.order);
  const previews = [...highPriority, ...otherPriority].slice(0, 5);

  return (
    <div 
      onClick={() => onOpenPage(page.id)}
      className="bg-bg-card border border-border hover:border-primary/50 shadow-card hover:shadow-card-hover rounded-2xl p-5 transition-all duration-200 cursor-pointer flex flex-col justify-between group"
    >
      <div>
        {/* Card Header: Icon, Name, and Chevron */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xs"
              style={{ backgroundColor: page.color }}
            >
              <IconRenderer name={page.icon} className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-txt-primary group-hover:text-primary transition-colors flex items-center gap-1.5">
                <span>{page.name}</span>
                <ChevronRight className="w-4 h-4 text-txt-muted group-hover:translate-x-0.5 transition-transform" />
              </h3>
              <p className="text-xs text-txt-muted">
                {totalCount} task{totalCount === 1 ? '' : 's'} · {completedCount} done
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-sm font-bold text-txt-primary">
              {completionPercentage}%
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-bg-subtle rounded-full h-1.5 mb-4 overflow-hidden border border-border-subtle">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${completionPercentage}%`,
              backgroundColor: page.color,
            }}
          />
        </div>

        {/* Pending Previews (up to 5) */}
        <div className="space-y-2 mt-2">
          {previews.length === 0 ? (
            <div className="py-4 text-center text-txt-muted text-xs italic">
              {totalCount === 0 ? 'No tasks yet' : 'All tasks completed! 🎉'}
            </div>
          ) : (
            previews.map(task => (
              <div
                key={task.id}
                onClick={e => e.stopPropagation()}
                className="flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-bg-subtle transition-colors text-xs group/item"
              >
                <div className="flex items-center gap-2 overflow-hidden flex-1">
                  <button
                    onClick={() => toggleTaskCompleted(task.id)}
                    className="text-txt-muted hover:text-primary transition-colors flex-shrink-0"
                    title="Mark complete"
                  >
                    <Square className="w-4 h-4" />
                  </button>
                  <span className="truncate text-txt-primary font-medium">
                    {task.title}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {task.priority === 'high' && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                      High
                    </span>
                  )}
                  {task.priority === 'medium' && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                      Med
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer count indicator if more pending exist */}
      {pendingTasks.length > 5 && (
        <div className="mt-3 pt-2 border-t border-border-subtle text-[11px] text-txt-muted font-medium flex items-center justify-between">
          <span>+{pendingTasks.length - 5} more pending tasks</span>
          <span className="text-primary font-semibold">View all &rarr;</span>
        </div>
      )}
    </div>
  );
};

