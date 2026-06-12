import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "docente" | "estudiante";

export interface CurrentUser {
  id: string;
  email: string;
  fullName: string;
  roles: AppRole[];
}

async function fetchCurrentUser(): Promise<CurrentUser | null> {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return null;

  const [{ data: profile }, { data: roleRows }] = await Promise.all([
    supabase.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", user.id),
  ]);

  return {
    id: user.id,
    email: profile?.email || user.email || "",
    fullName: profile?.full_name || "",
    roles: (roleRows ?? []).map((r) => r.role as AppRole),
  };
}

export function useAuth() {
  const query = useQuery({
    queryKey: ["current-user"],
    queryFn: fetchCurrentUser,
    staleTime: 1000 * 30,
  });

  const user = query.data ?? null;
  const roles = user?.roles ?? [];

  return {
    user,
    isLoading: query.isLoading,
    roles,
    isAdmin: roles.includes("admin"),
    isDocente: roles.includes("docente"),
    isEstudiante: roles.includes("estudiante"),
    isStaff: roles.includes("admin") || roles.includes("docente"),
  };
}