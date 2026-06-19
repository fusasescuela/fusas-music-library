import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Share2, Music } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { detectPitch } from "@/lib/pitch";
import { freqToMidi, midiToFreq, midiToNoteName, INSTRUMENTS, nearestString, Instrument } from "@/lib/notes";
import logoSrc from "@/assets/fusas-logo.png";

export const Route = createFileRoute("/tuner")({
  head: () => ({
    meta: [
      { title: "Afinador — FUSAS Escuela de Música" },
      { name: "description", content: "Afinador cromático en vivo con micrófono. Guitarra, bajo, saxo y violín." },
    ],
  }),
  component: TunerPage,
});

function TunerPage() {
  const [instrument, setInstrument] = useState<Instrument>(INSTRUMENTS[0]);
  const [a4, setA4] = useState(440);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [freq, setFreq] = useState<number>(0);
  const [cents, setCents] = useState<number>(0);
  const [noteLabel, setNoteLabel] = useState<string>("—");
  const [targetLabel, setTargetLabel] = useState<string>("");

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const bufRef = useRef<Float32Array<ArrayBuffer> | null>(null);
  const smoothFreqRef = useRef<number>(0);

  const stop = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    analyserRef.current = null;
    setRunning(false);
  };

  const start = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      streamRef.current = stream;
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AC();
      audioCtxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      src.connect(analyser);
      analyserRef.current = analyser;
      bufRef.current = new Float32Array(new ArrayBuffer(analyser.fftSize * 4));
      setRunning(true);
      tick();
    } catch (e: any) {
      setError(e?.message ?? "No se pudo acceder al micrófono");
    }
  };

  const tick = () => {
    const analyser = analyserRef.current;
    const ctx = audioCtxRef.current;
    const buf = bufRef.current;
    if (!analyser || !ctx || !buf) return;
    analyser.getFloatTimeDomainData(buf);
    const f = detectPitch(buf, ctx.sampleRate);

    if (f > 0) {
      // exponential smoothing
      const prev = smoothFreqRef.current;
      const sm = prev > 0 ? prev * 0.6 + f * 0.4 : f;
      smoothFreqRef.current = sm;

      const midi = freqToMidi(sm, a4);
      const targetMidi = nearestString(midi, instrument);
      const targetFreq = midiToFreq(targetMidi, a4);
      const c = 1200 * Math.log2(sm / targetFreq);
      const { name, octave } = midiToNoteName(targetMidi);

      setFreq(sm);
      setCents(Math.max(-50, Math.min(50, c)));
      setNoteLabel(`${name}${octave}`);
      setTargetLabel(`${targetFreq.toFixed(2)} Hz`);
    }
    rafRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => () => stop(), []);

  const absCents = Math.abs(cents);
  const tone =
    absCents < 5 ? "good" : absCents < 20 ? "near" : "flat";
  const status =
    cents < -20 ? "Muy baja" : cents < -5 ? "Baja" : cents <= 5 ? "Afinada" : cents <= 20 ? "Alta" : "Muy alta";
  const colorVar = tone === "good" ? "var(--tuner-good)" : tone === "near" ? "var(--tuner-near)" : "var(--tuner-flat)";

  // needle position: -50..50 cents -> -45..45 deg
  const angle = (cents / 50) * 45;

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader title="Afinador" back />
      <main className="flex-1 px-5 py-6 max-w-md w-full mx-auto flex flex-col gap-6">
        {/* Instrument selector */}
        <div className="flex-wrap gap-2 text-center flex items-center justify-center">
          {INSTRUMENTS.map(i => (
            <button
              key={i.id}
              onClick={() => setInstrument(i)}
              className={`px-3 py-1.5 rounded-full border transition text-xs ${
                instrument.id === i.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border hover:border-primary/50"
              }`}
            >
              {i.label}
            </button>
          ))}
        </div>

        {/* Dial */}
        <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
          <div className="relative w-full aspect-[2/1] overflow-hidden">
            <svg viewBox="-110 -100 220 110" className="w-full h-full">
              {/* arc */}
              <path d="M -90 0 A 90 90 0 0 1 90 0" stroke="var(--border)" strokeWidth="2" fill="none" />
              {/* ticks */}
              {Array.from({ length: 21 }).map((_, i) => {
                const t = -50 + i * 5;
                const a = (t / 50) * 45 - 90;
                const rad = (a * Math.PI) / 180;
                const x1 = Math.cos(rad) * 80;
                const y1 = Math.sin(rad) * 80;
                const x2 = Math.cos(rad) * (t % 25 === 0 ? 65 : 72);
                const y2 = Math.sin(rad) * (t % 25 === 0 ? 65 : 72);
                return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--muted-foreground)" strokeWidth={t === 0 ? 2 : 1} opacity={t === 0 ? 1 : 0.5} />;
              })}
              {/* needle */}
              <line
                x1={0}
                y1={0}
                x2={Math.cos(((angle - 90) * Math.PI) / 180) * 70}
                y2={Math.sin(((angle - 90) * Math.PI) / 180) * 70}
                stroke={colorVar}
                strokeWidth="2"
                strokeLinecap="round"
                style={{ transition: "all 80ms linear" }}
              />
              <circle cx="0" cy="0" r="3.5" fill={colorVar} />
            </svg>
          </div>

          <div className="mt-2 text-center">
            <div className="text-7xl font-bold tracking-tight" style={{ color: running && freq > 0 ? colorVar : undefined }}>
              {running && freq > 0 ? noteLabel : "—"}
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              {running && freq > 0 ? `${freq.toFixed(2)} Hz · objetivo ${targetLabel}` : "Toca una nota"}
            </div>
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium" style={{ backgroundColor: `color-mix(in oklab, ${colorVar} 18%, transparent)`, color: colorVar }}>
              {running && freq > 0 ? `${status} (${cents > 0 ? "+" : ""}${cents.toFixed(0)}¢)` : "En espera"}
            </div>
          </div>
        </div>

        {/* Mic button */}
        <button
          onClick={running ? stop : start}
          className={`w-full py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 transition shadow-sm text-sm ${
            running ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground hover:opacity-95"
          }`}
        >
          {running ? <><MicOff className="w-5 h-5" /> Detener</> : <><Mic className="w-5 h-5" /> Activar micrófono</>}
        </button>
        {error && <div className="text-sm text-destructive text-center">{error}</div>}

        {/* Calibration */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Calibración A4</div>
              
            </div>
            <div className="text-lg font-semibold tabular-nums">{a4} Hz</div>
          </div>
          <input
            type="range"
            min={432}
            max={446}
            step={1}
            value={a4}
            onChange={e => setA4(parseInt(e.target.value, 10))}
            className="w-full mt-3 accent-[color:var(--primary)]"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>432</span><span>440</span><span>446</span>
          </div>
        </div>

        <div className="text-xs text-muted-foreground text-center">
          Cuerdas: {instrument.strings.join(" · ")}
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
            to="/metronome"
            className="flex-1 h-12 rounded-2xl bg-accent text-accent-foreground font-medium flex items-center justify-center gap-2 hover:opacity-95 transition"
          >
            <Music className="w-4 h-4" /> Metrónomo
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
