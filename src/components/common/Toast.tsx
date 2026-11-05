import React from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { CheckCircle2, AlertCircle, Info, X, Undo2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const Toast: React.FC = () => {
  const { toast, clearToast } = useWorkspace();

  return (
    <AnimatePresence>
      {toast && (
        <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 max-w-sm w-full pointer-events-none">
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 450, damping: 30 }}
            drag="x"
            dragConstraints={{ left: 0, right: 150 }}
            onDragEnd={(_e, info) => {
              if (info.offset.x > 80) {
                clearToast();
              }
            }}
            className="pointer-events-auto bg-bg-card/95 backdrop-blur-md border border-border shadow-modal rounded-2xl p-3.5 flex items-center justify-between gap-3 text-sm font-sans text-txt-primary cursor-grab active:cursor-grabbing"
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />}
              {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />}
              {(!toast.type || toast.type === 'info') && <Info className="w-5 h-5 text-primary flex-shrink-0" />}
              <span className="truncate font-medium">{toast.message}</span>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {toast.actionLabel && toast.onAction && (
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  onClick={() => {
                    toast.onAction!();
                    clearToast();
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-primary bg-primary-light hover:bg-bg-hover rounded-lg transition-colors cursor-pointer"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  <span>{toast.actionLabel}</span>
                </motion.button>
              )}

              <button
                onClick={clearToast}
                className="p-1 rounded-lg text-txt-muted hover:text-txt-primary hover:bg-bg-subtle transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
