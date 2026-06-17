# Arreglar descargas bloqueadas (ERR_BLOCKED_BY_CLIENT)

## Causa
El error lo provoca una extensión del navegador (bloqueador de anuncios) que corta peticiones a `*.supabase.co`. Hoy la app abre directo la URL firmada de Supabase en una pestaña nueva (`window.open(...supabase.co...)`), y esa navegación es justamente lo que el bloqueador detecta y bloquea.

## Solución (combinada)
Servir el archivo desde el dominio propio de la app (proxy) **y** descargarlo como blob, de modo que el navegador nunca navegue a `supabase.co`.

```text
Antes:  navegador ── abre ──▶ gzhsyjulctpihfgdwzbe.supabase.co   ❌ bloqueado
Ahora:  navegador ── fetch ─▶ /api/attachment/{id}  ──▶ Supabase Storage (server)
                                   (mismo dominio)         (lado servidor)
        descarga como blob ──▶ guarda el archivo          ✅ sin bloqueo
```

## Cambios

### 1. Ruta servidor de proxy (dominio propio)
Crear `src/routes/api/attachment.$id.tsx` con un handler `GET`:
- Lee el token `Authorization: Bearer` del request.
- Valida el usuario y verifica con RLS que pueda ver ese adjunto (consulta `material_attachments` como ese usuario).
- Si tiene acceso, descarga el archivo desde Storage del lado servidor y lo devuelve como `Response` con:
  - `Content-Type` correcto (ej. `application/pdf`).
  - `Content-Disposition: attachment; filename="..."` para forzar la descarga.
- Si no hay acceso o el archivo no existe, devuelve 401/404.

Como la respuesta sale de `fusas-music-library.lovable.app` (mismo origen), el bloqueador ya no la corta.

### 2. Descarga por blob en el cliente
En `src/routes/_authenticated/material.$id.tsx`, reemplazar el `window.open(signedUrl)` por:
- `fetch("/api/attachment/{id}", { headers: { Authorization: Bearer <token de sesión> } })`.
- Convertir la respuesta a `blob`, crear un `URL.createObjectURL`, disparar un `<a download>` temporal y liberar el objeto.
- Mantener el estado de "Abriendo…/Descargando…" y el manejo de errores con `toast`.

Para los adjuntos tipo `link` (YouTube/Vimeo/enlaces externos) no cambia nada: siguen incrustándose o abriéndose como ahora.

### 3. Limpieza opcional
La función `getAttachmentSignedUrl` puede quedar como respaldo o eliminarse si ya no se usa. Propongo dejarla por ahora para no romper otros usos.

## Notas técnicas
- La ruta usa el cliente con service role solo del lado servidor (carga dinámica dentro del handler) y **solo después** de verificar el acceso del usuario con su token vía RLS, así no se expone contenido a quien no corresponde.
- Se respeta el patrón de TanStack: la lógica privilegiada vive en el handler de la ruta, no en el cliente.
- Resultado: las descargas funcionan aunque el usuario tenga un bloqueador activo, porque todo ocurre en el dominio de la app.
