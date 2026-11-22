import { createChessPiece, pieceName } from "./chess-pieces.js";

const colors = { w: "white", b: "black", R: "red", B: "blue", Y: "yellow", G: "green" };
const standard = "rnbqkbnr";
const mirrored = "rnbkqbnr";
function startingPosition(fourPlayer) {
  const squares = new Map();
  const place = (row, column, type, side) => squares.set(`${row},${column}`, { type, side });

  for (let i = 0; i < 8; i++) {
    if (fourPlayer) {
      const arm = i + 3;
      place(13, arm, standard[i], "red");
      place(12, arm, "p", "red");
      place(0, arm, mirrored[i], "yellow");
      place(1, arm, "p", "yellow");
      place(13 - arm, 0, standard[i], "blue");
      place(13 - arm, 1, "p", "blue");
      place(13 - arm, 13, mirrored[i], "green");
      place(13 - arm, 12, "p", "green");
    } else {
      place(0, i, standard[i], "black");
      place(1, i, "p", "black");
      place(6, i, "p", "white");
      place(7, i, standard[i], "white");
    }
  }

  return squares;
}

export function board(theme, fourPlayer = false, sample = false, options = {}) {
  const size = sample ? 4 : fourPlayer ? 14 : 8;
  const element = document.createElement("div");
  element.className = sample ? "board sample" : "board";
  if (sample) element.setAttribute("aria-hidden", "true");
  else element.setAttribute("aria-label", fourPlayer ? "Four-player board" : "Chessboard");
  element.style.setProperty("--size", size);
  for (const color of ["light", "dark", "frame", "stroke"]) {
    element.style.setProperty("--" + color, theme[color]);
  }

  const position = sample ? new Map() : startingPosition(fourPlayer);
  for (let row = 0; row < size; row++) {
    for (let column = 0; column < size; column++) {
      const rank = options.side === "b" ? row + 1 : size - row;
      const file = "abcdefghijklmn"[options.side === "b" ? size - column - 1 : column];
      const address = file + rank;
      const cross = index => index >= 3 && index <= 10;
      const corner = fourPlayer && !cross(row) && !cross(column);
      const square = document.createElement(options.select && !corner ? "button" : "div");
      square.className = corner ? "square cutout" : (row + column) % 2 ? "square dark" : "square";
      const encoded = options.state?.board[address];
      const piece = options.state ? (encoded && { type: encoded[1], side: colors[encoded[0]] }) : position.get(`${row},${column}`);
      if (!corner && !sample) {
        const description = piece ? `${piece.side} ${pieceName(piece.type)}` : "empty";
        square.setAttribute("aria-label", `${address}, ${description}`);
      }
      if (piece) {
        const image = createChessPiece(piece.type, piece.side);
        if (options.state?.eliminated?.[encoded?.[0]]) image.classList.add("eliminated");
        square.append(image);
      }
      const checked = piece?.type.toUpperCase() === "K" && (
        options.state?.checkedColors ? Object.values(options.state.checkedColors).includes(encoded?.[0]) :
          options.state?.status === "check" && encoded?.[0] === options.state.turn
      );
      if (checked) {
        square.classList.add("checked");
        square.setAttribute("aria-label", square.getAttribute("aria-label") + ", in check");
      }
      if (options.select && !corner) {
        square.type = "button";
        square.dataset.square = address;
        square.classList.toggle("selected", options.selected === address);
        square.setAttribute("aria-pressed", String(options.selected === address));
        if (options.targets.some(target => target.to === address)) {
          square.setAttribute("aria-label", square.getAttribute("aria-label") + ", legal destination");
        }
        square.classList.toggle("target", options.targets.some(target => target.to === address));
        const last = options.state?.lastMove;
        square.classList.toggle("last-move", [last?.from, last?.to].includes(address));
        square.addEventListener("click", () => options.select(address));
        square.addEventListener("contextmenu", event => {
          event.preventDefault();
          square.classList.toggle("marked");
          options.mark?.(address);
        });
        square.classList.toggle("marked", options.marks?.has(address) ?? false);
      }
      element.append(square);
    }
  }
  if (sample) return element;

  const frame = document.createElement("div");
  frame.className = "board-frame";
  frame.style.setProperty("--size", size);
  const reverse = options.side === "b";
  const files = Array.from({ length: size }, (_, index) => "abcdefghijklmn"[reverse ? size - index - 1 : index]);
  const ranks = Array.from({ length: size }, (_, index) => reverse ? index + 1 : size - index);
  frame.append(coordinates("ranks", ranks), element, coordinates("files", files));
  return frame;
}

function coordinates(axis, values) {
  const strip = document.createElement("div");
  strip.className = `board-coordinates board-${axis}`;
  strip.setAttribute("aria-hidden", "true");
  for (const value of values) {
    const label = document.createElement("span");
    label.textContent = value;
    strip.append(label);
  }
  return strip;
}
