// Merge verified output from the game importer and simulation builder.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { levels, levelOf, levelLabel } from "../game/puzzle-library.js";
import { puzzleIdea } from "../game/puzzle-pool.js";

const candidates = (await Promise.all(process.argv.slice(2).map(async path =>
  JSON.parse(await readFile(path, "utf8"))))).flat();
const index = {};
const publishedIds = new Set();
for (const category of ["checkmate", "material"]) {
  const identities = new Set();
  const verified = [];
  for (const puzzle of candidates.filter(item => item.category === category)) {
    const idea = puzzleIdea(puzzle);
    if (publishedIds.has(puzzle.id) || identities.has(puzzle.id) || identities.has(idea)) continue;
    identities.add(puzzle.id);
    identities.add(idea);
    verified.push({ ...puzzle, idea });
  }
  verified.sort((left, right) => left.difficulty - right.difficulty);
  const selected = levels.flatMap((level, band) => {
    const entries = verified.filter(puzzle => levelOf(puzzle.difficulty) === band);
    console.log(category, levelLabel(level), Math.min(5, entries.length), "of 5");
    if (entries.length <= 5) return entries;
    return Array.from({ length: 5 }, (_, index) => entries[Math.round(index * (entries.length - 1) / 4)]);
  });
  for (const puzzle of selected) publishedIds.add(puzzle.id);
  const folder = new URL(`../assets/puzzles/${category}/`, import.meta.url);
  await mkdir(folder, { recursive: true });
  index[category] = selected.map(({ id, difficulty, idea }) => ({ id, difficulty, idea }));
  await Promise.all(selected.map(puzzle => writeFile(new URL(puzzle.id + ".json", folder),
    JSON.stringify(puzzle) + "\n")));
  console.log(category, selected.length, selected.map(puzzle => puzzle.difficulty).join(","));
}
await writeFile(new URL("../assets/puzzles/index.json", import.meta.url), JSON.stringify(index, null, 2) + "\n");
