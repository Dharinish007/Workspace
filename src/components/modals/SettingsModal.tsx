import React, { useState, useRef } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Repository } from '../../db/repository';
import { 
  X, 
  Download, 
  Upload, 
  ShieldAlert, 
  User, 
  Database, 
  Check, 
  AlertTriangle 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const SettingsModal: React.FC = () => {
  const { 
    isSettingsOpen, 
    setIsSettingsOpen, 
    settings, 
    updateSetting, 
    showToast, 
    refreshAll 
  } = useWorkspace();

  const [displayNameInput, setDisplayNameInput] = useState(settings.displayName || '');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculate days since last backup
  let daysSinceBackup: number | null = null;
  if (settings.lastBackup) {
    const lastDate = new Date(settings.lastBackup).getTime();
    const now = Date.now();
    daysSinceBackup = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));
  }

  const needsBackupBanner = daysSinceBackup === null || daysSinceBackup >= 7;

  // Export JSON backup handler
  const handleExport = async () => {
    try {
      const backupData = await Repository.exportBackup();
      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `my-workspace-backup-${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      await refreshAll();
      showToast('Backup successfully exported!', undefined, undefined, 'success');
    } catch (err: any) {
      showToast(`Export failed: ${err.message}`, undefined, undefined, 'error');
    }
  };

  // Handle JSON file selection for import
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    setImportPreview(null);
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.app !== 'my-workspace') {
          throw new Error('This is not a valid My Workspace backup file (app identifier mismatch).');
        }
        if (typeof parsed.schemaVersion !== 'number' || parsed.schemaVersion > 1) {
          throw new Error(`Unsupported schema version (${parsed.schemaVersion}). Supported version is 1.`);
        }
        if (!parsed.data) {
          throw new Error('Backup file missing required "data" payload.');
        }

        setImportPreview({
          pagesCount: parsed.data.pages?.length || 0,
          tasksCount: parsed.data.tasks?.length || 0,
          habitsCount: parsed.data.habits?.length || 0,
          habitLogsCount: parsed.data.habitLogs?.length || 0,
          eventsCount: parsed.data.events?.length || 0,
          raw: parsed,
        });
      } catch (err: any) {
        setImportError(err.message || 'Failed to parse JSON file');
      }
    };
    reader.readAsText(file);
  };

  // Perform import
  const handlePerformImport = async () => {
    if (!importPreview?.raw) return;
    setIsImporting(true);
    setImportError(null);

    try {
      if (importMode === 'replace') {
        const safetyBackup = await Repository.exportBackup();
        const blob = new Blob([JSON.stringify(safetyBackup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `my-workspace-safety-before-replace-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      const res = await Repository.importBackup(importPreview.raw, importMode);
      await refreshAll();
      showToast(res.message, undefined, undefined, 'success');
      setImportFile(null);
      setImportPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      setImportError(err.message || 'Import failed');
      showToast(`Import failed: ${err.message}`, undefined, undefined, 'error');
    } finally {
      setIsImporting(false);
    }
  };

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
                  <h2 className="text-xl font-serif font-bold text-txt-primary tracking-tight">Settings & Data Management</h2>
                  <p className="text-xs text-txt-muted">Local preferences, IndexedDB safety, and JSON backups</p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsSettingsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-bg-subtle text-txt-muted hover:text-txt-primary transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Backup Reminder Banner */}
              {needsBackupBanner && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                      {settings.lastBackup
                        ? `Last backup was ${daysSinceBackup} days ago`
                        : 'No backup recorded yet'}
                    </div>
                    <div className="text-xs text-txt-secondary mt-0.5">
                      Your data lives entirely in your browser's IndexedDB. Export regular backups to protect against browser data clears.
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={handleExport}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors flex-shrink-0 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Now</span>
                  </motion.button>
                </div>
              )}

              {/* Section: Profile & Preferences */}
              <div className="space-y-4">
                <h3 className="text-sm font-serif font-bold tracking-tight text-txt-primary flex items-center gap-1.5">
                  <User className="w-4 h-4 text-primary" />
                  <span>Preferences</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-txt-secondary mb-1">
                      Display Name
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={displayNameInput}
                        onChange={e => setDisplayNameInput(e.target.value)}
                        className="flex-1 px-3 py-1.5 text-sm bg-bg-subtle border border-border rounded-lg text-txt-primary outline-hidden focus:border-primary"
                        placeholder="e.g. Dharinish"
                      />
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          updateSetting('displayName', displayNameInput.trim() || 'Dharinish');
                          showToast('Display name updated', undefined, undefined, 'success');
                        }}
                        className="px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-hover transition-colors cursor-pointer"
                      >
                        Save
                      </motion.button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-txt-secondary mb-1">
                      Week Starts On
                    </label>
                    <select
                      value={settings.weekStart || 'monday'}
                      onChange={e => {
                        updateSetting('weekStart', e.target.value);
                        showToast('Week start updated', undefined, undefined, 'success');
                      }}
                      className="w-full px-3 py-2 text-sm bg-bg-subtle border border-border rounded-lg text-txt-primary outline-hidden focus:border-primary cursor-pointer"
                    >
                      <option value="monday">Monday (Default)</option>
                      <option value="sunday">Sunday</option>
                    </select>
                  </div>
                </div>
              </div>

              <hr className="border-border" />

              {/* Section: Backup & Export */}
              <div className="space-y-4">
                <h3 className="text-sm font-serif font-bold tracking-tight text-txt-primary flex items-center gap-1.5">
                  <Download className="w-4 h-4 text-primary" />
                  <span>Export Backup</span>
                </h3>
                <p className="text-xs text-txt-secondary leading-relaxed">
                  Downloads a complete standalone JSON archive of all your Pages, Tasks, Habits, Habit Logs, Events, and custom Day Colors.
                </p>
                <div className="flex items-center justify-between p-3.5 bg-bg-subtle rounded-xl border border-border">
                  <div>
                    <div className="text-sm font-semibold text-txt-primary">Full Workspace Backup</div>
                    <div className="text-xs font-mono text-txt-muted">
                      Last backup: {settings.lastBackup ? new Date(settings.lastBackup).toLocaleString() : 'Never'}
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.96 }}
                    transition={{ type: "spring", stiffness: 500, damping: 25 }}
                    onClick={handleExport}
                    className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export JSON Backup</span>
                  </motion.button>
                </div>
              </div>

              <hr className="border-border" />

              {/* Section: Import */}
              <div className="space-y-4">
                <h3 className="text-sm font-serif font-bold tracking-tight text-txt-primary flex items-center gap-1.5">
                  <Upload className="w-4 h-4 text-primary" />
                  <span>Import Backup</span>
                </h3>
                <p className="text-xs text-txt-secondary leading-relaxed">
                  Restore or merge data from a previously exported <code className="bg-bg-subtle px-1 py-0.5 rounded text-primary font-mono">my-workspace-backup.json</code> file.
                </p>

                <div className="p-4 border-2 border-dashed border-border rounded-xl text-center space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    onChange={handleFileChange}
                    className="hidden"
                    id="workspace-import-input"
                  />
                  <label
                    htmlFor="workspace-import-input"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-bg-subtle hover:bg-bg-hover text-txt-primary border border-border rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                  >
                    <Upload className="w-4 h-4 text-primary" />
                    <span>{importFile ? importFile.name : 'Choose Backup JSON File'}</span>
                  </label>
                  {importFile && (
                    <div className="text-xs font-mono text-txt-muted">
                      {(importFile.size / 1024).toFixed(1)} KB selected
                    </div>
                  )}
                </div>

                {importError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 rounded-xl text-xs flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                    <span>{importError}</span>
                  </div>
                )}

                {importPreview && (
                  <div className="bg-bg-subtle border border-border rounded-xl p-4 space-y-3">
                    <div className="text-xs font-bold uppercase text-txt-muted">Backup Preview</div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                      <div className="bg-bg-card p-2 rounded-lg border border-border">
                        <div className="text-base font-mono font-bold text-primary">{importPreview.pagesCount}</div>
                        <div className="text-[11px] text-txt-muted">Pages</div>
                      </div>
                      <div className="bg-bg-card p-2 rounded-lg border border-border">
                        <div className="text-base font-mono font-bold text-primary">{importPreview.tasksCount}</div>
                        <div className="text-[11px] text-txt-muted">Tasks</div>
                      </div>
                      <div className="bg-bg-card p-2 rounded-lg border border-border">
                        <div className="text-base font-mono font-bold text-primary">{importPreview.habitsCount}</div>
                        <div className="text-[11px] text-txt-muted">Habits</div>
                      </div>
                      <div className="bg-bg-card p-2 rounded-lg border border-border">
                        <div className="text-base font-mono font-bold text-primary">{importPreview.habitLogsCount}</div>
                        <div className="text-[11px] text-txt-muted">Habit Logs</div>
                      </div>
                      <div className="bg-bg-card p-2 rounded-lg border border-border">
                        <div className="text-base font-mono font-bold text-primary">{importPreview.eventsCount}</div>
                        <div className="text-[11px] text-txt-muted">Events</div>
                      </div>
                    </div>

                    {/* Import Mode selection */}
                    <div className="space-y-1.5 pt-2">
                      <div className="text-xs font-medium text-txt-secondary">Select Import Mode:</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setImportMode('merge')}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            importMode === 'merge'
                              ? 'border-primary bg-primary-light/50 text-txt-primary ring-1 ring-primary'
                              : 'border-border bg-bg-card text-txt-secondary hover:bg-bg-hover'
                          }`}
                        >
                          <div className="font-semibold text-xs text-txt-primary flex items-center justify-between">
                            <span>Merge</span>
                            {importMode === 'merge' && <Check className="w-3.5 h-3.5 text-primary" />}
                          </div>
                          <div className="text-[11px] text-txt-muted mt-1">
                            Inserts new records and updates by ID. Existing records not in the file are preserved.
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setImportMode('replace')}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            importMode === 'replace'
                              ? 'border-red-500 bg-red-500/10 text-txt-primary ring-1 ring-red-500'
                              : 'border-border bg-bg-card text-txt-secondary hover:bg-bg-hover'
                          }`}
                        >
                          <div className="font-semibold text-xs text-txt-primary flex items-center justify-between">
                            <span>Replace (Clean)</span>
                            {importMode === 'replace' && <Check className="w-3.5 h-3.5 text-red-500" />}
                          </div>
                          <div className="text-[11px] text-txt-muted mt-1">
                            Clears existing records and restores this backup. A safety backup will be downloaded first.
                          </div>
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={handlePerformImport}
                        disabled={isImporting}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold text-white transition-colors cursor-pointer ${
                          importMode === 'replace'
                            ? 'bg-red-600 hover:bg-red-700'
                            : 'bg-primary hover:bg-primary-hover'
                        }`}
                      >
                        {isImporting ? 'Importing...' : `Confirm & ${importMode === 'replace' ? 'Replace All' : 'Merge Data'}`}
                      </motion.button>
                    </div>
                  </div>
                )}
              </div>

              <hr className="border-border" />

              {/* Section: Storage & Privacy Notice */}
              <div className="bg-bg-subtle p-3.5 rounded-xl border border-border text-xs text-txt-secondary space-y-1.5">
                <div className="font-semibold text-txt-primary flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-primary" />
                  <span>Local-First Architecture Notice</span>
                </div>
                <p>
                  This app stores 100% of your data inside Google Chrome's local IndexedDB engine. No data is ever sent to any remote server or cloud.
                </p>
                <p className="text-txt-muted">
                  Note: Clearing your browser's site data or history will wipe local databases. Always keep recent JSON exports in a safe folder!
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
