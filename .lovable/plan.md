## Biblioteca FUSAS — Escuela de Música

App web para gestionar y compartir materiales de estudio, con login por roles y control de acceso seguro mediante Lovable Cloud (Supabase).

### Roles y permisos
- **Admin**: gestiona todo (CRUD de instrumentos, niveles, materias, profesores, materiales) y crea/edita cuentas de usuario asignándoles rol, instrumentos, niveles y profesores.
- **Docente**: sube, edita y elimina sus propios materiales; ve sus asignaciones.
- **Estudiante**: solo ve los materiales que le corresponden (según sus instrumentos/niveles/profesores asignados) más una sección de **contenido general** visible para todos.

Las cuentas las crea únicamente el admin (no hay auto-registro).

### Tipos de material
Cada material puede ser **archivo** (PDF, partitura, audio, video — subido a almacenamiento), **enlace externo** (YouTube, Drive, etc.) o **texto/nota**. Se clasifica por instrumento, nivel, materia, profesor y tipo de contenido. Un material puede marcarse como "general" (visible para todos).

### Estilo visual
Dirección **Vibrante creativo**: fondo oscuro morado (#1e1b2e), acento violeta (#8b5cf6) y coral (#fb7185), superficies claras (#fef3f2). Moderno, limpio y fácil de navegar, pensado para una escuela de música. Tipografía display distintiva + cuerpo legible.

---

### Modelo de datos (Supabase)

```text
profiles        (id→auth.users, full_name, email, created_at)
user_roles      (user_id, role)  -- enum: admin, docente, estudiante
instruments     (id, name)
levels          (id, name, sort_order)
subjects        (id, name)        -- materias
teachers        (id, profile_id?, name, instrument_id?)  -- profesores
materials       (id, title, description, type[file|link|text],
                 file_path?, file_mime?, external_url?, body_text?,
                 instrument_id?, level_id?, subject_id?, teacher_id?,
                 is_general bool, owner_id→auth.users, created_at)
student_assignments (id, student_id→auth.users, instrument_id, level_id, teacher_id)
```

`student_assignments` permite **varios** instrumentos/niveles/profesores por estudiante. Bucket de storage privado `materials` para archivos.

### Seguridad (RLS)
- `user_roles` con función `has_role()` (security definer) para evitar recursión; roles NUNCA en profiles.
- `materials` SELECT:
  - admin/docente: todo (docente edita solo `owner_id = auth.uid()`).
  - estudiante: `is_general = true` **OR** el material coincide con alguna fila de sus `student_assignments` (instrumento/nivel/profesor) — vía función security definer.
- Catálogos (instruments/levels/subjects/teachers): lectura autenticada; escritura solo admin.
- Storage `materials`: acceso a archivos validado por permiso sobre el material asociado.

### Pantallas
1. **Login** (`/auth`) — email/contraseña.
2. **Biblioteca** (home) — grid de materiales con filtros por instrumento, nivel, materia, profesor, tipo; sección "Contenido general" destacada. Cada uno respeta los permisos del usuario.
3. **Detalle de material** — visor/descarga de archivo, embed de enlace, o texto.
4. **Subir/editar material** (docente y admin) — formulario con tipo, archivo/enlace/texto y clasificación.
5. **Panel admin** — gestión de catálogos (instrumentos, niveles, materias, profesores), usuarios (crear cuenta, asignar rol y asignaciones de estudiante), y todos los materiales.

### Implementación técnica
- TanStack Start + Lovable Cloud. Rutas protegidas bajo `_authenticated/`; `/auth` pública.
- Server functions con `requireSupabaseAuth` para lecturas/escrituras; admin (crear usuarios) vía server function privilegiada que verifica `has_role(admin)`.
- Creación de cuentas por admin usando Auth Admin API (service role) en server function protegida.
- Subida de archivos al bucket privado con URLs firmadas para visualización/descarga.
- Datos semilla mínimos (algunos instrumentos/niveles) vía migración.

### Orden de construcción
1. Habilitar Lovable Cloud + esquema (tablas, enum, `has_role`, RLS, grants, bucket).
2. Auth + layout protegido + roles en contexto.
3. Biblioteca con filtros y permisos por rol.
4. Subida/edición de materiales (archivo/enlace/texto).
5. Panel admin (catálogos + usuarios + asignaciones).
6. Pulido visual con la paleta vibrante.
