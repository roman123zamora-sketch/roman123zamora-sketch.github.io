import { createPositionTools } from "./position-tools.js";
import { nextSeed, possibleRatings, savePractice } from "./puzzle-progress.js";

export async function findPuzzle(worker, { category, rating, recent }, takeSeed) {
  const targetRating = Math.min(rating, 2400);
  let candidate;
  for (let attempt = 0; attempt < 3; attempt++) {
    const puzzle = await worker.run("puzzle", { category, rating: targetRating, recent, seed: takeSeed() });
    if (!puzzle.retry && (!candidate ||
        Math.abs(puzzle.difficulty - targetRating) < Math.abs(candidate.difficulty - targetRating))) candidate = puzzle;
    if (candidate && Math.abs(candidate.difficulty - targetRating) <= 200) break;
  }
  return candidate;
}

export function createPuzzlePrefetch(practice) {
  const jobs = new Map();
  const { category, recent } = practice;
  const excluded = [...recent, practice.active.puzzle.id];
  for (const rating of possibleRatings(practice)) {
    const worker = createPositionTools();
    const result = findPuzzle(worker, { category, rating, recent: excluded }, () => {
      const seed = nextSeed(practice);
      savePractice(practice);
      return seed;
    }).catch(() => undefined).finally(() => worker.close());
    jobs.set(rating, { worker, result });
  }
  return {
    take(rating) {
      const chosen = jobs.get(rating);
      for (const job of jobs.values()) if (job !== chosen) job.worker.close();
      jobs.clear();
      if (chosen) jobs.set(rating, chosen);
      return chosen?.result;
    },
    close() {
      for (const job of jobs.values()) job.worker.close();
      jobs.clear();
    }
  };
}
