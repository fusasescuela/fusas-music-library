import { type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, LibraryBig, Upload, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import fusasLogo from "@/assets/fusas-logo.png.asset.json";

function roleLabel(roles: string[]) {
  if (roles.includes("admin")) return "Administrador";
  if (roles.includes("docente")) return "Docente";
  if (roles.includes("estudiante")) return "Estudiante";
  return "Usuario";
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, roles, isAdmin, isStaff } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <Link to="/biblioteca" className="flex items-center gap-2">
            <img src={fusasLogo.url} alt="FUSAS" className="h-7 w-auto" />
            <span className="font-display text-lg font-bold leading-none">
              Biblioteca
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            <Link to="/biblioteca">
              {({ isActive }) => (
                <Button variant={isActive ? "secondary" : "ghost"} size="sm" className="gap-2">
                  <LibraryBig className="h-4 w-4" /> <span className="hidden sm:inline">Biblioteca</span>
                </Button>
              )}
            </Link>
            {isStaff && (
              <Link to="/subir">
                {({ isActive }) => (
                  <Button variant={isActive ? "secondary" : "ghost"} size="sm" className="gap-2">
                    <Upload className="h-4 w-4" /> <span className="hidden sm:inline">Subir</span>
                  </Button>
                )}
              </Link>
            )}
            {isAdmin && (
              <Link to="/admin">
                {({ isActive }) => (
                  <Button variant={isActive ? "secondary" : "ghost"} size="sm" className="gap-2">
                    <Settings className="h-4 w-4" /> <span className="hidden sm:inline">Admin</span>
                  </Button>
                )}
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold leading-none">{user?.fullName || "—"}</p>
              <p className="text-xs text-muted-foreground">{roleLabel(roles)}</p>
            </div>
            <Button variant="outline" size="icon" onClick={signOut} title="Cerrar sesión">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}