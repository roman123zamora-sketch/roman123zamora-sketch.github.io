// Short, dry impacts: a noisy contact excites several inharmonic plastic resonances.
const sampleRate = 24000;
const outputGain = 1.24;
const surfaces = {
  cap: [1280, 2720, 4330, .021, .54],
  rim: [740, 1570, 2890, .032, .36],
  piece: [480, 1090, 1960, .049, .33],
  hollow: [290, 685, 1270, .071, .25],
  muffled: [230, 525, 975, .049, .14]
};
const hit = (at, surface, strength, pitch = 1, pan = 0) => ({ at, surface, strength, pitch, pan });
const cues = {
  hover: [hit(0, "cap", .075, 1.18)],
  button: [hit(0, "cap", .23, .86), hit(.04, "cap", .12, 1.12)],
  lift: [hit(0, "piece", .14, 1.13)],
  queue: [hit(0, "piece", .23, 1.08)],
  release: [hit(0, "cap", .13, .8)],
  wrong: [hit(0, "muffled", .36)],
  check: [hit(0, "rim", .23), hit(.062, "rim", .19, 1.04)],
  mate: [hit(0, "cap", .18, .79), hit(.02, "hollow", .62, .87)],
  win: [hit(0, "rim", .31, .88), hit(.075, "rim", .36), hit(.15, "rim", .38, 1.16)],
  loss: [hit(0, "hollow", .36, .91), hit(.14, "piece", .15, .84, .14)],
  draw: [hit(0, "rim", .24, .9), hit(.107, "rim", .24, .9), hit(.214, "muffled", .13)],
  solved: [hit(0, "rim", .24, .94), hit(.075, "rim", .29, 1.15)]
};
const rendered = new Map();
const variationCount = 4;
let variation = 0;

function moveHits(name, variant) {
  const weight = name.endsWith("light") ? 0 : name.endsWith("heavy") ? 2 : 1;
  const pitch = [1.15, 1, .88][weight] * [.96, 1.04, 1.01, .985][variant];
  const land = at => hit(at, weight === 2 ? "hollow" : "piece", [.37, .44, .52][weight], pitch);
  if (name.startsWith("capture")) return [
    hit(0, "rim", .29, 1.07, .12), land(.034),
    hit(.078, "cap", .13, .9, .52), hit(.101, "piece", .08, 1.25, .57)
  ];
  if (name.startsWith("castle")) return [land(0), hit(.055, "piece", .44, 1.02)];
  if (name.startsWith("promote")) {
    const promotion = [hit(0, "piece", .26, 1.18), hit(.057, "hollow", .52, .95)];
    if (name === "promote-capture") promotion.push(hit(.022, "rim", .25, 1.07, .22));
    return promotion;
  }
  return [land(0)];
}

export function createPlasticSample(name) {
  const variant = cues[name] ? 0 : variation++ % variationCount;
  const key = name + variant;
  if (rendered.has(key)) return rendered.get(key);
  const impacts = cues[name] ?? moveHits(name, variant);
  const duration = Math.max(...impacts.map(impact => impact.at + surfaces[impact.surface][3]));
  const channels = Array.from({ length: 2 }, () => new Float32Array(Math.ceil(duration * sampleRate)));
  let seed = 1327 + variant * 917;
  for (const { at, surface, strength, pitch, pan } of impacts) {
    const [low, middle, high, length, texture] = surfaces[surface];
    const start = Math.round(at * sampleRate);
    const gains = [Math.sqrt(1 - pan), Math.sqrt(1 + pan)];
    let previousNoise = 0;
    for (let index = 0; index < length * sampleRate && start + index < channels[0].length; index++) {
      const t = index / sampleRate;
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const noise = seed / 2147483648 - 1;
      const edge = (noise - previousNoise * .43) * texture * .78 * Math.exp(-t / .0021);
      previousNoise = noise;
      const phase = 2 * Math.PI * pitch * t;
      const body = .60 * Math.sin(low * phase) * Math.exp(-5.9 * t / length) +
        .27 * Math.sin(middle * phase) * Math.exp(-9 * t / length) +
        .08 * Math.sin(high * phase) * Math.exp(-18 * t / length);
      const attack = Math.min(1, t / .00065);
      const release = Math.min(1, (length - t) / .006);
      const envelope = attack * attack * (3 - 2 * attack) * release * release;
      const sample = (edge + body) * strength * envelope * outputGain;
      for (let channel = 0; channel < 2; channel++) channels[channel][start + index] += sample * gains[channel];
    }
  }
  const sample = { sampleRate, channels, duration };
  rendered.set(key, sample);
  return sample;
}

export function plasticSampleUrl({ sampleRate, channels }) {
  const frames = channels[0].length;
  const bytes = new Uint8Array(44 + frames * 4);
  const wav = new DataView(bytes.buffer);
  for (const [offset, label] of [[0, "RIFF"], [8, "WAVE"], [12, "fmt "], [36, "data"]]) {
    bytes.set([...label].map(character => character.charCodeAt(0)), offset);
  }
  for (const [offset, value] of [[4, bytes.length - 8], [16, 16], [24, sampleRate], [28, sampleRate * 4], [40, frames * 4]]) {
    wav.setUint32(offset, value, true);
  }
  for (const [offset, value] of [[20, 1], [22, 2], [32, 4], [34, 16]]) wav.setUint16(offset, value, true);
  for (let index = 0; index < frames; index++) {
    for (let channel = 0; channel < 2; channel++) {
      wav.setInt16(44 + index * 4 + 2 * channel, Math.round(channels[channel][index] * 32767), true);
    }
  }
  return URL.createObjectURL(new Blob([bytes], { type: "audio/wav" }));
}
