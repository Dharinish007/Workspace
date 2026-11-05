import { Repository } from '../db/repository';
import { generateDummyData } from './dummyGenerator';
import { Page, BackupData } from '../types';
import { nowISO, generateUUID } from '../db/indexedDB';

export interface LoadDemoResult {
  message: string;
  counts: {
    pages: number;
    tasks: number;
    habits: number;
    habitLogs: number;
    events: number;
    dayColors: number;
  };
}

/**
 * Loads rich demo data into IndexedDB.
 * @param mode 'replace' clears current data first; 'merge' overlays demo data.
 */
export async function loadDemoData(mode: 'replace' | 'merge' = 'replace'): Promise<LoadDemoResult> {
  const dummyBackup = generateDummyData();
  const res = await Repository.importBackup(dummyBackup, mode);

  return {
    message: res.message,
    counts: {
      pages: dummyBackup.data.pages.length,
      tasks: dummyBackup.data.tasks.length,
      habits: dummyBackup.data.habits.length,
      habitLogs: dummyBackup.data.habitLogs.length,
      events: dummyBackup.data.events.length,
      dayColors: dummyBackup.data.dayColors.length,
    },
  };
}

/**
 * Resets the workspace back to a clean default state with empty initial pages.
 */
export async function resetToDefaultWorkspace(): Promise<{ message: string }> {
  const now = nowISO();
  const defaultPages: Page[] = [
    {
      id: generateUUID(),
      name: 'Career',
      icon: 'Briefcase',
      color: '#4285F4',
      order: 0,
      archived: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateUUID(),
      name: 'Projects',
      icon: 'Code',
      color: '#34A853',
      order: 1,
      archived: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateUUID(),
      name: 'Learning',
      icon: 'BookOpen',
      color: '#A142F4',
      order: 2,
      archived: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateUUID(),
      name: 'Personal',
      icon: 'Heart',
      color: '#EC4899',
      order: 3,
      archived: false,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const emptyBackup: BackupData = {
    app: 'my-workspace',
    schemaVersion: 1,
    exportedAt: now,
    data: {
      pages: defaultPages,
      tasks: [],
      habits: [],
      habitLogs: [],
      events: [],
      dayColors: [],
      settings: {
        theme: 'light',
        displayName: 'Dharinish',
        weekStart: 'monday',
        lastBackup: null,
        habitDefaultColor: '#0D9488',
        eventDefaultColor: '#F97316',
      },
    },
  };

  const res = await Repository.importBackup(emptyBackup, 'replace');
  return { message: res.message };
}

