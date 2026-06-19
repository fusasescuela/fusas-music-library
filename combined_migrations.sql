
-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'docente', 'estudiante');
CREATE TYPE public.material_type AS ENUM ('file', 'link', 'text');

-- updated_at helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- PROFILES
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- USER ROLES
CREATE TABLE public.user_roles (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role security definer
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- INSTRUMENTS
CREATE TABLE public.instruments (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.instruments TO authenticated;
GRANT ALL ON public.instruments TO service_role;
ALTER TABLE public.instruments ENABLE ROW LEVEL SECURITY;

-- LEVELS
CREATE TABLE public.levels (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.levels TO authenticated;
GRANT ALL ON public.levels TO service_role;
ALTER TABLE public.levels ENABLE ROW LEVEL SECURITY;

-- SUBJECTS (materias)
CREATE TABLE public.subjects (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subjects TO authenticated;
GRANT ALL ON public.subjects TO service_role;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

-- TEACHERS (profesores)
CREATE TABLE public.teachers (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  instrument_id UUID REFERENCES public.instruments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teachers TO authenticated;
GRANT ALL ON public.teachers TO service_role;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

-- MATERIALS
CREATE TABLE public.materials (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  type material_type NOT NULL,
  file_path TEXT,
  file_mime TEXT,
  file_name TEXT,
  external_url TEXT,
  body_text TEXT,
  instrument_id UUID REFERENCES public.instruments(id) ON DELETE SET NULL,
  level_id UUID REFERENCES public.levels(id) ON DELETE SET NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
  is_general BOOLEAN NOT NULL DEFAULT false,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.materials TO authenticated;
GRANT ALL ON public.materials TO service_role;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER materials_updated_at BEFORE UPDATE ON public.materials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- STUDENT ASSIGNMENTS
CREATE TABLE public.student_assignments (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instrument_id UUID REFERENCES public.instruments(id) ON DELETE CASCADE,
  level_id UUID REFERENCES public.levels(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES public.teachers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_assignments TO authenticated;
GRANT ALL ON public.student_assignments TO service_role;
ALTER TABLE public.student_assignments ENABLE ROW LEVEL SECURITY;

-- Function: does material match a student's assignments?
CREATE OR REPLACE FUNCTION public.student_can_view_material(_user_id UUID, _material_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.materials m
    JOIN public.student_assignments sa ON sa.student_id = _user_id
    WHERE m.id = _material_id
      AND (m.instrument_id IS NULL OR sa.instrument_id = m.instrument_id)
      AND (m.level_id IS NULL OR sa.level_id = m.level_id)
      AND (m.teacher_id IS NULL OR sa.teacher_id = m.teacher_id)
  )
$$;

-- ============ RLS POLICIES ============

-- profiles
CREATE POLICY "Users view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage profiles" ON public.profiles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- user_roles
CREATE POLICY "Users view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- catalogs: read all authenticated, write admin only
CREATE POLICY "Read instruments" ON public.instruments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage instruments" ON public.instruments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Read levels" ON public.levels FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage levels" ON public.levels FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Read subjects" ON public.subjects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage subjects" ON public.subjects FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Read teachers" ON public.teachers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage teachers" ON public.teachers FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- student_assignments
CREATE POLICY "Students view own assignments" ON public.student_assignments
  FOR SELECT TO authenticated USING (student_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage assignments" ON public.student_assignments
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- materials
CREATE POLICY "Admins manage all materials" ON public.materials
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Docentes manage own materials" ON public.materials
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'docente') AND owner_id = auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'docente') AND owner_id = auth.uid());
CREATE POLICY "Docentes view all materials" ON public.materials
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'docente'));
CREATE POLICY "Students view permitted materials" ON public.materials
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'estudiante')
    AND (is_general = true OR public.student_can_view_material(auth.uid(), id))
  );

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.student_can_view_material(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.student_can_view_material(uuid, uuid) TO authenticated, service_role;

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
UPDATE auth.users
SET
  confirmation_token = COALESCE(confirmation_token, ''),
  recovery_token = COALESCE(recovery_token, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  email_change = COALESCE(email_change, ''),
  phone_change = COALESCE(phone_change, ''),
  phone_change_token = COALESCE(phone_change_token, ''),
  reauthentication_token = COALESCE(reauthentication_token, '')
WHERE confirmation_token IS NULL
   OR recovery_token IS NULL
   OR email_change_token_new IS NULL
   OR email_change_token_current IS NULL
   OR email_change IS NULL
   OR phone_change IS NULL
   OR phone_change_token IS NULL
   OR reauthentication_token IS NULL;
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
