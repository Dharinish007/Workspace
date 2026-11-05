import React from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Page } from '../../types';
import { IconRenderer } from '../common/IconRegistry';
import { ChevronRight, Square, Flag } from 'lucide-react';
import { motion } from 'framer-motion';

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

  // Pending task previews: up to 5
  const pendingTasks = pageTasks.filter(t => !t.completed);
  const highPriority = pendingTasks.filter(t => t.priority === 'high').sort((a, b) => a.order - b.order);
  const otherPriority = pendingTasks.filter(t => t.priority !== 'high').sort((a, b) => a.order - b.order);
  const previews = [...highPriority, ...otherPriority].slice(0, 5);

  return (
    <motion.div 
      whileHover={{ y: -3, transition: { type: "spring", stiffness: 450, damping: 25 } }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onOpenPage(page.id)}
      className="bg-bg-card border border-border hover:border-primary/50 shadow-card hover:shadow-card-hover rounded-2xl p-5 transition-colors duration-150 cursor-pointer flex flex-col justify-between group select-none"
    >
      <div>
        {/* Card Header: Icon, Name, and Chevron */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <motion.div
              whileHover={{ scale: 1.08 }}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xs"
              style={{ backgroundColor: page.color }}
            >
              <IconRenderer name={page.icon} className="w-5 h-5" />
            </motion.div>
            <div>
              <h3 className="font-serif font-bold text-base text-txt-primary group-hover:text-primary transition-colors flex items-center gap-1.5 tracking-tight">
                <span>{page.name}</span>
                <ChevronRight className="w-4 h-4 text-txt-muted group-hover:translate-x-0.5 transition-transform" />
              </h3>
              <p className="text-xs font-sans text-txt-muted">
                {totalCount} task{totalCount === 1 ? '' : 's'} · {completedCount} done
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-sm font-mono font-bold text-txt-primary">
              {completionPercentage}%
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-bg-subtle rounded-full h-1.5 mb-4 overflow-hidden border border-border-subtle">
          <motion.div
            className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${completionPercentage}%` }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            style={{ backgroundColor: page.color }}
          />
        </div>

        {/* Pending Previews (up to 5) */}
        <div className="space-y-2 mt-2">
          {previews.length === 0 ? (
            <div className="py-4 text-center text-txt-muted text-xs font-sans italic">
              {totalCount === 0 ? 'No tasks yet' : 'All tasks completed! 🎉'}
            </div>
          ) : (
            previews.map(task => (
              <div
                key={task.id}
                onClick={e => e.stopPropagation()}
                className="flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-bg-subtle transition-colors text-xs font-sans group/item"
              >
                <div className="flex items-center gap-2 overflow-hidden flex-1">
                  <motion.button
                    whileTap={{ scale: 0.82 }}
                    onClick={() => toggleTaskCompleted(task.id)}
                    className="text-txt-muted hover:text-primary transition-colors flex-shrink-0 cursor-pointer"
                    title="Mark complete"
                  >
                    <Square className="w-4 h-4" />
                  </motion.button>
                  <span className="truncate text-txt-primary font-medium">
                    {task.title}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {task.priority === 'high' && (
                    <span className="text-[10px] font-bold text-red-600 dark:text-red-400">
                      <Flag className="w-3 h-3 fill-current" />
                    </span>
                  )}
                  {task.dueDate && (
                    <span className="text-[10px] font-mono text-txt-muted">
                      {task.dueDate.slice(5)}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs font-sans text-txt-muted">
        <span>View page</span>
        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
      </div>
    </motion.div>
  );
};
