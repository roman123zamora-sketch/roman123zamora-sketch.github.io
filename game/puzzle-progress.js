import { readSetting, writeSetting } from "./session.js";

const key = "exalted-chess-puzzles-v1";
const modulus = 2147483647;
const historyLimit = 128;

export function loadPractice() {
  try {
    const saved = JSON.parse(readSetting(key));
    if (saved && Array.isArray(saved.recent) && Number.isInteger(saved.seed) &&
        Number.isFinite(saved.rating) && ["checkmate", "material"].includes(saved.category)) return saved;
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

export function resolvePuzzle(practice, outcome) {
  const { puzzle, hearts } = practice.active;
  const expected = 1 / (1 + 10 ** ((puzzle.difficulty - practice.rating) / 400));
  // An even reward keeps all half results exact. L = R.
  const reward = Math.max(2, 2 * Math.round(16 * (1 - expected)));
  const delta = outcome === "skipped" ? 0 : outcome === "failed" ? -reward :
    hearts === 3 ? reward : hearts === 2 ? reward / 2 : -reward / 2;
  const prior = practice.rating;
  practice.rating = Math.max(100, Math.min(2400, prior + delta));
  practice.recent = [...practice.recent, puzzle.id].slice(-historyLimit);
  practice.active = null;
  savePractice(practice);
  return practice.rating - prior;
}
