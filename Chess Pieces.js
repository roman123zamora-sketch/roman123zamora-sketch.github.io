const names = { p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king" };

const palettes = {
  white: ["#ffffff", "#e6f1fc", "#b3cbe2", "#2c4562", "#ffffff"],
  black: ["#526984", "#253c58", "#142239", "#0a1729", "#b6cce3"],
  red: ["#ffb09c", "#d75149", "#982c34", "#541917", "#ffd0bc"],
  blue: ["#a0d4ff", "#437dc7", "#285287", "#122c56", "#d4ebff"],
  yellow: ["#fff1a9", "#efc14b", "#b87c24", "#59400e", "#fff5c8"],
  green: ["#adf2c5", "#4db879", "#277650", "#143d2c", "#d7fbe6"]
};

const dragArt = new Map();
let nextId = 0;

const silhouettes = {
  p: `<path d="M19 45c4.5-5.6 7-11.5 7.2-17.6a9.2 9.2 0 1 1 11.6 0c.2 6.1 2.7 12 7.2 17.6Z"/>
    <path d="M25.5 21.3a6.3 6.3 0 0 1 5.4-5.3" class="highlight"/>`,
  n: `<path d="M18.5 45c.2-8.6 5.4-15.7 14.7-21.1l-7.1 2.1-4.2 4.3
      c-.9.9-2.2 1-3.3.3l-4.1-2.8c-1.1-.8-1.3-2-.5-3l7.7-10.1
      c1.4-1.8 3.1-2.9 6.3-4.1L32 4l4.8 6.2c10 4.3 13.3 17.6 8.7 34.8Z"/>
    <path d="M24.9 17.3q1.7-1.8 4.1-2.3M21 40c1.4-4.7 4.2-8.1 8.2-11.1" class="highlight"/>`,
  b: `<circle cx="32" cy="5.3" r="2.7"/>
    <path d="M18.5 45c4.1-5.2 6.6-11 7.6-17-4.5-2.7-5.9-7.1-2.9-11.3l7.2-9.4
      c.8-1 2.4-1 3.2 0l7.2 9.4c3 4.2 1.6 8.6-2.9 11.3 1 6 3.5 11.8 7.6 17Z"/>
    <path d="m35.4 12.7-6.5 9.2" class="groove"/>
    <path d="M26 18.1q-2.3 3.4-.3 5.8" class="highlight"/>`,
  r: `<path d="M15.5 11.5c0-.8.7-1.5 1.5-1.5h5.5v6h5.7v-6h7.6v6h5.7v-6H47
      c.8 0 1.5.7 1.5 1.5v11.1c0 1-.5 2-1.3 2.6l-5.2 3.7c.1 6.2 1.2 11.6 3.8 16.1H18.2
      c2.6-4.5 3.7-9.9 3.8-16.1l-5.2-3.7c-.8-.6-1.3-1.6-1.3-2.6Z"/>
    <path d="M22.4 29h19.2" class="groove"/>
    <path d="M19 20.8h18.5" class="highlight"/>`,
  q: `<path d="m12.7 16.6 9 8.8 3.9-13.5 6.4 10.5 6.4-10.5 3.9 13.5 9-8.8
      c-1.4 8.1-5.8 15.8-6.6 21.9l-.8 6.5H20.1l-.8-6.5c-.8-6.1-5.2-13.8-6.6-21.9Z"/>
    <circle cx="11.7" cy="14.9" r="2.8"/><circle cx="25.6" cy="10.8" r="2.8"/>
    <circle cx="38.4" cy="10.8" r="2.8"/><circle cx="52.3" cy="14.9" r="2.8"/>
    <path d="M21.6 37.7q6.2-1.3 12.4-1.2" class="highlight"/>`,
  k: `<path d="M29 4.3q0-.8.8-.8h4.4q.8 0 .8.8v4.6h4.5q.8 0 .8.8v3.5q0 .8-.8.8H35v7h-6v-7h-4.5q-.8 0-.8-.8V9.7q0-.8.8-.8H29Z"/>
    <path d="M18.8 45c.6-6-.2-10.7-4.2-16.5-4.7-6.9 2.1-13.9 9.1-10.6
      3 1.4 5.8 3.1 8.3 5.1 2.5-2 5.3-3.7 8.3-5.1 7-3.3 13.8 3.7 9.1 10.6
      -4 5.8-4.8 10.5-4.2 16.5Z"/>
    <path d="M32 23.4v11.8" class="groove"/>
    <path d="M17.8 25c-.7-3 2-4.7 4.9-3.2" class="highlight"/>`
};

function artwork(piece, side, id) {
  const [light, fill, shade, edge, detail] = palettes[side];
  const body = id + "-body";
  const bevel = id + "-bevel";
  const foot = id + "-foot";
  const shape = silhouettes[piece]
    .replaceAll('class="highlight"', `fill="none" stroke="${detail}" stroke-opacity=".55" stroke-width="1.25"`)
    .replaceAll('class="groove"', `fill="none" stroke="${edge}" stroke-opacity=".72" stroke-width="1.35"`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="59" viewBox="0 0 64 59" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="${body}" x1="10%" y1="4%" x2="90%" y2="96%">
        <stop stop-color="${light}"/>
        <stop offset=".47" stop-color="${fill}"/>
        <stop offset="1" stop-color="${shade}"/>
      </linearGradient>
      <linearGradient id="${bevel}" x1="8%" y1="4%" x2="87%" y2="100%">
        <stop stop-color="${light}"/>
        <stop offset=".5" stop-color="${fill}"/>
        <stop offset="1" stop-color="${shade}"/>
      </linearGradient>
      <linearGradient id="${foot}" x1="14%" y1="0%" x2="86%" y2="100%">
        <stop stop-color="${fill}"/>
        <stop offset="1" stop-color="${shade}"/>
      </linearGradient>
    </defs>
    <g fill="url(#${body})" stroke="${edge}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
      ${shape}
      <path d="M20 44.5h24q1.6 0 2 1.5l.8 3.5H17.2l.8-3.5q.4-1.5 2-1.5Z" fill="url(#${bevel})"/>
      <path d="M17.5 50h29q2.8 0 2.8 2.3v2q0 2.3-2.3 2.3H17q-2.3 0-2.3-2.3v-2q0-2.3 2.8-2.3Z" fill="url(#${foot})"/>
      <path d="M18.7 51.9h20.5" fill="none" stroke="${detail}" stroke-opacity=".48" stroke-width="1.15"/>
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
