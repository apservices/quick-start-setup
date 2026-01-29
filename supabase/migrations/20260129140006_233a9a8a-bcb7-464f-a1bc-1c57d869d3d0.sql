-- Allow users to self-assign ONLY the default 'model' role on first login.
-- Admins can still manage roles via the existing admin policy.
DROP POLICY IF EXISTS "users insert default role" ON public.user_roles;
CREATE POLICY "users insert default role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() AND role = 'model'::public.app_role);
