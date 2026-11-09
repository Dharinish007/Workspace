import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Cloud, 
  CloudUpload, 
  Lock, 
  LogIn, 
  LogOut, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  Database,
  Download,
  Info,
  ShieldCheck,
  Check
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { 
  inspectCloudState, 
  executeIndexedDBMigration, 
  type CloudInspectionResult, 
  type MigrationResult 
} from '../../services/migrationService';
import { Repository } from '../../db/repository';

export const CloudSyncSettings: React.FC = () => {
  const { user, isLoading: isAuthLoading, isConfigured, authError, signIn, signOut, clearError } = useAuth();
  const { showToast } = useWorkspace();

  // Sign In Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cloud Inspection State
  const [cloudState, setCloudState] = useState<CloudInspectionResult | null>(null);
  const [isInspecting, setIsInspecting] = useState(false);

  // Migration Execution State
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [allowOverwrite, setAllowOverwrite] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationStage, setMigrationStage] = useState<string>('');
  const [migrationPercent, setMigrationPercent] = useState<number>(0);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);
  const [migrationError, setMigrationError] = useState<string | null>(null);

  // Load inspection on user change
  const refreshInspection = useCallback(async () => {
    if (!isConfigured || !user) {
      setCloudState(null);
      return;
    }
    setIsInspecting(true);
    try {
      const state = await inspectCloudState();
      setCloudState(state);
    } catch (err: any) {
      console.error('Failed to inspect cloud state:', err);
    } finally {
      setIsInspecting(false);
    }
  }, [isConfigured, user]);

  useEffect(() => {
    if (user && isConfigured) {
      refreshInspection();
    }
  }, [user, isConfigured, refreshInspection]);

  // Handle Login
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setIsSubmitting(true);
    clearError();

    const result = await signIn(email.trim(), password);
    setIsSubmitting(false);

    if (result.success) {
      showToast('Successfully signed in to Supabase', undefined, undefined, 'success');
      setPassword('');
    } else {
      showToast(result.error || 'Authentication failed', undefined, undefined, 'error');
    }
  };

  // Handle Logout
  const handleSignOut = async () => {
    const result = await signOut();
    if (result.success) {
      setCloudState(null);
      setMigrationResult(null);
      setMigrationError(null);
      showToast('Signed out of Supabase', undefined, undefined, 'success');
    } else {
      showToast(result.error || 'Failed to sign out', undefined, undefined, 'error');
    }
  };

  // Perform IndexedDB Safety Backup before migration
  const downloadSafetyBackup = async () => {
    const backupData = await Repository.exportBackup();
    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `my-workspace-pre-migration-safety-${dateStr}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Execute Migration Flow
  const handleExecuteMigration = async () => {
    setIsConfirmModalOpen(false);
    setIsMigrating(true);
    setMigrationError(null);
    setMigrationResult(null);
    setMigrationStage('Downloading safety backup...');
    setMigrationPercent(5);

    try {
      // 1. Automatic safety backup export
      await downloadSafetyBackup();
      showToast('Pre-migration safety backup downloaded', undefined, undefined, 'info');

      // 2. Perform Migration
      const result = await executeIndexedDBMigration({
        allowOverwriteIfCloudHasData: allowOverwrite,
        onProgress: (stage, percent) => {
          setMigrationStage(stage);
          setMigrationPercent(percent);
        },
      });

      setMigrationResult(result);
      showToast('Migration completed successfully!', undefined, undefined, 'success');
      // Refresh counts after migration
      await refreshInspection();
    } catch (err: any) {
      const msg = err.message || 'Migration failed';
      setMigrationError(msg);
      showToast(`Migration error: ${msg}`, undefined, undefined, 'error');
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-serif font-bold tracking-tight text-txt-primary flex items-center gap-1.5">
          <Cloud className="w-4 h-4 text-primary" />
          <span>Supabase Cloud & Migration</span>
        </h3>
        <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-full border ${
          !isConfigured
            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
            : user
            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
            : 'bg-bg-subtle text-txt-secondary border-border'
        }`}>
          {!isConfigured ? 'Unconfigured' : user ? 'Connected' : 'Signed Out'}
        </span>
      </div>

      {/* Case 1: Supabase Not Configured */}
      {!isConfigured && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-xs text-txt-secondary space-y-2.5">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold text-amber-700 dark:text-amber-400 text-sm">
                Supabase Credentials Not Configured
              </span>
              <p className="leading-relaxed">
                Supabase URL and Publishable Key are missing from your local environment. 
                Configure them in <code className="bg-bg-card px-1.5 py-0.5 rounded font-mono border border-border">.env.local</code> to enable cloud authentication and database migration.
              </p>
            </div>
          </div>
          <div className="pl-6 pt-1 text-[11px] text-txt-muted flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5" />
            <span>Refer to <code className="font-mono">docs/SUPABASE_SETUP.md</code> for step-by-step setup instructions.</span>
          </div>
        </div>
      )}

      {/* Case 2: Configured, but Unauthenticated */}
      {isConfigured && !user && (
        <div className="bg-bg-subtle border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm font-semibold text-txt-primary flex items-center gap-2">
                <Lock className="w-4 h-4 text-primary" />
                <span>Sign in to Supabase</span>
              </div>
              <p className="text-xs text-txt-secondary mt-1">
                Authenticate with your personal Supabase account to sync your workspace data to PostgreSQL.
              </p>
            </div>
            <span className="text-[11px] font-mono text-txt-muted bg-bg-card px-2 py-1 rounded-md border border-border">
              Single-User Mode
            </span>
          </div>

          {authError && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleSignIn} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-txt-secondary mb-1">
                  Account Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  required
                  disabled={isSubmitting || isAuthLoading}
                  className="w-full px-3 py-2 text-sm bg-bg-card border border-border rounded-lg text-txt-primary outline-hidden focus:border-primary disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-txt-secondary mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  disabled={isSubmitting || isAuthLoading}
                  className="w-full px-3 py-2 text-sm bg-bg-card border border-border rounded-lg text-txt-primary outline-hidden focus:border-primary disabled:opacity-50"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div className="text-[11px] text-txt-muted flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                <span>User accounts are provisioned via the Supabase Dashboard. Public signups are disabled.</span>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                type="submit"
                disabled={isSubmitting || isAuthLoading || !email || !password}
                className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Sign In</span>
                  </>
                )}
              </motion.button>
            </div>
          </form>
        </div>
      )}

      {/* Case 3: Configured and Authenticated */}
      {isConfigured && user && (
        <div className="space-y-4">
          {/* Active Session Card */}
          <div className="p-4 bg-bg-subtle rounded-xl border border-border space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-sm font-semibold text-txt-primary">
                    {user.email}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-txt-muted">
                  UID: {user.id}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={refreshInspection}
                  disabled={isInspecting}
                  className="p-2 text-txt-secondary hover:text-txt-primary bg-bg-card border border-border rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Refresh local vs cloud comparison"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isInspecting ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="px-3 py-1.5 text-xs font-semibold text-red-500 hover:text-red-600 bg-bg-card border border-border rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>

          {/* Local vs Cloud Record Inspection */}
          <div className="bg-bg-subtle border border-border rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold uppercase tracking-wider text-txt-muted">
                Database Record Comparison
              </div>
              {cloudState?.hasExistingCloudData && (
                <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/30">
                  Cloud Data Present
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-center">
              {[
                { label: 'Pages', local: cloudState?.localCounts.pages ?? 0, cloud: cloudState?.cloudCounts.pages ?? 0 },
                { label: 'Tasks', local: cloudState?.localCounts.tasks ?? 0, cloud: cloudState?.cloudCounts.tasks ?? 0 },
                { label: 'Habits', local: cloudState?.localCounts.habits ?? 0, cloud: cloudState?.cloudCounts.habits ?? 0 },
                { label: 'Habit Logs', local: cloudState?.localCounts.habitLogs ?? 0, cloud: cloudState?.cloudCounts.habitLogs ?? 0 },
                { label: 'Events', local: cloudState?.localCounts.events ?? 0, cloud: cloudState?.cloudCounts.events ?? 0 },
                { label: 'Notes', local: cloudState?.localCounts.notes ?? 0, cloud: cloudState?.cloudCounts.notes ?? 0 },
                { label: 'Journal', local: cloudState?.localCounts.journalEntries ?? 0, cloud: cloudState?.cloudCounts.journalEntries ?? 0 },
              ].map(item => (
                <div key={item.label} className="bg-bg-card p-2.5 rounded-xl border border-border space-y-1">
                  <div className="text-[11px] font-semibold text-txt-secondary">{item.label}</div>
                  <div className="flex items-center justify-center gap-2 font-mono text-xs">
                    <span className="text-txt-primary" title="Local IndexedDB count">{item.local}</span>
                    <span className="text-txt-muted">/</span>
                    <span className="text-primary font-bold" title="Cloud PostgreSQL count">{item.cloud}</span>
                  </div>
                  <div className="text-[10px] text-txt-muted font-mono">local / cloud</div>
                </div>
              ))}
            </div>

            {/* Migration Controls & Warnings */}
            <div className="pt-2 border-t border-border space-y-3">
              {cloudState?.hasExistingCloudData && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2">
                  <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400 font-semibold">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>Existing cloud data detected for this account.</span>
                  </div>
                  <p className="text-[11px] text-txt-secondary leading-relaxed pl-6">
                    Running migration will merge and update records matching existing IDs. To prevent accidental overwrites, confirmation is required.
                  </p>
                  <label className="flex items-center gap-2 pl-6 pt-1 text-xs text-txt-primary cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={allowOverwrite}
                      onChange={e => setAllowOverwrite(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary"
                    />
                    <span>Allow updating / overwriting existing cloud records</span>
                  </label>
                </div>
              )}

              {/* Migration Action Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div className="text-xs text-txt-secondary">
                  One-time migration transfers all 10 local IndexedDB stores to PostgreSQL.
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setIsConfirmModalOpen(true)}
                  disabled={isMigrating || (cloudState?.hasExistingCloudData && !allowOverwrite)}
                  className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 shadow-xs flex-shrink-0"
                >
                  <CloudUpload className="w-4 h-4" />
                  <span>Migrate Local Data to Cloud</span>
                </motion.button>
              </div>

              {/* Migration Progress Bar */}
              {isMigrating && (
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-primary flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>{migrationStage}</span>
                    </span>
                    <span className="font-mono font-bold text-primary">{migrationPercent}%</span>
                  </div>
                  <div className="w-full h-2 bg-bg-card rounded-full overflow-hidden border border-border">
                    <div 
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${migrationPercent}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Migration Error */}
              {migrationError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{migrationError}</span>
                </div>
              )}

              {/* Migration Success Summary */}
              {migrationResult?.success && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Migration Successfully Completed</span>
                  </div>
                  <div className="text-xs text-txt-secondary">
                    Migrated records:
                    <span className="font-mono ml-1 font-semibold text-txt-primary">
                      {migrationResult.migratedCounts.pages} pages, {migrationResult.migratedCounts.tasks} tasks, {migrationResult.migratedCounts.habits} habits, {migrationResult.migratedCounts.habitLogs} habit logs, {migrationResult.migratedCounts.events} events, {migrationResult.migratedCounts.dayColors} day colors.
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <AnimatePresence>
        {isConfirmModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-bg-card border border-border rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                  <CloudUpload className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-txt-primary">
                    Confirm Cloud Migration
                  </h4>
                  <p className="text-xs text-txt-secondary mt-1 leading-relaxed">
                    This will copy your local IndexedDB records to your Supabase PostgreSQL database.
                  </p>
                </div>
              </div>

              <div className="bg-bg-subtle p-3.5 rounded-xl border border-border space-y-2 text-xs text-txt-secondary">
                <div className="font-semibold text-txt-primary flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5 text-primary" />
                  <span>Automatic Safety Backup</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Before any data is uploaded, a complete JSON backup file of your local data will be downloaded automatically to your browser.
                </p>
                <div className="font-semibold text-txt-primary flex items-center gap-1.5 pt-1">
                  <Database className="w-3.5 h-3.5 text-primary" />
                  <span>IndexedDB Preserved</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Your local IndexedDB database remains intact and will not be erased during this operation.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsConfirmModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-txt-secondary hover:text-txt-primary bg-bg-subtle hover:bg-bg-hover rounded-xl border border-border transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  type="button"
                  onClick={handleExecuteMigration}
                  className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
                >
                  <Check className="w-4 h-4" />
                  <span>Start Migration</span>
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

