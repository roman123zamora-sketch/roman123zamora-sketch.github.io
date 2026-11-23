import { readSetting, writeSetting } from "./session.js";

export const puzzleTolerance = 200;
const reserveKey = "exalted-chess-puzzle-reserve-v1";
const reserveLimit = 8;
const assetRoot = new URL("../assets/puzzles/", import.meta.url);

export function puzzleIdea(puzzle) {
  const { side, category, origin, line } = puzzle;
  const first = line[0];
  const target = origin.board[first.to]?.[1] ?? "-";
  const mover = origin.board[first.from]?.[1] ?? "-";
  const signatures = [false, true].map(mirror => {
    const square = address => {
      const file = address.charCodeAt(0) - 97;
      const rank = Number(address[1]);
      return String.fromCharCode(97 + (mirror !== (side === "b") ? 7 - file : file)) +
        (side === "b" ? 9 - rank : rank);
    };
    const structure = Object.entries(origin.board)
      .filter(([, piece]) => "PK".includes(piece[1]))
      .map(([address, piece]) => (piece[0] === side ? "s" : "d") + piece[1] + square(address)).sort().join("");
    return [structure, square(first.from), square(first.to), ...line.slice(1, 3).map(move => square(move.to))].join("/");
  }).sort();
  return [category, mover, target, first.promotion ?? "-", signatures[0]].join(":");
}

export function matchesPuzzleTarget(puzzle, rating) {
  return Boolean(puzzle && !puzzle.retry && Number.isFinite(puzzle.difficulty) &&
    Math.abs(puzzle.difficulty - rating) <= puzzleTolerance);
}

export function eligiblePuzzles(entries, practice) {
  const excluded = new Set([...practice.recent, ...(practice.rated ?? []), ...(practice.seen ?? [])]);
  const seenIdeas = new Set(practice.seenIdeas ?? []);
  const unique = new Map(entries.map(puzzle => [puzzle.id, puzzle]));
  return [...unique.values()].filter(puzzle => matchesPuzzleTarget(puzzle, practice.rating) &&
    !excluded.has(puzzle.id) && !seenIdeas.has(puzzle.idea))
    .sort((left, right) => Math.abs(left.difficulty - practice.rating) - Math.abs(right.difficulty - practice.rating));
}

export function rememberPuzzle(practice, puzzle) {
  const idea = puzzle.idea ?? puzzleIdea(puzzle);
  practice.seen = [...new Set([...(practice.seen ?? []), puzzle.id])];
  practice.seenIdeas = [...new Set([...(practice.seenIdeas ?? []), idea])];
}

function readReserve() {
  try { return JSON.parse(readSetting(reserveKey)) ?? {}; }
  catch { return {}; }
}

export function saveVerifiedPuzzle(puzzle) {
  const reserve = readReserve();
  const entries = reserve[puzzle.category] ?? [];
  reserve[puzzle.category] = [
    { ...puzzle, idea: puzzle.idea ?? puzzleIdea(puzzle) },
    ...entries.filter(entry => entry.id !== puzzle.id)
  ].slice(0, reserveLimit);
  writeSetting(reserveKey, JSON.stringify(reserve));
}

let indexRequest;
function readIndex() {
  return indexRequest ??= fetch(new URL("index.json", assetRoot))
    .then(response => {
      if (!response.ok) throw new Error("Puzzle pool unavailable");
      return response.json();
    })
    .catch(() => { indexRequest = undefined; return {}; });
}

const payloads = new Map();

function readPayload(category, entry) {
  if (entry.origin) return Promise.resolve(entry);
  const key = category + "/" + entry.id;
  if (!payloads.has(key)) {
    const request = fetch(new URL(key + ".json", assetRoot))
      .then(response => response.ok ? response.json() : undefined)
      .catch(() => undefined)
      .then(puzzle => {
        if (!puzzle) payloads.delete(key);
        return puzzle;
      });
    payloads.set(key, request);
    if (payloads.size > 12) payloads.delete(payloads.keys().next().value);
  }
  return payloads.get(key);
}

async function available(practice) {
  const { category } = practice;
  const reserve = readReserve()[category] ?? [];
  const published = (await readIndex())[category] ?? [];
  return eligiblePuzzles([...published, ...reserve], practice);
}

export async function warmPuzzlePool(practice) {
  const { category } = practice;
  const candidates = await available({ ...practice });
  for (const candidate of candidates.slice(0, 2)) readPayload(category, candidate);
  return candidates.length;
}

export async function selectVerifiedPuzzle(practice) {
  const { category, rating } = practice;
  const candidates = await available({ ...practice });
  for (const candidate of candidates) {
    const puzzle = await readPayload(category, candidate);
    if (puzzle?.id === candidate.id && puzzle.category === category && matchesPuzzleTarget(puzzle, rating)) {
      return { puzzle: { ...puzzle, targetRating: rating }, supply: candidates.length };
    }
  }
  return { supply: 0 };
}
