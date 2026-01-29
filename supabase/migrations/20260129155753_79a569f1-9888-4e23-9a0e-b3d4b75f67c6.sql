-- Phase 1–2: align RLS with roles from public.user_roles (no profiles.role auth)

-- 1) user_roles must be readable by the user (self) and manageable by admin
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users read own roles" ON public.user_roles;
CREATE POLICY "users read own roles"
ON public.user_roles
FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "admins manage roles" ON public.user_roles;
CREATE POLICY "admins manage roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2) Replace admin checks from has_profile_role(...) -> has_role(...)
-- profiles
DROP POLICY IF EXISTS "profiles admin read" ON public.profiles;
CREATE POLICY "profiles admin read"
ON public.profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- audit_logs
DROP POLICY IF EXISTS "admin reads audit logs" ON public.audit_logs;
CREATE POLICY "admin reads audit logs"
ON public.audit_logs
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- brands
DROP POLICY IF EXISTS "admin manages brands" ON public.brands;
CREATE POLICY "admin manages brands"
ON public.brands
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- brand_models
DROP POLICY IF EXISTS "admin manages brand_models" ON public.brand_models;
CREATE POLICY "admin manages brand_models"
ON public.brand_models
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- jobs
DROP POLICY IF EXISTS "admin manages jobs" ON public.jobs;
CREATE POLICY "admin manages jobs"
ON public.jobs
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- job_applications
DROP POLICY IF EXISTS "admin reads job applications" ON public.job_applications;
CREATE POLICY "admin reads job applications"
ON public.job_applications
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- licenses
DROP POLICY IF EXISTS "admin manages licenses" ON public.licenses;
CREATE POLICY "admin manages licenses"
ON public.licenses
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- contracts
DROP POLICY IF EXISTS "admin manages contracts" ON public.contracts;
CREATE POLICY "admin manages contracts"
ON public.contracts
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- financeiro_transacoes
DROP POLICY IF EXISTS "admin manages financeiro" ON public.financeiro_transacoes;
CREATE POLICY "admin manages financeiro"
ON public.financeiro_transacoes
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- models
DROP POLICY IF EXISTS "admin reads models" ON public.models;
CREATE POLICY "admin reads models"
ON public.models
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "model inserts own model" ON public.models;
CREATE POLICY "model inserts own model"
ON public.models
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- captures
DROP POLICY IF EXISTS "admin manages captures" ON public.captures;
CREATE POLICY "admin manages captures"
ON public.captures
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- previews
DROP POLICY IF EXISTS "admin manages previews" ON public.previews;
CREATE POLICY "admin manages previews"
ON public.previews
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
