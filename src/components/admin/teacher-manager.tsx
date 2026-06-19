import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCatalogs } from "@/lib/catalogs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";

interface TeacherRow {
  id: string;
  name: string;
  teacher_instruments: { instrument_id: string }[];
  teacher_subjects: { subject_id: string }[];
}

interface CatalogItem {
  id: string;
  name: string;
}

function MultiSelect({
  label, items, selected, onToggle,
}: {
  label: string;
  items: CatalogItem[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  const summary = selected.length === 0 ? label : `${label} (${selected.length})`;
  const allSelected = items.length > 0 && selected.length === items.length;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="justify-start sm:w-56">{summary}</Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 max-h-72 overflow-y-auto">
        {items.length === 0 && <p className="text-sm text-muted-foreground">Sin opciones</p>}
        <div className="space-y-2">
          {items.length > 0 && (
            <>
              <Label className="flex items-center gap-2 font-medium">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={() => onToggle("__all__")}
                />
                Todos
              </Label>
              <div className="my-1 border-t border-border" />
            </>
          )}
          {items.map((it) => (
            <Label key={it.id} className="flex items-center gap-2 font-normal">
              <Checkbox checked={selected.includes(it.id)} onCheckedChange={() => onToggle(it.id)} />
              {it.name}
            </Label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function TeacherManager() {
  const queryClient = useQueryClient();
  const { data: catalogs } = useCatalogs();
  const [name, setName] = useState("");
  const [instruments, setInstruments] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const { data: teachers } = useQuery({
    queryKey: ["catalog", "teachers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teachers")
        .select("id, name, teacher_instruments(instrument_id), teacher_subjects(subject_id)")
        .order("name");
      if (error) throw error;
      return data as unknown as TeacherRow[];
    },
  });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["catalog", "teachers"] });
    queryClient.invalidateQueries({ queryKey: ["catalogs"] });
  }

  function toggle(list: string[], set: (v: string[]) => void, id: string) {
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  }

  function toggleWithAll(
    list: string[], set: (v: string[]) => void, id: string, allItems: CatalogItem[],
  ) {
    if (id === "__all__") {
      set(list.length === allItems.length ? [] : allItems.map((i) => i.id));
      return;
    }
    toggle(list, set, id);
  }

  async function add() {
    if (!name.trim()) return;
    const { data: created, error } = await supabase
      .from("teachers")
      .insert({ name: name.trim() })
      .select("id")
      .single();
    if (error || !created) return toast.error(error?.message ?? "Error al crear profesor");
    await saveLinks(created.id, instruments, subjects);
    setName(""); setInstruments([]); setSubjects([]); refresh();
  }

  async function saveLinks(teacherId: string, instrIds: string[], subjIds: string[]) {
    if (instrIds.length) {
      await supabase.from("teacher_instruments").insert(
        instrIds.map((instrument_id) => ({ teacher_id: teacherId, instrument_id })),
      );
    }
    if (subjIds.length) {
      await supabase.from("teacher_subjects").insert(
        subjIds.map((subject_id) => ({ teacher_id: teacherId, subject_id })),
      );
    }
  }

  async function toggleInstrument(teacherId: string, instrumentId: string, on: boolean) {
    const { error } = on
      ? await supabase.from("teacher_instruments").insert({ teacher_id: teacherId, instrument_id: instrumentId })
      : await supabase.from("teacher_instruments").delete().eq("teacher_id", teacherId).eq("instrument_id", instrumentId);
    if (error) return toast.error(error.message);
    refresh();
  }

  async function setAllInstruments(teacherId: string, current: string[], on: boolean) {
    const all = catalogs?.instruments ?? [];
    if (on) {
      const missing = all.filter((i) => !current.includes(i.id));
      if (missing.length) {
        const { error } = await supabase.from("teacher_instruments").insert(
          missing.map((i) => ({ teacher_id: teacherId, instrument_id: i.id })),
        );
        if (error) return toast.error(error.message);
      }
    } else {
      const { error } = await supabase.from("teacher_instruments").delete().eq("teacher_id", teacherId);
      if (error) return toast.error(error.message);
    }
    refresh();
  }

  async function toggleSubject(teacherId: string, subjectId: string, on: boolean) {
    const { error } = on
      ? await supabase.from("teacher_subjects").insert({ teacher_id: teacherId, subject_id: subjectId })
      : await supabase.from("teacher_subjects").delete().eq("teacher_id", teacherId).eq("subject_id", subjectId);
    if (error) return toast.error(error.message);
    refresh();
  }

  async function setAllSubjects(teacherId: string, current: string[], on: boolean) {
    const all = catalogs?.subjects ?? [];
    if (on) {
      const missing = all.filter((s) => !current.includes(s.id));
      if (missing.length) {
        const { error } = await supabase.from("teacher_subjects").insert(
          missing.map((s) => ({ teacher_id: teacherId, subject_id: s.id })),
        );
        if (error) return toast.error(error.message);
      }
    } else {
      const { error } = await supabase.from("teacher_subjects").delete().eq("teacher_id", teacherId);
      if (error) return toast.error(error.message);
    }
    refresh();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("teachers").delete().eq("id", id);
    if (error) return toast.error(error.message);
    refresh();
  }

  async function saveName(id: string) {
    if (!editName.trim()) return;
    const { error } = await supabase.from("teachers").update({ name: editName.trim() }).eq("id", id);
    if (error) return toast.error(error.message);
    setEditingId(null);
    refresh();
  }

  const instrName = (id: string) => catalogs?.instruments.find((i) => i.id === id)?.name ?? id;
  const subjName = (id: string) => catalogs?.subjects.find((s) => s.id === id)?.name ?? id;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del profesor" className="sm:w-56" />
        <MultiSelect label="Instrumentos" items={catalogs?.instruments ?? []} selected={instruments} onToggle={(id) => toggleWithAll(instruments, setInstruments, id, catalogs?.instruments ?? [])} />
        <MultiSelect label="Materias" items={catalogs?.subjects ?? []} selected={subjects} onToggle={(id) => toggleWithAll(subjects, setSubjects, id, catalogs?.subjects ?? [])} />
        <Button onClick={add} className="gap-2"><Plus className="h-4 w-4" /> Agregar</Button>
      </div>
      <Card className="divide-y divide-border">
        {(teachers ?? []).length === 0 && <p className="p-4 text-sm text-muted-foreground">Aún no hay profesores.</p>}
        {(teachers ?? []).map((t) => {
          const tInstr = t.teacher_instruments.map((x) => x.instrument_id);
          const tSubj = t.teacher_subjects.map((x) => x.subject_id);
          return (
            <div key={t.id} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                {editingId === t.id ? (
                  <div className="flex items-center gap-1">
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8 sm:w-56"
                      onKeyDown={(e) => e.key === "Enter" && saveName(t.id)} />
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => saveName(t.id)}><Check className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingId(null)}><X className="h-4 w-4" /></Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-medium">{t.name}</p>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditingId(t.id); setEditName(t.name); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
                <div className="flex flex-wrap gap-1">
                  {tInstr.length === 0 && <span className="text-xs text-muted-foreground">Sin instrumentos</span>}
                  {tInstr.map((id) => <Badge key={id} variant="secondary">{instrName(id)}</Badge>)}
                </div>
                <div className="flex flex-wrap gap-1">
                  {tSubj.length === 0 && <span className="text-xs text-muted-foreground">Sin materias</span>}
                  {tSubj.map((id) => <Badge key={id} variant="outline">{subjName(id)}</Badge>)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">Instrumentos</Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 max-h-72 overflow-y-auto">
                    <div className="space-y-2">
                      {(catalogs?.instruments ?? []).length > 0 && (
                        <>
                          <Label className="flex items-center gap-2 font-medium">
                            <Checkbox
                              checked={tInstr.length === (catalogs?.instruments ?? []).length}
                              onCheckedChange={(c) => setAllInstruments(t.id, tInstr, !!c)}
                            />
                            Todos
                          </Label>
                          <div className="my-1 border-t border-border" />
                        </>
                      )}
                      {(catalogs?.instruments ?? []).map((i) => (
                        <Label key={i.id} className="flex items-center gap-2 font-normal">
                          <Checkbox checked={tInstr.includes(i.id)} onCheckedChange={(c) => toggleInstrument(t.id, i.id, !!c)} />
                          {i.name}
                        </Label>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">Materias</Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 max-h-72 overflow-y-auto">
                    <div className="space-y-2">
                      {(catalogs?.subjects ?? []).length > 0 && (
                        <>
                          <Label className="flex items-center gap-2 font-medium">
                            <Checkbox
                              checked={tSubj.length === (catalogs?.subjects ?? []).length}
                              onCheckedChange={(c) => setAllSubjects(t.id, tSubj, !!c)}
                            />
                            Todos
                          </Label>
                          <div className="my-1 border-t border-border" />
                        </>
                      )}
                      {(catalogs?.subjects ?? []).map((s) => (
                        <Label key={s.id} className="flex items-center gap-2 font-normal">
                          <Checkbox checked={tSubj.includes(s.id)} onCheckedChange={(c) => toggleSubject(t.id, s.id, !!c)} />
                          {s.name}
                        </Label>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                <Button size="icon" variant="ghost" onClick={() => remove(t.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}