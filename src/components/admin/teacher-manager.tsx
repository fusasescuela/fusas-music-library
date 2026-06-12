import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCatalogs } from "@/lib/catalogs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const NONE = "none";

interface TeacherRow {
  id: string;
  name: string;
  instrument_id: string | null;
}

export function TeacherManager() {
  const queryClient = useQueryClient();
  const { data: catalogs } = useCatalogs();
  const [name, setName] = useState("");
  const [instrument, setInstrument] = useState(NONE);

  const { data: teachers } = useQuery({
    queryKey: ["catalog", "teachers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("teachers").select("id, name, instrument_id").order("name");
      if (error) throw error;
      return data as TeacherRow[];
    },
  });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["catalog", "teachers"] });
    queryClient.invalidateQueries({ queryKey: ["catalogs"] });
  }

  async function add() {
    if (!name.trim()) return;
    const { error } = await supabase.from("teachers").insert({
      name: name.trim(),
      instrument_id: instrument === NONE ? null : instrument,
    });
    if (error) return toast.error(error.message);
    setName(""); setInstrument(NONE); refresh();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("teachers").delete().eq("id", id);
    if (error) return toast.error(error.message);
    refresh();
  }

  const instrName = (id: string | null) => catalogs?.instruments.find((i) => i.id === id)?.name;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del profesor" />
        <Select value={instrument} onValueChange={setInstrument}>
          <SelectTrigger className="sm:w-56"><SelectValue placeholder="Instrumento (opcional)" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>Sin instrumento</SelectItem>
            {catalogs?.instruments.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={add} className="gap-2"><Plus className="h-4 w-4" /> Agregar</Button>
      </div>
      <Card className="divide-y divide-border">
        {(teachers ?? []).length === 0 && <p className="p-4 text-sm text-muted-foreground">Aún no hay profesores.</p>}
        {(teachers ?? []).map((t) => (
          <div key={t.id} className="flex items-center justify-between p-3">
            <div>
              <p className="text-sm font-medium">{t.name}</p>
              {t.instrument_id && <p className="text-xs text-muted-foreground">{instrName(t.instrument_id)}</p>}
            </div>
            <Button size="icon" variant="ghost" onClick={() => remove(t.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </Card>
    </div>
  );
}