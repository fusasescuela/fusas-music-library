import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Returns a short-lived signed URL for a material's stored file,
// but only if the requesting user is allowed to see that material (RLS).
export const getMaterialSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ materialId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    // RLS scopes this to materials the user may view.
    const { data: material, error } = await context.supabase
      .from("materials")
      .select("id, file_path")
      .eq("id", data.materialId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!material || !material.file_path) throw new Error("Archivo no disponible");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error: sErr } = await supabaseAdmin.storage
      .from("materials")
      .createSignedUrl(material.file_path, 60 * 10);
    if (sErr || !signed) throw new Error(sErr?.message || "No se pudo generar el enlace");

    return { url: signed.signedUrl };
  });