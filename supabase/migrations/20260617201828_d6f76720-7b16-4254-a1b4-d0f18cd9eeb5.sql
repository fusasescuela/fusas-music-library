-- Junction table: teachers <-> instruments (multiple instruments per teacher)
CREATE TABLE public.teacher_instruments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  instrument_id uuid NOT NULL REFERENCES public.instruments(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (teacher_id, instrument_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_instruments TO authenticated;
GRANT ALL ON public.teacher_instruments TO service_role;

ALTER TABLE public.teacher_instruments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read teacher_instruments" ON public.teacher_instruments
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage teacher_instruments" ON public.teacher_instruments
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Junction table: teachers <-> subjects (multiple subjects per teacher)
CREATE TABLE public.teacher_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (teacher_id, subject_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_subjects TO authenticated;
GRANT ALL ON public.teacher_subjects TO service_role;

ALTER TABLE public.teacher_subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read teacher_subjects" ON public.teacher_subjects
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage teacher_subjects" ON public.teacher_subjects
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Migrate existing single instrument assignments into the new junction table
INSERT INTO public.teacher_instruments (teacher_id, instrument_id)
SELECT id, instrument_id FROM public.teachers
WHERE instrument_id IS NOT NULL
ON CONFLICT DO NOTHING;