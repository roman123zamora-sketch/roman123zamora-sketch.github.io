import { loadPublishedPuzzle, readPublishedIndex } from "./puzzle-pool.js";

export const puzzlesPerLevel = 20;
export const levels = [
  [200, 399], [400, 599], [600, 799], [800, 999],
  [1000, 1249], [1250, 1499], [1500, 1749], [1750, 1999],
  [2000, 2249], [2250, 2500]
];

export const levelLabel = ([low, high]) => `${low}–${high}`;
export function levelOf(rating) {
  const index = levels.findIndex(([, high]) => rating <= high);
  return index < 0 ? levels.length - 1 : index;
}

export async function libraryEntries() {
  const index = await readPublishedIndex();
  return Object.entries(index).flatMap(([category, entries]) => entries.map(entry => ({ ...entry, category })));
}

export function levelEntries(entries, level) {
  const [low, high] = levels[level];
  return entries.filter(entry => entry.difficulty >= low && entry.difficulty <= high);
}

export function levelProgress(entries, solved, level) {
  const puzzles = levelEntries(entries, level);
  const count = puzzles.filter(entry => solved[entry.id] === "solved").length;
  return { count, available: puzzles.length, complete: count === puzzlesPerLevel };
}

export function levelLock(entries, practice, level) {
  for (let prior = 0; prior < level; prior++) {
    const { count, complete } = levelProgress(entries, practice.libraryProgress, prior);
    if (!complete) {
      return `Solve all ${puzzlesPerLevel} in ${levelLabel(levels[prior])} (${count} solved).`;
    }
  }
  const [minimum] = levels[level];
  if (level && practice.rating < minimum) return `Reach ${minimum} puzzle Elo (current ${practice.rating}).`;
  return "";
}

export function isRatedPuzzle(practice, puzzle) {
  const [low, high] = levels[levelOf(puzzle.difficulty)];
  return practice.rating >= low && practice.rating <= high &&
    !practice.rated.includes(puzzle.id) && !practice.libraryProgress[puzzle.id];
}

export function nextPuzzleLevel(entries, practice, current) {
  const available = levels.map((_, index) => index).filter(index =>
    !levelLock(entries, practice, index) && levelEntries(entries, index).length);
  if (current !== undefined) {
    if (available.includes(current) && !levelProgress(entries, practice.libraryProgress, current).complete) {
      return current;
    }
    if (available.includes(current + 1)) return current + 1;
    if (levelLock(entries, practice, current)) {
      return available.filter(index => index < current).at(-1);
    }
    return;
  }
  return available.find(index => !levelProgress(entries, practice.libraryProgress, index).complete) ?? available.at(-1);
}

export async function openLibraryPuzzle(entry) {
  const puzzle = await loadPublishedPuzzle(entry.category, entry);
  if (puzzle?.id === entry.id && puzzle.category === entry.category && puzzle.difficulty === entry.difficulty) return puzzle;
}
