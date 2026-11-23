import { createPositionTools } from "./position-tools.js";
import { nextSeed, puzzleRating, savePractice } from "./puzzle-progress.js";

const matchingTarget = rating => Math.max(400, Math.min(rating, 3000));

// The generator changes eligible solution lengths and search rules at these tiers.
export const puzzleSearchTier = rating => Math.floor((matchingTarget(rating) - 400) / 200);

export function matchesPuzzleTarget(puzzle, rating) {
  const target = matchingTarget(rating);
  return puzzle && !puzzle.retry && Number.isFinite(puzzle.difficulty) &&
    puzzle.difficulty >= (target >= 600 ? 600 : 400) &&
    Math.abs(puzzle.difficulty - target) <= 200;
}

export async function findPuzzle(worker, { category, rating, recent, timeMs }, takeSeed, batches = 3) {
  for (let attempt = 0; attempt < batches; attempt++) {
    const puzzle = await worker.run("puzzle", { category, rating, recent, timeMs, seed: takeSeed() });
    if (matchesPuzzleTarget(puzzle, rating)) return { ...puzzle, targetRating: rating };
  }
}

// Keep the player's target for scoring. If its search budget expires, try
// lower difficulty bands with the same legal, unique-solution proof.
export async function findRatedPuzzle(worker, search, takeSeed, current, onWiden, searchedTarget = false) {
  const { rating } = search;
  const recent = [...new Set([...search.recent, ...(search.rated ?? [])])];
  const bands = [...new Set([rating, Math.min(rating, 1000), Math.min(rating, 600), Math.min(rating, 400)])];
  let firstPass = true;
  while (current()) {
    for (const band of bands) {
      if (!current()) return;
      if (firstPass && searchedTarget && bands.length > 1 && band === rating) continue;
      if (band !== rating) onWiden();
      const puzzle = await findPuzzle(worker, { ...search, recent, rating: band, timeMs: band !== rating && band >= 1000 ? 1800 : undefined }, takeSeed, 1);
      if (puzzle && current()) return { ...puzzle, targetRating: rating };
    }
    firstPass = false;
  }
}

export function createPuzzlePrefetch(practice) {
  const { active, category, recent, rated, rating } = practice;
  const targetRating = active.puzzle.targetRating === rating && !rated?.includes(active.puzzle.id)
    ? puzzleRating(rating, active, "solved")
    : rating;
  const worker = createPositionTools({ puzzleOnly: true });
  const result = findPuzzle(worker, {
    category, rating: targetRating, recent: [...new Set([...recent, ...(rated ?? []), active.puzzle.id])]
  }, () => {
    const seed = nextSeed(practice);
    savePractice(practice);
    return seed;
  }, 1).catch(() => undefined).finally(() => worker.close());

  return {
    take(updatedRating) {
      if (puzzleSearchTier(updatedRating) !== puzzleSearchTier(targetRating)) {
        worker.close();
        return;
      }
      return result.then(puzzle => matchesPuzzleTarget(puzzle, updatedRating)
        ? { ...puzzle, targetRating: updatedRating } : undefined);
    },
    close: () => worker.close()
  };
}
