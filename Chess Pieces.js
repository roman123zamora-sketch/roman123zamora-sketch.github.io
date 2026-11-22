const names = { p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king" };

const palettes = {
  white: ["#fff4d8", "#26342d", "#c8a969"],
  black: ["#202923", "#e4d5ac", "#9ba48b"],
  red: ["#d75149", "#541917", "#ffc0a5"],
  blue: ["#437dc7", "#122c56", "#c1dcff"],
  yellow: ["#efc14b", "#59400e", "#fff1b0"],
  green: ["#4db879", "#143d2c", "#bbf5c8"]
};

const silhouettes = {
  p: '<path d="M19 40c4-5 6-9 6-14a8 8 0 1 1 14 0c0 5 2 9 6 14z"/>',
  n: '<path d="M18 41c0-9 6-15 16-20l-8 2-5 5-7-5 8-11 8-4 3-6 5 7c11 5 13 18 8 32z"/><path d="m25 15 3-1" fill="none" stroke="var(--detail)"/>',
  b: '<path d="M18 40c4-4 7-9 8-14-4-3-5-7-2-11l8-10 8 10c3 4 2 8-2 11 1 5 4 10 8 14z"/><path d="m35 11-6 10" fill="none" stroke="var(--detail)"/><circle cx="32" cy="5" r="3"/>',
  r: '<path d="M15 10h8v6h5v-6h8v6h5v-6h8v14l-7 5c0 6 2 9 4 11H18c2-2 4-5 4-11l-7-5z"/><path d="M22 29h20" fill="none" stroke="var(--detail)"/>',
  q: '<path d="m12 15 10 10 4-13 6 11 6-11 4 13 10-10-7 24H19z"/><circle cx="11" cy="13" r="3"/><circle cx="26" cy="10" r="3"/><circle cx="38" cy="10" r="3"/><circle cx="53" cy="13" r="3"/>',
  k: '<path d="M29 4h6v5h5v5h-5v7h-6v-7h-5V9h5z"/><path d="M19 40c1-5-1-8-5-13-4-8 5-13 11-9l7 5 7-5c6-4 15 1 11 9-4 5-6 8-5 13z"/><path d="M32 23v10" fill="none" stroke="var(--detail)"/>'
};

export function createChessPiece(type, side) {
  const piece = type.toLowerCase();
  const [fill, edge, detail] = palettes[side];
  const wrapper = document.createElement("span");
  wrapper.className = "chess-piece";
  wrapper.style.setProperty("--detail", detail);
  wrapper.innerHTML = `<svg viewBox="0 0 64 59" aria-hidden="true" focusable="false">
    <g fill="${fill}" stroke="${edge}" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
      ${silhouettes[piece]}
      <path d="M19 39h26l3 6H16z"/>
      <path d="M15 45h34l4 7H11z"/>
      <path d="M16 49h32" fill="none" stroke="${detail}" stroke-width="1.25"/>
    </g>
  </svg>`;
  return wrapper;
}

export function pieceName(type) {
  return names[type.toLowerCase()];
}
