import assert from "node:assert/strict";
import {
  highestUnlocked, isRatedPuzzle, levelEntries, levelLock, levelProgress, levels, practiceQueue,
  puzzleCategories, recommendedLevel, updateRecommendation
} from "../game/puzzle-library.js";
import { loadPractice, migrateLibraryProgress, puzzleProgressKey, puzzleRating, resolvePuzzle, savePractice } from "../game/puzzle-progress.js";

const storage = new Map();
globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
const deck = levels.flatMap(([minimum], level) => puzzleCategories.flatMap(category =>
  Array.from({ length: 25 }, (_, index) => ({ id: `${level}-${category}-${index}`, category, difficulty: minimum + index }))));
for (const [hearts, rewards] of [[3, [15, 10, 5]], [2, [10, 5, 0]], [1, [5, 0, -5]]]) {
  for (const [hintsUsed, reward] of rewards.entries()) {
    assert.equal(puzzleRating(400, { hearts, hintsUsed }, "solved"), 400 + reward);
    assert.equal(puzzleRating(400, { hearts: 0, hintsUsed }, "failed"), 390);
  }
}
const practice = loadPractice();
practice.ratings = { checkmate: 400, material: 201 };
const band = (level, category) => levelEntries(deck, level, category);
function mark(level, category, count) {
  for (const item of band(level, category).slice(0, count)) practice.libraryProgress[item.id] = "solved";
}
function solve(puzzle, { hintsUsed = 0, hearts = 3, fresh = true, failFirst = false } = {}) {
  const active = { id: puzzle.id, puzzle, hearts, hintsUsed, fresh, rated: isRatedPuzzle(practice, puzzle) };
  practice.active = active;
  if (failFirst) {
    active.hearts = 0;
    resolvePuzzle(practice, active, "failed");
  }
  return resolvePuzzle(practice, active, "solved");
}

mark(0, "material", 10);
mark(0, "checkmate", 8);
assert.match(levelLock(deck, practice, 1, "material"), /Solve 2 more Checkmate puzzles/);
assert.equal(solve(band(0, "checkmate")[8], { hintsUsed: 2 }), 0);
assert.match(levelLock(deck, practice, 1, "checkmate"), /Solve 1 more Checkmate puzzle to/);
assert.equal(solve(band(0, "checkmate")[9], { failFirst: true }), 0);
for (const category of puzzleCategories) {
  assert.equal(levelLock(deck, practice, 1, category), "");
  assert.equal(highestUnlocked(deck, practice, category), 1);
  assert.equal(levelProgress(deck, practice.libraryProgress, 0, category).complete, false);
}
const tally = levelProgress(deck, practice.libraryProgress, 0, "checkmate").count;
assert.equal(solve(band(0, "checkmate")[9], { fresh: false }), 0);
assert.equal(levelProgress(deck, practice.libraryProgress, 0, "checkmate").count, tally);
assert.equal(practice.hardest.checkmate, 209);
assert.equal(practice.firstAttempts.length, 2);

const tried = band(1, "checkmate")[0];
practice.libraryProgress[tried.id] = "failed";
assert.notEqual(practiceQueue(deck, practice, "checkmate", 1)[0].id, tried.id);
for (const item of band(1, "checkmate").slice(1)) practice.seen = { ...practice.seen, [item.id]: 1 };
assert.equal(practiceQueue(deck, practice, "checkmate", 1)[0].category, "checkmate");
mark(1, "checkmate", 25);
practice.libraryProgress[tried.id] = "failed";
assert.equal(practiceQueue(deck, practice, "checkmate", 1)[0].id, tried.id);
assert.equal(solve(tried, { fresh: false }), 0);
assert.equal(levelProgress(deck, practice.libraryProgress, 1, "checkmate").complete, true);
assert.equal(practiceQueue(deck, practice, "checkmate", 1).length, 25);

practice.recommendations = { checkmate: 1, material: 1 };
const attempt = (category, outcome, hearts, hints = 0) => ({ category, level: 1, outcome, hearts, hints });
practice.firstAttempts = [attempt("checkmate", "failed", 0)];
updateRecommendation(deck, practice, "checkmate", 1);
assert.equal(recommendedLevel(deck, practice, "checkmate"), 1);
practice.firstAttempts.push(attempt("checkmate", "failed", 0), attempt("checkmate", "solved", 1),
  attempt("checkmate", "solved", 3));
updateRecommendation(deck, practice, "checkmate", 1);
assert.equal(recommendedLevel(deck, practice, "checkmate"), 0);
assert.equal(recommendedLevel(deck, practice, "material"), 1);
assert.equal(highestUnlocked(deck, practice, "checkmate"), 1);
savePractice(practice);
assert.deepEqual(loadPractice().recommendations, practice.recommendations);

const legacy = { ...practice, rating: 550, earnedLevel: 3 };
delete legacy.ratings;
storage.set(puzzleProgressKey, JSON.stringify(legacy));
const upgraded = loadPractice();
assert.deepEqual(upgraded.ratings, { checkmate: 550, material: 550 });
assert.equal(levelLock(deck, upgraded, 3, "material"), "");
assert.deepEqual(upgraded.libraryProgress, practice.libraryProgress);
assert.equal(loadPractice().rating, undefined);
console.log("Independent recommendations, shared ten-solve gates, retries, first attempts and retained access passed.");

const former = loadPractice();
delete former.previouslyUnlocked;
former.earnedLevel = 0;
former.ratings = { checkmate: 350, material: 200 };
former.libraryProgress = { [band(2, "checkmate")[0].id]: "solved" };
migrateLibraryProgress(deck, former);
assert.equal(levelLock(deck, former, 2, "checkmate"), "");
assert.notEqual(levelLock(deck, former, 2, "material"), "");
assert.equal(former.hardest.checkmate, 600);
