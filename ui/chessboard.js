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

  const reverse = options.side === "b";
  const files = Array.from({ length: size }, (_, index) => "abcdefghijklmn"[reverse ? size - index - 1 : index]);
  const ranks = Array.from({ length: size }, (_, index) => reverse ? index + 1 : size - index);
  const inCenter = index => index >= 3 && index < size - 3;
  const position = !sample && !options.state ? startingPosition(fourPlayer) : null;
  for (let row = 0; row < size; row++) {
    for (let column = 0; column < size; column++) {
      const address = files[column] + ranks[row];
      const corner = fourPlayer && !sample && !inCenter(row) && !inCenter(column);
      const square = document.createElement(options.select && !corner ? "button" : "div");
      square.className = corner ? "square cutout" : (row + column) % 2 ? "square dark" : "square";
      const encoded = options.state?.board[address];
      const piece = options.state ? (encoded && { type: encoded[1], side: colors[encoded[0]] }) : position?.get(`${size - ranks[row]},${"abcdefghijklmn".indexOf(files[column])}`);
      if (!corner && !sample) {
        const description = piece ? `${piece.side} ${pieceName(piece.type)}` : "empty";
        square.setAttribute("aria-label", `${address}, ${description}`);
        // Follow the playable edge of each arm, skipping the four cutouts.
        const leftEdge = fourPlayer && !inCenter(row) ? 3 : 0;
        const bottomEdge = fourPlayer && !inCenter(column) ? size - 4 : size - 1;
        if (column === leftEdge) square.dataset.rank = ranks[row];
        if (row === bottomEdge) square.dataset.file = files[column];
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
        square.append(marker("check-marker", "!"));
        square.setAttribute("aria-label", square.getAttribute("aria-label") + ", in check");
      }
      if (!corner && !sample) {
        square.classList.toggle("selected", options.selected === address);
        const legalTarget = options.targets?.some(target => target.to === address) ?? false;
        if (legalTarget) {
          square.setAttribute("aria-label", square.getAttribute("aria-label") + ", legal destination");
          square.append(marker("move-marker"));
        }
        square.classList.toggle("target", legalTarget);
      }
      if (options.select && !corner) {
        square.type = "button";
        square.dataset.square = address;
        square.setAttribute("aria-pressed", String(options.selected === address));
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
  frame.append(element);
  return frame;
}


function marker(className, text = "") {
  const element = document.createElement("span");
  element.className = className;
  element.setAttribute("aria-hidden", "true");
  element.textContent = text;
  return element;
}
