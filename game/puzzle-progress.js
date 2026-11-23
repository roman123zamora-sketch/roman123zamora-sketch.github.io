import { readSetting, writeSetting } from "./session.js";

const key = "exalted-chess-puzzles-v1";
const modulus = 2147483647;
const historyLimit = 128;
const attemptsKey = "exalted-chess-puzzle-attempts-v1";
const attemptsLimit = 512;

function validActive(active, category) {
  if (active == null) return true;
  const { puzzle, step, hearts } = active;
  return puzzle?.category === category && typeof puzzle.id === "string" &&
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
      if (!validActive(saved.active, saved.category)) saved.active = null;
      if (saved.seed <= 0 || saved.seed >= modulus) saved.seed = 1;
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

export function puzzleRating(rating, { puzzle, hearts, assisted }, outcome) {
  if (assisted || outcome === "skipped") return rating;
  if (outcome === "failed") {
    const expected = 1 / (1 + 10 ** ((puzzle.difficulty - rating) / 400));
    const penalty = Math.max(2, 2 * Math.round(16 * (1 - expected)));
    return Math.max(100, rating - penalty);
  }
  const startingReward = hearts === 3 ? 50 : hearts === 2 ? 30 : 20;
  const remaining = 1 - Math.max(0, Math.min(1, (rating - 400) / 1600));
  return rating + 10 + Math.ceil((startingReward - 10) * remaining);
}

export function possibleRatings(practice) {
  const { active, rating } = practice;
  const ratings = new Set([rating, puzzleRating(rating, active, "failed")]);
  for (let hearts = active.hearts; hearts > 0; hearts--) {
    ratings.add(puzzleRating(rating, { ...active, hearts }, "solved"));
  }
  return ratings;
}

function recordAttempt(rating, active, outcome) {
  let recent;
  try { recent = JSON.parse(readSetting(attemptsKey)); }
  catch { recent = []; }
  const { puzzle, hearts, elapsedMs, assisted } = active;
  const attempt = {
    id: puzzle.id,
    category: puzzle.category,
    difficulty: puzzle.difficulty,
    ratingBand: Math.floor(rating / 200) * 200,
    outcome,
    assisted: Boolean(assisted),
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
  practice.rating = puzzleRating(prior, practice.active, outcome);
  practice.recent = [...practice.recent, puzzle.id].slice(-historyLimit);
  const active = practice.active;
  practice.active = null;
  savePractice(practice);
  recordAttempt(prior, active, outcome);
  return practice.rating - prior;
}
