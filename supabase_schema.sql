-- ═══════════════════════════════════════════════════════════════
-- Collabnb — Run this entire file in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. Create profiles table (safe if already exists) ──────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id           uuid REFERENCES auth.users NOT NULL PRIMARY KEY,
  email        text,
  full_name    text,
  role         text CHECK (role IN ('creator', 'host')),
  username     text,
  bio          text,
  avatar_url   text,
  created_at   timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ─── 2. Add new columns (safe to run on existing table) ─────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS business_name   text,
  ADD COLUMN IF NOT EXISTS property_type  text,
  ADD COLUMN IF NOT EXISTS city           text,
  ADD COLUMN IF NOT EXISTS region         text,
  ADD COLUMN IF NOT EXISTS tier           text,
  ADD COLUMN IF NOT EXISTS recent_collabs text,
  ADD COLUMN IF NOT EXISTS portfolio      text,
  ADD COLUMN IF NOT EXISTS beta           boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_founder     boolean DEFAULT false;

-- ─── 3. Row Level Security ───────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone."
  ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
CREATE POLICY "Users can insert their own profile."
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
CREATE POLICY "Users can update own profile."
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- ─── 4. Fix trigger function ─────────────────────────────────────
-- Previous version had 'security modeller' (typo) — it never compiled.
-- This version fixes that and adds founder tagging + all new fields.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  role_count integer;
  user_role  text;
BEGIN
  user_role := new.raw_user_meta_data->>'role';

  -- Count existing signups for this role to determine founder status
  SELECT COUNT(*) INTO role_count
  FROM public.profiles
  WHERE role = user_role;

  INSERT INTO public.profiles (
    id, email, role, full_name, username,
    business_name, property_type, city, region,
    tier, recent_collabs, portfolio, beta, is_founder
  ) VALUES (
    new.id,
    new.email,
    user_role,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'business_name',
    new.raw_user_meta_data->>'property_type',
    new.raw_user_meta_data->>'city',
    new.raw_user_meta_data->>'region',
    new.raw_user_meta_data->>'tier',
    new.raw_user_meta_data->>'recent_collabs',
    new.raw_user_meta_data->>'portfolio',
    COALESCE((new.raw_user_meta_data->>'beta')::boolean, false),
    role_count < 100  -- first 100 of each role get is_founder = true
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 5. Recreate trigger (drops old broken one first) ────────────
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
