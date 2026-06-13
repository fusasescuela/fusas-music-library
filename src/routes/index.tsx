import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Index,
});

import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import fusasLogo from "@/assets/fusas-logo.png.asset.json";

function Index() {
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      navigate({ to: data.session ? "/biblioteca" : "/auth", replace: true });
    });
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <img src={fusasLogo.url} alt="FUSAS" className="h-10 w-auto animate-pulse" />
        <p className="text-sm">Cargando Biblioteca FUSAS…</p>
      </div>
    </div>
  );
}
