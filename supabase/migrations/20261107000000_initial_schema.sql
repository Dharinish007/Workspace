-- ============================================================================
-- MY WORKSPACE — INITIAL DATABASE FOUNDATION (PHASE 3)
-- Migration: 20261107000000_initial_schema.sql
-- ============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Clean execution context
SET search_path = public;

-- ============================================================================
-- 1. USER SETTINGS
-- ============================================================================
CREATE TABLE public.user_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL DEFAULT 'User',
    theme TEXT NOT NULL DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
    week_start TEXT NOT NULL DEFAULT 'monday' CHECK (week_start IN ('monday', 'sunday')),
    background_style TEXT NOT NULL DEFAULT 'current' CHECK (background_style IN ('current', 'paper', 'notion')),
    habit_default_color TEXT NOT NULL DEFAULT '#0D9488',
    event_default_color TEXT NOT NULL DEFAULT '#F97316',
    last_backup TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

-- ============================================================================
-- 2. PAGES
-- ============================================================================
CREATE TABLE public.pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT 'Folder',
    color TEXT NOT NULL DEFAULT '#4285F4',
    "order" INTEGER NOT NULL DEFAULT 0,
    archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    CONSTRAINT uq_pages_user_id UNIQUE (user_id, id)
);

CREATE INDEX idx_pages_user_order ON public.pages (user_id, "order");
CREATE INDEX idx_pages_user_archived ON public.pages (user_id, archived);

-- ============================================================================
-- 3. TASKS
-- ============================================================================
CREATE TABLE public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    page_id UUID NOT NULL,
    title TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
    important BOOLEAN NOT NULL DEFAULT false,
    completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMPTZ,
    due_date DATE,
    "order" INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    -- Enforces cross-user relational integrity: page MUST belong to the same user
    CONSTRAINT fk_tasks_user_page FOREIGN KEY (user_id, page_id)
        REFERENCES public.pages (user_id, id) ON DELETE CASCADE
);

CREATE INDEX idx_tasks_user_page_order ON public.tasks (user_id, page_id, "order");
CREATE INDEX idx_tasks_user_due_date ON public.tasks (user_id, due_date);
CREATE INDEX idx_tasks_user_completed ON public.tasks (user_id, completed);

-- ============================================================================
-- 4. HABIT SCHEDULE VALIDATION FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION public.validate_habit_schedule(schedule jsonb)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
CALLED ON NULL INPUT
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_len integer;
  v_unique_count integer;
  v_valid_elem_count integer;
BEGIN
  -- 1. Must not be SQL NULL and must be a JSON object
  IF schedule IS NULL OR pg_catalog.jsonb_typeof(schedule) <> 'object' THEN
    RETURN false;
  END IF;

  -- 2. Format A: Daily
  -- Must have type = 'daily' and NO other properties
  IF schedule->>'type' = 'daily' THEN
    RETURN (schedule - 'type') = '{}'::jsonb;
  END IF;

  -- 3. Format B: Weekdays
  IF schedule->>'type' = 'weekdays' THEN
    -- 'days' key MUST be explicitly present in the object
    IF NOT (schedule ? 'days') THEN
      RETURN false;
    END IF;

    -- Must contain ONLY 'type' and 'days' keys (rejects unexpected properties)
    IF (schedule - 'type' - 'days') <> '{}'::jsonb THEN
      RETURN false;
    END IF;

    -- 'days' must be an actual JSON array (rejects null, string, object, number)
    IF pg_catalog.jsonb_typeof(schedule->'days') <> 'array' THEN
      RETURN false;
    END IF;

    v_len := pg_catalog.jsonb_array_length(schedule->'days');
    -- Array must not be empty and cannot exceed 7 days
    IF v_len < 1 OR v_len > 7 THEN
      RETURN false;
    END IF;

    -- Enforce that every array element is strictly a JSON number
    -- and is an integer strictly between 1 and 7 with zero duplicates
    SELECT
      count(*),
      count(DISTINCT elem::text)
    INTO
      v_valid_elem_count,
      v_unique_count
    FROM pg_catalog.jsonb_array_elements(schedule->'days') AS elem
    WHERE pg_catalog.jsonb_typeof(elem) = 'number'
      AND elem::text ~ '^[1-7]$';

    RETURN COALESCE(v_valid_elem_count = v_len AND v_unique_count = v_len, false);
  END IF;

  RETURN false;
END;
$$;

-- ============================================================================
-- 5. HABITS
-- ============================================================================
CREATE TABLE public.habits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT 'Flame',
    color TEXT NOT NULL DEFAULT '#0D9488',
    schedule JSONB NOT NULL DEFAULT '{"type": "daily"}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    CONSTRAINT uq_habits_user_id UNIQUE (user_id, id),
    CONSTRAINT chk_habits_schedule CHECK (public.validate_habit_schedule(schedule))
);

CREATE INDEX idx_habits_user_created ON public.habits (user_id, created_at);

-- ============================================================================
-- 6. HABIT LOGS
-- ============================================================================
CREATE TABLE public.habit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    habit_id UUID NOT NULL,
    date DATE NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    -- Enforces cross-user relational integrity: habit MUST belong to the same user
    CONSTRAINT fk_habit_logs_user_habit FOREIGN KEY (user_id, habit_id)
        REFERENCES public.habits (user_id, id) ON DELETE CASCADE,
    CONSTRAINT uq_habit_logs_user_habit_date UNIQUE (user_id, habit_id, date)
);

CREATE INDEX idx_habit_logs_user_date ON public.habit_logs (user_id, date);

-- ============================================================================
-- 7. CALENDAR EVENTS
-- ============================================================================
CREATE TABLE public.calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    date DATE NOT NULL,
    start_time TIME WITHOUT TIME ZONE,
    end_time TIME WITHOUT TIME ZONE,
    color TEXT NOT NULL DEFAULT '#F97316',
    category TEXT NOT NULL DEFAULT 'general',
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    CONSTRAINT chk_event_time_window CHECK (end_time IS NULL OR start_time IS NULL OR end_time >= start_time)
);

CREATE INDEX idx_calendar_events_user_date ON public.calendar_events (user_id, date);

-- ============================================================================
-- 8. DAY COLORS
-- ============================================================================
CREATE TABLE public.day_colors (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    color TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    PRIMARY KEY (user_id, date)
);

-- ============================================================================
-- 9. JOURNAL ENTRIES
-- ============================================================================
CREATE TABLE public.journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    title TEXT,
    body TEXT NOT NULL DEFAULT '',
    mood TEXT CHECK (mood IS NULL OR mood IN ('terrible', 'bad', 'neutral', 'good', 'great')),
    tags TEXT[] NOT NULL DEFAULT '{}'::text[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    CONSTRAINT uq_journal_entries_user_date UNIQUE (user_id, date)
);

CREATE INDEX idx_journal_entries_user_date ON public.journal_entries (user_id, date DESC);

-- ============================================================================
-- 10. NOTES
-- ============================================================================
CREATE TABLE public.notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    tags TEXT[] NOT NULL DEFAULT '{}'::text[],
    pinned BOOLEAN NOT NULL DEFAULT false,
    pinned_order INTEGER NOT NULL DEFAULT 0,
    icon TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

CREATE INDEX idx_notes_user_updated ON public.notes (user_id, updated_at DESC);
CREATE INDEX idx_notes_user_pinned ON public.notes (user_id, pinned, pinned_order);

-- ============================================================================
-- 11. TIMESTAMP ENFORCEMENT TRIGGER FUNCTION (SECURITY INVOKER)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = pg_catalog.now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_user_settings_updated_at BEFORE UPDATE ON public.user_settings FOR EACH ROW EXECUTE FUNCTION public.handle_set_updated_at();
CREATE TRIGGER trg_pages_updated_at BEFORE UPDATE ON public.pages FOR EACH ROW EXECUTE FUNCTION public.handle_set_updated_at();
CREATE TRIGGER trg_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.handle_set_updated_at();
CREATE TRIGGER trg_habits_updated_at BEFORE UPDATE ON public.habits FOR EACH ROW EXECUTE FUNCTION public.handle_set_updated_at();
CREATE TRIGGER trg_habit_logs_updated_at BEFORE UPDATE ON public.habit_logs FOR EACH ROW EXECUTE FUNCTION public.handle_set_updated_at();
CREATE TRIGGER trg_calendar_events_updated_at BEFORE UPDATE ON public.calendar_events FOR EACH ROW EXECUTE FUNCTION public.handle_set_updated_at();
CREATE TRIGGER trg_day_colors_updated_at BEFORE UPDATE ON public.day_colors FOR EACH ROW EXECUTE FUNCTION public.handle_set_updated_at();
CREATE TRIGGER trg_journal_entries_updated_at BEFORE UPDATE ON public.journal_entries FOR EACH ROW EXECUTE FUNCTION public.handle_set_updated_at();
CREATE TRIGGER trg_notes_updated_at BEFORE UPDATE ON public.notes FOR EACH ROW EXECUTE FUNCTION public.handle_set_updated_at();

-- ============================================================================
-- 12. SIGNUP TRIGGER FUNCTION (SECURITY DEFINER)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_display_name text;
BEGIN
  v_display_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    'User'
  );

  INSERT INTO public.user_settings (user_id, display_name)
  VALUES (NEW.id, v_display_name)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 13. ATOMIC WORKSPACE INITIALIZATION FUNCTION (SECURITY DEFINER)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.initialize_user_workspace()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_page_count integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 1. Ensure user_settings row exists even if user signed up before trigger was active
  INSERT INTO public.user_settings (user_id, display_name)
  VALUES (v_user_id, 'User')
  ON CONFLICT (user_id) DO NOTHING;

  -- 2. Exclusively lock the user's settings row to serialize concurrent tab requests
  PERFORM 1 FROM public.user_settings WHERE user_id = v_user_id FOR UPDATE;

  -- 3. Check existing page count
  SELECT count(*) INTO v_page_count FROM public.pages WHERE user_id = v_user_id;

  -- 4. Only insert default pages if account has zero pages
  IF v_page_count = 0 THEN
    INSERT INTO public.pages (user_id, name, icon, color, "order", archived)
    VALUES
      (v_user_id, 'Career', 'Briefcase', '#4285F4', 0, false),
      (v_user_id, 'Projects', 'Code', '#34A853', 1, false),
      (v_user_id, 'Learning', 'BookOpen', '#A142F4', 2, false),
      (v_user_id, 'Personal', 'Heart', '#EC4899', 3, false);
  END IF;
END;
$$;

-- ============================================================================
-- 14. PRIVILEGES, DEFAULT PRIVILEGES, AND LEAST PRIVILEGE LOCKDOWN
-- ============================================================================

-- A. Revoke default privileges for future objects created by role postgres
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
REVOKE ALL ON TABLES FROM anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
REVOKE ALL ON SEQUENCES FROM anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
REVOKE ALL ON FUNCTIONS FROM anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres
REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- B. Schema Privileges
REVOKE ALL ON SCHEMA public FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON SCHEMA public TO service_role;

-- C. Revoke permissions on existing objects
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM PUBLIC, anon, authenticated;

-- D. Explicit Table Grants
-- user_settings: SELECT, INSERT, UPDATE only (NO DELETE, NO TRUNCATE)
GRANT SELECT, INSERT, UPDATE ON TABLE public.user_settings TO authenticated;

-- Eight content tables: CRUD only (NO TRUNCATE, NO TRIGGER, NO REFERENCES)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE 
  public.pages,
  public.tasks,
  public.habits,
  public.habit_logs,
  public.calendar_events,
  public.day_colors,
  public.journal_entries,
  public.notes 
TO authenticated;

-- E. Function Execution Grants
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_set_updated_at() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.validate_habit_schedule(jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.initialize_user_workspace() TO authenticated, service_role;

-- F. Service Role Administrative Bypass
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;

-- ============================================================================
-- 15. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.day_colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- 1. user_settings (No DELETE policy)
CREATE POLICY "p_user_settings_select" ON public.user_settings FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "p_user_settings_insert" ON public.user_settings FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "p_user_settings_update" ON public.user_settings FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

-- 2. pages
CREATE POLICY "p_pages_select" ON public.pages FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "p_pages_insert" ON public.pages FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "p_pages_update" ON public.pages FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "p_pages_delete" ON public.pages FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

-- 3. tasks
CREATE POLICY "p_tasks_select" ON public.tasks FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "p_tasks_insert" ON public.tasks FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "p_tasks_update" ON public.tasks FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "p_tasks_delete" ON public.tasks FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

-- 4. habits
CREATE POLICY "p_habits_select" ON public.habits FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "p_habits_insert" ON public.habits FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "p_habits_update" ON public.habits FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "p_habits_delete" ON public.habits FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

-- 5. habit_logs
CREATE POLICY "p_habit_logs_select" ON public.habit_logs FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "p_habit_logs_insert" ON public.habit_logs FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "p_habit_logs_update" ON public.habit_logs FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "p_habit_logs_delete" ON public.habit_logs FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

-- 6. calendar_events
CREATE POLICY "p_calendar_events_select" ON public.calendar_events FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "p_calendar_events_insert" ON public.calendar_events FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "p_calendar_events_update" ON public.calendar_events FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "p_calendar_events_delete" ON public.calendar_events FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

-- 7. day_colors
CREATE POLICY "p_day_colors_select" ON public.day_colors FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "p_day_colors_insert" ON public.day_colors FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "p_day_colors_update" ON public.day_colors FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "p_day_colors_delete" ON public.day_colors FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

-- 8. journal_entries
CREATE POLICY "p_journal_entries_select" ON public.journal_entries FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "p_journal_entries_insert" ON public.journal_entries FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "p_journal_entries_update" ON public.journal_entries FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "p_journal_entries_delete" ON public.journal_entries FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

-- 9. notes
CREATE POLICY "p_notes_select" ON public.notes FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "p_notes_insert" ON public.notes FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "p_notes_update" ON public.notes FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "p_notes_delete" ON public.notes FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

