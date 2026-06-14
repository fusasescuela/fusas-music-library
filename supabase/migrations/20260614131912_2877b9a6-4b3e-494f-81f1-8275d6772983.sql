CREATE TYPE public.attachment_kind AS ENUM ('file', 'link', 'text');

CREATE TABLE public.material_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  material_id uuid NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  kind public.attachment_kind NOT NULL,
  file_path text,
  file_mime text,
  file_name text,
  external_url text,
  body_text text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.material_attachments TO authenticated;
GRANT ALL ON public.material_attachments TO service_role;

ALTER TABLE public.material_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View attachments of viewable materials"
ON public.material_attachments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.materials m
    WHERE m.id = material_attachments.material_id
      AND (
        public.has_role(auth.uid(), 'admin')
        OR public.has_role(auth.uid(), 'docente')
        OR (public.has_role(auth.uid(), 'estudiante') AND (m.is_general = true OR public.student_can_view_material(auth.uid(), m.id)))
      )
  )
);

CREATE POLICY "Admins manage all attachments"
ON public.material_attachments FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Docentes manage own material attachments"
ON public.material_attachments FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'docente')
  AND EXISTS (SELECT 1 FROM public.materials m WHERE m.id = material_attachments.material_id AND m.owner_id = auth.uid())
)
WITH CHECK (
  public.has_role(auth.uid(), 'docente')
  AND EXISTS (SELECT 1 FROM public.materials m WHERE m.id = material_attachments.material_id AND m.owner_id = auth.uid())
);

CREATE TRIGGER update_material_attachments_updated_at
BEFORE UPDATE ON public.material_attachments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_material_attachments_material_id ON public.material_attachments(material_id);

INSERT INTO public.material_attachments (material_id, kind, file_path, file_mime, file_name, external_url, body_text, position)
SELECT id, type::text::public.attachment_kind, file_path, file_mime, file_name, external_url, body_text, 0
FROM public.materials
WHERE (type = 'file' AND file_path IS NOT NULL)
   OR (type = 'link' AND external_url IS NOT NULL)
   OR (type = 'text' AND body_text IS NOT NULL);