import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, LinkIcon, StickyNote, Sparkles, Search, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCatalogs, MATERIAL_TYPE_LABELS } from "@/lib/catalogs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/biblioteca")({
  component: BibliotecaPage,
});

interface MaterialRow {
  id: string;
  title: string;
  description: string | null;
  type: "file" | "link" | "text";
  is_general: boolean;
  instrument_id: string | null;
  level_id: string | null;
  subject_id: string | null;
  teacher_id: string | null;
  created_at: string;
}

const ALL = "all";

function typeIcon(type: string) {
  if (type === "file") return <FileText className="h-4 w-4" />;
  if (type === "link") return <LinkIcon className="h-4 w-4" />;
  return <StickyNote className="h-4 w-4" />;
}

function MaterialCard({ m, lookup }: { m: MaterialRow; lookup: (k: keyof MaterialRow, id: string | null) => string | null }) {
  const tags = [
    lookup("instrument_id", m.instrument_id),
    lookup("level_id", m.level_id),
    lookup("subject_id", m.subject_id),
    lookup("teacher_id", m.teacher_id),
  ].filter(Boolean) as string[];

  return (
    <Link to="/material/$id" params={{ id: m.id }}>
      <Card className="group h-full p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-medium text-primary">
            {typeIcon(m.type)} {MATERIAL_TYPE_LABELS[m.type]}
          </span>
          {m.is_general && (
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="h-3 w-3" /> General
            </Badge>
          )}
        </div>
        <h3 className="mt-3 font-display text-lg font-semibold leading-snug group-hover:text-primary">
          {m.title}
        </h3>
        {m.description && (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{m.description}</p>
        )}
        {tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <span key={t} className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                {t}
              </span>
            ))}
          </div>
        )}
      </Card>
    </Link>
  );
}

function BibliotecaPage() {
  const { data: catalogs } = useCatalogs();
  const [search, setSearch] = useState("");
  const [instrument, setInstrument] = useState(ALL);
  const [level, setLevel] = useState(ALL);
  const [subject, setSubject] = useState(ALL);
  const [type, setType] = useState(ALL);

  const { data: materials, isLoading } = useQuery({
    queryKey: ["materials"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("materials")
        .select("id, title, description, type, is_general, instrument_id, level_id, subject_id, teacher_id, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as MaterialRow[];
    },
  });

  const lookup = useMemo(() => {
    const maps = {
      instrument_id: new Map(catalogs?.instruments.map((i) => [i.id, i.name])),
      level_id: new Map(catalogs?.levels.map((i) => [i.id, i.name])),
      subject_id: new Map(catalogs?.subjects.map((i) => [i.id, i.name])),
      teacher_id: new Map(catalogs?.teachers.map((i) => [i.id, i.name])),
    };
    return (k: keyof MaterialRow, id: string | null) => (id ? maps[k as keyof typeof maps]?.get(id) ?? null : null);
  }, [catalogs]);

  const filtered = (materials ?? []).filter((m) => {
    if (instrument !== ALL && m.instrument_id !== instrument) return false;
    if (level !== ALL && m.level_id !== level) return false;
    if (subject !== ALL && m.subject_id !== subject) return false;
    if (type !== ALL && m.type !== type) return false;
    if (search && !`${m.title} ${m.description ?? ""}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const general = filtered.filter((m) => m.is_general);
  const specific = filtered.filter((m) => !m.is_general);

  return (
    <div className="space-y-8">
      <div className="overflow-hidden rounded-3xl p-8 text-white" style={{ background: "var(--gradient-hero)" }}>
        <h1 className="font-display text-3xl font-extrabold">Biblioteca de materiales</h1>
        <p className="mt-2 max-w-lg text-white/80">
          Explora partituras, audios, videos y recursos de estudio.
        </p>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar materiales…"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" /> Filtros:
          </span>
          <FilterSelect value={instrument} onChange={setInstrument} placeholder="Instrumento" options={catalogs?.instruments ?? []} />
          <FilterSelect value={level} onChange={setLevel} placeholder="Nivel" options={catalogs?.levels ?? []} />
          <FilterSelect value={subject} onChange={setSubject} placeholder="Materia" options={catalogs?.subjects ?? []} />
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todo tipo</SelectItem>
              <SelectItem value="file">Archivo</SelectItem>
              <SelectItem value="link">Enlace</SelectItem>
              <SelectItem value="text">Nota</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Cargando materiales…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
          No hay materiales que coincidan con tu búsqueda.
        </div>
      ) : (
        <div className="space-y-8">
          {general.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-bold">
                <Sparkles className="h-5 w-5 text-accent" /> Contenido general
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {general.map((m) => <MaterialCard key={m.id} m={m} lookup={lookup} />)}
              </div>
            </section>
          )}
          {specific.length > 0 && (
            <section>
              <h2 className="mb-3 font-display text-xl font-bold">Tus materiales</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {specific.map((m) => <MaterialCard key={m.id} m={m} lookup={lookup} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { id: string; name: string }[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[150px]"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>Todos</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}