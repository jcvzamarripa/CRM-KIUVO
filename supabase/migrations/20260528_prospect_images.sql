-- ── Storage bucket ────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('prospect-images', 'prospect-images', true)
ON CONFLICT (id) DO NOTHING;

-- Cualquier usuario autenticado puede subir imágenes
CREATE POLICY "Authenticated users can upload prospect images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'prospect-images');

-- Cualquier usuario autenticado puede ver imágenes
CREATE POLICY "Authenticated users can view prospect images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'prospect-images');

-- Solo quien subió la imagen puede eliminarla (o el admin via service role)
CREATE POLICY "Uploader can delete prospect images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'prospect-images' AND owner = auth.uid());

-- ── Tabla prospect_images ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.prospect_images (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id  uuid NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  url          text NOT NULL,
  path         text NOT NULL,
  uploaded_by  uuid REFERENCES public.profiles(id),
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE public.prospect_images ENABLE ROW LEVEL SECURITY;

-- Vendedor ve imágenes de sus propios prospectos; admin ve todo
CREATE POLICY "Sellers view images of own prospects"
ON public.prospect_images FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.prospects WHERE id = prospect_id AND owner_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Vendedor puede insertar imágenes en sus prospectos
CREATE POLICY "Sellers insert images for own prospects"
ON public.prospect_images FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.prospects WHERE id = prospect_id AND owner_id = auth.uid())
);

-- Quien subió puede eliminar
CREATE POLICY "Uploader can delete image row"
ON public.prospect_images FOR DELETE TO authenticated
USING (uploaded_by = auth.uid());
