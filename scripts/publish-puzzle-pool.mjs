// Merge verified output from the game importer and simulation builder.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { puzzleIdea } from "../game/puzzle-pool.js";

const candidates = (await Promise.all(process.argv.slice(2).map(async path =>
  JSON.parse(await readFile(path, "utf8"))))).flat();
const index = {};
for (const category of ["checkmate", "material"]) {
  const identities = new Set();
  const selected = [];
  for (const puzzle of candidates.filter(item => item.category === category)) {
    const idea = puzzleIdea(puzzle);
    if (identities.has(puzzle.id) || identities.has(idea)) continue;
    identities.add(puzzle.id);
    identities.add(idea);
    selected.push({ ...puzzle, idea });
  }
  selected.sort((left, right) => left.difficulty - right.difficulty);
  const folder = new URL(`../assets/puzzles/${category}/`, import.meta.url);
  await mkdir(folder, { recursive: true });
  index[category] = selected.map(({ id, difficulty, idea }) => ({ id, difficulty, idea }));
  await Promise.all(selected.map(puzzle => writeFile(new URL(puzzle.id + ".json", folder),
    JSON.stringify(puzzle) + "\n")));
  console.log(category, selected.length, selected.map(puzzle => puzzle.difficulty).join(","));
}
await writeFile(new URL("../assets/puzzles/index.json", import.meta.url), JSON.stringify(index, null, 2) + "\n");
