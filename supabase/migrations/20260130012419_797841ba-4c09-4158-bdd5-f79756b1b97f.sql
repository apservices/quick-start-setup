-- 1) RLS: permitir operator gerenciar captures (insert/select/update/delete)
-- (admin já tem policy; model tem policies próprias)

CREATE POLICY "operator manages captures"
ON public.captures
FOR ALL
USING (has_role(auth.uid(), 'operator'::app_role))
WITH CHECK (has_role(auth.uid(), 'operator'::app_role));
