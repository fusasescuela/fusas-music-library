import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Returns a short-lived signed URL for an attachment's stored file,
// but only if the requesting user is allowed to see that attachment (RLS).
export const getAttachmentSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ attachmentId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    // RLS scopes this to attachments of materials the user may view.
    const { data: attachment, error } = await context.supabase
      .from("material_attachments")
      .select("id, file_path")
      .eq("id", data.attachmentId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!attachment || !attachment.file_path) throw new Error("Archivo no disponible");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error: sErr } = await supabaseAdmin.storage
      .from("materials")
      .createSignedUrl(attachment.file_path, 60 * 10);
    if (sErr || !signed) throw new Error(sErr?.message || "No se pudo generar el enlace");

    return { url: signed.signedUrl };
  });