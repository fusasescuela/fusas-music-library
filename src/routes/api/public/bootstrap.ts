import { createFileRoute } from "@tanstack/react-router";

// One-time bootstrap endpoint: creates the very first administrator account.
// It self-disables permanently once any admin exists.
export const Route = createFileRoute("/api/public/bootstrap")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { count, error: cErr } = await supabaseAdmin
          .from("user_roles")
          .select("id", { count: "exact", head: true })
          .eq("role", "admin");
        if (cErr) return Response.json({ error: cErr.message }, { status: 500 });
        if ((count ?? 0) > 0) {
          return Response.json({ error: "Ya existe un administrador." }, { status: 409 });
        }

        let body: { email?: string; password?: string; fullName?: string };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return Response.json({ error: "Cuerpo inválido" }, { status: 400 });
        }
        const email = (body.email ?? "").trim();
        const password = body.password ?? "";
        const fullName = (body.fullName ?? "Administrador").trim();
        if (!email || password.length < 6) {
          return Response.json({ error: "Email y contraseña (>=6) requeridos" }, { status: 400 });
        }

        const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
          email, password, email_confirm: true, user_metadata: { full_name: fullName },
        });
        if (error || !created.user) {
          return Response.json({ error: error?.message || "Error" }, { status: 500 });
        }
        const uid = created.user.id;
        await supabaseAdmin.from("profiles").upsert({ id: uid, full_name: fullName, email });
        await supabaseAdmin.from("user_roles").upsert(
          { user_id: uid, role: "admin" },
          { onConflict: "user_id,role" },
        );
        return Response.json({ ok: true, id: uid });
      },
    },
  },
});
