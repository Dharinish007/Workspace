import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import { Note } from '../../types';

interface DeleteNoteModalProps {
  isOpen: boolean;
  note: Note | null;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteNoteModal: React.FC<DeleteNoteModalProps> = ({
  isOpen,
  note,
  onClose,
  onConfirm,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !note) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/50 backdrop-blur-xs cursor-pointer"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.16 }}
          className="relative bg-bg-card border border-border rounded-2xl shadow-modal max-w-md w-full p-6 z-10 space-y-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-note-title"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 id="delete-note-title" className="text-base font-bold font-serif text-txt-primary">
                  Delete Note
                </h3>
                <p className="text-xs text-txt-muted mt-0.5">Permanent deletion confirmation</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-bg-hover text-txt-muted hover:text-txt-primary flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Description */}
          <div className="text-xs text-txt-secondary leading-relaxed bg-bg-subtle/50 border border-border/50 rounded-xl p-3.5 space-y-1.5">
            <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 font-semibold text-[13px]">
              <AlertTriangle className="w-4 h-4" />
              <span>Are you sure?</span>
            </div>
            <p>
              Are you sure you want to permanently delete{' '}
              <strong className="text-txt-primary font-semibold">"{note.title}"</strong>?
            </p>
            <p className="text-[11px] text-txt-muted">
              This note will be deleted from your workspace storage.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-txt-secondary hover:text-txt-primary hover:bg-bg-hover border border-border transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 text-white shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Note</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

