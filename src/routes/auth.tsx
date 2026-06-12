import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Music } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Iniciar sesión — Biblioteca FUSAS" },
      { name: "description", content: "Accede a la Biblioteca FUSAS con tu cuenta de estudiante o docente." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/biblioteca", replace: true });
    });
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) {
      toast.error("No se pudo iniciar sesión. Verifica tus datos.");
      return;
    }
    toast.success("¡Bienvenido!");
    navigate({ to: "/biblioteca", replace: true });
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div
        className="relative hidden flex-col justify-between p-12 text-white lg:flex"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
            <Music className="h-6 w-6" />
          </span>
          <span className="font-display text-xl font-bold">Biblioteca FUSAS</span>
        </div>
        <div>
          <h1 className="font-display text-4xl font-extrabold leading-tight">
            Toda la música de tu escuela, en un solo lugar.
          </h1>
          <p className="mt-4 max-w-md text-white/80">
            Partituras, audios, videos y recursos organizados por instrumento, nivel y profesor.
          </p>
        </div>
        <p className="text-sm text-white/60">FUSAS Escuela de Música</p>
      </div>

      <div className="flex items-center justify-center p-6">
        <form onSubmit={onSubmit} className="w-full max-w-sm space-y-6">
          <div className="lg:hidden">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <Music className="h-6 w-6" />
            </span>
          </div>
          <div>
            <h2 className="font-display text-2xl font-bold">Iniciar sesión</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Usa la cuenta que te entregó la escuela.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Ingresando…" : "Entrar"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            ¿No tienes cuenta? Solicítala a la administración de la escuela.
          </p>
        </form>
      </div>
    </div>
  );
}