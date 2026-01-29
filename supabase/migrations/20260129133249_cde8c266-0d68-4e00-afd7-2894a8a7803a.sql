-- Ensure RLS is enabled
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

-- Admins can manage brands
CREATE POLICY "admin manages brands"
ON public.brands
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

-- Authenticated users can read brands (brand names are non-sensitive)
CREATE POLICY "authenticated reads brands"
ON public.brands
FOR SELECT
TO authenticated
USING (true);
