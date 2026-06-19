import { createFileRoute, Link } from "@tanstack/react-router";
import { Mic, Activity, BookOpen } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { AddShortcutButton } from "@/components/AddShortcutButton";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FUSAS Escuela de Música — Afinador y Metrónomo" },
      { name: "description", content: "Afinador cromático y metrónomo profesional offline para estudiantes de música." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader />
      <main className="flex-1 flex flex-col items-center px-5 py-6 gap-8 max-w-md w-full mx-auto">
        {/* Welcome video */}
        <div className="w-full rounded-3xl overflow-hidden shadow-lg border border-border bg-primary relative">
          <video
            src="/fusas-logo.mp4"
            autoPlay
            muted
            loop
            playsInline
            className="w-full aspect-video object-cover -my-5"
          />
        </div>


        <div className="text-center max-w-sm">
          <h1 className="font-bold tracking-tight text-xl">Tus herramientas de estudio</h1>
        </div>

        <div className="w-full grid gap-4">
          <Link
            to="/tuner"
            className="group rounded-2xl border border-border bg-card hover:border-primary hover:shadow-lg transition p-5 flex items-center gap-5"
          >
            <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary grid place-items-center group-hover:bg-primary group-hover:text-primary-foreground transition">
              <Mic className="w-7 h-7" />
            </div>
            <div className="flex-1">
              <div className="text-lg font-semibold">Afinador</div>
              <div className="text-sm text-muted-foreground">Cromático, en vivo, con micrófono</div>
            </div>
          </Link>

          <Link
            to="/metronome"
            className="group rounded-2xl border border-border bg-card hover:border-accent hover:shadow-lg transition p-5 flex items-center gap-5"
          >
            <div className="w-14 h-14 rounded-2xl bg-accent/20 text-accent-foreground grid place-items-center group-hover:bg-accent transition">
              <Activity className="w-7 h-7" />
            </div>
            <div className="flex-1">
              <div className="text-lg font-semibold">Metrónomo</div>
              <div className="text-sm text-muted-foreground">20 – 300 BPM, compases y acento</div>
            </div>
          </Link>

          <Link
            to="/auth"
            className="group rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 hover:border-primary hover:shadow-lg transition p-5 flex items-center gap-5"
          >
            <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary grid place-items-center group-hover:bg-primary group-hover:text-primary-foreground transition">
              <BookOpen className="w-7 h-7" />
            </div>
            <div className="flex-1">
              <div className="text-lg font-semibold">Biblioteca de Materiales</div>
              <div className="text-sm text-muted-foreground">Accedé al material de estudio</div>
            </div>
          </Link>
        </div>

        <AddShortcutButton />


        <p className="text-sm text-muted-foreground text-center max-w-sm">
          Afiná tu instrumento y practicá con un metrónomo de precisión, todo desde tu teléfono.
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground pb-4">
          <span>Funciona 100% offline</span>
          <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
          <span>FUSAS 2026</span>
        </div>
      </main>
    </div>
  );
}
