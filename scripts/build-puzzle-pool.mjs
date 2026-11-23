// Verify offline with the same chess rules and tactical proofs as the worker.
// Usage: node scripts/build-puzzle-pool.mjs <category> <elo> <first-seed> <attempts> <output>
import { readFile, writeFile } from "node:fs/promises";
import { createRuntime } from "../game/luau-runtime.js";

const [category, elo, firstSeed, attempts, output] = process.argv.slice(2);
if (!["checkmate", "material"].includes(category) || !output ||
    ![elo, firstSeed, attempts].every(value => Number.isInteger(Number(value)) && Number(value) > 0)) {
  throw new Error("Provide a category, target Elo, positive initial seed, attempt count, and output path.");
}
const engine = await createRuntime(path => readFile(new URL(`../game/${path}`, import.meta.url), "utf8"), { puzzleOnly: true });
const puzzles = [];
for (let offset = 0; offset < Number(attempts); offset++) {
  const seed = Number(firstSeed) + offset;
  const puzzle = await engine("puzzle", 0, 0, {
    category, rating: Number(elo), seed, offline: true, timeMs: 12000, recent: puzzles.map(entry => entry.id)
  });
  if (!puzzle.retry) {
    delete puzzle.targetRating;
    puzzles.push(puzzle);
    console.log(category, elo, seed, puzzle.id, puzzle.difficulty);
    await writeFile(output, JSON.stringify(puzzles));
  }
}
