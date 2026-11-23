import { createPositionTools } from "./position-tools.js";
import { nextSeed, possibleRatings, savePractice } from "./puzzle-progress.js";

export async function findPuzzle(worker, { category, rating, recent }, takeSeed) {
  const matchingTarget = Math.max(400, Math.min(rating, 3000));
  for (let attempt = 0; attempt < 3; attempt++) {
    const puzzle = await worker.run("puzzle", { category, rating, recent, seed: takeSeed() });
    if (!puzzle.retry && Number.isFinite(puzzle.difficulty) &&
        puzzle.difficulty >= (matchingTarget >= 600 ? 600 : 400) &&
        Math.abs(puzzle.difficulty - matchingTarget) <= 200) {
      return { ...puzzle, targetRating: rating };
    }
  }
}

// Labels are 200 points apart. Between two 100-point boundaries, targets
// agree on both the difficulty ordering and whether a result is within 200.
export function puzzleTargetBucket(rating) {
  const target = Math.max(400, Math.min(rating, 3000));
  return 2 * Math.floor(target / 100) + (target % 100 === 0 ? 0 : 1);
}

export function createPuzzlePrefetch(practice) {
  const jobs = new Map();
  const { category, recent } = practice;
  const excluded = [...recent, practice.active.puzzle.id];
  for (const rating of possibleRatings(practice)) {
    const bucket = puzzleTargetBucket(rating);
    if (jobs.has(bucket)) continue;
    const worker = createPositionTools({ puzzleOnly: true });
    const result = findPuzzle(worker, { category, rating, recent: excluded }, () => {
      const seed = nextSeed(practice);
      savePractice(practice);
      return seed;
    }).catch(() => undefined).finally(() => worker.close());
    jobs.set(bucket, { worker, result });
  }
  return {
    take(rating) {
      const bucket = puzzleTargetBucket(rating);
      const chosen = jobs.get(bucket);
      for (const job of jobs.values()) if (job !== chosen) job.worker.close();
      jobs.clear();
      if (chosen) jobs.set(bucket, chosen);
      // Ratings in this bucket have identical generation and acceptance rules.
      return chosen?.result.then(puzzle => puzzle && { ...puzzle, targetRating: rating });
    },
    close() {
      for (const job of jobs.values()) job.worker.close();
      jobs.clear();
    }
  };
}
