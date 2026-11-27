// Original, deterministic Foley. Brief filtered contact noise excites a few
// inharmonic shell modes, with no reverb or sustained tonal layer.
const sampleRate = 24000;
const tap = (at, pitch, level, ring = .011, edge = .4) => ({ at, pitch, level, ring, edge });
const landing = tap(0, 635, .42, .014);
const cues = {
  move: [landing],
  capture: [tap(0, 1030, .22, .006), tap(.024, 585, .46, .015)],
  castle: [tap(0, 650, .35), tap(.066, 530, .39, .015)],
  promote: [tap(0, 980, .11, .005), tap(.038, 605, .43, .014)],
  capturePromote: [tap(0, 1090, .22, .006), tap(.039, 570, .47, .015)],
  lift: [tap(0, 590, .105, .006, .18)],
  check: [tap(0, 1080, .16, .006), tap(.038, 1250, .125, .006)],
  wrong: [tap(0, 370, .14, .009, .18), tap(.031, 320, .052, .007, .16)],
  reseat: [tap(0, 540, .12, .008)],
  hover: [tap(0, 1140, .036, .004, .27)],
  button: [tap(0, 820, .145, .007), tap(.019, 1050, .052, .004)],
  "toggle-on": [tap(0, 665, .12), tap(.044, 890, .125, .007)],
  "toggle-off": [tap(0, 580, .1, .008)],
  open: [tap(0, 755, .11, .007), tap(.03, 585, .075, .009)],
  close: [tap(0, 635, .115, .008)],
  queue: [tap(0, 800, .115, .007)],
  release: [tap(0, 580, .085, .006)],
  clock: [tap(0, 1030, .078, .004, .22)],
  offer: [tap(0, 715, .115), tap(.078, 790, .12)],
  setup: [tap(0, 530, .115), tap(.052, 645, .16)],
  mate: [tap(0, 410, .28, .017, .28)],
  solved: [tap(0, 720, .15), tap(.07, 975, .18)],
  win: [tap(0, 625, .18), tap(.075, 810, .17), tap(.148, 965, .20)],
  loss: [tap(0, 520, .17), tap(.105, 405, .152, .015)],
  draw: [tap(0, 680, .145), tap(.092, 680, .145)]
};

const placementVariants = [[1, 1], [.94, .97], [1.065, 1.01], [.978, .985]];
const cache = new Map();

export function plasticSample(name, variation = 0) {
  const variant = name === "move" ? variation % placementVariants.length : 0;
  const key = name + ":" + variant;
  if (cache.has(key)) return cache.get(key);
  const strokes = cues[name];
  if (!strokes) throw new Error("Unknown plastic sound: " + name);
  const duration = Math.max(...strokes.map(({ at, ring }) => at + ring * 4.8));
  const samples = new Float32Array(Math.ceil(duration * sampleRate));
  const [tuning, dynamics] = placementVariants[variant];
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
      filtered += .34 * (noise - filtered);
      const impact = filtered * edge * Math.exp(-t / .0025);
      const body = .56 * Math.sin(phase) * Math.exp(-t / ring)
        + .28 * Math.sin(phase * 1.82) * Math.exp(-t / (ring * .51))
        + .14 * Math.sin(phase * 2.67) * Math.exp(-t / (ring * .25));
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
