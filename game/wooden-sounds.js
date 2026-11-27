// Fixed Foley recipes. Each stroke models a wood contact or a short scrape on grain.
const sampleRate = 24000;
const knock = (at, length, pitch, level, edge = .3) => ({ at, length, pitch, level, edge });
const brush = (at, length, level, roughness = .4) => ({ at, length, level, roughness });

const placement = knock(0, .106, 218, .53);
const scrape = brush(0, .068, .20, .52);
const hover = [brush(0, .039, .052, .38)];
const reseat = [knock(0, .077, 195, .17, .14)];
const cues = {
  lift: [scrape],
  move: [placement],
  capture: [knock(0, .062, 327, .23), { ...placement, at: .051 }],
  castle: [placement, { ...placement, at: .108 }],
  promote: [brush(0, .068, .25, .48), knock(.058, .089, 286, .38, .42)],
  check: [knock(0, .075, 330, .37, .53)],
  wrong: [brush(0, .067, .27, .78), knock(.035, .040, 165, .18, .22)],
  reseat,
  hover,
  button: [knock(0, .058, 347, .21, .36)],
  "toggle-on": [knock(0, .054, 305, .19), knock(.033, .033, 379, .073, .2)],
  "toggle-off": [brush(0, .046, .093), knock(.025, .038, 245, .097, .16)],
  open: [brush(0, .096, .15, .33)],
  close: [brush(0, .044, .095, .26), knock(.036, .059, 185, .15, .15)],
  queue: [knock(0, .066, 232, .17, .18)],
  release: reseat,
  clock: [knock(0, .059, 301, .155)],
  offer: [knock(0, .063, 186, .14), knock(.120, .063, 205, .13)],
  setup: [brush(0, .142, .18, .35), knock(.128, .085, 192, .26, .18)],
  mate: [knock(0, .112, 151, .44, .23)],
  solved: [knock(0, .10, 221, .26), knock(.105, .13, 289, .29)],
  win: [knock(0, .16, 198, .35), knock(.12, .16, 247, .32),
    knock(.30, .6, 196, .35, .25), knock(.30, .6, 294, .23, .16)],
  loss: [knock(0, .16, 207, .38), knock(.23, .16, 169, .23),
    brush(.42, .37, .24, .3), knock(.713, .085, 155, .136, .13)],
  draw: [knock(0, .15, 218, .30), knock(.17, .15, 238, .30),
    knock(.36, .54, 218, .22, .17), knock(.36, .54, 238, .21, .17)]
};

const cache = new Map();

export function woodenSample(name) {
  if (cache.has(name)) return cache.get(name);
  const strokes = cues[name];
  if (!strokes) throw new Error("Unknown wooden sound: " + name);
  const duration = Math.max(...strokes.map(({ at, length }) => at + length));
  const samples = new Float32Array(Math.ceil(duration * sampleRate));
  let seed = 9473;
  for (const { at, length, pitch, level, edge, roughness } of strokes) {
    const start = Math.round(at * sampleRate);
    const count = Math.min(Math.ceil(length * sampleRate), samples.length - start);
    let grain = 0;
    for (let i = 0; i < count; i++) {
      const t = i / sampleRate;
      const phase = 2 * Math.PI * t;
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const noise = seed / 2147483648 - 1;
      grain += .24 * (noise - grain);
      let voice;
      if (pitch) {
        const mode = pitch * phase;
        const decay = Math.min(length * .35, .115);
        const body = .65 * Math.sin(mode) * Math.exp(-t / decay) +
          .28 * Math.sin(mode * 1.61) * Math.exp(-t / (decay * .6)) +
          .13 * Math.sin(mode * 2.47) * Math.exp(-t / (decay * .26));
        const contact = (.58 * grain + .42 * noise) * edge * Math.exp(-t / .0035);
        voice = (body + contact) * Math.min(1, t / .0011);
      } else {
        const pressure = Math.sin(Math.PI * t / length);
        voice = (grain + (noise - grain) * roughness * .52) * pressure *
          (.76 + .24 * Math.sin(phase * 36 + 1.1));
      }
      const fade = Math.max(0, Math.min(1, (length - t) / .012));
      samples[start + i] += voice * level * fade;
    }
  }
  const sample = { sampleRate, samples, duration };
  cache.set(name, sample);
  return sample;
}

export function woodenSampleUrl({ sampleRate, samples }) {
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
