// Short, dry impacts: noisy contact excites resonances tuned to each material.
const sampleRate = 24000;
const outputGain = 1.24;
const surfaces = {
  softCap: [790, 1580, 2490, .027, .20],
  cap: [1280, 2720, 4330, .021, .54],
  rim: [740, 1570, 2890, .032, .36],
  piece: [480, 1090, 1960, .049, .33],
  hollow: [290, 685, 1270, .071, .25],
  muffled: [230, 525, 975, .049, .14]
};
const metalSurfaces = {
  softCap: [1170, 2540, 3990, .025, .19],
  cap: [1390, 3090, 5030, .032, .26],
  rim: [920, 2040, 3530, .050, .25],
  piece: [720, 1640, 2920, .059, .23],
  hollow: [475, 1120, 2200, .073, .22],
  muffled: [350, 860, 1730, .046, .16]
};
const woodSurfaces = {
  softCap: [635, 1410, 2310, .026, .30],
  cap: [810, 1880, 3030, .027, .46],
  rim: [445, 965, 2350, .045, .42],
  piece: [355, 825, 1520, .052, .24],
  hollow: [215, 510, 1080, .066, .24],
  muffled: [190, 410, 905, .042, .16]
};
const materialSurfaces = { plastic: surfaces, metal: metalSurfaces, nature: woodSurfaces };
// The modes describe the material's strike, overtones, damping, and contact noise.
const editionResonance = {
  volcanic: [235, 580, 1490, .060, .44, 1.8],
  "ocean-reef": [510, 1300, 2560, .057, .13, 2.5],
  haunted: [340, 990, 3180, .068, .24, 2.0],
  "ancient-ruins": [290, 710, 1530, .041, .39, 2.5],
  steampunk: [570, 1240, 3430, .058, .38, 1.3],
  "neon-circuit": [662, 1324, 2648, .037, .10, .6],
  "stained-glass": [775, 2015, 3835, .073, .14, .75],
  origami: [388, 1346, 3227, .034, .72, 4.3],
  candy: [609, 1478, 3720, .039, .48, 1.35],
  cosmic: [247, 495, 993, .079, .09, .9],
  toy: [422, 1147, 2211, .047, .35, 1.5],
  fossil: [317, 826, 2235, .051, .57, 2.6]
};
const impactRoles = {
  softCap: [1.71, .48, .79],
  cap: [1.48, .65, 1.18],
  rim: [1.13, .88, 1.05],
  piece: [1, 1, 1],
  hollow: [.63, 1.13, .78],
  muffled: [.48, .69, .66]
};

for (const [id, [low, middle, high, length, texture, contact]] of Object.entries(editionResonance)) {
  materialSurfaces[id] = Object.fromEntries(Object.entries(impactRoles).map(([role, [pitch, decay, grain]]) =>
    [role, [low * pitch, middle * pitch, high * pitch, length * decay, texture * grain, contact / 1000]]
  ));
}

export function materialForBoard(id) {
  if (id === "slate") return "metal";
  if (id === "forest") return "nature";
  return Object.hasOwn(editionResonance, id) ? id : "plastic";
}

const hit = (at, surface, strength, pitch = 1, pan = 0) => ({ at, surface, strength, pitch, pan });
const cues = {
  hover: [hit(0, "softCap", .045, .92)],
  button: [hit(0, "piece", .16, 1.28), hit(.038, "softCap", .10, .94)],
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
const interactionCues = {
  metal: {
    hover: [hit(0, "softCap", .045, 1.08)],
    button: [hit(0, "cap", .14, .94), hit(.027, "softCap", .065, .94)]
  },
  nature: {
    hover: [hit(0, "softCap", .040, 1.15), hit(.011, "softCap", .019, .83, .12)],
    button: [hit(0, "rim", .15, 1.12), hit(.026, "softCap", .071)]
  }
};
// A short secondary contact identifies the material after the initial impact.
const captureFinish = {
  plastic: hit(.058, "cap", .10, .92, .35),
  nature: hit(.061, "cap", .10, .79, .24),
  metal: hit(.051, "softCap", .087, 1.1, .32),
  volcanic: hit(.059, "muffled", .16, .84, .14),
  "ocean-reef": hit(.058, "hollow", .09, 1.22, .22),
  haunted: hit(.057, "rim", .08, .68, .25),
  "ancient-ruins": hit(.061, "cap", .13, .79, .23),
  steampunk: hit(.052, "cap", .095, 1.18, .26),
  "neon-circuit": hit(.049, "softCap", .085, 1.25, .20),
  "stained-glass": hit(.051, "softCap", .088, 1.03, .31),
  origami: hit(.041, "cap", .14, .67, .28),
  candy: hit(.048, "cap", .12, .86, .24),
  cosmic: hit(.056, "muffled", .084, 1.18, .19),
  toy: hit(.058, "piece", .11, 1.11, .26),
  fossil: hit(.053, "cap", .12, .75, .24)
};
const rendered = new Map();
const variationCount = 4;
let variation = 0;

function moveHits(name, variant, finish) {
  const weight = name.endsWith("light") ? 0 : name.endsWith("heavy") ? 2 : 1;
  const pitch = [1.15, 1, .88][weight] * [.96, 1.04, 1.01, .985][variant];
  const land = at => hit(at, weight === 2 ? "hollow" : "piece", [.37, .44, .52][weight], pitch);
  if (name.startsWith("capture")) return [
    hit(0, "rim", .30, .98, .14),
    land(.019),
    captureFinish[finish] ?? captureFinish.plastic
  ];
  if (name.startsWith("castle")) return [land(0), hit(.055, "piece", .44, 1.02)];
  if (name.startsWith("promote")) {
    const promotion = [hit(0, "piece", .26, 1.18), hit(.057, "hollow", .52, .95)];
    if (name === "promote-capture") promotion.push(hit(.022, "rim", .25, 1.07, .22));
    return promotion;
  }
  return [land(0)];
}

export function createImpactSample(name, finish = "plastic") {
  const material = materialSurfaces[finish];
  const edition = Object.hasOwn(editionResonance, finish);
  const variant = cues[name] ? 0 : variation++ % variationCount;
  const key = `${finish}:${name}:${variant}`;
  if (rendered.has(key)) return rendered.get(key);
  const interfaceCue = edition && name === "hover" ? [hit(0, "softCap", .042)] :
    edition && name === "button" ? [hit(0, "cap", .15), hit(.022, "softCap", .055, .82)] : null;
  const impacts = interfaceCue ?? interactionCues[finish]?.[name] ?? cues[name] ?? moveHits(name, variant, finish);
  const duration = Math.max(...impacts.map(impact => impact.at + material[impact.surface][3]));
  const channels = Array.from({ length: 2 }, () => new Float32Array(Math.ceil(duration * sampleRate)));
  let seed = 1327 + variant * 917;
  for (const { at, surface, strength, pitch, pan } of impacts) {
    const [low, middle, high, length, texture, contact = .0021] = material[surface];
    const start = Math.round(at * sampleRate);
    const gains = [Math.sqrt(1 - pan), Math.sqrt(1 + pan)];
    let previousNoise = 0;
    for (let index = 0; index < length * sampleRate && start + index < channels[0].length; index++) {
      const t = index / sampleRate;
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const noise = seed / 2147483648 - 1;
      const edge = (noise - previousNoise * .43) * texture * .78 * Math.exp(-t / contact);
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

export function impactSampleUrl({ sampleRate, channels }) {
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
