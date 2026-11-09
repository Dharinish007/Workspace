# My Workspace — Supabase Setup & Cloud Migration Guide

This guide details the step-by-step procedure for provisioning your Supabase project, executing the database migration, setting environment variables, creating your authenticated user, and running the one-time data migration from browser IndexedDB to PostgreSQL.

---

## Architecture & Security Overview

- **Source of Truth**: Following migration, Supabase PostgreSQL becomes the primary source of truth for your workspace.
- **Single-User Security**: My Workspace is architected for personal single-user or isolated self-hosted deployments.
  - Public signups are intentionally disabled in the database via strict RLS and frontend security policies.
  - Users are provisioned exclusively by the project owner through the Supabase Dashboard.
  - Every table enforces Row-Level Security (RLS) guaranteeing that `auth.uid() = user_id`.
  - All foreign key relationships between dependent records (`tasks -> pages`, `habit_logs -> habits`) enforce composite `(user_id, id)` constraints to mathematically prevent cross-tenant or cross-user data leakage.
- **Frontend Keys**: Only the `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (anon public key) are exposed in the client. The `service_role` key is **NEVER** placed in the frontend application or committed to version control.

---

## Step 1: Create a Supabase Project

1. Navigate to [Supabase](https://supabase.com) and sign in to your account.
2. Click **New Project** and select your organization.
3. Configure your project:
   - **Name**: `my_workspace` (or your preferred name)
   - **Database Password**: Generate and securely store a strong password.
   - **Region**: Choose the region closest to you for lowest latency.
4. Click **Create new project** and wait 1–2 minutes for the database cluster to provision.

---

## Step 2: Apply the PostgreSQL Schema Migration

The initial schema definition is located at:
```
supabase/migrations/20261107000000_initial_schema.sql
```

This migration applies:
- 9 PostgreSQL tables (`user_settings`, `pages`, `tasks`, `habits`, `habit_logs`, `events`, `day_colors`, `journal_entries`, `notes`).
- Row-Level Security (RLS) policies on all tables.
- Composite foreign keys for strict user boundary isolation.
- Fast composite B-tree indexes for user-scoped queries.
- Strict `validate_habit_schedule()` JSONB constraint validator.
- Automated `updated_at` timestamp triggers with tampering prevention.
- Automated `handle_new_user()` trigger for workspace profile provisioning.
- Idempotent `initialize_user_workspace()` function.
- Hardened privilege revocation (`PUBLIC` and `anon` stripped of table and sequence access; default privileges locked down).

### Execution via Supabase SQL Editor

1. In your Supabase Dashboard, open the **SQL Editor** from the left navigation.
2. Click **New Query**.
3. Open the file `supabase/migrations/20261107000000_initial_schema.sql` in your editor and copy its entire contents.
4. Paste the SQL into the Supabase SQL Editor.
5. Click **Run** (or press `Ctrl+Enter` / `Cmd+Enter`).
6. Confirm that the query finishes successfully with `"Success. No rows returned"`.

---

## Step 3: Configure Environment Variables

1. In your Supabase Dashboard, go to **Project Settings** (gear icon) > **API**.
2. Locate the following values:
   - **Project URL**: e.g. `https://xyzcompanyproject.supabase.co`
   - **Project API Keys**: Copy the `anon` / `public` key (Publishable API Key).
3. In your local repository root, create or edit `.env.local`:
   ```env
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-actual-anon-publishable-key
   ```
4. Verify that `.env.local` is listed in `.gitignore` so your keys are never committed:
   ```bash
   git status --ignored
   ```
   *(Ensure `.env.local` appears in the Ignored files section).*

---

## Step 4: Create the Owner User Account

Because public registration is disabled for safety, your account must be provisioned through the Supabase Dashboard:

1. In your Supabase Dashboard, go to **Authentication** > **Users**.
2. Click **Add User** > **Create User**.
3. Enter:
   - **Email**: Your chosen personal email address.
   - **Password**: A strong password.
   - Check **Auto Confirm User?** (or "Confirm Email") so your account is immediately verified without requiring an email confirmation service.
4. Click **Create User**.

> [!NOTE]
> Upon user creation, the database trigger `on_auth_user_created` will automatically execute `handle_new_user()`, creating your initial `user_settings` record with your email and display name.

---

## Step 5: Start the App and Sign In

1. Start your local development server:
   ```bash
   npm run dev
   ```
2. Open the application in your browser (default: `http://localhost:5173`).
3. Click the **Settings** icon (gear in the top bar / sidebar).
4. Locate the **Supabase Cloud & Migration** section:
   - The status badge will show **Signed Out**.
   - Enter your email and password created in Step 4.
   - Click **Sign In**.
5. Once authenticated:
   - The status badge switches to **Connected** with a green active indicator.
   - Your email and UUID are displayed.
   - The **Database Record Comparison** table will display your local IndexedDB count alongside remote Supabase counts (`local / cloud`).

---

## Step 6: Execute One-Time Data Migration

To transfer your existing IndexedDB data (pages, priority tasks, habit streaks, calendar events, day colors, notes, journal entries, and settings) to PostgreSQL:

1. In the **Supabase Cloud & Migration** section, click **Migrate Local Data to Cloud**.
2. A confirmation modal will appear:
   - **Pre-flight Safety**: An automatic JSON backup (`my-workspace-pre-migration-safety-YYYY-MM-DD.json`) is downloaded to your machine before any upload starts.
   - **IndexedDB Preserved**: Local IndexedDB data is kept intact as a fallback.
3. Click **Start Migration**.
4. The migration runner will:
   - Verify cloud state and check for collision.
   - Upload records in dependency order (Pages -> Tasks -> Habits -> Habit Logs -> Events -> Day Colors -> Journal Entries -> Notes -> Settings).
   - Show real-time stage and percentage progress.
5. Upon completion:
   - A success summary displays the exact record counts migrated into Supabase.
   - The **Database Record Comparison** table refreshes, reflecting identical local and remote counts.

---

## Verification & Troubleshooting

### Verifying via Supabase Table Editor
1. In the Supabase Dashboard, open **Table Editor**.
2. Select `pages`, `tasks`, or `habits`.
3. Confirm your rows are present and that `user_id` matches your authenticated user's UUID.

### Troubleshooting

- **Error: "Supabase credentials are not configured in .env.local"**:
  Ensure both `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are defined and non-empty. Restart `npm run dev` after changing `.env.local`.
- **Error: "Invalid login credentials"**:
  Verify your user email and password in Supabase Dashboard under **Authentication > Users**. Ensure the user has the "Confirmed" badge.
- **Error: "Cloud database already contains data for this user"**:
  To protect against accidental duplication or overwrites, migration requires ticking the **"Allow updating / overwriting existing cloud records"** checkbox if the cloud already contains data for your account.

