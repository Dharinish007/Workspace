import React from 'react';
import { useLocation } from 'react-router-dom';
import { useWorkspace } from '../../context/WorkspaceContext';
import { X, Database } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SettingsContent } from '../settings/SettingsContent';

export const SettingsModal: React.FC = () => {
  const { isSettingsOpen, setIsSettingsOpen } = useWorkspace();
  const location = useLocation();

  if (location.pathname === '/settings') {
    return null;
  }

  return (
    <AnimatePresence>
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSettingsOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
          />

          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: "spring", stiffness: 450, damping: 32 }}
            className="bg-bg-card border border-border shadow-modal rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] z-10 font-sans"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary-light text-primary">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-[22px] sm:text-[24px] font-bold text-txt-primary tracking-tight">Settings & Data Management</h2>
                  <p className="text-[13px] text-txt-muted">Local preferences, IndexedDB safety, and JSON backups</p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsSettingsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-bg-subtle text-txt-muted hover:text-txt-primary transition-colors cursor-pointer"
                aria-label="Close settings"
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto">
              <SettingsContent />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
