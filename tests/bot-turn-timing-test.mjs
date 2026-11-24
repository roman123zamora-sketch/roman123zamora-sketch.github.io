import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRuntime } from "../game/luau-runtime.js";

const dispatch = await createRuntime(path => readFile(new URL("../game/" + path, import.meta.url), "utf8"));
const events = async (op, time, user, kind, data) => Object.values(await dispatch(op, time, user, kind, data));
const moves = response => response.filter(event => event.kind === "state")
  .flatMap(event => Object.values(event.data.state.history));

await events("join", 100, 1, "Tester");
await events("action", 100, 1, "bot", { rating: 200 });
await events("action", 100, 1, "move", { from: "e2", to: "e4" });
assert.equal(moves(await events("tick", 100.99)).length, 0);
assert.equal(moves(await events("tick", 101)).at(-1).color, "b");

await events("action", 101, 1, "leave");
await events("action", 102, 1, "fourBot", { ratings: { B: 200, Y: 200, G: 200 } });
await events("action", 102, 1, "move", { from: "h2", to: "h4" });
for (const [index, color] of ["B", "Y", "G"].entries()) {
  assert.equal(moves(await events("tick", 102.99 + index)).length, 0);
  assert.equal(moves(await events("tick", 103 + index)).at(-1).color, color);
}
await events("action", 106, 1, "move", { from: "g2", to: "g4" });
await events("action", 106.1, 1, "reset");
assert.equal(moves(await events("tick", 107)).length, 0);
console.log("Standard and all four-player bot turns wait one second, and reset cancels a waiting reply.");
