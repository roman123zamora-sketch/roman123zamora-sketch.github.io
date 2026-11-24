// Publish up to twenty independently verified positions per difficulty band.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { levels, levelLabel, levelOf, puzzlesPerLevel } from "../game/puzzle-library.js";
import { puzzleIdea } from "../game/puzzle-pool.js";

const categories = ["checkmate", "material"];
const candidates = (await Promise.all(process.argv.slice(2).map(async path =>
  JSON.parse(await readFile(path, "utf8"))))).flat();
const identities = new Set();
const verified = [];
for (const puzzle of candidates) {
  if (!categories.includes(puzzle.category) || !puzzle.fen || !puzzle.source ||
      puzzle.difficulty < levels[0][0] || puzzle.difficulty > levels.at(-1)[1]) continue;
  const idea = puzzleIdea(puzzle);
  if (identities.has(puzzle.id) || identities.has(idea)) continue;
  identities.add(puzzle.id);
  identities.add(idea);
  verified.push({ ...puzzle, idea });
}
verified.sort((a, b) => a.difficulty - b.difficulty);

function spread(entries, count) {
  if (entries.length <= count) return entries;
  if (count === 0) return [];
  if (count === 1) return [entries[Math.floor(entries.length / 2)]];
  return Array.from({ length: count }, (_, index) =>
    entries[Math.round(index * (entries.length - 1) / (count - 1))]);
}

const selected = levels.flatMap((level, band) => {
  const entries = verified.filter(puzzle => levelOf(puzzle.difficulty) === band);
  const half = puzzlesPerLevel / 2;
  const material = entries.filter(puzzle => puzzle.category === "material");
  const checkmate = entries.filter(puzzle => puzzle.category === "checkmate");
  const puzzles = [
    ...spread(material, puzzlesPerLevel - Math.min(checkmate.length, half)),
    ...spread(checkmate, puzzlesPerLevel - Math.min(material.length, half))
  ];
  console.log(levelLabel(level), puzzles.length, "of", puzzlesPerLevel);
  return puzzles;
});

const index = {};
for (const category of categories) {
  const puzzles = selected.filter(puzzle => puzzle.category === category);
  const folder = new URL(`../assets/puzzles/${category}/`, import.meta.url);
  await mkdir(folder, { recursive: true });
  index[category] = puzzles.map(({ id, difficulty, idea }) => ({ id, difficulty, idea }));
  await Promise.all(puzzles.map(puzzle => writeFile(new URL(puzzle.id + ".json", folder), JSON.stringify(puzzle) + "\n")));
}
await writeFile(new URL("../assets/puzzles/index.json", import.meta.url), JSON.stringify(index, null, 2) + "\n");
