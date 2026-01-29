-- Ensure RLS is enabled
ALTER TABLE public.brand_models ENABLE ROW LEVEL SECURITY;

-- Admins can manage brand-model mappings
CREATE POLICY "admin manages brand_models"
ON public.brand_models
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Fix mutable search_path warning
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
begin
  insert into public.profiles (id, role, full_name)
  values (new.id, 'model', new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;
