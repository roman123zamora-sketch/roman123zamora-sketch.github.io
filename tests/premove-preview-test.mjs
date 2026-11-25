import assert from "node:assert/strict";
import { premoveIntent, projectPremoves } from "../game/premove-preview.js";

const position = Object.freeze({ g1: "wN", e1: "wK", h1: "wR", g5: "bB", a7: "wP", a8: "bR" });
const first = premoveIntent(position, "g1", "f3", "w");
const second = premoveIntent(projectPremoves(position, [first]).board, "f3", "g5", "w");
const chained = projectPremoves(position, [first, second]);
assert.equal(chained.board.g5, "wN");
assert.deepEqual([...chained.destinations], ["g5"]);
assert.deepEqual([...chained.trail], [["f3", [1]], ["g5", [2]]]);
const returned = premoveIntent(chained.board, "g5", "f3", "w");
assert.deepEqual([...projectPremoves(position, [first, second, returned]).trail], [["f3", [1, 3]], ["g5", [2]]]);
assert.deepEqual([...projectPremoves({ ...position, f3: "wN", g1: undefined }, [second]).trail], [["g5", [1]]]);
assert.equal(chained.board.f3, undefined);
assert.equal(position.g5, "bB");
assert.equal(projectPremoves({ ...position, g1: undefined }, [first, second]).board.g5, "bB");
assert.equal(projectPremoves({ ...position, g1: undefined, f3: "wN" }, [second]).board.g5, "wN");
assert.equal(projectPremoves(position, [first]).board.f3, "wN");

for (const [side, from, to, rookFrom, rookTo] of [
  ["w", "e1", "g1", "h1", "f1"], ["b", "e8", "c8", "a8", "d8"],
  ["R", "h1", "j1", "k1", "i1"], ["B", "a8", "a6", "a4", "a7"],
  ["Y", "g14", "e14", "d14", "f14"], ["G", "n7", "n9", "n11", "n8"]
]) {
  const real = { [from]: side + "K", [rookFrom]: side + "R" };
  const castle = premoveIntent(real, from, to, side);
  const preview = projectPremoves(real, [castle]);
  assert.deepEqual(preview.board, { [to]: side + "K", [rookTo]: side + "R" });
  assert.deepEqual([...preview.trail], [[to, [1]], [rookTo, [1]]]);
  assert.equal(premoveIntent({ ...real, [rookTo]: side + "N" }, from, to, side), undefined);
}
for (const [side, from, to] of [
  ["w", "a7", "a8"], ["b", "a2", "a1"], ["R", "e7", "e8"],
  ["B", "g5", "h5"], ["Y", "e8", "e7"], ["G", "h5", "g5"]
]) {
  const real = { [from]: side + "P" };
  const intent = premoveIntent(real, from, to, side);
  assert.equal(intent.needsPromotion, true);
  assert.equal(projectPremoves(real, [{ ...intent, promotion: "N" }]).board[to], side + "N");
}
console.log("Chained moves, captures, queue replay, castling and promotion previews passed.");
