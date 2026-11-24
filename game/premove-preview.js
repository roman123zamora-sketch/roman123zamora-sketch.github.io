const homes = {
  w: ["e1", "a1", "h1"], b: ["e8", "a8", "h8"],
  R: ["h1", "d1", "k1"], B: ["a8", "a4", "a11"],
  Y: ["g14", "d14", "k14"], G: ["n7", "n4", "n11"]
};
const pawnEnd = { w: 8, b: 1, R: 8, B: 8, Y: 7, G: 7 };
const point = square => [square.charCodeAt(0), Number(square.slice(1))];
const squareAt = (file, rank) => String.fromCharCode(file) + rank;

export function premoveIntent(board, from, to, side) {
  const piece = board[from];
  if (from === to || piece?.[0] !== side || board[to]?.[0] === side) return;
  const move = { from, to, piece };
  const [x, y] = point(from);
  const [tx, ty] = point(to);
  const horizontal = side !== "B" && side !== "G";
  if (piece[1] === "P" && (horizontal ? ty : tx - 96) === pawnEnd[side]) {
    move.needsPromotion = true;
  }
  const [king, low, high] = homes[side];
  if (piece[1] !== "K" || from !== king ||
      !(horizontal ? y === ty && Math.abs(tx - x) === 2 : x === tx && Math.abs(ty - y) === 2)) return move;

  const dx = Math.sign(tx - x);
  const dy = Math.sign(ty - y);
  const rook = dx + dy < 0 ? low : high;
  if (board[rook] !== side + "R") return;
  for (let fx = x + dx, fy = y + dy; squareAt(fx, fy) !== rook; fx += dx, fy += dy) {
    if (board[squareAt(fx, fy)]) return;
  }
  return { ...move, rookFrom: rook, rookTo: squareAt(x + dx, y + dy) };
}

// The resulting board is only for display and entering intentions.
export function projectPremoves(realBoard, moves) {
  const board = { ...realBoard };
  const destinations = new Set();
  for (const move of moves) {
    if (board[move.from] !== move.piece || (move.rookFrom && board[move.rookFrom] !== move.piece[0] + "R")) break;
    delete board[move.from];
    destinations.delete(move.from);
    board[move.to] = move.promotion ? move.piece[0] + move.promotion : move.piece;
    destinations.add(move.to);
    if (move.rookFrom) {
      const rook = board[move.rookFrom];
      delete board[move.rookFrom];
      destinations.delete(move.rookFrom);
      board[move.rookTo] = rook;
      destinations.add(move.rookTo);
    }
  }
  return { board, destinations };
}
