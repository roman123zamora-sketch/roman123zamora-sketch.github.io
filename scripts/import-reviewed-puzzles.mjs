// Convert engine-reviewed JSONL leads to the browser's board format.
// All histories and continuations are replayed by Exalted's standard rules.
import { readFile, writeFile } from "node:fs/promises";
import { createRuntime } from "../game/luau-runtime.js";
import { puzzleIdea } from "../game/puzzle-pool.js";

const [output, ...inputs] = process.argv.slice(2);
if (!output || !inputs.length) throw new Error("Provide an output file and reviewed JSONL inputs");
const runtime = await createRuntime(path => readFile(new URL(`../game/${path}`, import.meta.url), "utf8"), { puzzleOnly: true });
const seen = new Set();
const records = [];
for (const path of inputs) {
  const text = await readFile(path, "utf8");
  for (const row of text.trim().split("\n").filter(Boolean)) {
    let lead;
    try { lead = JSON.parse(row); } catch { continue; } // A miner may still be writing the file.
    const category = lead.theme ? "positional" : "material";
    const replayed = await runtime("puzzleFromGame", 0, 0, {
      category, moves: lead.history, first: lead.first, options: lead.options,
      reviewed: category === "material", line: lead.line, gain: lead.gain
    });
    const puzzle = replayed?.[0];
    if (!puzzle) {
      console.error(`Rejected a reviewed position during legal replay: ${lead.fen}`);
      continue;
    }
    const { objective, explanation, theme, alternative, complexity, verification, source, fen } = lead;
    const idea = puzzleIdea(puzzle);
    if (seen.has(idea) || seen.has(puzzle.id)) continue;
    seen.add(idea);
    seen.add(puzzle.id);
    records.push({ ...puzzle, objective, explanation, theme, alternative, complexity, verification, source, fen, idea });
  }
}
await writeFile(output, JSON.stringify(records));
console.log(records.length, "reviewed puzzles replayed");
