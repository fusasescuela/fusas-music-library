import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/api/attachment/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.replace(/^Bearer\s+/i, "").trim();
        if (!token) {
          return new Response("Unauthorized", { status: 401 });
        }

        const SUPABASE_URL = process.env.SUPABASE_URL!;
        const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY!;

        // Client acting as the requesting user — RLS applies.
        const userClient = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
        });

        const { data: userData, error: userErr } = await userClient.auth.getUser(token);
        if (userErr || !userData.user) {
          return new Response("Unauthorized", { status: 401 });
        }

        // RLS scopes this read to attachments the user may view.
        const { data: attachment, error } = await userClient
          .from("material_attachments")
          .select("id, file_path, file_name, file_mime")
          .eq("id", params.id)
          .maybeSingle();

        if (error || !attachment || !attachment.file_path) {
          return new Response("No encontrado", { status: 404 });
        }

        // Download the file server-side with the admin client.
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: file, error: dlErr } = await supabaseAdmin.storage
          .from("materials")
          .download(attachment.file_path);

        if (dlErr || !file) {
          return new Response("No se pudo descargar el archivo", { status: 404 });
        }

        const fileName = attachment.file_name || "archivo";
        const contentType = attachment.file_mime || file.type || "application/octet-stream";

        return new Response(file.stream(), {
          status: 200,
          headers: {
            "Content-Type": contentType,
            "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
            "Cache-Control": "private, no-store",
          },
        });
      },
    },
  },
});