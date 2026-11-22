import { createChessPiece } from "./Chess Pieces.js";

export const themes = [
  {"id": "classic", "name": "Classic", "light": "#e9f0e5", "dark": "#6a8e74", "frame": "#111d16", "stroke": "#3c664c"},
  {"id": "honeyFrost", "name": "Honey Frost", "light": "#fff5d6", "dark": "#9a5b12", "frame": "#422c0a", "stroke": "#925c16"},
  {"id": "walnut", "name": "Walnut", "light": "#eddcc4", "dark": "#a06e4a", "frame": "#302116", "stroke": "#6e4c32"},
  {"id": "lavenderMilk", "name": "Lavender Milk", "light": "#f4ecff", "dark": "#6941a5", "frame": "#281a42", "stroke": "#7048a0"},
  {"id": "ocean", "name": "Ocean", "light": "#deeef6", "dark": "#6096be", "frame": "#10202c", "stroke": "#3c6e96"},
  {"id": "cherry", "name": "Cherry", "light": "#f6e2dc", "dark": "#be605a", "frame": "#2c1412", "stroke": "#8c423c"},
  {"id": "slate", "name": "Slate", "light": "#e4e6ea", "dark": "#787e8a", "frame": "#1c1e24", "stroke": "#505662"},
  {"id": "duskEmber", "name": "Dusk Ember", "light": "#f9c69a", "dark": "#293b63", "frame": "#141c30", "stroke": "#5a6ea5"},
  {"id": "sandstorm", "name": "Sandstorm", "light": "#f5e8c8", "dark": "#c8a460", "frame": "#2e2618", "stroke": "#8c7040"},
  {"id": "emeraldCoast", "name": "Emerald", "light": "#f2d6a1", "dark": "#176b4a", "frame": "#0c3426", "stroke": "#4a8c6c"},
  {"id": "rosewood", "name": "Rosewood", "light": "#f8e4e8", "dark": "#c8788c", "frame": "#2e1820", "stroke": "#965064"},
  {"id": "berryDusk", "name": "Grape", "light": "#f5c4d5", "dark": "#532b58", "frame": "#221224", "stroke": "#824882"},
  {"id": "midnight", "name": "Midnight", "light": "#d2def0", "dark": "#3c4878", "frame": "#0a0c1a", "stroke": "#323c6e"},
  {"id": "marble", "name": "Marble", "light": "#f5f6f8", "dark": "#a8acb6", "frame": "#24262c", "stroke": "#787c86"},
  {"id": "copperSage", "name": "Copper", "light": "#dde6d3", "dark": "#7e4d36", "frame": "#3a241a", "stroke": "#78503a"},
  {"id": "forest", "name": "Forest", "light": "#d6ecd2", "dark": "#346e46", "frame": "#0a1a10", "stroke": "#28643c"},
  {"id": "ice", "name": "Glacier", "light": "#e6f4fa", "dark": "#96c4e0", "frame": "#c4d8e8", "stroke": "#78a0be"},
  {"id": "onyxFlame", "name": "Onyx Flame", "light": "#f4b183", "dark": "#24232b", "frame": "#0e0e12", "stroke": "#c86428"},
  {"id": "amethyst", "name": "Amethyst", "light": "#eee4f8", "dark": "#8264b4", "frame": "#1e162c", "stroke": "#644c96"},
  {"id": "crimson", "name": "Crimson", "light": "#f6dedc", "dark": "#963c3a", "frame": "#240e0e", "stroke": "#78302e"},
  {"id": "royalGold", "name": "Gold", "light": "#f8f0d6", "dark": "#c49e4a", "frame": "#28200e", "stroke": "#967832"},
  {"id": "stormSteel", "name": "Steel", "light": "#cad8e7", "dark": "#394654", "frame": "#1a2028", "stroke": "#5a78b4"},
  {"id": "neonCity", "name": "Neon City", "light": "#586088", "dark": "#141624", "frame": "#0a0a12", "stroke": "#5a50c8"},
  {"id": "aurora", "name": "Aurora", "light": "#e0f6ee", "dark": "#26746e", "frame": "#0e1e20", "stroke": "#3c8c82"},
  {"id": "royalPlum", "name": "Royal", "light": "#f2d38a", "dark": "#55306f", "frame": "#22142e", "stroke": "#966e3c"},
  {"id": "volcano", "name": "Volcano", "light": "#96786a", "dark": "#221614", "frame": "#120a09", "stroke": "#be501e"},
  {"id": "voidRose", "name": "Void", "light": "#f2b3d3", "dark": "#31122f", "frame": "#160915", "stroke": "#b43c82"},
  {"id": "sakura", "name": "Sakura", "light": "#fceaf0", "dark": "#d696b0", "frame": "#341e28", "stroke": "#b46e8c"},
  {"id": "imperialSapphire", "name": "Saphire", "light": "#d7e8ff", "dark": "#132b63", "frame": "#0a1634", "stroke": "#3c64aa"},
  {"id": "galaxy", "name": "Galaxy", "light": "#62589e", "dark": "#1c1636", "frame": "#0c091a", "stroke": "#826eeb"},
  {"id": "phoenixCrown", "name": "Pheonix", "light": "#f8c18b", "dark": "#6e1f22", "frame": "#340f10", "stroke": "#a0322d"},
  {"id": "sovereignAurora", "name": "Sovereign Aurora", "light": "#c9f1e5", "dark": "#14584f", "frame": "#082824", "stroke": "#3c9682"}
];

const themeKey = "exalted-chess-board";
const standard = "rnbqkbnr";
const mirrored = "rnbkqbnr";
const armyNames = ["red", "blue", "yellow", "green"];

export function getTheme() {
  return themes.find(theme => theme.id === localStorage.getItem(themeKey)) ?? themes[0];
}

export function setTheme(theme) {
  localStorage.setItem(themeKey, theme.id);
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

export function board(theme, fourPlayer = false, sample = false) {
  const size = sample ? 4 : fourPlayer ? 14 : 8;
  const element = document.createElement("div");
  element.className = sample ? "board sample" : "board";
  element.setAttribute("aria-hidden", "true");
  element.style.setProperty("--size", size);
  for (const color of ["light", "dark", "frame", "stroke"]) {
    element.style.setProperty("--" + color, theme[color]);
  }

  const position = sample ? new Map() : startingPosition(fourPlayer);
  for (let row = 0; row < size; row++) {
    for (let column = 0; column < size; column++) {
      const square = document.createElement("div");
      const cross = index => index >= 3 && index <= 10;
      const corner = fourPlayer && !cross(row) && !cross(column);
      square.className = corner ? "square cutout" : (row + column) % 2 ? "square dark" : "square";
      const piece = position.get(`${row},${column}`);
      if (piece) {
        const army = armyNames.includes(piece.side);
        const image = createChessPiece(piece.type, army ? "white" : piece.side);
        if (army) image.classList.add(piece.side);
        square.append(image);
      }
      if (!sample && !fourPlayer && (column === 0 || row === 7)) {
        square.dataset.rank = column === 0 ? 8 - row : "";
        square.dataset.file = row === 7 ? "abcdefgh"[column] : "";
      }
      element.append(square);
    }
  }
  return element;
}
