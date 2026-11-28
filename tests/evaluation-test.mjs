import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRuntime } from "../game/luau-runtime.js";

const dispatch = await createRuntime(path => readFile(new URL("../game/" + path, import.meta.url), "utf8"));
const evaluate = (board, turn, settings = {}) =>
  dispatch("analysis", 0, 0, { board, turn, castling: {}, positions: {}, halfmove: 0, fullmove: 20, ...settings });

const whiteAhead = { a1: "wK", c2: "wQ", h8: "bK" };
for (const turn of ["w", "b"]) {
  const result = await evaluate(whiteAhead, turn);
  assert.equal(result.kind, "cp");
  assert(result.value > 0 && result.depth > 0);
}

const whiteMate = await evaluate({ f6: "wK", f7: "wQ", h8: "bK" }, "w");
const blackMate = await evaluate({ f3: "bK", f2: "bQ", h1: "wK" }, "b");
assert.deepEqual([whiteMate.kind, whiteMate.side, whiteMate.moves], ["mate", "w", 1]);
assert.deepEqual([blackMate.kind, blackMate.side, blackMate.moves], ["mate", "b", 1]);
const ended = await evaluate({ f6: "wK", g7: "wQ", h8: "bK" }, "b");
assert(ended.terminal && ended.side === "w" && ended.moves === 0);
const draw = await evaluate(whiteAhead, "w", { halfmove: 150 });
assert.equal(draw.kind, "draw");
assert.equal(draw.terminal, true);
console.log("Fixed White perspective, mate for both colors, checkmate and automatic draw passed.");

const { createEvaluationBar } = await import("../ui/evaluation-bar.js");
const workers = [];
globalThis.Worker = class {
  constructor() { workers.push(this); queueMicrotask(() => this.onmessage({ data: { ready: true } })); }
  postMessage(message) { this.message = message; }
  answer(result) { this.onmessage({ data: { id: this.message.id, result } }); }
  terminate() { this.terminated = true; }
};
const fake = () => ({
  style: {}, attributes: {},
  setAttribute(name, value) { this.attributes[name] = value; },
  toggleAttribute(name, value) { this.attributes[name] = Boolean(value); }
});
const w = fake();
const b = fake();
const fill = fake();
const label = { querySelector: selector => selector.includes('"w"') ? w : b };
const meter = { classList: { toggle: (_, flipped) => { meter.flipped = flipped; } } };
const element = Object.assign(fake(), {
  querySelector: selector => ({ ".eval-meter": meter, ".eval-white": fill, output: label })[selector]
});
const bar = createEvaluationBar(element);
const state = { board: whiteAhead, turn: "w", analysis: {} };
const match = { variant: "chess", mode: "bot", matchId: "one", side: "w", state };
const tick = () => new Promise(resolve => setImmediate(resolve));
bar.update(match);
await tick();
const obsolete = workers[0];
assert.equal(obsolete.message.op, "analysis");
const next = { ...match, state: { ...state, turn: "b" } };
bar.update(next);
await tick();
assert(obsolete.terminated);
obsolete.answer({ kind: "cp", value: 900, depth: 2 });
assert.equal(w.textContent, "…");
const current = workers[1];
current.answer({ kind: "cp", value: 80, depth: 2 });
await tick();
assert.equal(w.textContent, "+0.80");
assert.equal(b.textContent, "−0.80");
assert.equal(current.message.op, "analysisDeep");
current.answer({ kind: "cp", value: 120, depth: 4 });
await tick();
assert.equal(w.textContent, "+1.20");
bar.update({ ...next, side: "b" });
assert(meter.flipped);
assert.equal(w.textContent, "+1.20");
const lastFill = fill.style.blockSize;
bar.update(next, null, undefined, null, { projected: true });
assert.equal(fill.style.blockSize, lastFill);
assert.equal(w.title, "Waiting for confirmed move");
bar.update(next, null, undefined, null, { outcome: "draw" });
assert.equal(w.textContent, "Draw");
assert.equal(fill.style.blockSize, "50%");
bar.close();
console.log("Obsolete scores, staged refinement, orientation and terminal display passed.");
