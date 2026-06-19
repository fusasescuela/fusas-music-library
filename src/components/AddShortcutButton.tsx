import { useEffect, useState } from "react";
import { Smartphone, Share, Plus, MoreVertical } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type OS = "ios" | "android" | "other";

function detectOS(): OS {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "other";
}

export function AddShortcutButton() {
  const [open, setOpen] = useState(false);
  const [os, setOs] = useState<OS>("other");
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    setOs(detectOS());
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS Safari
      window.navigator.standalone === true;
    setStandalone(!!isStandalone);
  }, []);

  if (standalone) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="md:hidden w-full rounded-2xl border border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 transition p-4 flex items-center gap-4 text-left"
      >
        <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary grid place-items-center">
          <Smartphone className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <div className="font-semibold">Agregar a pantalla de inicio</div>
          <div className="text-sm text-muted-foreground">
            Creá un acceso directo en tu teléfono
          </div>
        </div>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar a pantalla de inicio</DialogTitle>
            <DialogDescription>
              Seguí estos pasos desde el navegador de tu teléfono para crear un
              acceso directo a esta página.
            </DialogDescription>
          </DialogHeader>

          {os === "ios" ? (
            <ol className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <span className="w-8 h-8 rounded-lg bg-muted grid place-items-center shrink-0">
                  <Share className="w-4 h-4" />
                </span>
                <span>
                  Tocá el ícono <strong>Compartir</strong> en la barra inferior
                  de Safari.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-8 h-8 rounded-lg bg-muted grid place-items-center shrink-0">
                  <Plus className="w-4 h-4" />
                </span>
                <span>
                  Elegí <strong>Agregar a pantalla de inicio</strong>.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-8 h-8 rounded-lg bg-muted grid place-items-center shrink-0 text-xs font-bold">
                  OK
                </span>
                <span>
                  Confirmá tocando <strong>Agregar</strong>.
                </span>
              </li>
            </ol>
          ) : os === "android" ? (
            <ol className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <span className="w-8 h-8 rounded-lg bg-muted grid place-items-center shrink-0">
                  <MoreVertical className="w-4 h-4" />
                </span>
                <span>
                  Tocá el menú <strong>⋮</strong> arriba a la derecha en Chrome.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-8 h-8 rounded-lg bg-muted grid place-items-center shrink-0">
                  <Plus className="w-4 h-4" />
                </span>
                <span>
                  Elegí <strong>Agregar a pantalla de inicio</strong> o{" "}
                  <strong>Crear acceso directo</strong>.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-8 h-8 rounded-lg bg-muted grid place-items-center shrink-0 text-xs font-bold">
                  OK
                </span>
                <span>
                  Confirmá tocando <strong>Agregar</strong>.
                </span>
              </li>
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground">
              Abrí esta página desde el navegador de tu celular para poder
              agregarla a la pantalla de inicio.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
