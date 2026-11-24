import { createChessPiece, pieceName } from "./chess-pieces.js";

const colors = { w: "white", b: "black", R: "red", B: "blue", Y: "yellow", G: "green" };
const standard = "rnbqkbnr";
const mirrored = "rnbkqbnr";
const previewPosition = { a4: "bR", b4: "bN", c1: "wN", d1: "wR" };
const boardLayouts = new WeakMap();
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
  const layout = `${size}:${options.side === "b"}:${Boolean(options.select)}`;
  const existing = !sample && options.frame;
  const reuse = existing && boardLayouts.get(existing) === layout;
  const element = reuse ? existing.firstElementChild : document.createElement("div");
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
      const square = reuse ? element.children[row * size + column]
        : document.createElement(options.select && !corner ? "button" : "div");
      let image;
      if (reuse) {
        for (const child of [...square.children]) {
          if (child.classList.contains("chess-piece")) image = child;
          else child.remove();
        }
      }
      square.className = corner ? "square cutout" : (row + column) % 2 ? "square dark" : "square";
      const encoded = sample ? previewPosition[address] : options.state?.board[address];
      const piece = sample || options.state ? (encoded && { type: encoded[1], side: colors[encoded[0]] }) : position?.get(`${size - ranks[row]},${"abcdefghijklmn".indexOf(files[column])}`);
      if (!corner && !sample) {
        const description = piece ? `${piece.side} ${pieceName(piece.type)}` : "empty";
        square.setAttribute("aria-label", `${address}, ${description}`);
        // Follow the playable edge of each arm, skipping the four cutouts.
        const leftEdge = fourPlayer && !inCenter(row) ? 3 : 0;
        const bottomEdge = fourPlayer && !inCenter(column) ? size - 4 : size - 1;
        if (column === leftEdge) square.dataset.rank = ranks[row];
        if (row === bottomEdge) square.dataset.file = files[column];
      }
      if (image && (!piece || image.dataset.art !== `${piece.type.toLowerCase()}-${piece.side}`)) {
        image.remove();
        image = undefined;
      }
      if (piece) {
        if (!image) {
          image = createChessPiece(piece.type, piece.side);
          square.append(image);
        }
        image.classList.toggle("eliminated", Boolean(options.state?.eliminated?.[encoded?.[0]]));
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
      if (!corner && !sample) {
        const last = options.state?.lastMove;
        square.classList.toggle("last-move", [last?.from, last?.to].includes(address));
        const premoveIndex = options.premoves?.findIndex(move => move.to === address) ?? -1;
        if (premoveIndex >= 0) {
          square.classList.add("premove-target");
          square.append(marker("premove-number", String(premoveIndex + 1)));
          square.setAttribute("aria-label", square.getAttribute("aria-label") + `, premove ${premoveIndex + 1} destination`);
        }
        const suggestion = options.bestMove;
        if (suggestion && (address === suggestion.from || address === suggestion.to)) {
          const target = address === suggestion.to;
          square.classList.add(target ? "best-move-to" : "best-move-from");
          square.setAttribute("aria-label", square.getAttribute("aria-label") +
            (target ? ", best move destination" : ", best move origin"));
        }
      }
      if (options.select && !corner) {
        square.type = "button";
        square.dataset.square = address;
        square.setAttribute("aria-pressed", String(options.selected === address));
        if (!reuse) {
          square.addEventListener("click", () => options.select(address));
          square.addEventListener("contextmenu", event => {
            event.preventDefault();
            square.classList.toggle("marked");
            options.mark?.(address);
          });
        }
        square.classList.toggle("marked", options.marks?.has(address) ?? false);
      }
      if (!reuse) element.append(square);
    }
  }
  if (sample) return element;
  if (reuse) return existing;

  const frame = document.createElement("div");
  frame.className = "board-frame";
  frame.append(element);
  boardLayouts.set(frame, layout);
  return frame;
}


function marker(className, text = "") {
  const element = document.createElement("span");
  element.className = className;
  element.setAttribute("aria-hidden", "true");
  element.textContent = text;
  return element;
}
