import React from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { CheckCircle2, AlertCircle, Info, X, Undo2 } from 'lucide-react';

export const Toast: React.FC = () => {
  const { toast, clearToast } = useWorkspace();

  if (!toast) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 max-w-sm w-full animate-in fade-in slide-in-from-bottom-5 duration-200">
      <div className="bg-bg-card border border-border shadow-modal rounded-xl p-3.5 flex items-center justify-between gap-3 text-sm text-txt-primary">
        <div className="flex items-center gap-2.5 overflow-hidden">
          {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />}
          {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />}
          {(!toast.type || toast.type === 'info') && <Info className="w-5 h-5 text-primary flex-shrink-0" />}
          <span className="truncate">{toast.message}</span>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {toast.actionLabel && toast.onAction && (
            <button
              onClick={() => {
                toast.onAction!();
                clearToast();
              }}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-primary bg-primary-light hover:bg-bg-hover rounded-md transition-colors"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>{toast.actionLabel}</span>
            </button>
          )}

          <button
            onClick={clearToast}
            className="p-1 rounded text-txt-muted hover:text-txt-primary hover:bg-bg-subtle transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

