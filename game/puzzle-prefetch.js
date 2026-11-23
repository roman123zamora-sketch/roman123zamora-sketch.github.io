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

export async function findPuzzle(worker, { category, rating, recent }, takeSeed, batches = 3) {
  for (let attempt = 0; attempt < batches; attempt++) {
    const puzzle = await worker.run("puzzle", { category, rating, recent, seed: takeSeed() });
    if (matchesPuzzleTarget(puzzle, rating)) return { ...puzzle, targetRating: rating };
  }
}

export function createPuzzlePrefetch(practice) {
  const { active, category, recent, rated, rating } = practice;
  const targetRating = active.puzzle.targetRating === rating && !rated?.includes(active.puzzle.id)
    ? puzzleRating(rating, active, "solved")
    : rating;
  const worker = createPositionTools({ puzzleOnly: true });
  const result = findPuzzle(worker, {
    category, rating: targetRating, recent: [...recent, active.puzzle.id]
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
