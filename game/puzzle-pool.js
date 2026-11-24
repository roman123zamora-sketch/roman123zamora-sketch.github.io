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

const indexes = new Map();

export function readPublishedIndex(name = "index") {
  if (!indexes.has(name)) {
    const request = fetch(new URL(name + ".json", assetRoot))
      .then(response => {
        if (!response.ok) throw new Error("Puzzle library unavailable");
        return response.json();
      })
      .catch(() => { indexes.delete(name); return {}; });
    indexes.set(name, request);
  }
  return indexes.get(name);
}

const payloads = new Map();

export function loadPublishedPuzzle(category, entry) {
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
