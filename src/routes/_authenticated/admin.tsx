import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CatalogManager } from "@/components/admin/catalog-manager";
import { TeacherManager } from "@/components/admin/teacher-manager";
import { UserManager } from "@/components/admin/user-manager";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

function AdminPage() {
  const { isAdmin } = useAuth();
  if (!isAdmin) {
    return <p className="text-muted-foreground">Esta sección es solo para administradores.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Administración</h1>
        <p className="mt-1 text-muted-foreground">Gestiona catálogos, profesores y usuarios.</p>
      </div>

      <Tabs defaultValue="users">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="users">Usuarios</TabsTrigger>
          <TabsTrigger value="instruments">Instrumentos</TabsTrigger>
          <TabsTrigger value="levels">Niveles</TabsTrigger>
          <TabsTrigger value="subjects">Materias</TabsTrigger>
          <TabsTrigger value="teachers">Profesores</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-6"><UserManager /></TabsContent>
        <TabsContent value="instruments" className="mt-6">
          <CatalogManager table="instruments" title="Instrumentos" />
        </TabsContent>
        <TabsContent value="levels" className="mt-6">
          <CatalogManager table="levels" title="Niveles" hasOrder />
        </TabsContent>
        <TabsContent value="subjects" className="mt-6">
          <CatalogManager table="subjects" title="Materias" />
        </TabsContent>
        <TabsContent value="teachers" className="mt-6"><TeacherManager /></TabsContent>
      </Tabs>
    </div>
  );
}