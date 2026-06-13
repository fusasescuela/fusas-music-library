import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, Download, ExternalLink, FileText, StickyNote, Sparkles, Pencil } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getMaterialSignedUrl } from "@/lib/materials.functions";
import { useCatalogs, MATERIAL_TYPE_LABELS } from "@/lib/catalogs";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/material/$id")({
  component: MaterialDetail,
  errorComponent: () => (
    <div className="text-center text-muted-foreground">No se pudo cargar este material.</div>
  ),
  notFoundComponent: () => <div className="text-center text-muted-foreground">Material no encontrado.</div>,
});

function MaterialDetail() {
  const { id } = Route.useParams();
  const router = useRouter();
  const { data: catalogs } = useCatalogs();
  const { isStaff } = useAuth();
  const getUrl = useServerFn(getMaterialSignedUrl);
  const [opening, setOpening] = useState(false);

  const { data: m, isLoading } = useQuery({
    queryKey: ["material", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("materials").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <p className="text-muted-foreground">Cargando…</p>;
  if (!m) return <p className="text-muted-foreground">Material no encontrado.</p>;

  const name = (table: "instruments" | "levels" | "subjects" | "teachers", val: string | null) => {
    if (!val) return null;
    const arr = catalogs?.[table] as { id: string; name: string }[] | undefined;
    return arr?.find((x) => x.id === val)?.name ?? null;
  };

  const tags = [
    name("instruments", m.instrument_id),
    name("levels", m.level_id),
    name("subjects", m.subject_id),
    name("teachers", m.teacher_id),
  ].filter(Boolean) as string[];

  const embedUrl = m.type === "link" ? getEmbedUrl(m.external_url) : null;

  async function openFile() {
    setOpening(true);
    try {
      const res = await getUrl({ data: { materialId: id } });
      window.open(res.url, "_blank", "noopener");
    } catch {
      toast.error("No se pudo abrir el archivo.");
    } finally {
      setOpening(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" className="gap-2" onClick={() => router.history.back()}>
          <ArrowLeft className="h-4 w-4" /> Volver
        </Button>
        {isStaff && (
          <Link to="/subir" search={{ id }}>
            <Button variant="outline" size="sm" className="gap-2">
              <Pencil className="h-4 w-4" /> Editar
            </Button>
          </Link>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline">{MATERIAL_TYPE_LABELS[m.type]}</Badge>
          {m.is_general && (
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="h-3 w-3" /> General
            </Badge>
          )}
        </div>
        <h1 className="font-display text-3xl font-extrabold">{m.title}</h1>
        {m.description && <p className="text-muted-foreground">{m.description}</p>}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <span key={t} className="rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground">{t}</span>
            ))}
          </div>
        )}
      </div>

      <Card className="p-6">
        {m.type === "file" && (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium">{m.file_name || "Archivo adjunto"}</p>
                <p className="text-sm text-muted-foreground">{m.file_mime || ""}</p>
              </div>
            </div>
            <Button onClick={openFile} disabled={opening} className="gap-2">
              <Download className="h-4 w-4" /> {opening ? "Abriendo…" : "Abrir"}
            </Button>
          </div>
        )}
        {m.type === "link" && m.external_url && (
          <a href={m.external_url} target="_blank" rel="noopener noreferrer">
            <Button className="gap-2">
              <ExternalLink className="h-4 w-4" /> Abrir enlace externo
            </Button>
          </a>
        )}
        {m.type === "text" && (
          <div className="prose prose-sm max-w-none">
            <div className="flex items-center gap-2 text-muted-foreground">
              <StickyNote className="h-4 w-4" /> Nota
            </div>
            <p className="mt-3 whitespace-pre-wrap text-foreground">{m.body_text}</p>
          </div>
        )}
      </Card>

      <Link to="/biblioteca" className="text-sm text-primary hover:underline">
        ← Volver a la biblioteca
      </Link>
    </div>
  );
}