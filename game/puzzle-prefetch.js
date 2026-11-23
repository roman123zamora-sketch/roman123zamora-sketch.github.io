import { matchesPuzzleTarget, puzzleIdea } from "./puzzle-pool.js";

export async function findRatedPuzzle(worker, search, takeSeed, current, batches) {
  const { category, rating } = search;
  const recent = new Set([...search.recent, ...(search.rated ?? []), ...(search.seen ?? [])]);
  const seenIdeas = new Set(search.seenIdeas ?? []);
  for (let attempt = 0; attempt < batches && current(); attempt++) {
    const puzzle = await worker.run("puzzle", { category, rating, recent: [...recent], seed: takeSeed() });
    if (!current() || !matchesPuzzleTarget(puzzle, rating)) continue;
    const idea = puzzleIdea(puzzle);
    if (!seenIdeas.has(idea)) return { ...puzzle, idea, targetRating: rating };
    recent.add(puzzle.id);
  }
}
