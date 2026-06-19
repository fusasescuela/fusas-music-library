import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Trash2, GraduationCap, UserPlus, X, Shield, Pencil } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createAppUser, deleteAppUser, updateUserRoles, updateUserProfile } from "@/lib/admin.functions";
import { useCatalogs } from "@/lib/catalogs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const NONE = "none";

interface UserRow {
  id: string;
  full_name: string;
  email: string;
  roles: string[];
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  docente: "Docente",
  estudiante: "Estudiante",
};

const ALL_ROLES: ("admin" | "docente" | "estudiante")[] = ["admin", "docente", "estudiante"];

export function UserManager() {
  const queryClient = useQueryClient();
  const createUser = useServerFn(createAppUser);
  const deleteUser = useServerFn(deleteAppUser);

  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"admin" | "docente" | "estudiante">("estudiante");
  const [saving, setSaving] = useState(false);

  const { data: users } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async (): Promise<UserRow[]> => {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email").order("full_name"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      const roleMap = new Map<string, string[]>();
      (roles ?? []).forEach((r) => {
        roleMap.set(r.user_id, [...(roleMap.get(r.user_id) ?? []), r.role]);
      });
      return (profiles ?? []).map((p) => ({ ...p, roles: roleMap.get(p.id) ?? [] }));
    },
  });

  async function onCreate() {
    setSaving(true);
    try {
      await createUser({ data: { email: email.trim(), password, fullName: fullName.trim(), role } });
      toast.success("Usuario creado.");
      setOpen(false);
      setEmail(""); setPassword(""); setFullName(""); setRole("estudiante");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo crear el usuario.");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    try {
      await deleteUser({ data: { userId: id } });
      toast.success("Usuario eliminado.");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo eliminar.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><UserPlus className="h-4 w-4" /> Nueva cuenta</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Crear cuenta</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fn">Nombre completo</Label>
                <Input id="fn" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="em">Correo electrónico</Label>
                <Input id="em" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pw">Contraseña temporal</Label>
                <Input id="pw" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
              </div>
              <div className="space-y-2">
                <Label>Rol</Label>
                <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="estudiante">Estudiante</SelectItem>
                    <SelectItem value="docente">Docente</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={onCreate} disabled={saving || !email || !password || !fullName}>
                {saving ? "Creando…" : "Crear cuenta"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="divide-y divide-border">
        {(users ?? []).length === 0 && <p className="p-4 text-sm text-muted-foreground">Aún no hay usuarios.</p>}
        {(users ?? []).map((u) => (
          <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-medium">{u.full_name || "Sin nombre"}</p>
              <p className="text-sm text-muted-foreground">{u.email}</p>
            </div>
            <div className="flex items-center gap-2">
              {u.roles.map((r) => <Badge key={r} variant="secondary">{ROLE_LABELS[r] ?? r}</Badge>)}
              <EditUserDialog userId={u.id} fullName={u.full_name} email={u.email} />
              <RolesDialog userId={u.id} name={u.full_name} currentRoles={u.roles} />
              {u.roles.includes("estudiante") && <AssignmentsDialog studentId={u.id} name={u.full_name} />}
              <Button size="icon" variant="ghost" onClick={() => onDelete(u.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

function RolesDialog({
  userId, name, currentRoles,
}: { userId: string; name: string; currentRoles: string[] }) {
  const queryClient = useQueryClient();
  const updateRoles = useServerFn(updateUserRoles);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(currentRoles);
  const [saving, setSaving] = useState(false);

  function toggle(role: string, checked: boolean) {
    setSelected((prev) => (checked ? [...new Set([...prev, role])] : prev.filter((r) => r !== role)));
  }

  async function save() {
    if (selected.length === 0) {
      toast.error("Selecciona al menos un rol.");
      return;
    }
    setSaving(true);
    try {
      await updateRoles({ data: { userId, roles: selected as ("admin" | "docente" | "estudiante")[] } });
      toast.success("Roles actualizados.");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudieron actualizar los roles.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setSelected(currentRoles); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Shield className="h-4 w-4" /> Roles
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Roles de {name || "usuario"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {ALL_ROLES.map((role) => (
            <label key={role} className="flex items-center gap-3 rounded-lg border border-border p-3 cursor-pointer">
              <Checkbox
                checked={selected.includes(role)}
                onCheckedChange={(c) => toggle(role, Boolean(c))}
              />
              <span className="font-medium">{ROLE_LABELS[role]}</span>
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button onClick={save} disabled={saving}>{saving ? "Guardando…" : "Guardar roles"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface AssignmentRow {
  id: string;
  instrument_id: string | null;
  level_id: string | null;
  teacher_id: string | null;
}

function AssignmentsDialog({ studentId, name }: { studentId: string; name: string }) {
  const queryClient = useQueryClient();
  const { data: catalogs } = useCatalogs();
  const [instrument, setInstrument] = useState(NONE);
  const [level, setLevel] = useState(NONE);
  const [teacher, setTeacher] = useState(NONE);

  const { data: assignments } = useQuery({
    queryKey: ["assignments", studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_assignments")
        .select("id, instrument_id, level_id, teacher_id")
        .eq("student_id", studentId);
      if (error) throw error;
      return data as AssignmentRow[];
    },
  });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["assignments", studentId] });
  }

  async function add() {
    if (instrument === NONE && level === NONE && teacher === NONE) {
      toast.error("Selecciona al menos un criterio.");
      return;
    }
    const { error } = await supabase.from("student_assignments").insert({
      student_id: studentId,
      instrument_id: instrument === NONE ? null : instrument,
      level_id: level === NONE ? null : level,
      teacher_id: teacher === NONE ? null : teacher,
    });
    if (error) return toast.error(error.message);
    setInstrument(NONE); setLevel(NONE); setTeacher(NONE);
    refresh();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("student_assignments").delete().eq("id", id);
    if (error) return toast.error(error.message);
    refresh();
  }

  const nm = (list: { id: string; name: string }[] | undefined, id: string | null) =>
    id ? list?.find((x) => x.id === id)?.name : null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <GraduationCap className="h-4 w-4" /> Asignaciones
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Asignaciones de {name || "estudiante"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            {(assignments ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">Sin asignaciones. El estudiante solo verá contenido general.</p>
            )}
            {(assignments ?? []).map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg border border-border p-2.5">
                <div className="flex flex-wrap gap-1.5">
                  {[nm(catalogs?.instruments, a.instrument_id), nm(catalogs?.levels, a.level_id), nm(catalogs?.teachers, a.teacher_id)]
                    .filter(Boolean)
                    .map((t, i) => <Badge key={i} variant="outline">{t}</Badge>)}
                </div>
                <Button size="icon" variant="ghost" onClick={() => remove(a.id)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Pick value={instrument} onChange={setInstrument} options={catalogs?.instruments ?? []} label="Instrumento" />
            <Pick value={level} onChange={setLevel} options={catalogs?.levels ?? []} label="Nivel" />
            <Pick value={teacher} onChange={setTeacher} options={catalogs?.teachers ?? []} label="Profesor" />
          </div>
          <Button onClick={add} className="w-full gap-2"><Plus className="h-4 w-4" /> Agregar asignación</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Pick({
  value, onChange, options, label,
}: { value: string; onChange: (v: string) => void; options: { id: string; name: string }[]; label: string }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue placeholder={label} /></SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>{label}</SelectItem>
        {options.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function EditUserDialog({ userId, fullName, email }: { userId: string; fullName: string; email: string }) {
  const queryClient = useQueryClient();
  const updateProfile = useServerFn(updateUserProfile);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(fullName);
  const [mail, setMail] = useState(email);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await updateProfile({ data: { userId, fullName: name.trim(), email: mail.trim() } });
      toast.success("Usuario actualizado.");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo actualizar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) { setName(fullName); setMail(email); } }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Pencil className="h-4 w-4" /> Editar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Editar usuario</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre completo</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Correo electrónico</Label>
            <Input type="email" value={mail} onChange={(e) => setMail(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={save} disabled={saving || !name.trim() || !mail.trim()}>
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}