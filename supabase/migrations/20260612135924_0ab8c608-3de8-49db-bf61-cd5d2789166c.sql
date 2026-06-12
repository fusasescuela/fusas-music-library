
CREATE POLICY "Staff upload material files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'materials'
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'docente'))
  );
CREATE POLICY "Staff update material files" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'materials'
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'docente'))
  );
CREATE POLICY "Staff delete material files" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'materials'
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'docente'))
  );
CREATE POLICY "Staff read material files" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'materials'
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'docente'))
  );
