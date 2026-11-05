import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Page } from '../../types';
import { X, RotateCcw, Trash2, AlertTriangle, Archive } from 'lucide-react';
import { IconRenderer } from '../common/IconRegistry';
import { motion, AnimatePresence } from 'framer-motion';

interface ArchivedPagesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchivedPagesModal: React.FC<ArchivedPagesModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { pages, tasks, restorePage, deletePagePermanently } = useWorkspace();

  const archivedPages = pages.filter(p => p.archived);

  const [pageToDelete, setPageToDelete] = useState<Page | null>(null);
  const [typedConfirmation, setTypedConfirmation] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setPageToDelete(null);
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handlePermanentDelete = async () => {
    if (!pageToDelete) return;
    if (typedConfirmation.trim() !== pageToDelete.name.trim()) {
      setDeleteError('Confirmation name does not match exact page name');
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deletePagePermanently(pageToDelete.id, typedConfirmation.trim());
      setPageToDelete(null);
      setTypedConfirmation('');
    } catch (err: any) {
      setDeleteError(err.message || 'Deletion failed');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => {
              setPageToDelete(null);
              onClose();
            }}
            className="fixed inset-0 bg-black/40 backdrop-blur-md"
          />

          {/* Modal Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: 'spring', stiffness: 450, damping: 30 }}
            onClick={e => e.stopPropagation()}
            className="bg-bg-card border border-border shadow-modal rounded-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[80vh] relative z-10"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-bg-subtle text-txt-secondary">
                  <Archive className="w-4 h-4 text-txt-muted" />
                </div>
                <h2 className="text-lg font-serif font-bold text-txt-primary">Archived Pages</h2>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  setPageToDelete(null);
                  onClose();
                }}
                className="p-1.5 rounded-lg hover:bg-bg-subtle text-txt-muted hover:text-txt-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              {archivedPages.length === 0 ? (
                <div className="py-12 text-center text-txt-muted text-sm font-serif">
                  No archived pages. Active pages can be archived from their page view menu.
                </div>
              ) : (
                <div className="space-y-3">
                  {archivedPages.map(page => {
                    const pageTasks = tasks.filter(t => t.pageId === page.id);

                    return (
                      <div
                        key={page.id}
                        className="p-3.5 bg-bg-subtle/80 hover:bg-bg-subtle rounded-xl border border-border flex items-center justify-between gap-3 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-2xs"
                            style={{ backgroundColor: page.color }}
                          >
                            <IconRenderer name={page.icon} className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="text-sm font-serif font-semibold text-txt-primary">{page.name}</div>
                            <div className="text-xs text-txt-muted font-mono">
                              {pageTasks.length} task{pageTasks.length === 1 ? '' : 's'} archived
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => restorePage(page.id)}
                            className="px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-lg flex items-center gap-1.5 transition-colors"
                            title="Restore page to active list"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Restore</span>
                          </motion.button>

                          <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => {
                              setPageToDelete(page);
                              setTypedConfirmation('');
                              setDeleteError(null);
                            }}
                            className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg flex items-center gap-1.5 transition-colors"
                            title="Permanently delete page and all tasks"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </motion.button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Delete confirmation dialog overlay */}
              {pageToDelete && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-4 border border-red-500/30 bg-red-500/5 rounded-xl space-y-3"
                >
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold text-sm">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>Confirm Permanent Deletion</span>
                  </div>
                  <p className="text-xs text-txt-secondary leading-relaxed">
                    This will permanently remove the page <strong className="text-txt-primary font-serif font-semibold">"{pageToDelete.name}"</strong> and all{' '}
                    <strong className="text-txt-primary font-mono font-semibold">{tasks.filter(t => t.pageId === pageToDelete.id).length}</strong> tasks inside it.
                    A recovery snapshot will be created before deletion.
                  </p>
                  <div>
                    <label className="block text-xs font-medium text-txt-secondary mb-1">
                      Type <span className="text-red-600 dark:text-red-400 select-all font-mono font-bold">"{pageToDelete.name}"</span> to confirm:
                    </label>
                    <input
                      type="text"
                      autoFocus
                      value={typedConfirmation}
                      onChange={e => setTypedConfirmation(e.target.value)}
                      placeholder={pageToDelete.name}
                      className="w-full px-3 py-1.5 text-sm bg-bg-card border border-border rounded-lg text-txt-primary outline-hidden focus:border-red-500 transition-colors"
                    />
                  </div>

                  {deleteError && (
                    <div className="text-xs text-red-600 dark:text-red-400">{deleteError}</div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={() => setPageToDelete(null)}
                      className="px-3 py-1.5 text-xs font-medium text-txt-secondary hover:text-txt-primary rounded-lg transition-colors"
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      disabled={typedConfirmation.trim() !== pageToDelete.name.trim() || isDeleting}
                      onClick={handlePermanentDelete}
                      className="px-4 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg shadow-xs transition-colors"
                    >
                      {isDeleting ? 'Deleting...' : 'Permanently Delete'}
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
