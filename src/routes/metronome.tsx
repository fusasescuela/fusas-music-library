import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Play, Pause, Square, RotateCcw, Minus, Plus, Share2, Activity } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import logoSrc from "@/assets/fusas-logo.png";

export const Route = createFileRoute("/metronome")({
  head: () => ({
    meta: [
      { title: "Metrónomo — FUSAS Escuela de Música" },
      { name: "description", content: "Metrónomo de precisión, 20 a 300 BPM, con compases y sonidos seleccionables." },
    ],
  }),
  component: MetronomePage,
});

type Signature = "2/4" | "3/4" | "4/4" | "5/4" | "6/8" | "12/8";
type Sound = "click" | "woodblock" | "beep";

const SIGNATURES: Record<Signature, { beats: number; unit: number }> = {
  "2/4": { beats: 2, unit: 1 },
  "3/4": { beats: 3, unit: 1 },
  "4/4": { beats: 4, unit: 1 },
  "5/4": { beats: 5, unit: 1 },
  "6/8": { beats: 6, unit: 0.5 },
  "12/8": { beats: 12, unit: 0.5 },
};
const BEATS: Record<Signature, number> = Object.fromEntries(
  Object.entries(SIGNATURES).map(([k, v]) => [k, v.beats])
) as Record<Signature, number>;

function MetronomePage() {
  const [bpm, setBpm] = useState(90);
  const [signature, setSignature] = useState<Signature>("4/4");
  const [sound, setSound] = useState<Sound>("click");
  const [running, setRunning] = useState(false);
  const [activeBeat, setActiveBeat] = useState(-1);

  const ctxRef = useRef<AudioContext | null>(null);
  const nextNoteTimeRef = useRef(0);
  const currentBeatRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const bpmRef = useRef(bpm);
  const sigRef = useRef(signature);
  const soundRef = useRef(sound);
  const scheduledRef = useRef<{ time: number; beat: number }[]>([]);

  useEffect(() => { bpmRef.current = bpm; }, [bpm]);
  useEffect(() => { sigRef.current = signature; }, [signature]);
  useEffect(() => { soundRef.current = sound; }, [sound]);

  const scheduleClick = (time: number, accent: boolean) => {
    const ctx = ctxRef.current!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    let freq = 1000;
    let dur = 0.04;
    if (soundRef.current === "click") {
      osc.type = "square";
      freq = accent ? 1500 : 1000;
      dur = 0.03;
    } else if (soundRef.current === "woodblock") {
      osc.type = "triangle";
      freq = accent ? 1200 : 800;
      dur = 0.06;
    } else {
      osc.type = "sine";
      freq = accent ? 880 : 660;
      dur = 0.08;
    }
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(accent ? 1.0 : 0.7, time + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(time);
    osc.stop(time + dur + 0.02);
  };

  const scheduler = () => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const lookahead = 0.1; // seconds
    while (nextNoteTimeRef.current < ctx.currentTime + lookahead) {
      const sig = SIGNATURES[sigRef.current];
      const beat = currentBeatRef.current % sig.beats;
      scheduleClick(nextNoteTimeRef.current, beat === 0);
      scheduledRef.current.push({ time: nextNoteTimeRef.current, beat });
      const secondsPerBeat = (60 / bpmRef.current) * sig.unit;
      nextNoteTimeRef.current += secondsPerBeat;
      currentBeatRef.current++;
    }
    // Visual sync
    const now = ctx.currentTime;
    while (scheduledRef.current.length && scheduledRef.current[0].time <= now) {
      const s = scheduledRef.current.shift()!;
      setActiveBeat(s.beat);
    }
    timerRef.current = window.setTimeout(scheduler, 25);
  };

  const start = async () => {
    if (!ctxRef.current) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      ctxRef.current = new AC();
    }
    await ctxRef.current.resume();
    currentBeatRef.current = 0;
    nextNoteTimeRef.current = ctxRef.current.currentTime + 0.05;
    scheduledRef.current = [];
    setRunning(true);
    scheduler();
  };

  const pause = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setRunning(false);
  };

  const stop = () => {
    pause();
    setActiveBeat(-1);
    currentBeatRef.current = 0;
  };

  const reset = () => {
    stop();
    setBpm(90);
    setSignature("4/4");
  };

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); ctxRef.current?.close(); }, []);

  const beats = BEATS[signature];

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader title="Metrónomo" back />
      <main className="flex-1 px-5 py-6 max-w-md w-full mx-auto flex flex-col gap-6">
        {/* BPM display */}
        <div className="rounded-3xl border border-border bg-card p-6 text-center shadow-sm">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Tempo</div>
          <div className="mt-1 text-7xl font-bold tabular-nums">{bpm}</div>
          <div className="text-sm text-muted-foreground">BPM · {signature}</div>

          {/* Beat indicator */}
          <div className="mt-5 flex items-center justify-center gap-2">
            {Array.from({ length: beats }).map((_, i) => {
              const active = i === activeBeat && running;
              const accent = i === 0;
              return (
                <div
                  key={i}
                  className="rounded-full transition-all"
                  style={{
                    width: accent ? 18 : 14,
                    height: accent ? 18 : 14,
                    backgroundColor: active
                      ? accent ? "var(--primary)" : "var(--accent)"
                      : "var(--muted)",
                    transform: active ? "scale(1.4)" : "scale(1)",
                    boxShadow: active ? `0 0 18px ${accent ? "var(--primary)" : "var(--accent)"}` : "none",
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* BPM controls */}
        <div className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setBpm(b => Math.max(20, b - 1))} className="w-11 h-11 rounded-xl bg-muted grid place-items-center hover:bg-secondary"><Minus className="w-5 h-5" /></button>
            <input
              type="number"
              min={20}
              max={300}
              value={bpm}
              onChange={e => setBpm(Math.max(20, Math.min(300, parseInt(e.target.value || "0", 10) || 0)))}
              className="flex-1 h-11 rounded-xl bg-muted text-center text-sm font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button onClick={() => setBpm(b => Math.min(300, b + 1))} className="w-11 h-11 rounded-xl bg-muted grid place-items-center hover:bg-secondary"><Plus className="w-5 h-5" /></button>
          </div>
          <input
            type="range"
            min={20}
            max={300}
            value={bpm}
            onChange={e => setBpm(parseInt(e.target.value, 10))}
            className="w-full accent-[color:var(--primary)]"
          />
        </div>

        {/* Transport */}
        <div className="grid grid-cols-4 gap-2">
          {!running ? (
            <button onClick={start} className="col-span-2 h-14 rounded-2xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 shadow-sm hover:opacity-95">
              <Play className="w-5 h-5" /> Start
            </button>
          ) : (
            <button onClick={pause} className="col-span-2 h-14 rounded-2xl bg-accent text-accent-foreground font-semibold flex items-center justify-center gap-2 shadow-sm">
              <Pause className="w-5 h-5" /> Pause
            </button>
          )}
          <button onClick={stop} className="h-14 rounded-2xl bg-muted font-semibold flex items-center justify-center gap-1">
            <Square className="w-4 h-4" /> Stop
          </button>
          <button onClick={reset} className="h-14 rounded-2xl bg-muted font-semibold flex items-center justify-center gap-1">
            <RotateCcw className="w-4 h-4" /> Reset
          </button>
        </div>

        {/* Signature */}
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-2">Compás</div>
          <div className="flex gap-2 flex-wrap">
            {(Object.keys(BEATS) as Signature[]).map(s => (
              <button
                key={s}
                onClick={() => setSignature(s)}
                className={`px-4 py-2 rounded-xl text-sm font-medium border transition ${
                  signature === s ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:border-primary/50"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Sound */}
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-2">Sonido</div>
          <div className="flex gap-2 flex-wrap">
            {(["click", "woodblock", "beep"] as Sound[]).map(s => (
              <button
                key={s}
                onClick={() => setSound(s)}
                className={`px-4 py-2 rounded-xl text-sm font-medium border transition capitalize ${
                  sound === s ? "bg-accent text-accent-foreground border-accent" : "bg-card border-border hover:border-accent/50"
                }`}
              >
                {s === "click" ? "Click clásico" : s === "woodblock" ? "Woodblock" : "Beep"}
              </button>
            ))}
          </div>
        </div>

        {/* Bottom actions */}
        <div className="mt-auto pt-4 flex items-center gap-3">
          <button
            onClick={() => {
              const url = typeof window !== "undefined" ? window.location.href : "";
              const text = "Probá el afinador y metrónomo de FUSAS Escuela de Música — perfecto para practicar.";
              if (navigator.share) {
                navigator.share({ title: "FUSAS — Afinador y Metrónomo", text, url });
              } else {
                window.open(`https://wa.me/?text=${encodeURIComponent(text + " " + url)}`, "_blank");
              }
            }}
            className="flex-1 h-12 rounded-2xl bg-muted font-medium flex items-center justify-center gap-2 hover:bg-secondary transition"
          >
            <Share2 className="w-4 h-4" /> Compartir
          </button>
          <Link
            to="/tuner"
            className="flex-1 h-12 rounded-2xl bg-accent text-accent-foreground font-medium flex items-center justify-center gap-2 hover:opacity-95 transition"
          >
            <Activity className="w-4 h-4" /> Afinador
          </Link>
        </div>

        {/* FUSAS branding */}
        <div className="flex items-center justify-center gap-2 pt-2">
          <img src={logoSrc} alt="FUSAS" className="h-8 w-auto" />
          <span className="text-sm font-semibold tracking-tight text-foreground">FUSAS 2026</span>
        </div>
      </main>
    </div>
  );
}
