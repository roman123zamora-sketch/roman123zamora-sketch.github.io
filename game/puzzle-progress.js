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
    if (saved && Number.isFinite(saved.rating) && Array.isArray(saved.rated) && saved.libraryProgress) {
      if (!validActive(saved.active)) saved.active = null;
      return saved;
    }
  } catch {
    // Begin with a fresh record if the saved record cannot be read.
  }
  const practice = { rating: startingPuzzleRating, rated: [], libraryProgress: {}, active: null };
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
  const prior = practice.rating;
  const id = active.puzzle.id;
  if (outcome !== "skipped" && !active.finishing) {
    if (active.rated && !practice.rated.includes(id) && !practice.libraryProgress[id]) {
      practice.rating = puzzleRating(prior, active, outcome);
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
  return practice.rating - prior;
}
