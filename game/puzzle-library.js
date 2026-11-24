import { loadPublishedPuzzle, readPublishedIndex } from "./puzzle-pool.js";

export const puzzleCategories = ["checkmate", "material"];
export const puzzlesPerCategory = 25;
export const puzzlesPerLevel = puzzleCategories.length * puzzlesPerCategory;
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
  return puzzleCategories.flatMap(category => (index[category] ?? []).map(entry => ({ ...entry, category })));
}

export function levelEntries(entries, level, category) {
  const [low, high] = levels[level];
  return entries.filter(entry => entry.difficulty >= low && entry.difficulty <= high && (!category || entry.category === category));
}

export function levelProgress(entries, solved, level, category) {
  const puzzles = levelEntries(entries, level, category);
  const count = puzzles.filter(entry => solved[entry.id] === "solved").length;
  return { count, available: puzzles.length, complete: puzzles.length > 0 && count === puzzles.length };
}

export const solvesToUnlock = 10;

export function levelLock(entries, practice, level, category) {
  if (level <= (practice.previouslyUnlocked?.[category] ?? 0)) return "";
  for (let prior = practice.earnedLevel ?? 0; prior < level; prior++) {
    const missing = puzzleCategories.map(category => {
      const count = levelProgress(entries, practice.libraryProgress, prior, category).count;
      const remaining = solvesToUnlock - count;
      const name = category === "checkmate" ? "Checkmate" : "Material";
      return remaining > 0 ? `${remaining} more ${name} ${remaining === 1 ? "puzzle" : "puzzles"}` : "";
    }).filter(Boolean);
    if (missing.length) return `Solve ${missing.join(" and ")} to unlock the next level (${levelLabel(levels[prior])}).`;
  }
  return "";
}

export function highestUnlocked(entries, practice, category) {
  return levels.findLastIndex((_, level) => !levelLock(entries, practice, level, category));
}

export function recommendedLevel(entries, practice, category) {
  const unlocked = highestUnlocked(entries, practice, category);
  return Math.min(unlocked, practice.recommendations?.[category] ?? levelOf(practice.ratings[category]));
}

export function updateRecommendation(entries, practice, category, level) {
  const samples = (practice.firstAttempts ?? []).filter(item => item.category === category && item.level === level).slice(-5);
  const current = recommendedLevel(entries, practice, category);
  if (samples.length < 4) return;
  const struggling = samples.filter(item => item.outcome === "failed" || item.hearts <= 1 || item.hints >= 2).length;
  const ready = samples.filter(item => item.outcome === "solved" && item.hearts >= 2 && item.hints === 0).length;
  practice.recommendations ??= {};
  if (struggling >= 3 && level <= current + 1) {
    practice.recommendations[category] = Math.max(0, level - 1);
  } else if (ready >= 4 && level >= current) {
    const next = Math.min(level + 1, levels.length - 1);
    practice.recommendations[category] = levelLock(entries, practice, next, category) ? level : next;
  }
}

export function practiceQueue(entries, practice, category, level, recentId) {
  const seen = practice.seen ?? {};
  const status = practice.libraryProgress;
  const group = entry => status[entry.id] === "solved" ? 2 : !status[entry.id] && !seen[entry.id] ? 0 : 1;
  const recentAttempts = (practice.firstAttempts ?? []).filter(item => item.category === category && item.level === level).slice(-5);
  const needsEasier = recentAttempts.filter(item => item.outcome === "failed" || item.hearts <= 1 || item.hints >= 2).length >= 3;
  const [low, high] = levels[level];
  const target = needsEasier ? low + (high - low) / 4 : practice.ratings[category];
  const recent = entry => Number(entry.id === recentId || entry.id === practice.lastSkipped);
  return levelEntries(entries, level, category).sort((a, b) =>
    recent(a) - recent(b) || group(a) - group(b) ||
    (group(a) === 2 ? (seen[a.id] ?? 0) - (seen[b.id] ?? 0) : 0) ||
    Math.abs(a.difficulty - target) - Math.abs(b.difficulty - target));
}

export function isRatedPuzzle(practice, puzzle) {
  const [low, high] = levels[levelOf(puzzle.difficulty)];
  const rating = practice.ratings[puzzle.category];
  return rating >= low && rating <= high &&
    !practice.rated.includes(puzzle.id) && !practice.libraryProgress[puzzle.id];
}

export async function openLibraryPuzzle(entry) {
  const puzzle = await loadPublishedPuzzle(entry.category, entry);
  if (puzzle?.id === entry.id && puzzle.category === entry.category && puzzle.difficulty === entry.difficulty) return puzzle;
}

export function puzzleChoice(step, move) {
  const answer = step.move;
  return answer.from === move.from && answer.to === move.to && answer.promotion === move.promotion ? step : undefined;
}
