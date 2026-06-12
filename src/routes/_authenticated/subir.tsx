import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { Upload, FileText, LinkIcon, StickyNote } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/use-auth";
import { useCatalogs } from "@/lib/catalogs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/subir")({
  validateSearch: (s: Record<string, unknown>) => ({ id: typeof s.id === "string" ? s.id : undefined }),
  component: SubirPage,
});

const NONE = "none";
type MType = "file" | "link" | "text";

function SubirPage() {
  const { id } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isStaff } = useAuth();
  const { data: catalogs } = useCatalogs();

  const [type, setType] = useState<MType>("file");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [instrument, setInstrument] = useState(NONE);
  const [level, setLevel] = useState(NONE);
  const [subject, setSubject] = useState(NONE);
  const [teacher, setTeacher] = useState(NONE);
  const [isGeneral, setIsGeneral] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    supabase.from("materials").select("*").eq("id", id).maybeSingle().then(({ data }) => {
      if (!data) return;
      setType(data.type);
      setTitle(data.title);
      setDescription(data.description ?? "");
      setExternalUrl(data.external_url ?? "");
      setBodyText(data.body_text ?? "");
      setInstrument(data.instrument_id ?? NONE);
      setLevel(data.level_id ?? NONE);
      setSubject(data.subject_id ?? NONE);
      setTeacher(data.teacher_id ?? NONE);
      setIsGeneral(data.is_general);
    });
  }, [id]);

  if (!isStaff) {
    return <p className="text-muted-foreground">No tienes permiso para subir materiales.</p>;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const titleCheck = z.string().trim().min(1).max(200).safeParse(title);
    if (!titleCheck.success) {
      toast.error("El título es obligatorio.");
      return;
    }
    if (type === "link" && !z.string().url().safeParse(externalUrl).success) {
      toast.error("Ingresa un enlace válido.");
      return;
    }
    if (type === "text" && !bodyText.trim()) {
      toast.error("El contenido de la nota no puede estar vacío.");
      return;
    }
    if (type === "file" && !file && !id) {
      toast.error("Selecciona un archivo.");
      return;
    }

    setSaving(true);
    try {
      let file_path: string | undefined;
      let file_mime: string | undefined;
      let file_name: string | undefined;
      if (type === "file" && file) {
        const path = `${user.id}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
        const { error: upErr } = await supabase.storage.from("materials").upload(path, file);
        if (upErr) throw upErr;
        file_path = path;
        file_mime = file.type;
        file_name = file.name;
      }

      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        type,
        external_url: type === "link" ? externalUrl.trim() : null,
        body_text: type === "text" ? bodyText : null,
        instrument_id: instrument === NONE ? null : instrument,
        level_id: level === NONE ? null : level,
        subject_id: subject === NONE ? null : subject,
        teacher_id: teacher === NONE ? null : teacher,
        is_general: isGeneral,
      } as Partial<TablesInsert<"materials">> & Pick<TablesInsert<"materials">, "title" | "type">;
      if (file_path) {
        payload.file_path = file_path;
        payload.file_mime = file_mime;
        payload.file_name = file_name;
      }

      if (id) {
        const { error } = await supabase.from("materials").update(payload).eq("id", id);
        if (error) throw error;
        toast.success("Material actualizado.");
      } else {
        const { error } = await supabase
          .from("materials")
          .insert({ ...payload, owner_id: user.id } as TablesInsert<"materials">);
        if (error) throw error;
        toast.success("Material publicado.");
      }
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      navigate({ to: "/biblioteca" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar el material.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">{id ? "Editar material" : "Subir material"}</h1>
        <p className="mt-1 text-muted-foreground">Comparte recursos con tus estudiantes.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <Card className="space-y-5 p-6">
          <div className="space-y-2">
            <Label>Tipo de contenido</Label>
            <Tabs value={type} onValueChange={(v) => setType(v as MType)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="file" className="gap-1.5"><FileText className="h-4 w-4" /> Archivo</TabsTrigger>
                <TabsTrigger value="link" className="gap-1.5"><LinkIcon className="h-4 w-4" /> Enlace</TabsTrigger>
                <TabsTrigger value="text" className="gap-1.5"><StickyNote className="h-4 w-4" /> Nota</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej. Escala de Do mayor" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="desc">Descripción (opcional)</Label>
            <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>

          {type === "file" && (
            <div className="space-y-2">
              <Label htmlFor="file">Archivo {id && "(deja vacío para conservar el actual)"}</Label>
              <Input id="file" type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              <p className="text-xs text-muted-foreground">PDF, partituras, audio o video (máx. 20 MB).</p>
            </div>
          )}
          {type === "link" && (
            <div className="space-y-2">
              <Label htmlFor="url">Enlace externo</Label>
              <Input id="url" value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} placeholder="https://youtube.com/…" />
            </div>
          )}
          {type === "text" && (
            <div className="space-y-2">
              <Label htmlFor="body">Contenido</Label>
              <Textarea id="body" value={bodyText} onChange={(e) => setBodyText(e.target.value)} rows={6} />
            </div>
          )}
        </Card>

        <Card className="space-y-5 p-6">
          <h2 className="font-display text-lg font-semibold">Clasificación</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <CatSelect label="Instrumento" value={instrument} onChange={setInstrument} options={catalogs?.instruments ?? []} />
            <CatSelect label="Nivel" value={level} onChange={setLevel} options={catalogs?.levels ?? []} />
            <CatSelect label="Materia" value={subject} onChange={setSubject} options={catalogs?.subjects ?? []} />
            <CatSelect label="Profesor" value={teacher} onChange={setTeacher} options={catalogs?.teachers ?? []} />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <Label htmlFor="general">Contenido general</Label>
              <p className="text-xs text-muted-foreground">Visible para todos los estudiantes.</p>
            </div>
            <Switch id="general" checked={isGeneral} onCheckedChange={setIsGeneral} />
          </div>
        </Card>

        <Button type="submit" className="w-full gap-2" disabled={saving}>
          <Upload className="h-4 w-4" /> {saving ? "Guardando…" : id ? "Guardar cambios" : "Publicar material"}
        </Button>
      </form>
    </div>
  );
}

function CatSelect({
  label, value, onChange, options,
}: { label: string; value: string; onChange: (v: string) => void; options: { id: string; name: string }[] }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue placeholder="Sin especificar" /></SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>Sin especificar</SelectItem>
          {options.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}