import { previousLevels, previousMixedLevels } from "./puzzle-legacy-levels.js";
import { readSetting, writeSetting } from "./session.js";

// This key is also the reset marker. Never replace an existing season record
// with legacy ratings or completion data.
export const puzzleProgressKey = "exalted-chess-puzzle-progression-v2";
export const startingPuzzleRating = 400;

function validActive(active) {
  return active && typeof active.id === "string" && active.puzzle?.steps?.[active.step]?.legal &&
    Number.isInteger(active.hearts) && active.hearts >= 0 && active.hearts <= 3;
}

export function loadPractice() {
  try {
    const saved = JSON.parse(readSetting(puzzleProgressKey));
    const hasSplitRatings = Number.isFinite(saved?.ratings?.checkmate) && Number.isFinite(saved?.ratings?.material);
    if ((hasSplitRatings || Number.isFinite(saved?.rating)) && Array.isArray(saved.rated) && saved.libraryProgress) {
      if (!validActive(saved.active)) saved.active = null;
      if (!Number.isInteger(saved.earnedLevel)) {
        let earned = 0;
        while (previousLevels[earned]?.every(id => saved.libraryProgress[id] === "solved")) earned++;
        saved.earnedLevel = earned;
        savePractice(saved);
      }
      if (!saved.tacticalLibraryMigrated) {
        let earned = 0;
        while (previousMixedLevels[earned]?.every(id => saved.libraryProgress[id] === "solved")) earned++;
        saved.earnedLevel = Math.max(earned, saved.earnedLevel);
        if (saved.active?.puzzle.category === "positional") saved.active = null;
        saved.tacticalLibraryMigrated = true;
        savePractice(saved);
      }
      if (!hasSplitRatings) {
        saved.ratings = { checkmate: saved.rating, material: saved.rating };
        delete saved.rating;
        savePractice(saved);
      }
      return saved;
    }
  } catch {
    // Begin with a fresh record if the saved record cannot be read.
  }
  const practice = { ratings: { checkmate: startingPuzzleRating, material: startingPuzzleRating }, rated: [], libraryProgress: {}, active: null, earnedLevel: 0, tacticalLibraryMigrated: true };
  savePractice(practice);
  return practice;
}

export function savePractice(practice) {
  writeSetting(puzzleProgressKey, JSON.stringify(practice));
}

export function puzzleRating(rating, { hearts, hintsUsed = 0 }, outcome) {
  if (outcome === "failed") return rating - 10;
  if (outcome !== "solved") return rating;
  return rating + hearts * 5 - Math.min(2, hintsUsed) * 5;
}

export function resolvePuzzle(practice, active, outcome) {
  if (active !== practice.active || !active) return 0;
  const { category, id } = active.puzzle;
  const prior = practice.ratings[category];
  if (outcome !== "skipped" && !active.finishing) {
    if (active.rated && !practice.rated.includes(id) && !practice.libraryProgress[id]) {
      practice.ratings[category] = puzzleRating(prior, active, outcome);
      practice.rated.push(id);
    }
    if (practice.libraryProgress[id] !== "solved") practice.libraryProgress[id] = outcome;
  }
  if (outcome === "failed") {
    active.rated = false;
    active.finishing = true;
  } else {
    if (outcome === "solved") practice.libraryProgress[id] = "solved";
    practice.active = null;
  }
  // Persist rating, credit, and the exact position together before advancing.
  savePractice(practice);
  return practice.ratings[category] - prior;
}
