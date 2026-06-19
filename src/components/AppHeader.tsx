import { Link } from "@tanstack/react-router";
import { Moon, Sun, ArrowLeft } from "lucide-react";
import { useTheme } from "@/lib/theme";
import logo from "@/assets/fusas-logo.png";

export function AppHeader({ title, back = false }: { title?: string; back?: boolean }) {
  const { theme, toggle } = useTheme();
  return (
    <header className="flex items-center justify-between px-5 py-3 border-b border-border bg-background/80 backdrop-blur sticky top-0 z-10">
      <div className="flex items-center gap-3 min-w-0">
        {back ? (
          <Link to="/" className="p-2 -ml-2 rounded-lg hover:bg-muted transition shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        ) : null}
        <Link to="/" className="flex items-center gap-3 min-w-0">
          <div className="h-9 px-2 rounded-lg bg-white grid place-items-center shadow-sm shrink-0">
            <img src={logo} alt="FUSAS Escuela de Música" className="h-5 w-auto" />
          </div>
          {title && (
            <div className="leading-tight min-w-0">
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">FUSAS</div>
              <div className="text-sm font-semibold truncate">{title}</div>
            </div>
          )}
        </Link>
      </div>
      <button
        onClick={toggle}
        aria-label="Cambiar tema"
        className="p-2 rounded-lg hover:bg-muted transition shrink-0"
      >
        {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>
    </header>
  );
}
