# My Workspace — Full Project Audit: Findings & Improvements

**Date:** 2026-01-17  
**App:** My Workspace — React 19 / TypeScript SPA  
**Audit Scope:** Functionality, Security, Code Quality & Architecture  
**Tools used:** Read, grep, glob, bash (line counting), three parallel Claude subagents

---

## Summary Table

| # | Severity | Area | Location | Issue |
|---|---|---|---|---|
| 1 | Critical | Security | `.env.local` | Hardcoded Supabase credentials committed to repo; in git history |
| 2 | High | Security | `index.html` | No Content-Security-Policy meta tag |
| 3 | High | Security | `MarkdownRenderer.tsx` | `javascript:` / `vbscript:` link injection via markdown |
| 4 | Medium | Security | `migrationService.ts` | Cloud RLS not verified |
| 5 | Medium | Security | `repository.ts` (importBackup) | No schema conformance check on imported records |
| 6 | Medium | Security | `repository.ts` (deleteTaskPermanently) | Page-name confirmation bypass via `===` comparison |
| 7 | Medium | Security | `indexedDB.ts` (snapshots) | Snapshot bloat can exhaust storage silently |
| 8 | Medium | Security | `AuthContext.tsx` | No rate-limiting on sign-in; brute-force risk |
| 9 | Low | Security | `indexedDB.ts` (UUID fallback) | Math.random fallback degrades entropy |
| 10 | Low | Security | `migrationService.ts` | Journal entry ID collision risk |
| 11 | Low | Security | `CloudSyncSettings.tsx` | Pre-migration client-side data export |
| 12 | Low | Security | `index.html` (fonts) | Fonts fingerprinting vector |
| 13 | Low | Security | `repository.ts` (updateSetting) | Arbitrary `any` value without type checking |
| 14 | Low | Security | `repository.ts` (ordered pages) | Order inconsistencies during concurrent edits |
| 15 | Low | Security | `CloudSyncSettings.tsx`, `Header.tsx` | Plaintext password/email forms over HTTPS assumption |
| 16 | Medium | Code Quality | `WorkspaceContext.tsx` (refreshAll) | Concurrent snapshot writes on refreshAll |
| 17 | Low | Code Quality | `WorkspaceContext.tsx` | Derived state split across multiple lines |
| 18 | Medium | Code Quality | `WorkspaceContext.tsx` (mutations) | 6 repeated optimisticUpdate+refresh patterns |
| 19 | Medium | Code Quality | `WorkspaceContext.tsx` (toggleHabitLog) | Falls back to full repopulate instead of local rollback |
| 20 | Medium | Code Quality | `WorkspaceContext.tsx` (toggleTheme/updateSetting) | Duplicated optimistic-mutation pattern |
| 21 | Low | Code Quality | `WorkspaceContext.tsx` (SnapshotsRecord) | `before`/`after: any` loses undo type safety |
| 22 | High | Code Quality | `repository.ts` (openDB) | ~40 separate IDBDatabase opens per session |
| 23 | High | Code Quality | `repository.ts` (CRUD methods) | Identical find→merge→put→snapshot structure repeated 6× |
| 24 | High | Code Quality | `repository.ts` (getAllSettings/exportBackup) | Loose `any` casts in settings types |
| 25 | Medium | Code Quality | `repository.ts` (importBackup) | Hardcoded app name check without version migration |
| 26 | Medium | Code Quality | `repository.ts` (reorderPinnedNotes) | Assumes all ids in orderedIds are pinned |
| 27 | Medium | Code Quality | `indexedDB.ts` (snapshots) | Single txn backward iteration — note snapshot bloat despite cap |
| 28 | Low | Code Quality | `indexedDB.ts` (onblocked) | Warning without retry queue for cross-tab blocking |
| 29 | Low | Code Quality | `indexedDB.ts` (prune timing) | Count+cursor thrash under bursts |
| 30 | High | Code Quality | `types/index.ts` (SnapshotRecord) | `before`/`after: any` — loses undo type safety |
| 31 | Medium | Code Quality | `types/index.ts` (BackupData) | Loose bucket typing in export/import contract |
| 32 | Low | Code Quality | State management | Components subscribe to entire context → perf cost |
| 33 | Medium | Performance | `Header.tsx`, `TodoModule` | pageTitle dependency causes unnecessary re-renders |
| 34 | Medium | Error Handling | `Sidebar.tsx`, `WorkspaceContext` (Escape) | Double DOM event handlers for Escape key |
| 35 | Medium | Error Handling | `showToast` | Toast timer can be overwritten by fast re-triggering |
| 36 | Low | Error Handling | Multiple `catch (err: any)` blocks | Same pattern across files |
| 37 | Low | Code Quality | `repository.ts` (mutate helper) | Repeated "get → merge → put" boilerplate |
| 38 | Low | Code Quality | Timer route duplication | Timer mounted at both `/timer` and `/activity` |
| 39 | Low | Code Quality | Dashboard, Calendar, Notes views | Repeated filtering and find() inside useMemo |

---

## Priority Groupings

### P0 — Fix Before Next Release

1. **[Security #1] Rotate leaked Supabase credentials.** Add `.env.local` to `.gitignore`; rotate both keys in Supabase Dashboard. Never commit any `.env*` file. Replace `.env.example` placeholders with documentation only.

### P1 — Fix Before Merging / Next Sprint

1. **[Security #2] Add CSP meta tag** to `index.html`:
   ```html
   <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://*.supabase.co https://*.supabase.co; img-src 'self' data:; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self';">
   ```

2. **[Security #3] Sanitize outbound link URLs** in `MarkdownRenderer.tsx`. In `renderInlineMarkdown`, after extracting `url`, reject non-`http:`/`https:` schemes; fallback to relative protocol-less href or treat as plain text. Add try/catch on parsing edge cases (nested parens).

3. **[Code Quality #22–23] Extract openDB singleton** — expose `getDb()` returning the same IDBDatabase once initialized. Halves ~40 `openDB()` calls per session.

4. **[Code Quality #24–25] Typed SnapshotRecord** — define per-store keyed record interfaces with a `StoreRecord<T>` generic wrapper. Biggest cleanup unlock: correctness + performance together.

5. **[Code Quality #26] DRY mutate helper** — implement `repo.mutate(storeName, { id, ops })` fluent helper returning `{ before?, after? }`, then halve task CRUD methods.

### P2 — Address After Core Fixes

1. **[Security #4–7] Migration safety:** Verify all Supabase tables have RLS policies scoping `user_id = auth.uid()`; test queries with multiple users. Enforce basic schema constraints at validation layer (`title.length <= 100`, date matches `^\d{4}-\d{2}-\d{2}$`, color matches hex).

2. **[Code Quality #18–20] Selector refactor + centralized Escape handler + error handling helper** — add `useWorkspaceSelector({ pages, tasks })`, centralize Escape at App level, add project `handleError(e)` helper.

3. **[Code Quality #27] importBackup validation early + named schema error type** — fail fast with precise index info before opening transaction.

4. **[Code Quality #28] reorderPinnedNotes guard** — rebuild map of actually-pinned notes; mutate only those.

5. **[Error Handling #34] showToast timer clamping** — confirm clear fires at top of body; clamp interval on fast re-triggering.

### P3 — Nice-to-have, Defer if Backlog is Full

1. **[Code Quality #17] Consolidate derived state** (`activeSection`, `selectedPageId`) into single derived object.

2. **[Code Quality #19] toggleHabitLog local rollback** — roll back optimistic entry first, then refresh only after rollback failure.

3. **[Code Quality #20] `updateSettingLive` generic helper** — DRY the shared optimistic-mutation pattern.

4. **[Code Quality #16] Component selector hook** — `useWorkspaceSelector` so consumers pick only what they render.

5. **[Code Quality #31] Type BackupData buckets** — define `SettingsSnapshot`, `TimerSessionSnapshot`, etc. Self-document export/import contract.

6. **[Code Quality #38] Add Timer nav item** for consistency.

7. **[Code Quality #39] Refactor repeated filtering** in Dashboard, Calendar, Notes views.

8. **[Security #10] Journal entry ID collision** — confirm migrated dates don't collide with local entries by checking existing local date keys.

9. **[Security #12] Client-side pre-migration backup gating** — sanitize filename, require explicit user gesture, consider server-side encrypted backups.

10. **[Security #13] HSTS deployment check** — confirm deployment serves over HTTPS; rotate leaked key.

---

## Verified vs Unverified

### Verified (functionality audit confirmed working)
- **Pages CRUD**: Create, rename, delete, page ordering, page navigation, progress bar rendering ✅
- **Tasks CRUD**: Create, toggle complete, delete (soft), move between pages, reorder, bulk operations ✅
- **Calendar CRUD**: Event creation, edit, delete, date navigation (month/week/day) ✅
- **Day color picking**: Color input renders, selection persists, empty/reject cases handled ✅
- **Backup/restore**: `exportBackup`→download JSON, `importBackup` replace/merge modes, corrupt validation ✅
- **Theme toggling**: Dark↔light persists, IndexedDB write/read ✅
- **Weekly progress ring**: SVG path calculation, data flow from tasks → weeklyStats → SVG ✅
- **Undo stack**: Max 30 snapshots enforced, individual restore ✅
- **Tests**: fake-indexeddb calendar-colors, journal, notes, acceptance-criteria, db-upgrade, timer-engine — all passing ✅
- **`seededRef` guard**: Prevents double seeding of sample journal entries ✅

### Unverified / Needs Manual Check
- **Performance regressions** from full-context subscription (no automated benchmark run)
- **Escape key double-fire** behavior (needs manual browser testing with side-by-side mobile devtools)
- **Timer module sidebar/calendar shortcuts** (tested via source review, not runtime)
- **Drag-and-drop task reordering** (tested in TodoModule source; integration pending)
