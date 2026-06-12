import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Index,
});

import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Music } from "lucide-react";

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
        <span className="flex h-12 w-12 animate-pulse items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Music className="h-6 w-6" />
        </span>
        <p className="text-sm">Cargando Biblioteca FUSAS…</p>
      </div>
    </div>
  );
}
