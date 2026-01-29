-- Fix linter: ensure RLS is enabled on all public tables exposed to PostgREST.
-- user_roles should not be directly accessible; enabling RLS with no policies blocks access.

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
