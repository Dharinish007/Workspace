# Demo & Dummy Data Module

This folder contains dummy data generators and loaders for testing and UI evaluation.

## What is included:
- `dummyGenerator.ts`: Generates realistic mock data (Pages, Tasks, Habits, 45-day Habit Logs for heatmaps, Calendar Events, Day Colors) using **relative dates** so the calendar and streaks are always active relative to `today`.
- `dummyLoader.ts`: Helper methods (`loadDemoData`, `resetToDefaultWorkspace`) that interface with IndexedDB via `Repository.importBackup`.

## How to Remove for Final Production:
When you are ready to prepare the final build and no longer need demo data:
1. Delete the `src/data/` directory.
2. In `src/components/modals/SettingsModal.tsx`, remove:
   - The import: `import { loadDemoData, resetToDefaultWorkspace } from '../../data';`
   - The "Demo & Test Data" section block in the modal UI.

