// Read archived-game leads as JSON Lines and verify them with Exalted's rules and tactical search.
// Candidate engine suggestions serve only as leads. No suggested line is published without proof.
import { readFile, writeFile } from "node:fs/promises";
import { createRuntime } from "../game/luau-runtime.js";
import { puzzleIdea } from "../game/puzzle-pool.js";

const [category, input, output] = process.argv.slice(2);
if (!["checkmate", "material"].includes(category) || !input || !output) throw new Error("Provide category, input JSONL and output JSON");
const runtime = await createRuntime(path => readFile(new URL(`../game/${path}`, import.meta.url), "utf8"), { puzzleOnly: true });
const puzzles = [];
const seen = new Set();
const attempted = new Set();
const moveId = uci => uci?.toUpperCase().replace(/^([A-H]\d[A-H]\d)/, match => match.toLowerCase());
let lastAttempt = Date.now();
while (Date.now() - lastAttempt < 45000) {
  const rows = (await readFile(input, "utf8")).trim().split("\n").filter(Boolean).map(line => {
    try { return JSON.parse(line); } catch { return null; }
  }).filter(Boolean).filter(lead => !attempted.has(lead.fen));
  // Lead scores only establish the order in which to spend verification time.
  rows.sort((a, b) => category === "checkmate" ? Math.abs(a.mate - 3) - Math.abs(b.mate - 3) : (b.priority ?? 0) - (a.priority ?? 0));
  if (!rows.length) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    continue;
  }
  for (const lead of rows.slice(0, 24)) {
    attempted.add(lead.fen);
    const results = await runtime("puzzleFromGame", 0, 0, {
      category, rating: category === "checkmate" ? 2000 : 2200,
      moves: lead.history, exactPosition: true, knownMate: lead.mate,
      firstMove: moveId(lead.pv?.[0]),
      replyHints: lead.replyHints && Object.fromEntries(Object.entries(lead.replyHints)
        .map(([move, reply]) => [moveId(move), moveId(reply)]))
    });
    for (const puzzle of Array.isArray(results) ? results : []) {
      const idea = puzzleIdea(puzzle);
      if (seen.has(puzzle.id) || seen.has(idea)) continue;
      seen.add(puzzle.id);
      seen.add(idea);
      delete puzzle.targetRating;
      puzzles.push({ ...puzzle, idea, source: lead.source, fen: lead.fen });
      console.log(puzzle.difficulty, puzzle.id, puzzle.line.length, lead.source.collection, lead.source.game);
      await writeFile(output, JSON.stringify(puzzles));
    }
    lastAttempt = Date.now();
  }
}
