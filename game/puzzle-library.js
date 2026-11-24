import { eligiblePuzzles, loadPublishedPuzzle, readPublishedIndex } from "./puzzle-pool.js";

export const levels = [
  [200, 399], [400, 599], [600, 799], [800, 999],
  [1000, 1249], [1250, 1499], [1500, 1749], [1750, Infinity]
];

export const levelLabel = ([low, high]) => Number.isFinite(high) ? `${low}–${high}` : `${low}+`;
export const levelOf = difficulty => Math.max(0, levels.findIndex(([, high]) => difficulty <= high));

export async function libraryEntries(name) {
  const index = await readPublishedIndex(name);
  return Object.entries(index).flatMap(([category, entries]) => entries.map(entry => ({ ...entry, category })));
}

export function ratedEntries(entries, practice) {
  const level = levelOf(practice.rating);
  return eligiblePuzzles(entries, practice)
    .filter(entry => Math.abs(levelOf(entry.difficulty) - level) <= 1)
    .sort((a, b) => Number(levelOf(b.difficulty) === level) - Number(levelOf(a.difficulty) === level));
}

export async function openLibraryPuzzle(entry, rating) {
  const puzzle = await loadPublishedPuzzle(entry.category, entry);
  if (puzzle?.id === entry.id && puzzle.category === entry.category && puzzle.difficulty === entry.difficulty) {
    return { ...puzzle, targetRating: rating };
  }
}
