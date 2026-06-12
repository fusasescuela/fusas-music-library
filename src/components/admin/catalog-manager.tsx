import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

type CatalogTable = "instruments" | "levels" | "subjects";

interface Row {
  id: string;
  name: string;
  sort_order?: number;
}

export function CatalogManager({ table, title, hasOrder }: { table: CatalogTable; title: string; hasOrder?: boolean }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const { data: rows } = useQuery({
    queryKey: ["catalog", table],
    queryFn: async () => {
      const q = supabase.from(table).select("*");
      const { data, error } = await (hasOrder ? q.order("sort_order") : q.order("name"));
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["catalog", table] });
    queryClient.invalidateQueries({ queryKey: ["catalogs"] });
  }

  async function add() {
    if (!name.trim()) return;
    const payload: Row = { id: "", name: name.trim() } as Row;
    const insert: Record<string, unknown> = { name: name.trim() };
    if (hasOrder) insert.sort_order = (rows?.length ?? 0) + 1;
    const { error } = await supabase.from(table).insert(insert as never);
    if (error) return toast.error(error.message);
    setName("");
    refresh();
    void payload;
  }

  async function save(id: string) {
    if (!editName.trim()) return;
    const { error } = await supabase.from(table).update({ name: editName.trim() } as never).eq("id", id);
    if (error) return toast.error(error.message);
    setEditingId(null);
    refresh();
  }

  async function remove(id: string) {
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) return toast.error(error.message);
    refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={`Nuevo ${title.toLowerCase()}`}
          onKeyDown={(e) => e.key === "Enter" && add()} />
        <Button onClick={add} className="gap-2"><Plus className="h-4 w-4" /> Agregar</Button>
      </div>
      <Card className="divide-y divide-border">
        {(rows ?? []).length === 0 && <p className="p-4 text-sm text-muted-foreground">Aún no hay elementos.</p>}
        {(rows ?? []).map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-2 p-3">
            {editingId === r.id ? (
              <>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-9" />
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => save(r.id)}><Check className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => setEditingId(null)}><X className="h-4 w-4" /></Button>
                </div>
              </>
            ) : (
              <>
                <span className="text-sm">{r.name}</span>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => { setEditingId(r.id); setEditName(r.name); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(r.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </>
            )}
          </div>
        ))}
      </Card>
    </div>
  );
}