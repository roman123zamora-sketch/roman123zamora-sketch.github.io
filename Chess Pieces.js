const names = { p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king" };

const palettes = {
  white: ["#ffffff", "#dcecff", "#9bbad7", "#233b57", "#f7fbff"],
  black: ["#425f82", "#1c3453", "#0b182c", "#0b192d", "#acc9e8"],
  red: ["#ffb09c", "#d75149", "#982c34", "#541917", "#ffd0bc"],
  blue: ["#a0d4ff", "#437dc7", "#285287", "#122c56", "#d4ebff"],
  yellow: ["#fff1a9", "#efc14b", "#b87c24", "#59400e", "#fff5c8"],
  green: ["#adf2c5", "#4db879", "#277650", "#143d2c", "#d7fbe6"]
};

const dragArt = new Map();
let nextId = 0;

const silhouettes = {
  p: '<path d="M19 40c4-5 6-9 6-14a8 8 0 1 1 14 0c0 5 2 9 6 14z"/>',
  n: '<path d="M18 41c0-9 6-15 16-20l-8 2-5 5-7-5 8-11 8-4 3-6 5 7c11 5 13 18 8 32z"/><path d="m25 15 3-1" fill="none" stroke="DETAIL"/>',
  b: '<path d="M18 40c4-4 7-9 8-14-4-3-5-7-2-11l8-10 8 10c3 4 2 8-2 11 1 5 4 10 8 14z"/><path d="m35 11-6 10" fill="none" stroke="DETAIL"/><circle cx="32" cy="5" r="3"/>',
  r: '<path d="M15 10h8v6h5v-6h8v6h5v-6h8v14l-7 5c0 6 2 9 4 11H18c2-2 4-5 4-11l-7-5z"/><path d="M22 29h20" fill="none" stroke="DETAIL"/>',
  q: '<path d="m12 15 10 10 4-13 6 11 6-11 4 13 10-10-7 24H19z"/><circle cx="11" cy="13" r="3"/><circle cx="26" cy="10" r="3"/><circle cx="38" cy="10" r="3"/><circle cx="53" cy="13" r="3"/>',
  k: '<path d="M29 4h6v5h5v5h-5v7h-6v-7h-5V9h5z"/><path d="M19 40c1-5-1-8-5-13-4-8 5-13 11-9l7 5 7-5c6-4 15 1 11 9-4 5-6 8-5 13z"/><path d="M32 23v10" fill="none" stroke="DETAIL"/>'
};

function artwork(piece, side, id) {
  const [light, fill, shade, edge, detail] = palettes[side];
  const body = id + "-body";
  const bevel = id + "-bevel";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="59" viewBox="0 0 64 59" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="${body}" x1="10%" y1="4%" x2="90%" y2="96%">
        <stop stop-color="${light}"/>
        <stop offset=".47" stop-color="${fill}"/>
        <stop offset="1" stop-color="${shade}"/>
      </linearGradient>
      <linearGradient id="${bevel}" x2="0%" y2="100%">
        <stop stop-color="${light}"/>
        <stop offset=".4" stop-color="${fill}"/>
        <stop offset="1" stop-color="${shade}"/>
      </linearGradient>
    </defs>
    <g fill="url(#${body})" stroke="${edge}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
      ${silhouettes[piece].replaceAll("DETAIL", detail)}
      <path d="M19 39h26l3 6H16z" fill="url(#${bevel})"/>
      <path d="M15 45h34l4 7H11z" fill="url(#${bevel})"/>
      <path d="M19 41h26m-29 7h32" fill="none" stroke="${detail}" stroke-opacity=".72" stroke-width="1.15"/>
    </g>
  </svg>`;
}

export function createChessPiece(type, side) {
  const piece = type.toLowerCase();
  const wrapper = document.createElement("span");
  wrapper.className = "chess-piece";
  wrapper.dataset.art = `${piece}-${side}`;
  wrapper.innerHTML = artwork(piece, side, `piece-${++nextId}`);
  if (!dragArt.has(wrapper.dataset.art)) {
    const image = new Image();
    image.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(artwork(piece, side, "drag"));
    dragArt.set(wrapper.dataset.art, image);
  }
  return wrapper;
}

export function setPieceDragImage(piece, transfer) {
  const image = dragArt.get(piece.dataset.art);
  const size = Math.max(1, Math.round(piece.getBoundingClientRect().width));
  let ghost;
  if (image?.complete && image.naturalWidth) {
    ghost = document.createElement("canvas");
    ghost.width = ghost.height = size;
    ghost.getContext("2d").drawImage(image, 0, size * 5 / 128, size, size * 59 / 64);
  } else {
    ghost = piece.cloneNode(true);
    ghost.draggable = false;
    const [type, side] = piece.dataset.art.split("-");
    ghost.innerHTML = artwork(type, side, "drag-fallback");
  }
  ghost.classList.add("piece-drag-image");
  ghost.style.width = ghost.style.height = size + "px";
  document.body.append(ghost);
  transfer.setDragImage(ghost, size / 2, size / 2);
  return () => ghost.remove();
}

export function pieceName(type) {
  return names[type.toLowerCase()];
}
