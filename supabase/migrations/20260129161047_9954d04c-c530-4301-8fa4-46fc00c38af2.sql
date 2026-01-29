-- Phase 2 (Forge pipeline): create public.forges backed by Supabase

-- 1) Table
CREATE TABLE IF NOT EXISTS public.forges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid NOT NULL REFERENCES public.models(id) ON DELETE CASCADE,
  state text NOT NULL DEFAULT 'CREATED',
  version integer NOT NULL DEFAULT 1,
  capture_progress integer NOT NULL DEFAULT 0,
  digital_twin_id text,
  seed_hash text,
  certified_at timestamp with time zone,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_forges_model_id ON public.forges(model_id);
CREATE INDEX IF NOT EXISTS idx_forges_state ON public.forges(state);

-- 2) RLS
ALTER TABLE public.forges ENABLE ROW LEVEL SECURITY;

-- Admin/Operator manage forges
DROP POLICY IF EXISTS "admin/operator manage forges" ON public.forges;
CREATE POLICY "admin/operator manage forges"
ON public.forges
FOR ALL
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'operator'::public.app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'operator'::public.app_role)
);

-- Model reads own forges
DROP POLICY IF EXISTS "model reads own forges" ON public.forges;
CREATE POLICY "model reads own forges"
ON public.forges
FOR SELECT
USING (
  model_id IN (
    SELECT m.id
    FROM public.models m
    WHERE m.user_id = auth.uid()
  )
);
