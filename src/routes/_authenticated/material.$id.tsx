import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, Download, ExternalLink, FileText, StickyNote, Sparkles, Pencil } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { getAttachmentSignedUrl } from "@/lib/materials.functions";
import { useCatalogs } from "@/lib/catalogs";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type Attachment = Tables<"material_attachments">;

function getEmbedUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = u.searchParams.get("v");
      if (id) return `https://www.youtube-nocookie.com/embed/${id}`;
    }
    if (host === "youtu.be") {
      const id = u.pathname.slice(1);
      if (id) return `https://www.youtube-nocookie.com/embed/${id}`;
    }
    if (host === "vimeo.com") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      if (id) return `https://player.vimeo.com/video/${id}`;
    }
  } catch {
    return null;
  }
  return null;
}

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
  const getUrl = useServerFn(getAttachmentSignedUrl);
  const [opening, setOpening] = useState<string | null>(null);

  const { data: m, isLoading } = useQuery({
    queryKey: ["material", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("materials").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: attachments } = useQuery({
    queryKey: ["material-attachments", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("material_attachments")
        .select("*")
        .eq("material_id", id)
        .order("position", { ascending: true });
      if (error) throw error;
      return data as Attachment[];
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

  async function openFile(attachmentId: string) {
    setOpening(attachmentId);
    try {
      const res = await getUrl({ data: { attachmentId } });
      window.open(res.url, "_blank", "noopener");
    } catch {
      toast.error("No se pudo abrir el archivo.");
    } finally {
      setOpening(null);
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

      <div className="space-y-4">
        {(attachments ?? []).length === 0 && (
          <Card className="p-6 text-muted-foreground">Este material no tiene contenido todavía.</Card>
        )}
        {(attachments ?? []).map((a) => (
          <AttachmentBlock
            key={a.id}
            a={a}
            title={m.title}
            opening={opening === a.id}
            onOpen={() => openFile(a.id)}
          />
        ))}
      </div>

      <Link to="/biblioteca" className="text-sm text-primary hover:underline">
        ← Volver a la biblioteca
      </Link>
    </div>
  );
}

function AttachmentBlock({
  a, title, opening, onOpen,
}: { a: Attachment; title: string; opening: boolean; onOpen: () => void }) {
  if (a.kind === "file") {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            <div>
              <p className="font-medium">{a.file_name || "Archivo adjunto"}</p>
              <p className="text-sm text-muted-foreground">{a.file_mime || ""}</p>
            </div>
          </div>
          <Button onClick={onOpen} disabled={opening} className="gap-2">
            <Download className="h-4 w-4" /> {opening ? "Abriendo…" : "Abrir"}
          </Button>
        </div>
      </Card>
    );
  }
  if (a.kind === "link" && a.external_url) {
    const embedUrl = getEmbedUrl(a.external_url);
    return (
      <Card className="space-y-4 p-6">
        {embedUrl && (
          <div className="aspect-video w-full overflow-hidden rounded-lg bg-muted">
            <iframe
              src={embedUrl}
              title={title}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}
        <a href={a.external_url} target="_blank" rel="noopener noreferrer">
          <Button variant={embedUrl ? "outline" : "default"} className="gap-2">
            <ExternalLink className="h-4 w-4" /> Abrir enlace externo
          </Button>
        </a>
      </Card>
    );
  }
  if (a.kind === "text") {
    return (
      <Card className="p-6">
        <div className="prose prose-sm max-w-none">
          <div className="flex items-center gap-2 text-muted-foreground">
            <StickyNote className="h-4 w-4" /> Nota
          </div>
          <p className="mt-3 whitespace-pre-wrap text-foreground">{a.body_text}</p>
        </div>
      </Card>
    );
  }
  return null;
}