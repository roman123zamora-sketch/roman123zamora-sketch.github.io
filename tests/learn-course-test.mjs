import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRuntime } from "../game/luau-runtime.js";
import { course } from "../tabs/learn-lessons.js";

const dispatch = await createRuntime(path => readFile(new URL("../game/" + path, import.meta.url), "utf8"));
assert.equal(course.length, 11);
const models = new Map();
for (const module of course) {
  for (const lesson of module.lessons) {
    try {
      const model = await dispatch("courseLesson", 0, 0, {
        ...lesson.setup, attackFrom: lesson.attackFrom ?? lesson.setup.attackFrom
      });
      const frames = Object.values(model.frames);
      assert.equal(frames.length, 1 + (lesson.setup.line?.length ?? 0));
      if (lesson.square) assert.match(lesson.square, /^[a-h][1-8]$/);
      if (lesson.promotion) assert.deepEqual(Object.keys(model.promotions).sort(), ["B", "N", "Q", "R"]);
      if (["Checkmate", "Stalemate", "Neither"].includes(lesson.answer)) {
        assert.equal(lesson.answer, ({checkmate: "Checkmate", stalemate: "Stalemate"})[frames[0].state.status] ?? "Neither");
      }
      models.set(lesson.title, { frames, promotions: model.promotions });
    } catch (error) {
      throw new Error(module.title + " / " + lesson.title, { cause: error });
    }
  }
}

const pawn = models.get("A pawn’s attack is diagonal").frames[0];
assert.deepEqual(Object.values(pawn.attacks.d2).sort(), ["c3", "e3"]);
assert.deepEqual(Object.values(pawn.legal).filter(move => move.from === "d2").map(move => move.to).sort(), ["d3", "d4"]);
const pinned = models.get("A pinned bishop still attacks").frames[0];
assert(Object.values(pinned.attacks.e7).includes("d6"));
assert(!Object.values(pinned.legal).some(move => move.from === "d5" && move.to === "d6"));
const castle = models.get("Castle with the king").frames[1].state.board;
assert.equal(castle.g1, "wK");
assert.equal(castle.f1, "wR");
assert(!Object.values(models.get("Castling through check").frames[0].legal).some(move => move.special === "castleK"));
const ep = models.get("En passant").frames[2].state.board;
assert.equal(ep.d6, "wP");
assert.equal(ep.d5, undefined);
assert(!Object.values(models.get("When en passant ends").frames[0].legal).some(move => move.special === "enpassant"));
assert.equal(models.get("Back-rank mate").frames[1].state.status, "checkmate");
assert.equal(models.get("Remove a defender").frames.at(-1).state.board.f6, "wR");
console.log(models.size + " Learn lessons loaded. Legal lines, outcomes, attack marks, castling, en passant and all promotions verified.");
