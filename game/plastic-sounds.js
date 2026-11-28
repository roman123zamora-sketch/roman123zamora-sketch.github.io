// Original, deterministic Foley. Brief filtered contact noise excites a few
// inharmonic shell modes, with no reverb or sustained tonal layer.
const sampleRate = 24000;
const tap = (at, pitch, level, ring = .0075, edge = .34) => ({ at, pitch, level, ring, edge });
const landing = tap(0, 815, .33, .0095);
const cues = {
  move: [landing],
  capture: [tap(0, 1120, .14, .0045), tap(.022, 835, .34, .009)],
  castle: [tap(0, 850, .27), tap(.063, 780, .30, .009)],
  promote: [tap(0, 1120, .105, .0045), tap(.031, 840, .33, .0095)],
  capturePromote: [tap(0, 1170, .16, .0045), tap(.032, 815, .35, .010)],
  lift: [tap(0, 930, .105, .005)],
  check: [tap(0, 1080, .155, .005), tap(.029, 1160, .11, .0045)],
  wrong: [tap(0, 625, .12, .006, .22), tap(.032, 590, .048, .005)],
  reseat: [tap(0, 745, .11, .006)],
  hover: [tap(0, 1060, .043, .0038, .27)],
  button: [tap(0, 960, .136, .005), tap(.016, 1090, .038, .0035)],
  "toggle-on": [tap(0, 825, .104), tap(.038, 975, .11, .0055)],
  "toggle-off": [tap(0, 735, .10, .0055)],
  open: [tap(0, 870, .105, .005), tap(.024, 1010, .058, .004)],
  close: [tap(0, 820, .105, .0055)],
  queue: [tap(0, 970, .105, .005)],
  release: [tap(0, 780, .083, .005)],
  clock: [tap(0, 1090, .07, .0042, .22)],
  offer: [tap(0, 855, .10), tap(.064, 940, .115)],
  setup: [tap(0, 765, .105), tap(.048, 850, .14)],
  mate: [tap(0, 685, .23, .0105, .29)],
  solved: [tap(0, 845, .145), tap(.061, 1010, .16)],
  win: [tap(0, 810, .145), tap(.058, 940, .15), tap(.119, 1040, .17)],
  loss: [tap(0, 785, .145), tap(.076, 680, .12, .008)],
  draw: [tap(0, 850, .13), tap(.077, 850, .13)]
};

// Two of four placements include a quiet second contact as the piece settles.
const placementVariants = [
  { tuning: 1, dynamics: 1 },
  { tuning: .957, dynamics: .98, settle: tap(.024, 975, .055, .004) },
  { tuning: 1.05, dynamics: .99 },
  { tuning: .984, dynamics: 1.01, settle: tap(.031, 900, .063, .004) }
];
const cache = new Map();

export function plasticSample(name, variation = 0) {
  const variant = name === "move" ? variation % placementVariants.length : 0;
  const key = name + ":" + variant;
  if (cache.has(key)) return cache.get(key);
  const cue = cues[name];
  if (!cue) throw new Error("Unknown plastic sound: " + name);
  const { tuning, dynamics, settle } = placementVariants[variant];
  const strokes = settle ? [...cue, settle] : cue;
  const duration = Math.max(...strokes.map(({ at, ring }) => at + ring * 4.8));
  const samples = new Float32Array(Math.ceil(duration * sampleRate));
  let seed = 31741 + variant * 4567;
  for (const { at, pitch, level, ring, edge } of strokes) {
    const start = Math.round(at * sampleRate);
    const length = ring * 4.8;
    const count = Math.min(Math.ceil(length * sampleRate), samples.length - start);
    let filtered = 0;
    for (let i = 0; i < count; i++) {
      const t = i / sampleRate;
      const phase = 2 * Math.PI * t * pitch * tuning;
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const noise = seed / 2147483648 - 1;
      filtered += .27 * (noise - filtered);
      const impact = filtered * edge * Math.exp(-t / .0019);
      const body = .46 * Math.sin(phase) * Math.exp(-t / ring)
        + .28 * Math.sin(phase * 1.68) * Math.exp(-t / (ring * .51))
        + .09 * Math.sin(phase * 2.36) * Math.exp(-t / (ring * .25));
      const envelope = Math.min(1, t / .0007) * Math.min(1, Math.max(0, (length - t) / .009));
      samples[start + i] += (impact + body) * envelope * level * dynamics;
    }
  }
  const sample = { sampleRate, samples, duration };
  cache.set(key, sample);
  return sample;
}

export function plasticSampleUrl({ sampleRate, samples }) {
  const bytes = new Uint8Array(44 + samples.length * 2);
  const wav = new DataView(bytes.buffer);
  for (const [offset, label] of [[0, "RIFF"], [8, "WAVE"], [12, "fmt "], [36, "data"]]) {
    bytes.set([...label].map(character => character.charCodeAt(0)), offset);
  }
  for (const [offset, value] of [[4, bytes.length - 8], [16, 16], [24, sampleRate], [28, sampleRate * 2], [40, samples.length * 2]]) {
    wav.setUint32(offset, value, true);
  }
  for (const [offset, value] of [[20, 1], [22, 1], [32, 2], [34, 16]]) wav.setUint16(offset, value, true);
  samples.forEach((value, index) => wav.setInt16(44 + index * 2, Math.round(value * 32767), true));
  return URL.createObjectURL(new Blob([bytes], { type: "audio/wav" }));
}
