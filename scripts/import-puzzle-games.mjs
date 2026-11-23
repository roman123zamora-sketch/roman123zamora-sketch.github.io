// Read complete, standard-start PGN main lines and verify tactical positions.
// Usage: node scripts/import-puzzle-games.mjs file.pgn category elo offset count output.json
import { readFile, writeFile } from "node:fs/promises";
import { createRuntime } from "../game/luau-runtime.js";

const [input, category, elo, offset, count, output, mode] = process.argv.slice(2);
if (!input || !output || !["material", "checkmate"].includes(category)) throw new Error("Invalid puzzle import arguments");
const text = await readFile(input, "utf8");
const games = text.split(/(?=^\[Event )/m).filter(game => game.startsWith("[Event ") && !/^\[FEN /m.test(game));
const engine = await createRuntime(path => readFile(new URL(`../game/${path}`, import.meta.url), "utf8"), { puzzleOnly: true });
const puzzles = [];
for (const [index, game] of games.slice(Number(offset), Number(offset) + Number(count)).entries()) {
  let main = game.replace(/^\[[^\n]*\]\s*$/gm, "").replace(/\{[^}]*\}|;[^\n]*/g, "");
  while (/\([^()]*\)/.test(main)) main = main.replace(/\([^()]*\)/g, "");
  const moves = main.replace(/\d+\.(?:\.\.)?|\$\d+|1\/2-1\/2|1-0|0-1|\*/g, " ").trim().split(/\s+/);
  if (moves.length < 20) continue;
  const forcingFinal = mode === "--forcing-final";
  if (forcingFinal && ![1, 3, 5].every(back => /[+#]/.test(moves.at(-back)))) continue;
  const batch = await engine("puzzleFromGame", 0, 0, { category, rating: Number(elo), moves, forcingFinal,
    recent: puzzles.map(puzzle => puzzle.id) });
  for (const puzzle of Array.isArray(batch) ? batch : []) {
    delete puzzle.targetRating;
    puzzle.source = { archive: "PGN Mentor", game: Number(offset) + index + 1,
      collection: input.split("/").at(-1).replace(/^exalted-/, "") };
    puzzles.push(puzzle);
    console.log(category, elo, puzzle.source.game, puzzle.id, puzzle.difficulty);
  }
  await writeFile(output, JSON.stringify(puzzles));
}
