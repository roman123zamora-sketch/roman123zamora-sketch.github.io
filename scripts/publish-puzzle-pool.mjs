// Publish pre-verified, individually rated positions without disturbing retained IDs.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { levels, levelLabel, levelOf, puzzleCategories, puzzlesPerCategory, puzzlesPerLevel } from "../game/puzzle-library.js";
import { puzzleIdea } from "../game/puzzle-pool.js";

const candidates = (await Promise.all(process.argv.slice(2).map(async path =>
  JSON.parse(await readFile(path, "utf8"))))).flat();
const identities = new Set();
const verified = [];
for (const puzzle of candidates) {
  if (!puzzleCategories.includes(puzzle.category) || !puzzle.fen || !puzzle.source ||
      !Number.isFinite(puzzle.difficulty) || puzzle.difficulty < levels[0][0] || puzzle.difficulty > levels.at(-1)[1]) continue;
  const idea = puzzleIdea(puzzle);
  const position = puzzle.fen.split(" ")[0];
  if (identities.has(puzzle.id) || identities.has(idea) || identities.has(position)) continue;
  identities.add(puzzle.id);
  identities.add(idea);
  identities.add(position);
  verified.push({ ...puzzle, idea });
}

const selected = levels.flatMap((level, band) => {
  const entries = verified.filter(puzzle => levelOf(puzzle.difficulty) === band);
  const groups = puzzleCategories.map(category =>
    entries.filter(puzzle => puzzle.category === category).slice(0, puzzlesPerCategory));
  const puzzles = groups.flat();
  console.log(levelLabel(level), groups.map(group => group.length).join(" / "), "·", puzzles.length, "of", puzzlesPerLevel);
  return puzzles;
});
if (selected.length !== levels.length * puzzlesPerLevel) {
  throw new Error(`Each category needs ${puzzlesPerCategory} verified puzzles in every band`);
}

const index = {};
for (const category of puzzleCategories) {
  const puzzles = selected.filter(puzzle => puzzle.category === category);
  const folder = new URL(`../assets/puzzles/${category}/`, import.meta.url);
  await mkdir(folder, { recursive: true });
  index[category] = puzzles.map(({ id, difficulty, idea }) => ({ id, difficulty, idea }));
  await Promise.all(puzzles.map(puzzle => writeFile(new URL(puzzle.id + ".json", folder), JSON.stringify(puzzle) + "\n")));
}
await writeFile(new URL("../assets/puzzles/index.json", import.meta.url), JSON.stringify(index, null, 2) + "\n");
