import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Task, Priority } from '../../types';
import { X, Calendar, Star, Flag, Folder } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskToEdit?: Task | null;
  defaultPageId?: string;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  taskToEdit,
  defaultPageId,
}) => {
  const { pages, createTask, updateTask, moveTaskToPage } = useWorkspace();

  const activePages = pages.filter(p => !p.archived);

  const [title, setTitle] = useState('');
  const [pageId, setPageId] = useState(defaultPageId || activePages[0]?.id || '');
  const [priority, setPriority] = useState<Priority>('medium');
  const [important, setImportant] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title);
      setPageId(taskToEdit.pageId);
      setPriority(taskToEdit.priority);
      setImportant(taskToEdit.important);
      setDueDate(taskToEdit.dueDate || '');
    } else {
      setTitle('');
      setPageId(defaultPageId || activePages[0]?.id || '');
      setPriority('medium');
      setImportant(false);
      setDueDate('');
    }
    setError(null);
  }, [taskToEdit, defaultPageId, activePages, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Task title is required');
      return;
    }
    if (!pageId) {
      setError('Please select a valid page');
      return;
    }

    try {
      if (taskToEdit) {
        if (taskToEdit.pageId !== pageId) {
          await moveTaskToPage(taskToEdit.id, pageId);
        }
        await updateTask(taskToEdit.id, {
          title: title.trim(),
          priority,
          important,
          dueDate: dueDate || null,
        });
      } else {
        await createTask({
          pageId,
          title: title.trim(),
          priority,
          important,
          dueDate: dueDate || null,
        });
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Operation failed');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop with blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
          />

          {/* Modal Container */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: "spring", stiffness: 450, damping: 32 }}
            className="bg-bg-card border border-border shadow-modal rounded-2xl w-full max-w-lg overflow-hidden flex flex-col z-10"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-xl font-serif font-bold text-txt-primary tracking-tight">
                {taskToEdit ? 'Edit Task' : 'New Task'}
              </h2>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-bg-subtle text-txt-muted hover:text-txt-primary transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-2.5 text-xs font-sans bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 rounded-lg">
                  {error}
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-xs font-sans font-semibold text-txt-secondary mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  autoFocus
                  value={title}
                  maxLength={200}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="What needs to be done?"
                  className="w-full px-3.5 py-2 text-sm font-sans bg-bg-subtle border border-border rounded-xl text-txt-primary outline-hidden focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Page Dropdown */}
              <div>
                <label className="block text-xs font-sans font-semibold text-txt-secondary mb-1 flex items-center gap-1.5">
                  <Folder className="w-3.5 h-3.5" />
                  <span>Page *</span>
                </label>
                <select
                  value={pageId}
                  onChange={e => setPageId(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm font-sans bg-bg-subtle border border-border rounded-xl text-txt-primary outline-hidden focus:border-primary cursor-pointer"
                >
                  {activePages.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Priority */}
                <div>
                  <label className="block text-xs font-sans font-semibold text-txt-secondary mb-1 flex items-center gap-1.5">
                    <Flag className="w-3.5 h-3.5" />
                    <span>Priority</span>
                  </label>
                  <select
                    value={priority}
                    onChange={e => setPriority(e.target.value as Priority)}
                    className="w-full px-3 py-2 text-sm font-sans bg-bg-subtle border border-border rounded-xl text-txt-primary outline-hidden focus:border-primary cursor-pointer"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                {/* Due Date */}
                <div>
                  <label className="block text-xs font-sans font-semibold text-txt-secondary mb-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Due Date</span>
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-sans bg-bg-subtle border border-border rounded-xl text-txt-primary outline-hidden focus:border-primary cursor-pointer"
                  />
                </div>
              </div>

              {/* Star toggle */}
              <div className="pt-1">
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  type="button"
                  onClick={() => setImportant(!important)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-sans font-semibold border transition-colors cursor-pointer ${
                    important
                      ? 'border-amber-400 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                      : 'border-border bg-bg-subtle text-txt-secondary hover:bg-bg-hover'
                  }`}
                >
                  <Star className={`w-4 h-4 ${important ? 'fill-amber-400 text-amber-400' : 'text-txt-muted'}`} />
                  <span>Mark as Important</span>
                </motion.button>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-sans font-semibold text-txt-secondary hover:text-txt-primary hover:bg-bg-subtle rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                  type="submit"
                  className="px-5 py-2 text-xs font-sans font-semibold text-white bg-primary hover:bg-primary-hover rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  {taskToEdit ? 'Save Changes' : 'Create Task'}
                </motion.button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
