import { createChessPiece, pieceName } from "./chess-pieces.js";

const colors = { w: "white", b: "black", R: "red", B: "blue", Y: "yellow", G: "green" };
const standard = "rnbqkbnr";
const mirrored = "rnbkqbnr";
const previewPosition = { a4: "bR", b4: "bN", c1: "wN", d1: "wR" };
const boardLayouts = new WeakMap();
const boardOptions = new WeakMap();
const squareVisuals = new WeakMap();
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

const directions = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };

function bindKeyboardMoves(element, size) {
  element.addEventListener("keydown", event => {
    const direction = directions[event.key];
    if (!direction || !event.target.matches("button.square")) return;
    const index = [...element.children].indexOf(event.target);
    const [rankStep, fileStep] = direction;
    let rank = Math.floor(index / size) + rankStep;
    let file = index % size + fileStep;
    event.preventDefault();
    while (rank >= 0 && rank < size && file >= 0 && file < size) {
      const square = element.children[rank * size + file];
      if (square.matches("button.square")) {
        square.focus({ preventScroll: true });
        return;
      }
      rank += rankStep;
      file += fileStep;
    }
  });
}

export function board(theme, fourPlayer = false, sample = false, options = {}) {
  const size = sample ? 4 : fourPlayer ? 14 : 8;
  const layout = `${size}:${options.side === "b"}:${Boolean(options.select)}`;
  const existing = !sample && options.frame;
  const reuse = existing && boardLayouts.get(existing) === layout;
  const element = reuse ? existing.firstElementChild : document.createElement("div");
  if (!reuse) {
    element.className = sample ? "board sample" : "board";
    if (sample) element.setAttribute("aria-hidden", "true");
    else element.setAttribute("aria-label", fourPlayer ? "Four-player board" : "Chessboard");
    element.style.setProperty("--size", size);
  }
  for (const color of ["light", "dark", "frame", "stroke"]) {
    const property = "--" + color;
    if (element.style.getPropertyValue(property) !== theme[color]) element.style.setProperty(property, theme[color]);
  }
  boardOptions.set(element, options);
  const targets = new Map(options.targets?.map(target => [target.to, target]));
  const checkedColors = new Set(options.state?.checkedColors ? Object.values(options.state.checkedColors)
    : options.state?.status === "check" ? [options.state.turn] : []);
  const last = options.state?.lastMove;

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
      const encoded = sample ? previewPosition[address] : (options.preview?.board ?? options.state?.board)?.[address];
      const piece = sample || options.state ? (encoded && { type: encoded[1], side: colors[encoded[0]] }) : position?.get(`${size - ranks[row]},${"abcdefghijklmn".indexOf(files[column])}`);
      const art = piece && `${piece.type.toLowerCase()}-${piece.side}`;
      const eliminated = Boolean(options.state?.eliminated?.[encoded?.[0]]);
      const checked = piece?.type.toUpperCase() === "K" && options.state?.board[address] === encoded && checkedColors.has(encoded?.[0]);
      const steps = options.preview?.trail?.get(address);
      const legalTarget = targets.get(address);
      const isSelected = options.selected === address;
      const isMarked = options.marks?.has(address);
      const isPlanned = options.preview?.destinations?.has(address);
      const isLast = last?.from === address || last?.to === address;
      const suggestion = options.bestMove?.from === address ? "from" : options.bestMove?.to === address ? "to" : "";
      const draggable = !corner && options.select && options.canDrag?.(address);
      const dragging = options.dragSource === address;
      const wrong = options.wrong === address;
      const visual = [art, theme.id, eliminated, checked, steps?.join("·"), Boolean(legalTarget),
        Boolean(legalTarget?.capture), isSelected, isMarked, isPlanned, isLast, suggestion, draggable, dragging, wrong].join("|");
      if (reuse && squareVisuals.get(square) === visual) continue;
      squareVisuals.set(square, visual);

      let image;
      if (reuse) {
        for (const child of [...square.children]) {
          if (child.classList.contains("chess-piece")) image = child;
          else child.remove();
        }
      }
      square.className = corner ? "square cutout" : (row + column) % 2 ? "square dark" : "square";
      if (draggable) square.classList.add("drag-enabled");
      if (dragging) square.classList.add("drag-source");
      if (wrong) square.classList.add("puzzle-wrong");
      if (!corner && !sample) {
        const description = piece ? `${piece.side} ${pieceName(piece.type)}` : "empty";
        square.setAttribute("aria-label", `${address}, ${description}`);
        // Follow the playable edge of each arm, skipping the four cutouts.
        const leftEdge = fourPlayer && !inCenter(row) ? 3 : 0;
        const bottomEdge = fourPlayer && !inCenter(column) ? size - 4 : size - 1;
        if (column === leftEdge) square.dataset.rank = ranks[row];
        if (row === bottomEdge) square.dataset.file = files[column];
      }
      if (image && (!piece || image.dataset.art !== art || image.dataset.artTheme !== theme.id)) {
        image.remove();
        image = undefined;
      }
      if (piece) {
        if (!image) {
          image = createChessPiece(piece.type, piece.side, theme.id);
          square.append(image);
        }
        image.classList.toggle("eliminated", eliminated);
      }
      if (checked) {
        square.classList.add("checked");
        if (!steps) square.append(marker("check-marker", "!"));
        square.setAttribute("aria-label", square.getAttribute("aria-label") + ", in check");
      }
      if (!corner && !sample) {
        square.classList.toggle("selected", options.selected === address);
        if (legalTarget) {
          square.setAttribute("aria-label", square.getAttribute("aria-label") + ", legal destination");
          square.append(marker(legalTarget.capture || piece ? "move-marker capture-marker" : "move-marker"));
        }
        square.classList.toggle("target", Boolean(legalTarget));
      }
      if (!corner && !sample) {
        square.classList.toggle("last-move", isLast);
        if (isPlanned) {
          square.classList.add("premove-preview");
          square.setAttribute("aria-label", square.getAttribute("aria-label") + ", planned position");
        }
        if (steps) {
          square.classList.add("premove-trail");
          square.append(marker("check-marker premove-marker", (checked ? "! " : "") + steps.join("·")));
          square.setAttribute("aria-label", square.getAttribute("aria-label") +
            `, queued ${steps.length === 1 ? "move" : "moves"} ${steps.join(", ")}`);
        }
        if (suggestion) {
          const target = suggestion === "to";
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
          square.addEventListener("click", () => boardOptions.get(element).select(address));
          square.addEventListener("contextmenu", event => {
            const { mark } = boardOptions.get(element);
            if (!mark) return;
            event.preventDefault();
            square.classList.toggle("marked");
            mark(address);
          });
        }
        square.classList.toggle("marked", options.marks?.has(address) ?? false);
      }
      if (!reuse) element.append(square);
    }
  }
  if (sample) return element;
  if (reuse) return existing;
  if (options.select) bindKeyboardMoves(element, size);

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
