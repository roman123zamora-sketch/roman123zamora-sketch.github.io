import { readSetting, writeSetting } from "./session.js";

const key = "exalted-chess-puzzles-v1";
const modulus = 2147483647;
const historyLimit = 128;
const attemptsKey = "exalted-chess-puzzle-attempts-v1";
const attemptsLimit = 512;

function readAttempts() {
  try {
    const attempts = JSON.parse(readSetting(attemptsKey));
    return Array.isArray(attempts) ? attempts : [];
  } catch {
    return [];
  }
}

function validActive(active, category) {
  if (active == null) return true;
  const { puzzle, step, hearts } = active;
  return puzzle?.category === category && (category !== "material" || puzzle.materialProof === 2) && typeof puzzle.id === "string" &&
    Number.isFinite(puzzle.difficulty) && puzzle.origin?.board &&
    ["w", "b"].includes(puzzle.side) && Array.isArray(puzzle.steps) &&
    Number.isInteger(step) && step >= 0 && step < puzzle.steps.length &&
    Number.isInteger(hearts) && hearts >= 1 && hearts <= 3 &&
    puzzle.steps.every(frame => frame?.move?.from && frame.move.to && frame.position?.board && frame.legal);
}

export function loadPractice() {
  try {
    const saved = JSON.parse(readSetting(key));
    if (saved && Array.isArray(saved.recent) && Number.isInteger(saved.seed) &&
        Number.isFinite(saved.rating) && ["checkmate", "material"].includes(saved.category)) {
      const rating = Math.round(saved.rating / 5) * 5;
      const migrated = rating !== saved.rating || !Array.isArray(saved.rated);
      saved.rating = rating;
      if (!Array.isArray(saved.rated)) {
        const completed = readAttempts().filter(attempt =>
          typeof attempt?.id === "string" && (attempt.outcome === "solved" || attempt.outcome === "failed"));
        saved.rated = [...new Set(completed.map(attempt => attempt.id))];
      }
      if (!validActive(saved.active, saved.category)) saved.active = null;
      if (saved.active && !Number.isFinite(saved.active.hintsUsed)) {
        saved.active.hintsUsed = saved.active.assisted ? Math.max(1, saved.active.hint ?? 0) : 0;
      }
      if (saved.seed <= 0 || saved.seed >= modulus) saved.seed = 1;
      if (migrated) savePractice(saved);
      return saved;
    }
  } catch {
    // Restart practice if the stored record cannot be read.
  }
  return {
    category: "checkmate",
    rating: 400,
    seed: crypto.getRandomValues(new Uint32Array(1))[0] % (modulus - 1) + 1,
    recent: [],
    rated: [],
    active: null
  };
}

export function savePractice(practice) {
  writeSetting(key, JSON.stringify(practice));
}

export function nextSeed(practice) {
  practice.seed = (practice.seed * 48271) % modulus;
  return practice.seed;
}

export function puzzleRating(rating, { hearts, hintsUsed = 0 }, outcome) {
  if (outcome === "failed") return rating - 10;
  if (outcome !== "solved") return rating;
  return rating + hearts * 5 - Math.min(2, hintsUsed) * 5;
}

function recordAttempt(rating, active, outcome) {
  const recent = readAttempts();
  const { puzzle, hearts, elapsedMs, hintsUsed } = active;
  const attempt = {
    id: puzzle.id,
    category: puzzle.category,
    difficulty: puzzle.difficulty,
    ratingBand: Math.floor(rating / 200) * 200,
    outcome,
    assisted: Boolean(hintsUsed),
    mistakes: 3 - hearts,
    elapsedMs: Number.isFinite(elapsedMs) ? Math.max(0, Math.round(elapsedMs)) : null
  };
  const records = Array.isArray(recent) ? recent.slice(1 - attemptsLimit) : [];
  records.push(attempt);
  writeSetting(attemptsKey, JSON.stringify(records));
}

export function resolvePuzzle(practice, outcome) {
  const { puzzle } = practice.active;
  const prior = practice.rating;
  practice.rated ??= [];
  const firstCompletion = outcome !== "skipped" && !practice.rated.includes(puzzle.id);
  if (firstCompletion) {
    if (puzzle.targetRating === prior) practice.rating = puzzleRating(prior, practice.active, outcome);
    practice.rated.push(puzzle.id);
  }
  practice.recent = [...practice.recent, puzzle.id].slice(-historyLimit);
  const active = practice.active;
  practice.active = null;
  savePractice(practice);
  recordAttempt(prior, active, outcome);
  return practice.rating - prior;
}
