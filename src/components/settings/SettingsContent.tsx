import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  Laptop,
  Timer,
  Sliders,
  Globe,
  Flame,
  CheckSquare,
  Calendar,
  BookOpen,
  FileText,
  Bell,
  Volume2,
  Type,
  Layout,
  Zap,
  HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { loadDemoData, resetToDefaultWorkspace } from '../../data';
import { 
  ThemeMode, 
  AccentColor, 
  FontSizeOption, 
  LayoutDensity, 
  AnimationPreference,
  SupportedLanguage,
  DateFormatOption,
  LandingPageOption,
  NotificationPreference,
  TaskSortOption,
  StartupBehavior
} from '../../types/settings';

type SettingsTab = 
  | 'general' 
  | 'appearance' 
  | 'global' 
  | 'habits' 
  | 'todo' 
  | 'timer' 
  | 'calendar' 
  | 'journal_notes' 
  | 'data';

export const SettingsContent: React.FC = () => {
  const { 
    settings, 
    updateSetting,
    updateGeneralSettings,
    updateAppearanceSettings,
    updateGlobalPreferences,
    updateModuleSettings,
    toggleTheme,
    showToast, 
    refreshAll 
  } = useWorkspace();

  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as SettingsTab) || 'general';
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);

  // Sync tab with URL search parameter if changed externally
  useEffect(() => {
    const tabParam = searchParams.get('tab') as SettingsTab;
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (tab: SettingsTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const isDark = settings.theme === 'dark';
  const currentBgStyle = settings.appearance?.backgroundStyle || settings.backgroundStyle || 'current';
  const currentAccent = settings.appearance?.accentColor || 'blue';
  const currentThemeMode = settings.appearance?.themeMode || (isDark ? 'dark' : 'light');

  // Form local state
  const [displayNameInput, setDisplayNameInput] = useState(settings.general?.displayName || settings.displayName || '');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync display name input if settings update
  useEffect(() => {
    if (settings.general?.displayName) {
      setDisplayNameInput(settings.general.displayName);
    }
  }, [settings.general?.displayName]);

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

  // Tab Definitions
  const tabs = [
    { id: 'general' as SettingsTab, label: 'General', icon: Sliders },
    { id: 'appearance' as SettingsTab, label: 'Appearance', icon: Palette },
    { id: 'global' as SettingsTab, label: 'Preferences', icon: Globe },
    { id: 'habits' as SettingsTab, label: 'Habits', icon: Flame },
    { id: 'todo' as SettingsTab, label: 'To-Do', icon: CheckSquare },
    { id: 'timer' as SettingsTab, label: 'Focus Timer', icon: Timer },
    { id: 'calendar' as SettingsTab, label: 'Calendar', icon: Calendar },
    { id: 'journal_notes' as SettingsTab, label: 'Journal & Notes', icon: BookOpen },
    { id: 'data' as SettingsTab, label: 'Data & Backups', icon: Database },
  ];

  return (
    <div className="space-y-6">
      {/* Backup Reminder Banner */}
      {needsBackupBanner && activeTab === 'data' && (
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

      {/* Settings Navigation Tabs */}
      <div className="border-b border-border pb-2 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1.5 min-w-max">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer select-none ${
                  isActive
                    ? 'bg-primary text-white font-bold shadow-xs'
                    : 'text-txt-secondary hover:text-txt-primary hover:bg-bg-subtle'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-txt-muted'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Panels */}
      <div className="pt-2">
        <AnimatePresence mode="wait">
          {/* ==================================================================== */}
          {/* TAB 1: GENERAL PREFERENCES */}
          {/* ==================================================================== */}
          {activeTab === 'general' && (
            <motion.div
              key="general"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-sm font-serif font-bold text-txt-primary flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  <span>General Settings</span>
                </h3>
                <p className="text-xs text-txt-muted mt-0.5">
                  Identity, regional localization, and startup navigation preferences.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Display Name */}
                <div className="bg-bg-subtle/50 border border-border p-4 rounded-xl space-y-2">
                  <label className="block text-xs font-semibold text-txt-primary">
                    Display Name
                  </label>
                  <p className="text-[11px] text-txt-muted">Used in header greetings and workspace exports.</p>
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={displayNameInput}
                      onChange={e => setDisplayNameInput(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs bg-bg-card border border-border rounded-lg text-txt-primary outline-hidden focus:border-primary"
                      placeholder="e.g. Dharinish"
                    />
                    <button
                      onClick={() => updateGeneralSettings({ displayName: displayNameInput.trim() || 'Dharinish' })}
                      className="px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-hover transition-colors cursor-pointer"
                    >
                      Save
                    </button>
                  </div>
                </div>

                {/* Language Selection */}
                <div className="bg-bg-subtle/50 border border-border p-4 rounded-xl space-y-2">
                  <label className="block text-xs font-semibold text-txt-primary">
                    Language
                  </label>
                  <p className="text-[11px] text-txt-muted">Supported UI languages and terminology.</p>
                  <select
                    value={settings.general?.language || 'en'}
                    onChange={e => updateGeneralSettings({ language: e.target.value as SupportedLanguage })}
                    className="w-full px-3 py-1.5 text-xs bg-bg-card border border-border rounded-lg text-txt-primary outline-hidden focus:border-primary cursor-pointer"
                  >
                    <option value="en">English (US & International)</option>
                    <option value="es">Español (Spanish)</option>
                    <option value="fr">Français (French)</option>
                    <option value="de">Deutsch (German)</option>
                  </select>
                </div>

                {/* Date Format */}
                <div className="bg-bg-subtle/50 border border-border p-4 rounded-xl space-y-2">
                  <label className="block text-xs font-semibold text-txt-primary">
                    Date Format
                  </label>
                  <p className="text-[11px] text-txt-muted">Format used to present calendar dates across all modules.</p>
                  <select
                    value={settings.general?.dateFormat || 'YYYY-MM-DD'}
                    onChange={e => updateGeneralSettings({ dateFormat: e.target.value as DateFormatOption })}
                    className="w-full px-3 py-1.5 text-xs bg-bg-card border border-border rounded-lg text-txt-primary outline-hidden focus:border-primary cursor-pointer"
                  >
                    <option value="YYYY-MM-DD">YYYY-MM-DD (e.g. 2026-11-11)</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY (e.g. 11/11/2026)</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 11/11/2026)</option>
                  </select>
                </div>

                {/* Week Starts On */}
                <div className="bg-bg-subtle/50 border border-border p-4 rounded-xl space-y-2">
                  <label className="block text-xs font-semibold text-txt-primary">
                    Week Starts On
                  </label>
                  <p className="text-[11px] text-txt-muted">Determines calendar columns and weekly progress calculation.</p>
                  <select
                    value={settings.general?.weekStart || settings.weekStart || 'monday'}
                    onChange={e => updateGeneralSettings({ weekStart: e.target.value as 'monday' | 'sunday' })}
                    className="w-full px-3 py-1.5 text-xs bg-bg-card border border-border rounded-lg text-txt-primary outline-hidden focus:border-primary cursor-pointer"
                  >
                    <option value="monday">Monday (ISO 8601 standard)</option>
                    <option value="sunday">Sunday (US / Traditional)</option>
                  </select>
                </div>

                {/* Default Landing Page */}
                <div className="bg-bg-subtle/50 border border-border p-4 rounded-xl space-y-2 md:col-span-2">
                  <label className="block text-xs font-semibold text-txt-primary">
                    Default Landing Page
                  </label>
                  <p className="text-[11px] text-txt-muted">Which view to open when loading the workspace from root URL.</p>
                  <select
                    value={settings.general?.defaultLandingPage || 'dashboard'}
                    onChange={e => updateGeneralSettings({ defaultLandingPage: e.target.value as LandingPageOption })}
                    className="w-full sm:w-72 px-3 py-1.5 text-xs bg-bg-card border border-border rounded-lg text-txt-primary outline-hidden focus:border-primary cursor-pointer"
                  >
                    <option value="dashboard">Dashboard (Overview & Today)</option>
                    <option value="tasks">To-Do / Tasks</option>
                    <option value="calendar">Calendar View</option>
                    <option value="habits">Habit Tracker</option>
                    <option value="journal">Daily Journal</option>
                    <option value="notes">Notes Library</option>
                    <option value="timer">Focus Timer</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}

          {/* ==================================================================== */}
          {/* TAB 2: APPEARANCE PREFERENCES */}
          {/* ==================================================================== */}
          {activeTab === 'appearance' && (
            <motion.div
              key="appearance"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-sm font-serif font-bold text-txt-primary flex items-center gap-2">
                  <Palette className="w-4 h-4 text-primary" />
                  <span>Appearance & Themes</span>
                </h3>
                <p className="text-xs text-txt-muted mt-0.5">
                  Live customization of color modes, design systems, accent colors, and typography scaling.
                </p>
              </div>

              {/* Theme Mode: Light / Dark / System */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-txt-secondary">
                  Theme Mode
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => updateAppearanceSettings({ themeMode: 'light' })}
                    className={`p-3 rounded-xl border flex items-center gap-3 transition-all cursor-pointer ${
                      currentThemeMode === 'light'
                        ? 'border-primary bg-primary/10 text-txt-primary ring-2 ring-primary ring-offset-2 ring-offset-bg-card shadow-xs'
                        : 'border-border bg-bg-card hover:bg-bg-subtle text-txt-secondary'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-400/20 text-amber-500 flex items-center justify-center flex-shrink-0">
                      <Sun className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="text-xs font-bold text-txt-primary">Light Mode</div>
                      <div className="text-[11px] text-txt-muted">Creamy White & Blue</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => updateAppearanceSettings({ themeMode: 'dark' })}
                    className={`p-3 rounded-xl border flex items-center gap-3 transition-all cursor-pointer ${
                      currentThemeMode === 'dark'
                        ? 'border-primary bg-primary/10 text-txt-primary ring-2 ring-primary ring-offset-2 ring-offset-bg-card shadow-xs'
                        : 'border-border bg-bg-card hover:bg-bg-subtle text-txt-secondary'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center flex-shrink-0">
                      <Moon className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="text-xs font-bold text-txt-primary">Dark Mode</div>
                      <div className="text-[11px] text-txt-muted">Slate Night Canvas</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => updateAppearanceSettings({ themeMode: 'system' })}
                    className={`p-3 rounded-xl border flex items-center gap-3 transition-all cursor-pointer ${
                      currentThemeMode === 'system'
                        ? 'border-primary bg-primary/10 text-txt-primary ring-2 ring-primary ring-offset-2 ring-offset-bg-card shadow-xs'
                        : 'border-border bg-bg-card hover:bg-bg-subtle text-txt-secondary'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-500 flex items-center justify-center flex-shrink-0">
                      <Laptop className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="text-xs font-bold text-txt-primary">System Match</div>
                      <div className="text-[11px] text-txt-muted">Follows OS Preference</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Accent Color Palette */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-txt-secondary">
                  Accent Color
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
                  {[
                    { id: 'blue' as AccentColor, name: 'Google Blue', hex: '#1A73E8' },
                    { id: 'indigo' as AccentColor, name: 'Royal Indigo', hex: '#4F46E5' },
                    { id: 'violet' as AccentColor, name: 'Deep Violet', hex: '#7C3AED' },
                    { id: 'emerald' as AccentColor, name: 'Forest Emerald', hex: '#059669' },
                    { id: 'rose' as AccentColor, name: 'Ruby Rose', hex: '#E11D48' },
                    { id: 'amber' as AccentColor, name: 'Warm Amber', hex: '#D97706' },
                  ].map(acc => {
                    const isSelected = currentAccent === acc.id;
                    return (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => updateAppearanceSettings({ accentColor: acc.id })}
                        className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-primary bg-primary/10 ring-2 ring-primary ring-offset-2 ring-offset-bg-card shadow-xs'
                            : 'border-border bg-bg-card hover:bg-bg-subtle'
                        }`}
                      >
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-white shadow-2xs"
                          style={{ backgroundColor: acc.hex }}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                        <span className="text-[11px] font-medium text-txt-primary text-center">
                          {acc.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* UI Theme Style: Current / Paper / Notion */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-txt-secondary">
                  UI Theme Style
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div
                    onClick={() => updateAppearanceSettings({ backgroundStyle: 'current' })}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      currentBgStyle === 'current'
                        ? 'border-primary ring-2 ring-primary ring-offset-2 ring-offset-bg-card bg-bg-card shadow-xs'
                        : 'border-border bg-bg-card hover:bg-bg-subtle/70'
                    }`}
                  >
                    <div className="text-xs font-bold text-txt-primary flex items-center justify-between">
                      <span>Standard Flat</span>
                      {currentBgStyle === 'current' && <Check className="w-4 h-4 text-primary" />}
                    </div>
                    <p className="text-[11px] text-txt-muted mt-1">Clean, solid modern interface.</p>
                  </div>

                  <div
                    onClick={() => updateAppearanceSettings({ backgroundStyle: 'paper' })}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      currentBgStyle === 'paper'
                        ? 'border-primary ring-2 ring-primary ring-offset-2 ring-offset-bg-card bg-bg-card shadow-xs'
                        : 'border-border bg-bg-card hover:bg-bg-subtle/70'
                    }`}
                  >
                    <div className="text-xs font-bold text-txt-primary flex items-center justify-between">
                      <span>Paper Texture</span>
                      {currentBgStyle === 'paper' && <Check className="w-4 h-4 text-primary" />}
                    </div>
                    <p className="text-[11px] text-txt-muted mt-1">Tactile paper grain & warm overlay.</p>
                  </div>

                  <div
                    onClick={() => updateAppearanceSettings({ backgroundStyle: 'notion' })}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      currentBgStyle === 'notion'
                        ? 'border-primary ring-2 ring-primary ring-offset-2 ring-offset-bg-card bg-bg-card shadow-xs'
                        : 'border-border bg-bg-card hover:bg-bg-subtle/70'
                    }`}
                  >
                    <div className="text-xs font-bold text-txt-primary flex items-center justify-between">
                      <span>Notion Minimal</span>
                      {currentBgStyle === 'notion' && <Check className="w-4 h-4 text-primary" />}
                    </div>
                    <p className="text-[11px] text-txt-muted mt-1">Notion typography, subtle borders & clean cards.</p>
                  </div>
                </div>
              </div>

              {/* Font Size & Density & Animations */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                {/* Font Size */}
                <div className="bg-bg-subtle/50 border border-border p-3.5 rounded-xl space-y-1.5">
                  <label className="block text-xs font-semibold text-txt-primary flex items-center gap-1.5">
                    <Type className="w-3.5 h-3.5 text-primary" />
                    <span>Font Size</span>
                  </label>
                  <select
                    value={settings.appearance?.fontSize || 'md'}
                    onChange={e => updateAppearanceSettings({ fontSize: e.target.value as FontSizeOption })}
                    className="w-full px-2.5 py-1.5 text-xs bg-bg-card border border-border rounded-lg text-txt-primary cursor-pointer"
                  >
                    <option value="sm">Small (14px base)</option>
                    <option value="md">Medium / Normal (16px base)</option>
                    <option value="lg">Large (18px base)</option>
                  </select>
                </div>

                {/* Layout Density */}
                <div className="bg-bg-subtle/50 border border-border p-3.5 rounded-xl space-y-1.5">
                  <label className="block text-xs font-semibold text-txt-primary flex items-center gap-1.5">
                    <Layout className="w-3.5 h-3.5 text-primary" />
                    <span>Layout Density</span>
                  </label>
                  <select
                    value={settings.appearance?.density || 'comfortable'}
                    onChange={e => updateAppearanceSettings({ density: e.target.value as LayoutDensity })}
                    className="w-full px-2.5 py-1.5 text-xs bg-bg-card border border-border rounded-lg text-txt-primary cursor-pointer"
                  >
                    <option value="comfortable">Comfortable (Standard)</option>
                    <option value="compact">Compact (Tighter padding)</option>
                  </select>
                </div>

                {/* Animations */}
                <div className="bg-bg-subtle/50 border border-border p-3.5 rounded-xl space-y-1.5">
                  <label className="block text-xs font-semibold text-txt-primary flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-primary" />
                    <span>Animations</span>
                  </label>
                  <select
                    value={settings.appearance?.animations || 'full'}
                    onChange={e => updateAppearanceSettings({ animations: e.target.value as AnimationPreference })}
                    className="w-full px-2.5 py-1.5 text-xs bg-bg-card border border-border rounded-lg text-txt-primary cursor-pointer"
                  >
                    <option value="full">Full (Fluid transitions)</option>
                    <option value="reduced">Reduced motion</option>
                    <option value="none">Disabled (Instant)</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}

          {/* ==================================================================== */}
          {/* TAB 3: GLOBAL PREFERENCES */}
          {/* ==================================================================== */}
          {activeTab === 'global' && (
            <motion.div
              key="global"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-sm font-serif font-bold text-txt-primary flex items-center gap-2">
                  <Globe className="w-4 h-4 text-primary" />
                  <span>Global Behavioral Preferences</span>
                </h3>
                <p className="text-xs text-txt-muted mt-0.5">
                  Application-wide notifications, confirmations, and startup behavior.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Notification Preferences */}
                <div className="bg-bg-subtle/50 border border-border p-4 rounded-xl space-y-2">
                  <label className="block text-xs font-semibold text-txt-primary flex items-center gap-1.5">
                    <Bell className="w-4 h-4 text-primary" />
                    <span>Notification Mode</span>
                  </label>
                  <p className="text-[11px] text-txt-muted">Toast banners and audible sound cues.</p>
                  <select
                    value={settings.globalPreferences?.notifications || 'enabled'}
                    onChange={e => updateGlobalPreferences({ notifications: e.target.value as NotificationPreference })}
                    className="w-full px-3 py-1.5 text-xs bg-bg-card border border-border rounded-lg text-txt-primary cursor-pointer"
                  >
                    <option value="enabled">Enabled (Visual Toasts & Sound)</option>
                    <option value="sound_only">Sound Only</option>
                    <option value="disabled">Disabled (Do not disturb)</option>
                  </select>
                </div>

                {/* Reminder Lead Time */}
                <div className="bg-bg-subtle/50 border border-border p-4 rounded-xl space-y-2">
                  <label className="block text-xs font-semibold text-txt-primary flex items-center gap-1.5">
                    <Volume2 className="w-4 h-4 text-primary" />
                    <span>Reminder Lead Time</span>
                  </label>
                  <p className="text-[11px] text-txt-muted">Advance notice for scheduled tasks and upcoming events.</p>
                  <select
                    value={settings.globalPreferences?.reminderLeadTimeMinutes ?? 15}
                    onChange={e => updateGlobalPreferences({ reminderLeadTimeMinutes: parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-1.5 text-xs bg-bg-card border border-border rounded-lg text-txt-primary cursor-pointer"
                  >
                    <option value={5}>5 minutes before</option>
                    <option value={15}>15 minutes before (Default)</option>
                    <option value={30}>30 minutes before</option>
                    <option value={60}>1 hour before</option>
                  </select>
                </div>

                {/* Default Task Sorting */}
                <div className="bg-bg-subtle/50 border border-border p-4 rounded-xl space-y-2">
                  <label className="block text-xs font-semibold text-txt-primary">
                    Default Task Sorting
                  </label>
                  <p className="text-[11px] text-txt-muted">Initial task sorting order applied across to-do views.</p>
                  <select
                    value={settings.globalPreferences?.defaultTaskSorting || 'order'}
                    onChange={e => updateGlobalPreferences({ defaultTaskSorting: e.target.value as TaskSortOption })}
                    className="w-full px-3 py-1.5 text-xs bg-bg-card border border-border rounded-lg text-txt-primary cursor-pointer"
                  >
                    <option value="order">Custom Manual Order (Drag & Drop)</option>
                    <option value="dueDate">Due Date (Earliest first)</option>
                    <option value="priority">Priority (High to Low)</option>
                    <option value="title">Alphabetical Title (A-Z)</option>
                  </select>
                </div>

                {/* Startup Behavior */}
                <div className="bg-bg-subtle/50 border border-border p-4 rounded-xl space-y-2">
                  <label className="block text-xs font-semibold text-txt-primary">
                    Startup Behavior
                  </label>
                  <p className="text-[11px] text-txt-muted">What the application displays when first opened.</p>
                  <select
                    value={settings.globalPreferences?.startupBehavior || 'landing_page'}
                    onChange={e => updateGlobalPreferences({ startupBehavior: e.target.value as StartupBehavior })}
                    className="w-full px-3 py-1.5 text-xs bg-bg-card border border-border rounded-lg text-txt-primary cursor-pointer"
                  >
                    <option value="landing_page">Open Default Landing Page</option>
                    <option value="last_visited">Restore Last Visited View</option>
                  </select>
                </div>

                {/* Confirm Before Permanent Delete */}
                <div className="bg-bg-subtle/50 border border-border p-4 rounded-xl space-y-2 md:col-span-2 flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-semibold text-txt-primary">
                      Confirm Before Permanent Deletion
                    </label>
                    <p className="text-[11px] text-txt-muted">
                      Requires typing exact entity names before permanent deletion of pages or major data.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.globalPreferences?.confirmBeforeDelete ?? true}
                    onChange={e => updateGlobalPreferences({ confirmBeforeDelete: e.target.checked })}
                    className="w-4 h-4 accent-primary rounded cursor-pointer"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* ==================================================================== */}
          {/* TAB 4: HABITS MODULE SETTINGS */}
          {/* ==================================================================== */}
          {activeTab === 'habits' && (
            <motion.div
              key="habits"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-serif font-bold text-txt-primary flex items-center gap-2">
                    <Flame className="w-4 h-4 text-primary" />
                    <span>Habits Module Configuration</span>
                  </h3>
                  <p className="text-xs text-txt-muted mt-0.5">
                    Schedule defaults, streak display rules, and completion celebration behavior.
                  </p>
                </div>
                <label className="flex items-center gap-2 text-xs font-semibold text-txt-primary cursor-pointer bg-bg-subtle px-3 py-1.5 rounded-lg border border-border">
                  <input
                    type="checkbox"
                    checked={settings.modules?.habits?.enabled ?? true}
                    onChange={e => updateModuleSettings('habits', { enabled: e.target.checked })}
                    className="w-4 h-4 accent-primary rounded"
                  />
                  <span>Module Enabled</span>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-bg-subtle/50 border border-border p-4 rounded-xl space-y-2">
                  <label className="block text-xs font-semibold text-txt-primary">
                    Default Frequency
                  </label>
                  <p className="text-[11px] text-txt-muted">Preselected schedule when creating a new habit.</p>
                  <select
                    value={settings.modules?.habits?.defaultFrequency || 'daily'}
                    onChange={e => updateModuleSettings('habits', { defaultFrequency: e.target.value as 'daily' | 'weekdays' })}
                    className="w-full px-3 py-1.5 text-xs bg-bg-card border border-border rounded-lg text-txt-primary cursor-pointer"
                  >
                    <option value="daily">Every Day (7 days/week)</option>
                    <option value="weekdays">Specific Weekdays</option>
                  </select>
                </div>

                <div className="bg-bg-subtle/50 border border-border p-4 rounded-xl space-y-2">
                  <label className="block text-xs font-semibold text-txt-primary">
                    Daily Reminder Time
                  </label>
                  <p className="text-[11px] text-txt-muted">Target time of day for scheduled habit notifications.</p>
                  <input
                    type="time"
                    value={settings.modules?.habits?.reminderTime || '09:00'}
                    onChange={e => updateModuleSettings('habits', { reminderTime: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-bg-card border border-border rounded-lg text-txt-primary cursor-pointer"
                  />
                </div>

                <div className="bg-bg-subtle/50 border border-border p-4 rounded-xl space-y-2">
                  <label className="block text-xs font-semibold text-txt-primary">
                    Weekly Goal (Days)
                  </label>
                  <p className="text-[11px] text-txt-muted">Default target completion days per week.</p>
                  <input
                    type="number"
                    min="1"
                    max="7"
                    value={settings.modules?.habits?.weeklyGoalDays ?? 5}
                    onChange={e => updateModuleSettings('habits', { weeklyGoalDays: Math.min(7, Math.max(1, parseInt(e.target.value, 10) || 5)) })}
                    className="w-full px-3 py-1.5 text-xs bg-bg-card border border-border rounded-lg text-txt-primary cursor-pointer"
                  />
                </div>

                <div className="bg-bg-subtle/50 border border-border p-4 rounded-xl space-y-2">
                  <label className="block text-xs font-semibold text-txt-primary">
                    Streak Display Style
                  </label>
                  <p className="text-[11px] text-txt-muted">How streak counts are shown on habit cards and tables.</p>
                  <select
                    value={settings.modules?.habits?.streakDisplay || 'badge'}
                    onChange={e => updateModuleSettings('habits', { streakDisplay: e.target.value as any })}
                    className="w-full px-3 py-1.5 text-xs bg-bg-card border border-border rounded-lg text-txt-primary cursor-pointer"
                  >
                    <option value="badge">Badge with Day Count</option>
                    <option value="flame_only">Flame Icon Only</option>
                    <option value="hidden">Hidden</option>
                  </select>
                </div>

                <div className="bg-bg-subtle/50 border border-border p-4 rounded-xl space-y-2">
                  <label className="block text-xs font-semibold text-txt-primary">
                    Completion Behavior
                  </label>
                  <p className="text-[11px] text-txt-muted">Feedback effect when marking a habit complete.</p>
                  <select
                    value={settings.modules?.habits?.completionBehavior || 'confetti'}
                    onChange={e => updateModuleSettings('habits', { completionBehavior: e.target.value as any })}
                    className="w-full px-3 py-1.5 text-xs bg-bg-card border border-border rounded-lg text-txt-primary cursor-pointer"
                  >
                    <option value="confetti">Celebration Confetti</option>
                    <option value="toast">Toast Message Only</option>
                    <option value="none">Silent (No animation)</option>
                  </select>
                </div>

                <div className="bg-bg-subtle/50 border border-border p-4 rounded-xl space-y-2 flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-semibold text-txt-primary">
                      Show Archived Habits
                    </label>
                    <p className="text-[11px] text-txt-muted">Display inactive or paused habits in the overview.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.modules?.habits?.showArchived ?? false}
                    onChange={e => updateModuleSettings('habits', { showArchived: e.target.checked })}
                    className="w-4 h-4 accent-primary rounded cursor-pointer"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* ==================================================================== */}
          {/* TAB 5: TO-DO MODULE SETTINGS */}
          {/* ==================================================================== */}
          {activeTab === 'todo' && (
            <motion.div
              key="todo"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-serif font-bold text-txt-primary flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-primary" />
                    <span>To-Do Module Configuration</span>
                  </h3>
                  <p className="text-xs text-txt-muted mt-0.5">
                    Task defaults, sorting strategies, and completed item handling.
                  </p>
                </div>
                <label className="flex items-center gap-2 text-xs font-semibold text-txt-primary cursor-pointer bg-bg-subtle px-3 py-1.5 rounded-lg border border-border">
                  <input
                    type="checkbox"
                    checked={settings.modules?.todo?.enabled ?? true}
                    onChange={e => updateModuleSettings('todo', { enabled: e.target.checked })}
                    className="w-4 h-4 accent-primary rounded"
                  />
                  <span>Module Enabled</span>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-bg-subtle/50 border border-border p-4 rounded-xl space-y-2">
                  <label className="block text-xs font-semibold text-txt-primary">
                    Default Task Priority
                  </label>
                  <p className="text-[11px] text-txt-muted">Assigned when creating tasks without an explicit priority.</p>
                  <select
                    value={settings.modules?.todo?.defaultPriority || 'medium'}
                    onChange={e => updateModuleSettings('todo', { defaultPriority: e.target.value as any })}
                    className="w-full px-3 py-1.5 text-xs bg-bg-card border border-border rounded-lg text-txt-primary cursor-pointer"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                </div>

                <div className="bg-bg-subtle/50 border border-border p-4 rounded-xl space-y-2">
                  <label className="block text-xs font-semibold text-txt-primary">
                    Default Due Date
                  </label>
                  <p className="text-[11px] text-txt-muted">Pre-populated due date for newly created tasks.</p>
                  <select
                    value={settings.modules?.todo?.defaultDueDate || 'none'}
                    onChange={e => updateModuleSettings('todo', { defaultDueDate: e.target.value as any })}
                    className="w-full px-3 py-1.5 text-xs bg-bg-card border border-border rounded-lg text-txt-primary cursor-pointer"
                  >
                    <option value="none">No Due Date</option>
                    <option value="today">Today</option>
                    <option value="tomorrow">Tomorrow</option>
                  </select>
                </div>

                <div className="bg-bg-subtle/50 border border-border p-4 rounded-xl space-y-2">
                  <label className="block text-xs font-semibold text-txt-primary">
                    Task Sorting Strategy
                  </label>
                  <p className="text-[11px] text-txt-muted">How tasks are arranged within page cards and lists.</p>
                  <select
                    value={settings.modules?.todo?.defaultSort || 'order'}
                    onChange={e => updateModuleSettings('todo', { defaultSort: e.target.value as any })}
                    className="w-full px-3 py-1.5 text-xs bg-bg-card border border-border rounded-lg text-txt-primary cursor-pointer"
                  >
                    <option value="order">Custom Manual Order (Drag & Drop)</option>
                    <option value="priority">Priority (High to Low)</option>
                    <option value="dueDate">Due Date (Earliest first)</option>
                    <option value="title">Alphabetical (A-Z)</option>
                  </select>
                </div>

                <div className="bg-bg-subtle/50 border border-border p-4 rounded-xl space-y-2">
                  <label className="block text-xs font-semibold text-txt-primary">
                    Completed Task Visibility
                  </label>
                  <p className="text-[11px] text-txt-muted">Placement and display of finished tasks.</p>
                  <select
                    value={settings.modules?.todo?.completedVisibility || 'show'}
                    onChange={e => updateModuleSettings('todo', { completedVisibility: e.target.value as any })}
                    className="w-full px-3 py-1.5 text-xs bg-bg-card border border-border rounded-lg text-txt-primary cursor-pointer"
                  >
                    <option value="show">Show Inline with Open Tasks</option>
                    <option value="bottom">Move to Bottom of List</option>
                    <option value="hide">Hide Completed Tasks</option>
                  </select>
                </div>

                <div className="bg-bg-subtle/50 border border-border p-4 rounded-xl space-y-2">
                  <label className="block text-xs font-semibold text-txt-primary">
                    Recurring Task Behavior
                  </label>
                  <p className="text-[11px] text-txt-muted">Action taken upon completing repeating tasks.</p>
                  <select
                    value={settings.modules?.todo?.recurringBehavior || 'create_next'}
                    onChange={e => updateModuleSettings('todo', { recurringBehavior: e.target.value as any })}
                    className="w-full px-3 py-1.5 text-xs bg-bg-card border border-border rounded-lg text-txt-primary cursor-pointer"
                  >
                    <option value="create_next">Create Next Occurrence Immediately</option>
                    <option value="keep_completed">Keep Completed Until Scheduled Date</option>
                  </select>
                </div>

                <div className="bg-bg-subtle/50 border border-border p-4 rounded-xl space-y-2 flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-semibold text-txt-primary">
                      Enable Task Due Date Reminders
                    </label>
                    <p className="text-[11px] text-txt-muted">Receive alerts when tasks reach their target time.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.modules?.todo?.enableReminders ?? true}
                    onChange={e => updateModuleSettings('todo', { enableReminders: e.target.checked })}
                    className="w-4 h-4 accent-primary rounded cursor-pointer"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* ==================================================================== */}
          {/* TAB 6: FOCUS TIMER MODULE SETTINGS */}
          {/* ==================================================================== */}
          {activeTab === 'timer' && (
            <motion.div
              key="timer"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-serif font-bold text-txt-primary flex items-center gap-2">
                    <Timer className="w-4 h-4 text-[#2F5D50]" />
                    <span>Focus Timer & Pomodoro Configuration</span>
                  </h3>
                  <p className="text-xs text-txt-muted mt-0.5">
                    Block durations, break cycles, audio feedback, and session tracking rules.
                  </p>
                </div>
                <label className="flex items-center gap-2 text-xs font-semibold text-txt-primary cursor-pointer bg-bg-subtle px-3 py-1.5 rounded-lg border border-border">
                  <input
                    type="checkbox"
                    checked={settings.modules?.timer?.enabled ?? true}
                    onChange={e => updateModuleSettings('timer', { enabled: e.target.checked })}
                    className="w-4 h-4 accent-[#2F5D50] rounded"
                  />
                  <span>Module Enabled</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-bg-subtle/50 border border-border p-3.5 rounded-xl space-y-1.5">
                  <label className="block text-xs font-semibold text-txt-primary">Work Block (min)</label>
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={settings.modules?.timer?.workMinutes ?? 25}
                    onChange={e => updateModuleSettings('timer', { workMinutes: Math.max(1, parseInt(e.target.value, 10) || 25) })}
                    className="w-full px-3 py-1.5 text-xs bg-bg-card border border-border rounded-lg text-txt-primary outline-hidden focus:border-[#2F5D50]"
                  />
                </div>

                <div className="bg-bg-subtle/50 border border-border p-3.5 rounded-xl space-y-1.5">
                  <label className="block text-xs font-semibold text-txt-primary">Short Break (min)</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={settings.modules?.timer?.shortBreakMinutes ?? 5}
                    onChange={e => updateModuleSettings('timer', { shortBreakMinutes: Math.max(1, parseInt(e.target.value, 10) || 5) })}
                    className="w-full px-3 py-1.5 text-xs bg-bg-card border border-border rounded-lg text-txt-primary outline-hidden focus:border-[#2F5D50]"
                  />
                </div>

                <div className="bg-bg-subtle/50 border border-border p-3.5 rounded-xl space-y-1.5">
                  <label className="block text-xs font-semibold text-txt-primary">Long Break (min)</label>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={settings.modules?.timer?.longBreakMinutes ?? 15}
                    onChange={e => updateModuleSettings('timer', { longBreakMinutes: Math.max(1, parseInt(e.target.value, 10) || 15) })}
                    className="w-full px-3 py-1.5 text-xs bg-bg-card border border-border rounded-lg text-txt-primary outline-hidden focus:border-[#2F5D50]"
                  />
                </div>

                <div className="bg-bg-subtle/50 border border-border p-3.5 rounded-xl space-y-1.5">
                  <label className="block text-xs font-semibold text-txt-primary">Long Break Interval</label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={settings.modules?.timer?.longBreakInterval ?? 4}
                    onChange={e => updateModuleSettings('timer', { longBreakInterval: Math.max(1, parseInt(e.target.value, 10) || 4) })}
                    className="w-full px-3 py-1.5 text-xs bg-bg-card border border-border rounded-lg text-txt-primary outline-hidden focus:border-[#2F5D50]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-bg-subtle/50 border border-border p-4 rounded-xl space-y-2">
                  <label className="block text-xs font-semibold text-txt-primary">
                    Sound Feedback Theme
                  </label>
                  <p className="text-[11px] text-txt-muted">Audible alerts when focus blocks and breaks conclude.</p>
                  <select
                    value={settings.modules?.timer?.soundTheme || 'bell'}
                    onChange={e => updateModuleSettings('timer', { soundTheme: e.target.value as any })}
                    className="w-full px-3 py-1.5 text-xs bg-bg-card border border-border rounded-lg text-txt-primary cursor-pointer"
                  >
                    <option value="bell">Tibetan Singing Bowl / Bell</option>
                    <option value="digital">Digital Electronic Beep</option>
                    <option value="chime">Subtle Wind Chime</option>
                    <option value="silent">Silent (Visual cues only)</option>
                  </select>
                </div>

                <div className="bg-bg-subtle/50 border border-border p-4 rounded-xl space-y-2">
                  <label className="block text-xs font-semibold text-txt-primary">
                    Session Save Tracking
                  </label>
                  <p className="text-[11px] text-txt-muted">How completed sessions are recorded into IndexedDB.</p>
                  <select
                    value={settings.modules?.timer?.sessionTracking || 'auto_save'}
                    onChange={e => updateModuleSettings('timer', { sessionTracking: e.target.value as any })}
                    className="w-full px-3 py-1.5 text-xs bg-bg-card border border-border rounded-lg text-txt-primary cursor-pointer"
                  >
                    <option value="auto_save">Auto-save completed sessions</option>
                    <option value="prompt">Prompt to review & tag session</option>
                  </select>
                </div>

                <div className="bg-bg-subtle/50 border border-border p-4 rounded-xl space-y-2 flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-semibold text-txt-primary">Auto-Start Breaks</label>
                    <p className="text-[11px] text-txt-muted">Start break timer immediately upon finishing work block.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.modules?.timer?.autoStartBreaks ?? false}
                    onChange={e => updateModuleSettings('timer', { autoStartBreaks: e.target.checked })}
                    className="w-4 h-4 accent-[#2F5D50] rounded cursor-pointer"
                  />
                </div>

                <div className="bg-bg-subtle/50 border border-border p-4 rounded-xl space-y-2 flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-semibold text-txt-primary">Auto-Start Next Work Session</label>
                    <p className="text-[11px] text-txt-muted">Start next work block immediately after break ends.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.modules?.timer?.autoStartWork ?? false}
                    onChange={e => updateModuleSettings('timer', { autoStartWork: e.target.checked })}
                    className="w-4 h-4 accent-[#2F5D50] rounded cursor-pointer"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* ==================================================================== */}
          {/* TAB 7: CALENDAR MODULE SETTINGS */}
          {/* ==================================================================== */}
          {activeTab === 'calendar' && (
            <motion.div
              key="calendar"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-serif font-bold text-txt-primary flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span>Calendar Module Configuration</span>
                  </h3>
                  <p className="text-xs text-txt-muted mt-0.5">
                    View perspectives, completed task filtering, and default event durations.
                  </p>
                </div>
                <label className="flex items-center gap-2 text-xs font-semibold text-txt-primary cursor-pointer bg-bg-subtle px-3 py-1.5 rounded-lg border border-border">
                  <input
                    type="checkbox"
                    checked={settings.modules?.calendar?.enabled ?? true}
                    onChange={e => updateModuleSettings('calendar', { enabled: e.target.checked })}
                    className="w-4 h-4 accent-primary rounded"
                  />
                  <span>Module Enabled</span>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-bg-subtle/50 border border-border p-4 rounded-xl space-y-2">
                  <label className="block text-xs font-semibold text-txt-primary">
                    Default Calendar View
                  </label>
                  <p className="text-[11px] text-txt-muted">Initial perspective opened when navigating to Calendar.</p>
                  <select
                    value={settings.modules?.calendar?.defaultView || 'month'}
                    onChange={e => updateModuleSettings('calendar', { defaultView: e.target.value as any })}
                    className="w-full px-3 py-1.5 text-xs bg-bg-card border border-border rounded-lg text-txt-primary cursor-pointer"
                  >
                    <option value="month">Month View (Full Grid)</option>
                    <option value="week">Week View</option>
                    <option value="day">Day View (Hourly Timeline)</option>
                  </select>
                </div>

                <div className="bg-bg-subtle/50 border border-border p-4 rounded-xl space-y-2">
                  <label className="block text-xs font-semibold text-txt-primary">
                    Default Event Duration (min)
                  </label>
                  <p className="text-[11px] text-txt-muted">Standard duration for events created without an end time.</p>
                  <select
                    value={settings.modules?.calendar?.defaultEventDuration ?? 30}
                    onChange={e => updateModuleSettings('calendar', { defaultEventDuration: parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-1.5 text-xs bg-bg-card border border-border rounded-lg text-txt-primary cursor-pointer"
                  >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes (Default)</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>60 minutes (1 hour)</option>
                  </select>
                </div>

                <div className="bg-bg-subtle/50 border border-border p-4 rounded-xl space-y-2 md:col-span-2 flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-semibold text-txt-primary">
                      Show Completed Tasks on Calendar
                    </label>
                    <p className="text-[11px] text-txt-muted">
                      Display checked-off to-do tasks alongside pending activities.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.modules?.calendar?.showCompletedTasks ?? true}
                    onChange={e => updateModuleSettings('calendar', { showCompletedTasks: e.target.checked })}
                    className="w-4 h-4 accent-primary rounded cursor-pointer"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* ==================================================================== */}
          {/* TAB 8: JOURNAL & NOTES MODULE SETTINGS */}
          {/* ==================================================================== */}
          {activeTab === 'journal_notes' && (
            <motion.div
              key="journal_notes"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              {/* Journal Sub-Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-serif font-bold text-txt-primary flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-primary" />
                      <span>Daily Journal Configuration</span>
                    </h3>
                    <p className="text-xs text-txt-muted mt-0.5">
                      Daily mood tracking prompts, default tags, and background autosave cadence.
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-xs font-semibold text-txt-primary cursor-pointer bg-bg-subtle px-3 py-1.5 rounded-lg border border-border">
                    <input
                      type="checkbox"
                      checked={settings.modules?.journal?.enabled ?? true}
                      onChange={e => updateModuleSettings('journal', { enabled: e.target.checked })}
                      className="w-4 h-4 accent-primary rounded"
                    />
                    <span>Journal Enabled</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-bg-subtle/50 border border-border p-4 rounded-xl space-y-2 flex items-center justify-between">
                    <div>
                      <label className="block text-xs font-semibold text-txt-primary">
                        Prompt Daily Mood
                      </label>
                      <p className="text-[11px] text-txt-muted">Show mood picker when opening daily journal entry.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.modules?.journal?.promptMood ?? true}
                      onChange={e => updateModuleSettings('journal', { promptMood: e.target.checked })}
                      className="w-4 h-4 accent-primary rounded cursor-pointer"
                    />
                  </div>

                  <div className="bg-bg-subtle/50 border border-border p-4 rounded-xl space-y-2">
                    <label className="block text-xs font-semibold text-txt-primary">
                      Autosave Cadence
                    </label>
                    <p className="text-[11px] text-txt-muted">Debounce interval before writing drafts to IndexedDB.</p>
                    <select
                      value={settings.modules?.journal?.autoSaveDelayMs ?? 1000}
                      onChange={e => updateModuleSettings('journal', { autoSaveDelayMs: parseInt(e.target.value, 10) })}
                      className="w-full px-3 py-1.5 text-xs bg-bg-card border border-border rounded-lg text-txt-primary cursor-pointer"
                    >
                      <option value={500}>500 ms (Fast)</option>
                      <option value={1000}>1000 ms (1 second - Balanced)</option>
                      <option value={2000}>2000 ms (2 seconds)</option>
                    </select>
                  </div>
                </div>
              </div>

              <hr className="border-border" />

              {/* Notes Sub-Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-serif font-bold text-txt-primary flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      <span>Notes Library Configuration</span>
                    </h3>
                    <p className="text-xs text-txt-muted mt-0.5">
                      Default display mode, sorting order, and markdown rendering.
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-xs font-semibold text-txt-primary cursor-pointer bg-bg-subtle px-3 py-1.5 rounded-lg border border-border">
                    <input
                      type="checkbox"
                      checked={settings.modules?.notes?.enabled ?? true}
                      onChange={e => updateModuleSettings('notes', { enabled: e.target.checked })}
                      className="w-4 h-4 accent-primary rounded"
                    />
                    <span>Notes Enabled</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-bg-subtle/50 border border-border p-4 rounded-xl space-y-2">
                    <label className="block text-xs font-semibold text-txt-primary">
                      Default View Mode
                    </label>
                    <p className="text-[11px] text-txt-muted">Display notes in a sequential list or a grid matrix.</p>
                    <select
                      value={settings.modules?.notes?.defaultViewMode || 'list'}
                      onChange={e => updateModuleSettings('notes', { defaultViewMode: e.target.value as any })}
                      className="w-full px-3 py-1.5 text-xs bg-bg-card border border-border rounded-lg text-txt-primary cursor-pointer"
                    >
                      <option value="list">List View</option>
                      <option value="grid">Grid View</option>
                    </select>
                  </div>

                  <div className="bg-bg-subtle/50 border border-border p-4 rounded-xl space-y-2">
                    <label className="block text-xs font-semibold text-txt-primary">
                      Default Sort Order
                    </label>
                    <p className="text-[11px] text-txt-muted">Initial ordering for notes overview.</p>
                    <select
                      value={settings.modules?.notes?.defaultSort || 'recent'}
                      onChange={e => updateModuleSettings('notes', { defaultSort: e.target.value as any })}
                      className="w-full px-3 py-1.5 text-xs bg-bg-card border border-border rounded-lg text-txt-primary cursor-pointer"
                    >
                      <option value="recent">Recently Modified</option>
                      <option value="oldest">Oldest First</option>
                      <option value="title-asc">Title (A - Z)</option>
                      <option value="title-desc">Title (Z - A)</option>
                    </select>
                  </div>

                  <div className="bg-bg-subtle/50 border border-border p-4 rounded-xl space-y-2 md:col-span-2 flex items-center justify-between">
                    <div>
                      <label className="block text-xs font-semibold text-txt-primary">
                        Live Markdown Preview
                      </label>
                      <p className="text-[11px] text-txt-muted">
                        Automatically render formatted markdown syntax (headings, code blocks, lists) in note editor.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.modules?.notes?.previewMarkdown ?? true}
                      onChange={e => updateModuleSettings('notes', { previewMarkdown: e.target.checked })}
                      className="w-4 h-4 accent-primary rounded cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ==================================================================== */}
          {/* TAB 9: DATA & BACKUPS */}
          {/* ==================================================================== */}
          {activeTab === 'data' && (
            <motion.div
              key="data"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-sm font-serif font-bold text-txt-primary flex items-center gap-2">
                  <Database className="w-4 h-4 text-primary" />
                  <span>Data Safety, Backups & Restoration</span>
                </h3>
                <p className="text-xs text-txt-muted mt-0.5">
                  Full standalone JSON snapshots, schema validation, and test data generators.
                </p>
              </div>

              {/* Section: Backup & Export */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-bg-subtle/50 rounded-xl border border-border">
                  <div>
                    <div className="text-sm font-semibold text-txt-primary">Full Workspace Backup</div>
                    <div className="text-xs font-mono text-txt-muted mt-0.5">
                      Last backup: {settings.lastBackup ? new Date(settings.lastBackup).toLocaleString() : 'Never'}
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={handleExport}
                    className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export JSON Backup</span>
                  </motion.button>
                </div>
              </div>

              {/* Section: Import */}
              <div className="space-y-3">
                <div className="text-xs font-semibold text-txt-primary">Import Backup</div>
                <div className="p-5 border-2 border-dashed border-border rounded-xl text-center space-y-2 bg-bg-subtle/30">
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
                    className="inline-flex items-center gap-2 px-4 py-2 bg-bg-card hover:bg-bg-subtle text-txt-primary border border-border rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
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

              {/* Section: Demo & Testing Data */}
              <div className="space-y-3">
                <div className="text-xs font-semibold text-txt-primary flex items-center justify-between">
                  <span>Demo & Testing Data</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/20 text-primary border border-primary/30">
                    Developer Utilities
                  </span>
                </div>
                <div className="p-4 bg-bg-subtle/50 rounded-xl border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-txt-primary">Sample Workspace Data</div>
                    <div className="text-[11px] text-txt-muted mt-0.5">
                      Injects pages, sample tasks, habit streaks, and scheduled events for testing.
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleLoadDemo('replace')}
                      disabled={isLoadingDemo}
                      className="px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-hover transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isLoadingDemo ? 'Loading...' : 'Load Sample Data'}
                    </button>
                    <button
                      onClick={handleResetDefault}
                      disabled={isResetting}
                      className="px-3 py-1.5 bg-bg-card hover:bg-bg-subtle text-txt-secondary hover:text-red-500 border border-border rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isResetting ? 'Resetting...' : 'Reset Clean'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
