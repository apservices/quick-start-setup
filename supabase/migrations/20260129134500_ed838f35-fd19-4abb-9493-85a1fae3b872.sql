-- 1) Roles must be stored in a separate table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.app_role AS ENUM ('admin','operator','model','client');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 2) Security definer role-check helper (must exist before policies reference it)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 3) user_roles policies
DROP POLICY IF EXISTS "users read own roles" ON public.user_roles;
CREATE POLICY "users read own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "admins manage roles" ON public.user_roles;
CREATE POLICY "admins manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 4) Update existing policies to use user_roles-based admin checks

-- profiles
DROP POLICY IF EXISTS "profiles admin read" ON public.profiles;
CREATE POLICY "profiles admin read"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- models
DROP POLICY IF EXISTS "admin reads models" ON public.models;
CREATE POLICY "admin reads models"
ON public.models
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- captures
DROP POLICY IF EXISTS "admin manages captures" ON public.captures;
CREATE POLICY "admin manages captures"
ON public.captures
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- previews
DROP POLICY IF EXISTS "admin manages previews" ON public.previews;
CREATE POLICY "admin manages previews"
ON public.previews
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- licenses
DROP POLICY IF EXISTS "admin manages licenses" ON public.licenses;
CREATE POLICY "admin manages licenses"
ON public.licenses
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- contracts
DROP POLICY IF EXISTS "admin manages contracts" ON public.contracts;
CREATE POLICY "admin manages contracts"
ON public.contracts
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- financeiro_transacoes
DROP POLICY IF EXISTS "admin manages financeiro" ON public.financeiro_transacoes;
CREATE POLICY "admin manages financeiro"
ON public.financeiro_transacoes
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- jobs
DROP POLICY IF EXISTS "admin manages jobs" ON public.jobs;
CREATE POLICY "admin manages jobs"
ON public.jobs
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- job_applications
DROP POLICY IF EXISTS "admin reads job applications" ON public.job_applications;
CREATE POLICY "admin reads job applications"
ON public.job_applications
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- audit_logs: admin read + authenticated insert for their own actor_id
DROP POLICY IF EXISTS "admin reads audit logs" ON public.audit_logs;
CREATE POLICY "admin reads audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "users insert own audit logs" ON public.audit_logs;
CREATE POLICY "users insert own audit logs"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (actor_id = auth.uid());

-- brands
DROP POLICY IF EXISTS "admin manages brands" ON public.brands;
CREATE POLICY "admin manages brands"
ON public.brands
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- brand_models
DROP POLICY IF EXISTS "admin manages brand_models" ON public.brand_models;
CREATE POLICY "admin manages brand_models"
ON public.brand_models
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
