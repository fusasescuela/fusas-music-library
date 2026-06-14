## Objetivo

Hoy cada material (tarjeta) admite **un solo** tipo de contenido: archivo, enlace/video o nota. El objetivo es que en una misma tarjeta se puedan subir y visualizar **varios elementos a la vez** (por ejemplo: un PDF + una nota + un video), sin que sean excluyentes.

## Enfoque

Convertir el material en un "contenedor" (título, descripción, clasificación, visibilidad) y mover el contenido a una tabla nueva de **adjuntos**, donde cada material puede tener varios. Así se pueden combinar libremente archivos, enlaces/videos y notas, e incluso varios del mismo tipo.

## 1. Base de datos

Nueva tabla `material_attachments`:

```text
id            uuid (PK)
material_id   uuid  -> materials.id (on delete cascade)
kind          'file' | 'link' | 'text'
file_path     text   (solo file)
file_mime     text   (solo file)
file_name     text   (solo file)
external_url  text   (solo link/video)
body_text     text   (solo text)
position      int    (orden dentro de la tarjeta)
created_at / updated_at
```

- GRANTs estándar + RLS:
  - **Ver**: si el usuario puede ver el material padre (misma lógica: docentes/admin ven todo; estudiantes ven generales o asignados).
  - **Gestionar**: admin, o docente dueño del material padre.
- Migración de datos: por cada material existente, crear un adjunto a partir de su `type`/`file_path`/`external_url`/`body_text` actuales, para no perder nada.
- Se conservan las columnas actuales de `materials` (no se borran) para evitar romper nada; el contenido pasa a leerse desde los adjuntos.

## 2. Formulario de subida (`subir.tsx`)

- Reemplazar las pestañas excluyentes por **secciones acumulables**:
  - Archivos: poder adjuntar uno o varios archivos.
  - Enlaces / videos: agregar uno o varios enlaces (YouTube, Vimeo, etc.).
  - Notas: agregar uno o varios bloques de texto.
- Cada elemento agregado se puede quitar antes de guardar.
- Al guardar: subir los archivos nuevos al storage e insertar/actualizar las filas en `material_attachments`. La clasificación (instrumento, nivel, materia, profesor, general) sigue igual a nivel material.
- En edición: cargar los adjuntos existentes y permitir agregar/quitar.

## 3. Vista de detalle (`material.$id.tsx`)

- Renderizar **todos** los adjuntos del material, cada uno en su propio bloque dentro de la Card:
  - file → nombre + botón "Abrir" (URL firmada).
  - link/video → reproductor embebido (YouTube/Vimeo, lógica `getEmbedUrl` ya existente) + botón de enlace externo.
  - text → nota con formato.

## 4. Tarjeta de biblioteca (`biblioteca.tsx`)

- En cada `MaterialCard`, mostrar pequeños íconos indicando qué tipos de contenido incluye (p. ej. 📄 + 🔗 + 📝).
- Mantener el filtro por tipo, ahora basado en "el material contiene algún adjunto de ese tipo".

## 5. Función de URL firmada (`materials.functions.ts`)

- Cambiar `getMaterialSignedUrl` para recibir un `attachmentId` (o material + path) y validar el acceso vía RLS del material padre antes de firmar la URL del archivo correspondiente.

## Detalles técnicos

- Subida múltiple de archivos al bucket privado `materials` (ya existe), con rutas `userId/timestamp-nombre`.
- Validación con zod por cada adjunto (enlace válido, nota no vacía, archivo presente).
- Invalidar queries `["materials"]` y `["material", id]` tras guardar.
- El tipo `MATERIAL_TYPE_LABELS` se reutiliza para etiquetar cada adjunto.
