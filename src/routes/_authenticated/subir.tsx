import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { Upload, FileText, LinkIcon, StickyNote, Plus, X } from "lucide-react";
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/subir")({
  validateSearch: (s: Record<string, unknown>) => ({ id: typeof s.id === "string" ? s.id : undefined }),
  component: SubirPage,
});

const NONE = "none";

type AttachmentKind = "file" | "link" | "text";
interface FileItem { id?: string; file_path: string; file_mime: string | null; file_name: string | null; }
interface LinkItem { url: string; }
interface NoteItem { text: string; }

function SubirPage() {
  const { id } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isStaff } = useAuth();
  const { data: catalogs } = useCatalogs();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [existingFiles, setExistingFiles] = useState<FileItem[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);
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
      setTitle(data.title);
      setDescription(data.description ?? "");
      setInstrument(data.instrument_id ?? NONE);
      setLevel(data.level_id ?? NONE);
      setSubject(data.subject_id ?? NONE);
      setTeacher(data.teacher_id ?? NONE);
      setIsGeneral(data.is_general);
    });
    supabase
      .from("material_attachments")
      .select("*")
      .eq("material_id", id)
      .order("position", { ascending: true })
      .then(({ data }) => {
        if (!data) return;
        setExistingFiles(
          data.filter((a) => a.kind === "file").map((a) => ({
            id: a.id, file_path: a.file_path!, file_mime: a.file_mime, file_name: a.file_name,
          })),
        );
        setLinks(data.filter((a) => a.kind === "link").map((a) => ({ url: a.external_url ?? "" })));
        setNotes(data.filter((a) => a.kind === "text").map((a) => ({ text: a.body_text ?? "" })));
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
    const cleanLinks = links.map((l) => l.url.trim()).filter(Boolean);
    const cleanNotes = notes.map((n) => n.text.trim()).filter(Boolean);
    for (const l of cleanLinks) {
      if (!z.string().url().safeParse(l).success) {
        toast.error(`Enlace no válido: ${l}`);
        return;
      }
    }
    const totalItems = existingFiles.length + newFiles.length + cleanLinks.length + cleanNotes.length;
    if (totalItems === 0) {
      toast.error("Agrega al menos un contenido (archivo, enlace o nota).");
      return;
    }

    setSaving(true);
    try {
      // Upload any new files first.
      const uploadedFiles: FileItem[] = [];
      for (const f of newFiles) {
        const path = `${user.id}/${Date.now()}-${f.name.replace(/[^\w.\-]/g, "_")}`;
        const { error: upErr } = await supabase.storage.from("materials").upload(path, f);
        if (upErr) throw upErr;
        uploadedFiles.push({ file_path: path, file_mime: f.type, file_name: f.name });
      }

      const allFiles = [...existingFiles, ...uploadedFiles];
      // Primary type kept on materials for legacy/badge purposes.
      const primaryType: AttachmentKind =
        allFiles.length > 0 ? "file" : cleanLinks.length > 0 ? "link" : "text";

      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        type: primaryType,
        instrument_id: instrument === NONE ? null : instrument,
        level_id: level === NONE ? null : level,
        subject_id: subject === NONE ? null : subject,
        teacher_id: teacher === NONE ? null : teacher,
        is_general: isGeneral,
      } as Partial<TablesInsert<"materials">> & Pick<TablesInsert<"materials">, "title" | "type">;

      let materialId = id;
      if (id) {
        const { error } = await supabase.from("materials").update(payload).eq("id", id);
        if (error) throw error;
        // Rebuild attachments from scratch.
        const { error: delErr } = await supabase.from("material_attachments").delete().eq("material_id", id);
        if (delErr) throw delErr;
      } else {
        const { data: inserted, error } = await supabase
          .from("materials")
          .insert({ ...payload, owner_id: user.id } as TablesInsert<"materials">)
          .select("id")
          .single();
        if (error) throw error;
        materialId = inserted.id;
      }

      const rows: TablesInsert<"material_attachments">[] = [];
      let pos = 0;
      for (const f of allFiles) {
        rows.push({ material_id: materialId!, kind: "file", file_path: f.file_path, file_mime: f.file_mime, file_name: f.file_name, position: pos++ });
      }
      for (const l of cleanLinks) {
        rows.push({ material_id: materialId!, kind: "link", external_url: l, position: pos++ });
      }
      for (const n of cleanNotes) {
        rows.push({ material_id: materialId!, kind: "text", body_text: n, position: pos++ });
      }
      if (rows.length > 0) {
        const { error: attErr } = await supabase.from("material_attachments").insert(rows);
        if (attErr) throw attErr;
      }

      toast.success(id ? "Material actualizado." : "Material publicado.");
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      queryClient.invalidateQueries({ queryKey: ["material-attachments", materialId] });
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
            <Label htmlFor="title">Título</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej. Escala de Do mayor" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="desc">Descripción (opcional)</Label>
            <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
        </Card>

        <Card className="space-y-6 p-6">
          <div>
            <h2 className="font-display text-lg font-semibold">Contenido</h2>
            <p className="text-xs text-muted-foreground">
              Agrega uno o varios elementos. Pueden combinarse archivos, enlaces/videos y notas.
            </p>
          </div>

          {/* Archivos */}
          <div className="space-y-3">
            <Label className="flex items-center gap-1.5"><FileText className="h-4 w-4" /> Archivos</Label>
            {existingFiles.map((f, i) => (
              <div key={f.id ?? i} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                <span className="truncate">{f.file_name || "Archivo"}</span>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0"
                  onClick={() => setExistingFiles((p) => p.filter((_, idx) => idx !== i))}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {newFiles.map((f, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 text-sm">
                <span className="truncate">{f.name}</span>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0"
                  onClick={() => setNewFiles((p) => p.filter((_, idx) => idx !== i))}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Input
              type="file"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setNewFiles((p) => [...p, f]);
                e.target.value = "";
              }}
            />
            <p className="text-xs text-muted-foreground">PDF, partituras, audio o imagen (máx. 20 MB c/u).</p>
          </div>

          {/* Enlaces / videos */}
          <div className="space-y-3">
            <Label className="flex items-center gap-1.5"><LinkIcon className="h-4 w-4" /> Enlaces / videos</Label>
            {links.map((l, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={l.url}
                  placeholder="https://youtube.com/…"
                  onChange={(e) => setLinks((p) => p.map((x, idx) => (idx === i ? { url: e.target.value } : x)))}
                />
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0"
                  onClick={() => setLinks((p) => p.filter((_, idx) => idx !== i))}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="gap-1.5"
              onClick={() => setLinks((p) => [...p, { url: "" }])}>
              <Plus className="h-4 w-4" /> Agregar enlace
            </Button>
          </div>

          {/* Notas */}
          <div className="space-y-3">
            <Label className="flex items-center gap-1.5"><StickyNote className="h-4 w-4" /> Notas</Label>
            {notes.map((n, i) => (
              <div key={i} className="flex items-start gap-2">
                <Textarea
                  value={n.text}
                  rows={4}
                  placeholder="Escribe una nota…"
                  onChange={(e) => setNotes((p) => p.map((x, idx) => (idx === i ? { text: e.target.value } : x)))}
                />
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0"
                  onClick={() => setNotes((p) => p.filter((_, idx) => idx !== i))}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="gap-1.5"
              onClick={() => setNotes((p) => [...p, { text: "" }])}>
              <Plus className="h-4 w-4" /> Agregar nota
            </Button>
          </div>
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