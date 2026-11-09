import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Repository } from '../db/repository';
import { nowISO } from '../db/indexedDB';
import type { Database } from '../types/database.types';

export interface MigrationSummary {
  pages: number;
  tasks: number;
  habits: number;
  habitLogs: number;
  events: number;
  dayColors: number;
  journalEntries: number;
  notes: number;
  settings: number;
}

export interface CloudInspectionResult {
  isConfigured: boolean;
  isAuthenticated: boolean;
  userId: string | null;
  hasExistingCloudData: boolean;
  cloudCounts: Partial<MigrationSummary>;
  localCounts: MigrationSummary;
}

export interface MigrationOptions {
  allowOverwriteIfCloudHasData?: boolean;
  onProgress?: (stage: string, percent: number) => void;
}

export interface MigrationResult {
  success: boolean;
  error?: string;
  migratedCounts: MigrationSummary;
}

/**
 * Helper to split an array into chunks of a given size
 */
function chunkArray<T>(items: T[], size = 100): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/**
 * Inspects both local IndexedDB counts and remote Supabase counts for the authenticated user.
 */
export async function inspectCloudState(): Promise<CloudInspectionResult> {
  const emptyCounts: MigrationSummary = {
    pages: 0,
    tasks: 0,
    habits: 0,
    habitLogs: 0,
    events: 0,
    dayColors: 0,
    journalEntries: 0,
    notes: 0,
    settings: 0,
  };

  if (!isSupabaseConfigured) {
    return {
      isConfigured: false,
      isAuthenticated: false,
      userId: null,
      hasExistingCloudData: false,
      cloudCounts: {},
      localCounts: emptyCounts,
    };
  }

  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;

  // 1. Gather Local Counts from IndexedDB
  const backup = await Repository.exportBackup();
  const localCounts: MigrationSummary = {
    pages: backup.data.pages?.length || 0,
    tasks: backup.data.tasks?.length || 0,
    habits: backup.data.habits?.length || 0,
    habitLogs: backup.data.habitLogs?.length || 0,
    events: backup.data.events?.length || 0,
    dayColors: backup.data.dayColors?.length || 0,
    journalEntries: backup.data.journalEntries?.length || 0,
    notes: backup.data.notes?.length || 0,
    settings: backup.data.settings ? Object.keys(backup.data.settings).length : 0,
  };

  if (!user) {
    return {
      isConfigured: true,
      isAuthenticated: false,
      userId: null,
      hasExistingCloudData: false,
      cloudCounts: {},
      localCounts,
    };
  }

  // 2. Gather Remote Cloud Counts for this User
  const [
    pagesRes,
    tasksRes,
    habitsRes,
    habitLogsRes,
    eventsRes,
    dayColorsRes,
    journalRes,
    notesRes,
    settingsRes,
  ] = await Promise.all([
    supabase.from('pages').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('habits').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('habit_logs').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('calendar_events').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('day_colors').select('user_id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('journal_entries').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('notes').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('user_settings').select('user_id', { count: 'exact', head: true }).eq('user_id', user.id),
  ]);

  const cloudCounts: Partial<MigrationSummary> = {
    pages: pagesRes.count ?? 0,
    tasks: tasksRes.count ?? 0,
    habits: habitsRes.count ?? 0,
    habitLogs: habitLogsRes.count ?? 0,
    events: eventsRes.count ?? 0,
    dayColors: dayColorsRes.count ?? 0,
    journalEntries: journalRes.count ?? 0,
    notes: notesRes.count ?? 0,
    settings: settingsRes.count ?? 0,
  };

  const hasExistingCloudData = Object.values(cloudCounts).some((count) => (count ?? 0) > 0);

  return {
    isConfigured: true,
    isAuthenticated: true,
    userId: user.id,
    hasExistingCloudData,
    cloudCounts,
    localCounts,
  };
}

/**
 * Performs one-time IndexedDB to Supabase cloud migration.
 * Requires explicit user trigger and authenticated session.
 */
export async function executeIndexedDBMigration(options: MigrationOptions = {}): Promise<MigrationResult> {
  const { allowOverwriteIfCloudHasData = false, onProgress } = options;

  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured in .env.local.');
  }

  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) {
    throw new Error('Authentication required: user must be signed in to perform cloud migration.');
  }

  const userId = user.id;

  // Pre-flight check
  onProgress?.('Checking cloud state...', 5);
  const inspection = await inspectCloudState();
  if (inspection.hasExistingCloudData && !allowOverwriteIfCloudHasData) {
    throw new Error(
      'Cloud database already contains data for this user. Migration aborted to prevent unintended overwrites. Explicit confirmation is required.'
    );
  }

  onProgress?.('Extracting local IndexedDB records...', 10);
  const backup = await Repository.exportBackup();
  const localData = backup.data;

  const migrated: MigrationSummary = {
    pages: 0,
    tasks: 0,
    habits: 0,
    habitLogs: 0,
    events: 0,
    dayColors: 0,
    journalEntries: 0,
    notes: 0,
    settings: 0,
  };

  // --------------------------------------------------------------------------
  // STORE 1: PAGES (Must be uploaded first to satisfy foreign keys)
  // --------------------------------------------------------------------------
  onProgress?.('Migrating pages...', 20);
  const rawPages = localData.pages || [];
  if (rawPages.length > 0) {
    const pageRows: Database['public']['Tables']['pages']['Insert'][] = rawPages.map((p) => ({
      id: p.id,
      user_id: userId,
      name: p.name,
      icon: p.icon || 'Folder',
      color: p.color || '#4285F4',
      order: p.order ?? 0,
      archived: Boolean(p.archived),
      created_at: p.createdAt || nowISO(),
      updated_at: p.updatedAt || nowISO(),
    }));

    for (const chunk of chunkArray(pageRows, 100)) {
      const { error } = await supabase.from('pages').upsert(chunk, { onConflict: 'id' });
      if (error) throw new Error(`Failed to migrate pages: ${error.message}`);
    }
    migrated.pages = pageRows.length;
  }

  // --------------------------------------------------------------------------
  // STORE 2: TASKS (Foreign key depends on pages)
  // --------------------------------------------------------------------------
  onProgress?.('Migrating tasks...', 35);
  const rawTasks = localData.tasks || [];
  if (rawTasks.length > 0) {
    const validPageIds = new Set(rawPages.map((p) => p.id));
    const taskRows: Database['public']['Tables']['tasks']['Insert'][] = rawTasks
      .filter((t) => validPageIds.has(t.pageId))
      .map((t) => ({
        id: t.id,
        user_id: userId,
        page_id: t.pageId,
        title: t.title,
        priority: t.priority || 'medium',
        important: Boolean(t.important),
        completed: Boolean(t.completed),
        completed_at: t.completedAt || null,
        due_date: t.dueDate || null,
        order: t.order ?? 0,
        created_at: t.createdAt || nowISO(),
        updated_at: t.updatedAt || nowISO(),
      }));

    for (const chunk of chunkArray(taskRows, 100)) {
      const { error } = await supabase.from('tasks').upsert(chunk, { onConflict: 'id' });
      if (error) throw new Error(`Failed to migrate tasks: ${error.message}`);
    }
    migrated.tasks = taskRows.length;
  }

  // --------------------------------------------------------------------------
  // STORE 3: HABITS (Must precede habit logs)
  // --------------------------------------------------------------------------
  onProgress?.('Migrating habits...', 45);
  const rawHabits = localData.habits || [];
  if (rawHabits.length > 0) {
    const habitRows: Database['public']['Tables']['habits']['Insert'][] = rawHabits.map((h) => ({
      id: h.id,
      user_id: userId,
      name: h.name,
      icon: h.icon || 'Flame',
      color: h.color || '#1A73E8',
      schedule: h.schedule as any,
      created_at: h.createdAt || nowISO(),
      updated_at: h.updatedAt || nowISO(),
    }));

    for (const chunk of chunkArray(habitRows, 100)) {
      const { error } = await supabase.from('habits').upsert(chunk, { onConflict: 'id' });
      if (error) throw new Error(`Failed to migrate habits: ${error.message}`);
    }
    migrated.habits = habitRows.length;
  }

  // --------------------------------------------------------------------------
  // STORE 4: HABIT LOGS (Foreign key depends on habits, assigns UUID id)
  // --------------------------------------------------------------------------
  onProgress?.('Migrating habit logs...', 55);
  const rawHabitLogs = localData.habitLogs || [];
  if (rawHabitLogs.length > 0) {
    const validHabitIds = new Set(rawHabits.map((h) => h.id));
    const habitLogRows: Database['public']['Tables']['habit_logs']['Insert'][] = rawHabitLogs
      .filter((hl) => validHabitIds.has(hl.habitId))
      .map((hl) => ({
        user_id: userId,
        habit_id: hl.habitId,
        date: hl.date,
        completed: Boolean(hl.completed),
        created_at: hl.updatedAt || nowISO(),
        updated_at: hl.updatedAt || nowISO(),
      }));

    for (const chunk of chunkArray(habitLogRows, 100)) {
      const { error } = await supabase.from('habit_logs').upsert(chunk, {
        onConflict: 'user_id,habit_id,date',
      });
      if (error) throw new Error(`Failed to migrate habit logs: ${error.message}`);
    }
    migrated.habitLogs = habitLogRows.length;
  }

  // --------------------------------------------------------------------------
  // STORE 5: CALENDAR EVENTS
  // --------------------------------------------------------------------------
  onProgress?.('Migrating calendar events...', 65);
  const rawEvents = localData.events || [];
  if (rawEvents.length > 0) {
    const eventRows: Database['public']['Tables']['calendar_events']['Insert'][] = rawEvents.map((e) => ({
      id: e.id,
      user_id: userId,
      title: e.title,
      date: e.date,
      start_time: e.startTime || null,
      end_time: e.endTime || null,
      color: e.color || '#F97316',
      category: e.category || 'general',
      created_at: e.createdAt || nowISO(),
      updated_at: e.updatedAt || nowISO(),
    }));

    for (const chunk of chunkArray(eventRows, 100)) {
      const { error } = await supabase.from('calendar_events').upsert(chunk, { onConflict: 'id' });
      if (error) throw new Error(`Failed to migrate calendar events: ${error.message}`);
    }
    migrated.events = eventRows.length;
  }

  // --------------------------------------------------------------------------
  // STORE 6: DAY COLORS
  // --------------------------------------------------------------------------
  onProgress?.('Migrating calendar day colors...', 75);
  const rawDayColors = localData.dayColors || [];
  if (rawDayColors.length > 0) {
    const dayColorRows: Database['public']['Tables']['day_colors']['Insert'][] = rawDayColors.map((dc) => ({
      user_id: userId,
      date: dc.date,
      color: dc.color,
      created_at: nowISO(),
      updated_at: nowISO(),
    }));

    for (const chunk of chunkArray(dayColorRows, 100)) {
      const { error } = await supabase.from('day_colors').upsert(chunk, { onConflict: 'user_id,date' });
      if (error) throw new Error(`Failed to migrate day colors: ${error.message}`);
    }
    migrated.dayColors = dayColorRows.length;
  }

  // --------------------------------------------------------------------------
  // STORE 7: JOURNAL ENTRIES
  // --------------------------------------------------------------------------
  onProgress?.('Migrating journal entries...', 85);
  const rawJournal = localData.journalEntries || [];
  if (rawJournal.length > 0) {
    const journalRows: Database['public']['Tables']['journal_entries']['Insert'][] = rawJournal.map((j) => ({
      id: j.id || crypto.randomUUID(),
      user_id: userId,
      date: j.date,
      title: j.title || null,
      body: j.body || '',
      mood: j.mood || null,
      tags: j.tags || [],
      created_at: j.createdAt || nowISO(),
      updated_at: j.updatedAt || nowISO(),
    }));

    for (const chunk of chunkArray(journalRows, 100)) {
      const { error } = await supabase.from('journal_entries').upsert(chunk, { onConflict: 'user_id,date' });
      if (error) throw new Error(`Failed to migrate journal entries: ${error.message}`);
    }
    migrated.journalEntries = journalRows.length;
  }

  // --------------------------------------------------------------------------
  // STORE 8: NOTES
  // --------------------------------------------------------------------------
  onProgress?.('Migrating notes...', 90);
  const rawNotes = localData.notes || [];
  if (rawNotes.length > 0) {
    const noteRows: Database['public']['Tables']['notes']['Insert'][] = rawNotes.map((n) => ({
      id: n.id,
      user_id: userId,
      title: n.title || '',
      content: n.content || '',
      tags: n.tags || [],
      pinned: Boolean(n.pinned),
      pinned_order: n.pinnedOrder ?? 0,
      icon: n.icon || null,
      created_at: n.createdAt || nowISO(),
      updated_at: n.updatedAt || nowISO(),
    }));

    for (const chunk of chunkArray(noteRows, 100)) {
      const { error } = await supabase.from('notes').upsert(chunk, { onConflict: 'id' });
      if (error) throw new Error(`Failed to migrate notes: ${error.message}`);
    }
    migrated.notes = noteRows.length;
  }

  // --------------------------------------------------------------------------
  // STORE 9: SETTINGS -> user_settings
  // --------------------------------------------------------------------------
  onProgress?.('Migrating user settings...', 95);
  const rawSettings = localData.settings || {};
  const settingsRow: Database['public']['Tables']['user_settings']['Insert'] = {
    user_id: userId,
    display_name: rawSettings.displayName || 'User',
    theme: rawSettings.theme || 'light',
    week_start: rawSettings.weekStart || 'monday',
    background_style: rawSettings.backgroundStyle || 'current',
    habit_default_color: rawSettings.habitDefaultColor || '#1A73E8',
    event_default_color: rawSettings.eventDefaultColor || '#F97316',
    last_backup: rawSettings.lastBackup || nowISO(),
  };

  const { error: settingsError } = await supabase.from('user_settings').upsert(settingsRow, { onConflict: 'user_id' });
  if (settingsError) {
    console.warn('Warning: Could not upsert user_settings:', settingsError.message);
  } else {
    migrated.settings = 1;
  }

  // STORE 10: SNAPSHOTS
  // Snapshots are intentionally preserved local-only to maintain fast browser undo buffers.

  // --------------------------------------------------------------------------
  // STEP 11: INITIALIZE WORKSPACE (ONLY AFTER LOCAL PAGES HAVE BEEN MIGRATED)
  // --------------------------------------------------------------------------
  // Because pages were uploaded first, page count is > 0, so initialize_user_workspace
  // cleanly skips seeding duplicate default pages.
  onProgress?.('Finalizing workspace provisioning...', 98);
  const { error: initError } = await supabase.rpc('initialize_user_workspace');
  if (initError) {
    console.warn('Workspace initialization RPC notice:', initError.message);
  }

  onProgress?.('Migration complete!', 100);

  return {
    success: true,
    migratedCounts: migrated,
  };
}

