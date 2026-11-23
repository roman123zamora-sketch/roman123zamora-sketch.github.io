import { createPositionTools } from "./position-tools.js";
import { nextSeed, possibleRatings, savePractice } from "./puzzle-progress.js";

export async function findPuzzle(worker, { category, rating, recent }, takeSeed) {
  const targetRating = Math.min(rating, 3000);
  let candidate;
  for (let attempt = 0; attempt < 3; attempt++) {
    const puzzle = await worker.run("puzzle", { category, rating: targetRating, recent, seed: takeSeed() });
    if (!puzzle.retry && (!candidate ||
        Math.abs(puzzle.difficulty - targetRating) < Math.abs(candidate.difficulty - targetRating))) candidate = puzzle;
    if (candidate && Math.abs(candidate.difficulty - targetRating) <= 200) break;
  }
  return candidate;
}

// Labels are 200 points apart. Between two 100-point boundaries, targets
// agree on both the difficulty ordering and whether a result is within 200.
export function puzzleTargetBucket(rating) {
  const target = Math.min(rating, 3000);
  return 2 * Math.floor(target / 100) + (target % 100 === 0 ? 0 : 1);
}

export function createPuzzlePrefetch(practice) {
  const jobs = new Map();
  const { category, recent } = practice;
  const excluded = [...recent, practice.active.puzzle.id];
  for (const rating of possibleRatings(practice)) {
    const bucket = puzzleTargetBucket(rating);
    if (jobs.has(bucket)) continue;
    const worker = createPositionTools();
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
      return chosen?.result;
    },
    close() {
      for (const job of jobs.values()) job.worker.close();
      jobs.clear();
    }
  };
}
