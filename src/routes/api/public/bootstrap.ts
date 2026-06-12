import { createFileRoute } from "@tanstack/react-router";

// One-time bootstrap endpoint: seeds the FUSAS administrator accounts.
// It self-disables permanently once at least two admins exist.
const ADMINS = [
  { email: "fusas8@gmail.com", password: "Fusas2026", fullName: "Administrador FUSAS" },
  { email: "fusasescuela@gmail.com", password: "Fusas2026", fullName: "Paola" },
];

export const Route = createFileRoute("/api/public/bootstrap")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { count, error: cErr } = await supabaseAdmin
          .from("user_roles")
          .select("id", { count: "exact", head: true })
          .eq("role", "admin");
        if (cErr) return Response.json({ error: cErr.message }, { status: 500 });
        if ((count ?? 0) >= ADMINS.length) {
          return Response.json({ error: "Los administradores ya existen." }, { status: 409 });
        }

        const results: { email: string; ok: boolean; error?: string }[] = [];
        for (const a of ADMINS) {
          const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
            email: a.email,
            password: a.password,
            email_confirm: true,
            user_metadata: { full_name: a.fullName },
          });
          if (error || !created.user) {
            results.push({ email: a.email, ok: false, error: error?.message });
            continue;
          }
          const uid = created.user.id;
          await supabaseAdmin.from("profiles").upsert({ id: uid, full_name: a.fullName, email: a.email });
          await supabaseAdmin.from("user_roles").upsert(
            { user_id: uid, role: "admin" },
            { onConflict: "user_id,role" },
          );
          results.push({ email: a.email, ok: true });
        }
        return Response.json({ ok: true, results });
      },
    },
  },
});
