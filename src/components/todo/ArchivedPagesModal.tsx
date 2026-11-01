import React, { useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Page } from '../../types';
import { X, RotateCcw, Trash2, AlertTriangle, Archive } from 'lucide-react';
import { IconRenderer } from '../common/IconRegistry';

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

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div 
        className="bg-bg-card border border-border shadow-modal rounded-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[80vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Archive className="w-5 h-5 text-txt-muted" />
            <h2 className="text-base font-bold text-txt-primary">Archived Pages</h2>
          </div>
          <button
            onClick={() => {
              setPageToDelete(null);
              onClose();
            }}
            className="p-1.5 rounded-lg hover:bg-bg-subtle text-txt-muted hover:text-txt-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4">
          {archivedPages.length === 0 ? (
            <div className="py-12 text-center text-txt-muted text-sm">
              No archived pages. Active pages can be archived from their page view menu.
            </div>
          ) : (
            <div className="space-y-3">
              {archivedPages.map(page => {
                const pageTasks = tasks.filter(t => t.pageId === page.id);

                return (
                  <div
                    key={page.id}
                    className="p-3.5 bg-bg-subtle rounded-xl border border-border flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-white"
                        style={{ backgroundColor: page.color }}
                      >
                        <IconRenderer name={page.icon} className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-txt-primary">{page.name}</div>
                        <div className="text-xs text-txt-muted">
                          {pageTasks.length} task{pageTasks.length === 1 ? '' : 's'} archived
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => restorePage(page.id)}
                        className="px-3 py-1.5 text-xs font-semibold text-primary bg-primary-light hover:bg-bg-hover rounded-lg flex items-center gap-1.5 transition-colors"
                        title="Restore page to active list"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Restore</span>
                      </button>

                      <button
                        onClick={() => {
                          setPageToDelete(page);
                          setTypedConfirmation('');
                          setDeleteError(null);
                        }}
                        className="px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg flex items-center gap-1.5 transition-colors"
                        title="Permanently delete page and all tasks"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Delete confirmation dialog overlay */}
          {pageToDelete && (
            <div className="mt-4 p-4 border border-red-500/30 bg-red-500/5 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold text-sm">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>Confirm Permanent Deletion</span>
              </div>
              <p className="text-xs text-txt-secondary leading-relaxed">
                This will permanently remove the page <strong className="text-txt-primary font-semibold">"{pageToDelete.name}"</strong> and all{' '}
                <strong className="text-txt-primary font-semibold">{tasks.filter(t => t.pageId === pageToDelete.id).length}</strong> tasks inside it.
                A recovery snapshot will be created before deletion.
              </p>
              <div>
                <label className="block text-xs font-semibold text-txt-secondary mb-1">
                  Type <span className="text-red-600 dark:text-red-400 select-all font-mono font-bold">"{pageToDelete.name}"</span> to confirm:
                </label>
                <input
                  type="text"
                  autoFocus
                  value={typedConfirmation}
                  onChange={e => setTypedConfirmation(e.target.value)}
                  placeholder={pageToDelete.name}
                  className="w-full px-3 py-1.5 text-sm bg-bg-card border border-border rounded-lg text-txt-primary outline-hidden focus:border-red-500"
                />
              </div>

              {deleteError && (
                <div className="text-xs text-red-600 dark:text-red-400">{deleteError}</div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPageToDelete(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-txt-secondary hover:text-txt-primary rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={typedConfirmation.trim() !== pageToDelete.name.trim() || isDeleting}
                  onClick={handlePermanentDelete}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg shadow-xs transition-colors"
                >
                  {isDeleting ? 'Deleting...' : 'Permanently Delete'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

