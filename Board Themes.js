import { createChessPiece, pieceName } from "./Chess Pieces.js";

export const themes = [
  {"id": "classic", "price": 0, "name": "Classic", "light": "#ecf6ff", "dark": "#7fa5cc", "frame": "#324e70", "stroke": "#496b90"},
  {"id": "honeyFrost", "price": 10, "name": "Honey Frost", "light": "#fff5d6", "dark": "#9a5b12", "frame": "#422c0a", "stroke": "#925c16"},
  {"id": "walnut", "price": 15, "name": "Walnut", "light": "#eddcc4", "dark": "#a06e4a", "frame": "#302116", "stroke": "#6e4c32"},
  {"id": "lavenderMilk", "price": 20, "name": "Lavender Milk", "light": "#f4ecff", "dark": "#6941a5", "frame": "#281a42", "stroke": "#7048a0"},
  {"id": "ocean", "price": 25, "name": "Ocean", "light": "#deeef6", "dark": "#6096be", "frame": "#10202c", "stroke": "#3c6e96"},
  {"id": "cherry", "price": 35, "name": "Cherry", "light": "#f6e2dc", "dark": "#be605a", "frame": "#2c1412", "stroke": "#8c423c"},
  {"id": "slate", "price": 45, "name": "Slate", "light": "#e4e6ea", "dark": "#787e8a", "frame": "#1c1e24", "stroke": "#505662"},
  {"id": "duskEmber", "price": 50, "name": "Dusk Ember", "light": "#f9c69a", "dark": "#293b63", "frame": "#141c30", "stroke": "#5a6ea5"},
  {"id": "sandstorm", "price": 60, "name": "Sandstorm", "light": "#f5e8c8", "dark": "#c8a460", "frame": "#2e2618", "stroke": "#8c7040"},
  {"id": "emeraldCoast", "price": 70, "name": "Emerald", "light": "#f2d6a1", "dark": "#176b4a", "frame": "#0c3426", "stroke": "#4a8c6c"},
  {"id": "rosewood", "price": 75, "name": "Rosewood", "light": "#f8e4e8", "dark": "#c8788c", "frame": "#2e1820", "stroke": "#965064"},
  {"id": "berryDusk", "price": 90, "name": "Grape", "light": "#f5c4d5", "dark": "#532b58", "frame": "#221224", "stroke": "#824882"},
  {"id": "midnight", "price": 90, "name": "Midnight", "light": "#d2def0", "dark": "#3c4878", "frame": "#0a0c1a", "stroke": "#323c6e"},
  {"id": "marble", "price": 110, "name": "Marble", "light": "#f5f6f8", "dark": "#a8acb6", "frame": "#24262c", "stroke": "#787c86"},
  {"id": "copperSage", "price": 120, "name": "Copper", "light": "#dde6d3", "dark": "#7e4d36", "frame": "#3a241a", "stroke": "#78503a"},
  {"id": "forest", "price": 135, "name": "Forest", "light": "#d6ecd2", "dark": "#346e46", "frame": "#0a1a10", "stroke": "#28643c"},
  {"id": "ice", "price": 160, "name": "Glacier", "light": "#e6f4fa", "dark": "#96c4e0", "frame": "#c4d8e8", "stroke": "#78a0be"},
  {"id": "onyxFlame", "price": 180, "name": "Onyx Flame", "light": "#f4b183", "dark": "#24232b", "frame": "#0e0e12", "stroke": "#c86428"},
  {"id": "amethyst", "price": 190, "name": "Amethyst", "light": "#eee4f8", "dark": "#8264b4", "frame": "#1e162c", "stroke": "#644c96"},
  {"id": "crimson", "price": 230, "name": "Crimson", "light": "#f6dedc", "dark": "#963c3a", "frame": "#240e0e", "stroke": "#78302e"},
  {"id": "royalGold", "price": 280, "name": "Gold", "light": "#f8f0d6", "dark": "#c49e4a", "frame": "#28200e", "stroke": "#967832"},
  {"id": "stormSteel", "price": 300, "name": "Steel", "light": "#cad8e7", "dark": "#394654", "frame": "#1a2028", "stroke": "#5a78b4"},
  {"id": "neonCity", "price": 340, "name": "Neon City", "light": "#586088", "dark": "#141624", "frame": "#0a0a12", "stroke": "#5a50c8"},
  {"id": "aurora", "price": 420, "name": "Aurora", "light": "#e0f6ee", "dark": "#26746e", "frame": "#0e1e20", "stroke": "#3c8c82"},
  {"id": "royalPlum", "price": 450, "name": "Royal", "light": "#f2d38a", "dark": "#55306f", "frame": "#22142e", "stroke": "#966e3c"},
  {"id": "volcano", "price": 520, "name": "Volcano", "light": "#96786a", "dark": "#221614", "frame": "#120a09", "stroke": "#be501e"},
  {"id": "voidRose", "price": 650, "name": "Void", "light": "#f2b3d3", "dark": "#31122f", "frame": "#160915", "stroke": "#b43c82"},
  {"id": "sakura", "price": 800, "name": "Sakura", "light": "#fceaf0", "dark": "#d696b0", "frame": "#341e28", "stroke": "#b46e8c"},
  {"id": "imperialSapphire", "price": 900, "name": "Saphire", "light": "#d7e8ff", "dark": "#132b63", "frame": "#0a1634", "stroke": "#3c64aa"},
  {"id": "galaxy", "price": 1000, "name": "Galaxy", "light": "#62589e", "dark": "#1c1636", "frame": "#0c091a", "stroke": "#826eeb"},
  {"id": "phoenixCrown", "price": 1200, "name": "Pheonix", "light": "#f8c18b", "dark": "#6e1f22", "frame": "#340f10", "stroke": "#a0322d"},
  {"id": "sovereignAurora", "price": 2400, "name": "Sovereign Aurora", "light": "#c9f1e5", "dark": "#14584f", "frame": "#082824", "stroke": "#3c9682"}
];

import { session } from "./game/session.js";

const colors = { w: "white", b: "black", R: "red", B: "blue", Y: "yellow", G: "green" };
const standard = "rnbqkbnr";
const mirrored = "rnbkqbnr";
export function getTheme() {
  return themes.find(theme => theme.id === session.profile.equippedBoard) ?? themes[0];
}

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
