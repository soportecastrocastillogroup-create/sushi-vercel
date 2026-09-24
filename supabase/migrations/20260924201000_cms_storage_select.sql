-- PRD 01 · Etapa D: los administradores necesitan leer los objetos de los
-- buckets del sitio para poder borrarlos (Storage exige SELECT además de
-- DELETE). La lectura pública de las imágenes sigue siendo por URL pública.
DROP POLICY IF EXISTS cms_images_select ON storage.objects;
CREATE POLICY cms_images_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id IN ('product-images', 'site-media') AND public.is_admin());
