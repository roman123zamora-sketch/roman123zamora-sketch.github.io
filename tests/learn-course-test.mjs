import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRuntime } from "../game/luau-runtime.js";
import { course, sections } from "../tabs/learn-lessons.js";

const dispatch = await createRuntime(path => readFile(new URL("../game/" + path, import.meta.url), "utf8"));
assert.equal(course.length, 14);
assert.equal(sections.length, 4);
assert.equal(new Set(course.map(lesson => lesson.id)).size, 14);
const models = new Map();
for (const lesson of course) {
  const exercises = [];
  for (const [index, step] of lesson.steps.entries()) {
    try {
      const model = await dispatch("courseLesson", 0, 0, step.setup);
      const frames = Object.values(model.frames);
      assert.equal(frames.length, 1 + (step.setup.line?.length ?? 0));
      assert(frames[step.practiceStart ?? 0]);
      if (step.setup.explore) assert(Object.values(model.alternatives).some(result => result.success));
      if (step.setup.promotion) assert.deepEqual(Object.keys(model.promotions).sort(), ["B", "N", "Q", "R"]);
      if (step.choices) assert(step.choices.includes(step.answer));
      // Explicit coordinate instructions must name a move on this exact board.
      for (const [, from, to] of step.instruction.matchAll(/from ([a-h][1-8]) (?:back )?to ([a-h][1-8])/g)) {
        const available = frames.slice(step.practiceStart ?? 0).some(frame =>
          Object.values(frame.legal).some(move => move.from === from && move.to === to));
        const demonstrated = frames.some(frame => frame.move?.from === from && frame.move?.to === to);
        assert(available || demonstrated, `${from}–${to} is absent from the diagram and history`);
      }
      exercises.push({ ...model, frames });
    } catch (error) {
      throw new Error(lesson.title + " / step " + (index + 1), { cause: error });
    }
  }
  models.set(lesson.id, exercises);
}

const sample = (id, index = 0) => models.get(id)[index];
assert(sample("movement", 5).alternatives.d3.success && sample("movement", 5).alternatives.d4.success);
assert(sample("safe").alternatives.d5.success);
assert(!sample("safe").alternatives.f4.success);
assert.equal(sample("safe").alternatives.f4.reply.from, "f8");
assert(!sample("check", 4).alternatives.d2);
assert(sample("check", 4).alternatives.e8.success);
assert.equal(sample("mate").frames[0].state.status, "checkmate");
assert.equal(sample("mate", 2).frames[0].state.status, "check");
assert(Object.values(sample("mate", 2).frames[0].legal).some(move => move.from === "h8" && move.to === "h7"));
assert.equal(sample("draws").frames[0].state.status, "stalemate");
assert(sample("draws", 2).frames.at(-1).state.claimReason);
assert(sample("draws", 3).frames[0].state.claimReason);
assert.equal(sample("castling").frames[1].state.board.f1, "wR");
assert.equal(sample("castling", 1).frames[1].state.board.d1, "wR");
assert(!Object.values(sample("castling", 2).frames[0].legal).some(move => move.special === "castleK"));
const ep = sample("en-passant").frames[2].state.board;
assert.equal(ep.d6, "wP");
assert.equal(ep.d5, undefined);
assert(!Object.values(sample("en-passant", 1).frames.at(-1).legal).some(move => move.special === "enpassant"));
assert.equal(sample("tactics", 4).alternatives.a8.frame.state.status, "checkmate");
console.log(`All ${course.flatMap(lesson => lesson.steps).length} Learn positions, legal lines, alternate moves, captures, outcomes, and promotions verified.`);
