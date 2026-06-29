-- ============================================================
-- UPSC Prep Tracker — Supabase Community Features Migration
-- Generated: 2026-06-29
-- Paste this entire script into the Supabase SQL Editor and run.
-- ============================================================

-- ============================================================
-- Section 1: Tables
-- ============================================================

-- 1.1 Profiles Table
-- Stores user public identity info and privacy preferences.
CREATE TABLE IF NOT EXISTS profiles (
  id            UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  TEXT        NOT NULL,
  avatar_url    TEXT,
  is_public     BOOLEAN     DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- 1.2 Daily Summaries Table
-- Private master data logs of totals. Kept in a separate table for fast join & view generation.
CREATE TABLE IF NOT EXISTS daily_summaries (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_number    INTEGER     NOT NULL CHECK (day_number BETWEEN 1 AND 30),
  date          TEXT        NOT NULL, -- YYYY-MM-DD
  total_hours   REAL        DEFAULT 0,
  subjects      TEXT[]      DEFAULT ARRAY[]::TEXT[],
  streak        INTEGER     DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, day_number) -- Changed to day_number to match 30-day sprint logs
);

-- 1.3 Cheers Table
-- Emoji reactions left by users on daily summaries.
CREATE TABLE IF NOT EXISTS cheers (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  summary_id    UUID        NOT NULL REFERENCES daily_summaries(id) ON DELETE CASCADE,
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji         TEXT        NOT NULL DEFAULT '👏',
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (summary_id, user_id, emoji)
);


-- ============================================================
-- Section 2: Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_daily_summaries_user ON daily_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_summaries_date ON daily_summaries(date);
CREATE INDEX IF NOT EXISTS idx_cheers_summary       ON cheers(summary_id);


-- ============================================================
-- Section 3: Triggers for updated_at
-- ============================================================
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_daily_summaries_updated_at
  BEFORE UPDATE ON daily_summaries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- Section 4: Secure view with security_barrier
-- ============================================================
-- Using security_barrier=true prevents Postgres optimizer leaks of masked values.
CREATE OR REPLACE VIEW public_daily_activities 
WITH (security_barrier = true)
AS
SELECT 
  ds.id,
  ds.user_id,
  ds.day_number,
  ds.date,
  ds.subjects,
  -- Mask study hours unless the profile is public OR the current user owns this log
  CASE 
    WHEN p.is_public = true OR ds.user_id = auth.uid() THEN ds.total_hours 
    ELSE null 
  END AS total_hours,
  -- Mask streak count unless public OR owned
  CASE 
    WHEN p.is_public = true OR ds.user_id = auth.uid() THEN ds.streak 
    ELSE 0 
  END AS streak,
  ds.created_at,
  p.display_name,
  p.avatar_url,
  p.is_public
FROM daily_summaries ds
JOIN profiles p ON ds.user_id = p.id;


-- ============================================================
-- Section 5: Row Level Security (RLS) & Grants
-- ============================================================

-- ---- profiles ----
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (is_public = true OR auth.uid() = id);

CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_delete" ON profiles
  FOR DELETE USING (auth.uid() = id);

-- ---- daily_summaries ----
ALTER TABLE daily_summaries ENABLE ROW LEVEL SECURITY;

-- Deny SELECT direct queries by other users on the raw daily_summaries table
CREATE POLICY "daily_summaries_select" ON daily_summaries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "daily_summaries_insert" ON daily_summaries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "daily_summaries_update" ON daily_summaries
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "daily_summaries_delete" ON daily_summaries
  FOR DELETE USING (auth.uid() = user_id);

-- ---- cheers ----
ALTER TABLE cheers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cheers_select" ON cheers
  FOR SELECT USING (true); -- Allow everyone to read emoji cheer counts

CREATE POLICY "cheers_insert" ON cheers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "cheers_delete" ON cheers
  FOR DELETE USING (auth.uid() = user_id);

-- ---- Grants on the View ----
-- Allow authenticated users to select from the masked view
GRANT SELECT ON public_daily_activities TO authenticated;
GRANT SELECT ON public_daily_activities TO anon;


-- ============================================================
-- Section 6: Profile seeding trigger
-- ============================================================
-- Automatically creates a profile row in the profiles table
-- whenever a new user registers in auth.users.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url, is_public)
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1), 'UPSC Aspirant'),
    new.raw_user_meta_data->>'avatar_url',
    false -- default to private (opt-in model)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger execution
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
