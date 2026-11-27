import assert from "node:assert/strict";
import { plasticSample, plasticSampleUrl } from "../game/plastic-sounds.js";

const events = ["move", "capture", "castle", "promote", "capturePromote", "lift", "check", "wrong",
  "reseat", "hover", "button", "toggle-on", "toggle-off", "open", "close", "queue", "release", "clock",
  "offer", "setup", "mate", "solved", "win", "loss", "draw"];
function peak(samples) {
  return samples.reduce((result, value) => Math.max(result, Math.abs(value)), 0);
}
for (const name of events) {
  const sample = plasticSample(name);
  assert(sample.duration < .25 && sample.duration > .015, name);
  assert(sample.samples.every(Number.isFinite), name);
  assert(peak(sample.samples) < .5 && peak(sample.samples) > .008, name);
  assert.equal(sample.samples[0], 0, name);
  assert(Math.abs(sample.samples.at(-1)) < .001, name);
}
const move = plasticSample("move");
for (let variant = 1; variant <= 3; variant++) {
  const other = plasticSample("move", variant);
  assert.notDeepEqual(other.samples, move.samples);
  assert(Math.abs(peak(other.samples) / peak(move.samples) - 1) < .25);
}
assert.equal(plasticSample("move", 4), move);
assert(peak(plasticSample("clock").samples) < peak(move.samples) / 3);
for (const name of ["capture", "castle", "capturePromote", "promote"]) {
  assert(plasticSample(name).duration > move.duration, name);
}
const url = plasticSampleUrl(move);
try {
  const data = new DataView(await (await fetch(url)).arrayBuffer());
  assert.equal(data.getUint32(24, true), move.sampleRate);
  assert.equal(data.getUint32(40, true), move.samples.length * 2);
} finally {
  URL.revokeObjectURL(url);
}
console.log("25 cues, four placement variants, levels, decays, and WAV fallback passed.");
