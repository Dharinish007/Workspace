import React, { useState, useRef } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Repository } from '../../db/repository';
import { 
  Download, 
  Upload, 
  ShieldAlert, 
  User, 
  Database, 
  Check, 
  AlertTriangle,
  Sparkles,
  RotateCcw,
  Palette,
  Sun,
  Moon,
  Timer
} from 'lucide-react';
import { motion } from 'framer-motion';
import { loadDemoData, resetToDefaultWorkspace } from '../../data';

export const SettingsContent: React.FC = () => {
  const { 
    settings, 
    updateSetting, 
    toggleTheme,
    showToast, 
    refreshAll 
  } = useWorkspace();

  const isDark = settings.theme === 'dark';
  const currentBgStyle = settings.backgroundStyle || 'current';

  const [displayNameInput, setDisplayNameInput] = useState(settings.displayName || '');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [timerForm, setTimerForm] = useState({
    workMinutes: settings.timerConfig?.workMinutes ?? 25,
    shortBreakMinutes: settings.timerConfig?.shortBreakMinutes ?? 5,
    longBreakMinutes: settings.timerConfig?.longBreakMinutes ?? 15,
    longBreakInterval: settings.timerConfig?.longBreakInterval ?? 4,
    dailyGoalMinutes: settings.timerConfig?.dailyGoalMinutes ?? null,
  });

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

  // Demo data handlers
  const handleLoadDemo = async (mode: 'replace' | 'merge') => {
    setIsLoadingDemo(true);
    try {
      const res = await loadDemoData(mode);
      await refreshAll();
      showToast(
        `Demo data loaded: ${res.counts.pages} pages, ${res.counts.tasks} tasks, ${res.counts.habits} habits, ${res.counts.events} events`,
        undefined,
        undefined,
        'success'
      );
    } catch (err: any) {
      showToast(`Failed to load demo data: ${err.message}`, undefined, undefined, 'error');
    } finally {
      setIsLoadingDemo(false);
    }
  };

  const handleResetDefault = async () => {
    if (!window.confirm('Reset workspace to a clean, empty state with default pages?')) {
      return;
    }
    setIsResetting(true);
    try {
      await resetToDefaultWorkspace();
      await refreshAll();
      showToast('Workspace reset to default clean state', undefined, undefined, 'success');
    } catch (err: any) {
      showToast(`Reset failed: ${err.message}`, undefined, undefined, 'error');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6">
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

      {/* Section: Appearance */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-serif font-bold tracking-tight text-txt-primary flex items-center gap-1.5">
            <Palette className="w-4 h-4 text-primary" />
            <span>Appearance</span>
          </h3>
          <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-bg-subtle text-txt-secondary border border-border">
            {isDark ? 'Dark Theme' : 'Light Theme'}
          </span>
        </div>

        {/* Theme Mode Selector */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              if (settings.theme !== 'light') toggleTheme();
            }}
            className={`p-3 rounded-xl border flex items-center gap-3 transition-all cursor-pointer ${
              !isDark
                ? 'border-primary bg-primary/10 text-txt-primary ring-2 ring-primary ring-offset-2 ring-offset-bg-card shadow-xs'
                : 'border-border bg-bg-card hover:bg-bg-subtle text-txt-secondary'
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-amber-400/20 text-amber-500 flex items-center justify-center flex-shrink-0">
              <Sun className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-txt-primary">Light Mode</div>
              <div className="text-[11px] text-txt-muted">Creamy White & Powder Blue</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              if (settings.theme !== 'dark') toggleTheme();
            }}
            className={`p-3 rounded-xl border flex items-center gap-3 transition-all cursor-pointer ${
              isDark
                ? 'border-primary bg-primary/10 text-txt-primary ring-2 ring-primary ring-offset-2 ring-offset-bg-card shadow-xs'
                : 'border-border bg-bg-card hover:bg-bg-subtle text-txt-secondary'
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center flex-shrink-0">
              <Moon className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-txt-primary">Dark Mode</div>
              <div className="text-[11px] text-txt-muted">Slate Night & Jewel Accent</div>
            </div>
          </button>
        </div>

        {/* Appearance Style Selector */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-txt-secondary">
              Appearance Style
            </label>
            <span className="text-[11px] text-txt-muted">
              {currentBgStyle === 'notion' ? 'Notion Active' : currentBgStyle === 'paper' ? 'Paper Texture Active' : 'Current Theme Active'}
            </span>
          </div>
          <div 
            role="radiogroup" 
            aria-label="Appearance Style"
            className="grid grid-cols-1 sm:grid-cols-3 gap-3.5"
          >
            {/* Option 1: Current Theme */}
            <motion.div
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              role="radio"
              aria-checked={currentBgStyle === 'current'}
              tabIndex={0}
              onClick={() => {
                updateSetting('backgroundStyle', 'current');
                showToast('Switched to Current Theme appearance', undefined, undefined, 'success');
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  updateSetting('backgroundStyle', 'current');
                  showToast('Switched to Current Theme appearance', undefined, undefined, 'success');
                }
              }}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                currentBgStyle === 'current'
                  ? 'border-primary ring-2 ring-primary ring-offset-2 ring-offset-bg-card bg-bg-card shadow-xs'
                  : 'border-border bg-bg-card hover:bg-bg-subtle/70 hover:border-border-interactive'
              }`}
            >
              {/* Visual Preview */}
              <div 
                className="w-full h-20 rounded-xl border border-border p-2.5 flex flex-col justify-between relative overflow-hidden mb-3 transition-colors"
                style={{ backgroundColor: isDark ? '#0E1726' : '#F8F4E9' }}
              >
                <div className="flex items-center justify-between">
                  <div className="w-12 h-3 rounded bg-primary/20 border border-primary/30" />
                  <div className="w-4 h-4 rounded-full bg-border" />
                </div>
                <div className="bg-bg-card rounded-lg border border-border p-2 shadow-2xs flex items-center justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="w-16 h-2 rounded bg-txt-primary/30" />
                    <div className="w-10 h-1.5 rounded bg-txt-muted/30" />
                  </div>
                  <div className="w-4 h-4 rounded bg-primary/20 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  </div>
                </div>
              </div>

              {/* Title & Description */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-txt-primary">Current Theme</span>
                    <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-bg-subtle text-txt-secondary border border-border">
                      Standard
                    </span>
                  </div>
                  <p className="text-xs text-txt-secondary mt-1 leading-snug">
                    Existing UI and colour system with clean, solid backgrounds.
                  </p>
                </div>
                {currentBgStyle === 'current' && (
                  <div className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-2xs">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}
              </div>
            </motion.div>

            {/* Option 2: Paper Texture */}
            <motion.div
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              role="radio"
              aria-checked={currentBgStyle === 'paper'}
              tabIndex={0}
              onClick={() => {
                updateSetting('backgroundStyle', 'paper');
                showToast('Switched to Paper Texture appearance', undefined, undefined, 'success');
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  updateSetting('backgroundStyle', 'paper');
                  showToast('Switched to Paper Texture appearance', undefined, undefined, 'success');
                }
              }}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                currentBgStyle === 'paper'
                  ? 'border-primary ring-2 ring-primary ring-offset-2 ring-offset-bg-card bg-bg-card shadow-xs'
                  : 'border-border bg-bg-card hover:bg-bg-subtle/70 hover:border-border-interactive'
              }`}
            >
              {/* Visual Preview */}
              <div 
                className="w-full h-20 rounded-xl border border-border p-2.5 flex flex-col justify-between relative overflow-hidden mb-3 transition-colors bg-cover bg-center"
                style={{
                  backgroundImage: isDark
                    ? "linear-gradient(rgba(37, 35, 31, 0.86), rgba(37, 35, 31, 0.86)), url('/textures/charcoal-paper.jpg')"
                    : "linear-gradient(rgba(247, 243, 233, 0.88), rgba(247, 243, 233, 0.88)), url('/textures/classic-paper.jpg')"
                }}
              >
                <div className="flex items-center justify-between">
                  <div 
                    className="w-12 h-3 rounded border"
                    style={{
                      backgroundColor: isDark ? 'rgba(117, 165, 245, 0.25)' : 'rgba(47, 111, 219, 0.25)',
                      borderColor: isDark ? '#75A5F5' : '#2F6FDB'
                    }}
                  />
                  <div className="w-4 h-4 rounded-full bg-white/20 border border-white/30 backdrop-blur-xs" />
                </div>
                <div 
                  className="rounded-lg border p-2 shadow-2xs flex items-center justify-between"
                  style={{
                    backgroundColor: isDark ? '#35322C' : '#FFFFFF',
                    borderColor: isDark ? '#4D483F' : '#D2C9B8'
                  }}
                >
                  <div className="space-y-1 flex-1">
                    <div 
                      className="w-16 h-2 rounded"
                      style={{ backgroundColor: isDark ? '#F5EFE6' : '#1E3A5F', opacity: 0.4 }}
                    />
                    <div 
                      className="w-10 h-1.5 rounded"
                      style={{ backgroundColor: isDark ? '#9E9589' : '#6B7E94', opacity: 0.4 }}
                    />
                  </div>
                  <div 
                    className="w-4 h-4 rounded flex items-center justify-center"
                    style={{ backgroundColor: isDark ? 'rgba(117, 165, 245, 0.2)' : 'rgba(47, 111, 219, 0.2)' }}
                  >
                    <div 
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: isDark ? '#75A5F5' : '#2F6FDB' }}
                    />
                  </div>
                </div>
              </div>

              {/* Title & Description */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-txt-primary">Paper Texture</span>
                    <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/30">
                      {isDark ? 'Charcoal Paper' : 'Classic Paper'}
                    </span>
                  </div>
                  <p className="text-xs text-txt-secondary mt-1 leading-snug">
                    Tactile {isDark ? 'Charcoal Paper' : 'Classic Paper'} UI with subtle theme-matched overlay.
                  </p>
                </div>
                {currentBgStyle === 'paper' && (
                  <div className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-2xs">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}
              </div>
            </motion.div>

            {/* Option 3: Notion */}
            <motion.div
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              role="radio"
              aria-checked={currentBgStyle === 'notion'}
              tabIndex={0}
              onClick={() => {
                updateSetting('backgroundStyle', 'notion');
                showToast('Switched to Notion appearance', undefined, undefined, 'success');
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  updateSetting('backgroundStyle', 'notion');
                  showToast('Switched to Notion appearance', undefined, undefined, 'success');
                }
              }}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                currentBgStyle === 'notion'
                  ? 'border-primary ring-2 ring-primary ring-offset-2 ring-offset-bg-card bg-bg-card shadow-xs'
                  : 'border-border bg-bg-card hover:bg-bg-subtle/70 hover:border-border-interactive'
              }`}
            >
              {/* Visual Preview */}
              <div 
                className="w-full h-20 rounded-xl border p-2.5 flex flex-col justify-between relative overflow-hidden mb-3 transition-colors"
                style={{ 
                  backgroundColor: isDark ? '#191919' : '#FFFFFF',
                  borderColor: isDark ? '#373737' : '#E3E2DE'
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div 
                      className="w-3.5 h-3.5 rounded-xs flex items-center justify-center text-[8px] font-bold"
                      style={{
                        backgroundColor: isDark ? '#2E2E2E' : '#EFEFED',
                        color: isDark ? '#E6E6E6' : '#37352F'
                      }}
                    >
                      N
                    </div>
                    <div 
                      className="w-12 h-2 rounded-xs"
                      style={{
                        backgroundColor: '#2383E2'
                      }}
                    />
                  </div>
                  <div 
                    className="w-4 h-4 rounded-xs border flex items-center justify-center text-[9px]"
                    style={{
                      backgroundColor: isDark ? '#202020' : '#FBFBFA',
                      borderColor: isDark ? '#373737' : '#E3E2DE',
                      color: isDark ? '#9B9B9B' : '#787774'
                    }}
                  >
                    /
                  </div>
                </div>
                <div 
                  className="rounded-md border p-2 shadow-2xs flex items-center justify-between"
                  style={{
                    backgroundColor: isDark ? '#202020' : '#FBFBFA',
                    borderColor: isDark ? '#373737' : '#E3E2DE'
                  }}
                >
                  <div className="space-y-1 flex-1">
                    <div 
                      className="w-16 h-2 rounded-xs"
                      style={{ backgroundColor: isDark ? '#E6E6E6' : '#37352F', opacity: 0.5 }}
                    />
                    <div 
                      className="w-10 h-1.5 rounded-xs"
                      style={{ backgroundColor: isDark ? '#9B9B9B' : '#787774', opacity: 0.4 }}
                    />
                  </div>
                  <div 
                    className="w-4 h-4 rounded-xs flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(35, 131, 226, 0.15)' }}
                  >
                    <div 
                      className="w-2 h-2 rounded-xs"
                      style={{ backgroundColor: '#2383E2' }}
                    />
                  </div>
                </div>
              </div>

              {/* Title & Description */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-txt-primary">Notion</span>
                    <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-bg-subtle text-txt-secondary border border-border">
                      Minimalist
                    </span>
                  </div>
                  <p className="text-xs text-txt-secondary mt-1 leading-snug">
                    Clean workspace aesthetic with Notion blue accents and subtle borders.
                  </p>
                </div>
                {currentBgStyle === 'notion' && (
                  <div className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-2xs">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <hr className="border-border" />

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
                className="h-9 px-4 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary-hover transition-colors cursor-pointer shadow-2xs"
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

      {/* Section: Focus & Timer Configuration */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-serif font-bold tracking-tight text-txt-primary flex items-center gap-1.5">
            <Timer className="w-4 h-4 text-[#2F5D50]" />
            <span>Focus & Timer Settings</span>
          </h3>
          <span className="text-xs text-txt-muted">Default Pomodoro & Daily Goal</span>
        </div>

        <p className="text-xs text-txt-secondary leading-relaxed">
          Customize your default Pomodoro session intervals, break cycles, and daily focus target.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Work Duration */}
          <div>
            <label className="block text-xs font-semibold text-txt-secondary mb-1">
              Work Duration (min)
            </label>
            <input
              type="number"
              min="1"
              max="120"
              value={timerForm.workMinutes}
              onChange={e => setTimerForm(prev => ({ ...prev, workMinutes: Math.max(1, parseInt(e.target.value, 10) || 25) }))}
              className="w-full px-3 py-1.5 text-sm bg-bg-subtle border border-border rounded-lg text-txt-primary outline-hidden focus:border-[#2F5D50]"
            />
          </div>

          {/* Short Break */}
          <div>
            <label className="block text-xs font-semibold text-txt-secondary mb-1">
              Short Break (min)
            </label>
            <input
              type="number"
              min="1"
              max="60"
              value={timerForm.shortBreakMinutes}
              onChange={e => setTimerForm(prev => ({ ...prev, shortBreakMinutes: Math.max(1, parseInt(e.target.value, 10) || 5) }))}
              className="w-full px-3 py-1.5 text-sm bg-bg-subtle border border-border rounded-lg text-txt-primary outline-hidden focus:border-[#2F5D50]"
            />
          </div>

          {/* Long Break */}
          <div>
            <label className="block text-xs font-semibold text-txt-secondary mb-1">
              Long Break (min)
            </label>
            <input
              type="number"
              min="1"
              max="90"
              value={timerForm.longBreakMinutes}
              onChange={e => setTimerForm(prev => ({ ...prev, longBreakMinutes: Math.max(1, parseInt(e.target.value, 10) || 15) }))}
              className="w-full px-3 py-1.5 text-sm bg-bg-subtle border border-border rounded-lg text-txt-primary outline-hidden focus:border-[#2F5D50]"
            />
          </div>

          {/* Long Break Interval */}
          <div>
            <label className="block text-xs font-semibold text-txt-secondary mb-1">
              Long Break Interval
            </label>
            <input
              type="number"
              min="1"
              max="12"
              value={timerForm.longBreakInterval}
              onChange={e => setTimerForm(prev => ({ ...prev, longBreakInterval: Math.max(1, parseInt(e.target.value, 10) || 4) }))}
              className="w-full px-3 py-1.5 text-sm bg-bg-subtle border border-border rounded-lg text-txt-primary outline-hidden focus:border-[#2F5D50]"
            />
          </div>
        </div>

        {/* Daily Goal & Save Button */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-2">
          <div className="max-w-xs w-full">
            <label className="block text-xs font-semibold text-txt-secondary mb-1">
              Daily Focus Goal (minutes, optional)
            </label>
            <input
              type="number"
              min="0"
              max="1440"
              placeholder="e.g. 120 (for 2 hours)"
              value={timerForm.dailyGoalMinutes ?? ''}
              onChange={e => {
                const val = e.target.value.trim();
                setTimerForm(prev => ({
                  ...prev,
                  dailyGoalMinutes: val === '' ? null : Math.max(0, parseInt(val, 10) || 0),
                }));
              }}
              className="w-full px-3 py-1.5 text-sm bg-bg-subtle border border-border rounded-lg text-txt-primary outline-hidden focus:border-[#2F5D50]"
            />
          </div>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              updateSetting('timerConfig', timerForm);
              showToast('Timer settings saved!', undefined, undefined, 'success');
            }}
            className="h-9 px-5 bg-[#2F5D50] hover:bg-[#254C41] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-2xs self-start sm:self-end"
          >
            Save Timer Settings
          </motion.button>
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
            className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
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
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs ${
                  importMode === 'replace'
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-primary hover:bg-primary-hover text-white'
                }`}
              >
                {isImporting ? 'Importing...' : `Confirm & ${importMode === 'replace' ? 'Replace All' : 'Merge Data'}`}
              </motion.button>
            </div>
          </div>
        )}
      </div>

      <hr className="border-border" />

      {/* Section: Demo & Testing Data */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold tracking-tight text-txt-primary flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>Demo & Preview Data</span>
          </h3>
          <span
            className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-primary/20 text-primary border border-primary/40"
            title="Provides sample dummy data for testing and layout inspection"
          >
            Developer Mode
          </span>
        </div>
        <p className="text-[13px] text-txt-secondary leading-relaxed font-medium">
          Quickly populate your local workspace with rich dummy data (pages, priority tasks, 45-day habit streaks, and scheduled calendar events) to preview all modules in action.
        </p>

        <div className="p-4 bg-bg-subtle rounded-xl border border-border space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-txt-primary">Full Workspace Sample</div>
              <div className="text-xs text-txt-muted mt-0.5">
                Injects 5 active pages, 1 archived page, 18 tasks, 5 habits with 45-day heatmap history, and 10 calendar events relative to today.
              </div>
            </div>
            <div className="flex items-center gap-2.5 flex-shrink-0">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => handleLoadDemo('replace')}
                disabled={isLoadingDemo}
                className="h-10 px-4 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isLoadingDemo ? 'Loading...' : 'Load Demo Data'}</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                onClick={handleResetDefault}
                disabled={isResetting}
                className="h-10 px-3.5 bg-bg-card hover:bg-bg-hover text-txt-secondary hover:text-red-500 border border-border rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                title="Reset workspace to clean empty state"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{isResetting ? 'Resetting...' : 'Reset Clean'}</span>
              </motion.button>
            </div>
          </div>
        </div>
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
  );
};

