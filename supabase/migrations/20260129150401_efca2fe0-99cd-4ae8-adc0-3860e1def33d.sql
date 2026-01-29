-- Enable profile provisioning from the app and move authorization to public.profiles.role

-- 1) Allow authenticated users to create their own profile row
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'profiles self insert'
  ) THEN
    CREATE POLICY "profiles self insert"
    ON public.profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (id = auth.uid());
  END IF;
END $$;

-- 2) Helper to safely check roles from profiles without RLS recursion
CREATE OR REPLACE FUNCTION public.has_profile_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = _user_id
      AND lower(p.role) = lower(_role)
  );
$$;

-- 3) Update RLS policies across tables to use has_profile_role instead of has_role/user_roles
-- audit_logs
DROP POLICY IF EXISTS "admin reads audit logs" ON public.audit_logs;
CREATE POLICY "admin reads audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (public.has_profile_role(auth.uid(), 'admin'));

-- brands
DROP POLICY IF EXISTS "admin manages brands" ON public.brands;
CREATE POLICY "admin manages brands"
ON public.brands
FOR ALL
TO authenticated
USING (public.has_profile_role(auth.uid(), 'admin'))
WITH CHECK (public.has_profile_role(auth.uid(), 'admin'));

-- brand_models
DROP POLICY IF EXISTS "admin manages brand_models" ON public.brand_models;
CREATE POLICY "admin manages brand_models"
ON public.brand_models
FOR ALL
TO authenticated
USING (public.has_profile_role(auth.uid(), 'admin'))
WITH CHECK (public.has_profile_role(auth.uid(), 'admin'));

-- captures
DROP POLICY IF EXISTS "admin manages captures" ON public.captures;
CREATE POLICY "admin manages captures"
ON public.captures
FOR ALL
TO authenticated
USING (public.has_profile_role(auth.uid(), 'admin'))
WITH CHECK (public.has_profile_role(auth.uid(), 'admin'));

-- contracts
DROP POLICY IF EXISTS "admin manages contracts" ON public.contracts;
CREATE POLICY "admin manages contracts"
ON public.contracts
FOR ALL
TO authenticated
USING (public.has_profile_role(auth.uid(), 'admin'))
WITH CHECK (public.has_profile_role(auth.uid(), 'admin'));

-- financeiro_transacoes
DROP POLICY IF EXISTS "admin manages financeiro" ON public.financeiro_transacoes;
CREATE POLICY "admin manages financeiro"
ON public.financeiro_transacoes
FOR ALL
TO authenticated
USING (public.has_profile_role(auth.uid(), 'admin'))
WITH CHECK (public.has_profile_role(auth.uid(), 'admin'));

-- job_applications
DROP POLICY IF EXISTS "admin reads job applications" ON public.job_applications;
CREATE POLICY "admin reads job applications"
ON public.job_applications
FOR SELECT
TO authenticated
USING (public.has_profile_role(auth.uid(), 'admin'));

-- jobs
DROP POLICY IF EXISTS "admin manages jobs" ON public.jobs;
CREATE POLICY "admin manages jobs"
ON public.jobs
FOR ALL
TO authenticated
USING (public.has_profile_role(auth.uid(), 'admin'))
WITH CHECK (public.has_profile_role(auth.uid(), 'admin'));

-- licenses
DROP POLICY IF EXISTS "admin manages licenses" ON public.licenses;
CREATE POLICY "admin manages licenses"
ON public.licenses
FOR ALL
TO authenticated
USING (public.has_profile_role(auth.uid(), 'admin'))
WITH CHECK (public.has_profile_role(auth.uid(), 'admin'));

-- models
DROP POLICY IF EXISTS "admin reads models" ON public.models;
CREATE POLICY "admin reads models"
ON public.models
FOR ALL
TO authenticated
USING (public.has_profile_role(auth.uid(), 'admin'))
WITH CHECK (public.has_profile_role(auth.uid(), 'admin'));

-- previews
DROP POLICY IF EXISTS "admin manages previews" ON public.previews;
CREATE POLICY "admin manages previews"
ON public.previews
FOR ALL
TO authenticated
USING (public.has_profile_role(auth.uid(), 'admin'))
WITH CHECK (public.has_profile_role(auth.uid(), 'admin'));

-- profiles
DROP POLICY IF EXISTS "profiles admin read" ON public.profiles;
CREATE POLICY "profiles admin read"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_profile_role(auth.uid(), 'admin'));

-- NOTE: user_roles is no longer used as the source of truth.
-- We keep the table for now (non-breaking), but stop depending on triggers.

-- 4) Remove trigger dependency: no triggers exist; drop the unused function to avoid confusion.
DROP FUNCTION IF EXISTS public.handle_new_user();
