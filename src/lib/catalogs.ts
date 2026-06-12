import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Catalog {
  instruments: { id: string; name: string }[];
  levels: { id: string; name: string; sort_order: number }[];
  subjects: { id: string; name: string }[];
  teachers: { id: string; name: string; instrument_id: string | null }[];
}

export function useCatalogs() {
  return useQuery({
    queryKey: ["catalogs"],
    queryFn: async (): Promise<Catalog> => {
      const [instruments, levels, subjects, teachers] = await Promise.all([
        supabase.from("instruments").select("id, name").order("name"),
        supabase.from("levels").select("id, name, sort_order").order("sort_order"),
        supabase.from("subjects").select("id, name").order("name"),
        supabase.from("teachers").select("id, name, instrument_id").order("name"),
      ]);
      return {
        instruments: instruments.data ?? [],
        levels: levels.data ?? [],
        subjects: subjects.data ?? [],
        teachers: teachers.data ?? [],
      };
    },
    staleTime: 1000 * 60,
  });
}

export const MATERIAL_TYPE_LABELS: Record<string, string> = {
  file: "Archivo",
  link: "Enlace",
  text: "Nota",
};