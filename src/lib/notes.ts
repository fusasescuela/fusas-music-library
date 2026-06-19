export const NOTE_STRINGS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export function freqToMidi(freq: number, a4 = 440): number {
  return 69 + 12 * Math.log2(freq / a4);
}

export function midiToFreq(midi: number, a4 = 440): number {
  return a4 * Math.pow(2, (midi - 69) / 12);
}

export function midiToNoteName(midi: number): { name: string; octave: number } {
  const rounded = Math.round(midi);
  const name = NOTE_STRINGS[((rounded % 12) + 12) % 12];
  const octave = Math.floor(rounded / 12) - 1;
  return { name, octave };
}

// note string like "E2" -> midi
export function noteNameToMidi(note: string): number {
  const m = note.match(/^([A-G]#?)(-?\d+)$/);
  if (!m) return 0;
  const idx = NOTE_STRINGS.indexOf(m[1]);
  return idx + (parseInt(m[2], 10) + 1) * 12;
}

export type Instrument = {
  id: string;
  label: string;
  strings: string[]; // note names
};

export const INSTRUMENTS: Instrument[] = [
  { id: "guitar", label: "GUITARRA", strings: ["E2", "A2", "D3", "G3", "B3", "E4"] },
  { id: "bass", label: "BAJO", strings: ["E1", "A1", "D2", "G2"] },
  { id: "violin", label: "VIOLÍN", strings: ["G3", "D4", "A4", "E5"] },
  { id: "trumpet", label: "TROMPETA (Bb)", strings: ["C4", "G4", "C5", "E5", "G5"] },
  { id: "sax-tenor", label: "SAXO TENOR (Bb)", strings: ["Bb2", "C3", "D3", "Eb3", "F3", "G3", "A3", "Bb3"].map(n => n.replace("Eb","D#").replace("Bb","A#")) },
  { id: "sax-alto", label: "SAXO ALTO (Eb)", strings: ["Eb3", "F3", "G3", "A3", "Bb3", "C4", "D4", "Eb4"].map(n => n.replace("Eb","D#").replace("Bb","A#")) },
];

// Find nearest target string note (midi) from instrument
export function nearestString(midi: number, instrument: Instrument): number {
  const targets = instrument.strings.map(noteNameToMidi);
  let best = targets[0];
  let bestDist = Math.abs(midi - best);
  for (const t of targets) {
    const d = Math.abs(midi - t);
    if (d < bestDist) {
      best = t;
      bestDist = d;
    }
  }
  return best;
}
