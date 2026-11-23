const names = { p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king" };

const palettes = {
  white: ["#ffffff", "#edf6ff", "#9cb6d2", "#4b6685", "#ffffff"],
  black: ["#5d7899", "#263d5e", "#0e192d", "#151f33", "#b4d4f1"],
  red: ["#ffd0c5", "#e17469", "#922c36", "#5b222a", "#ffdfd0"],
  blue: ["#c2e6ff", "#5c96dd", "#284f86", "#163454", "#dbf2ff"],
  yellow: ["#fff6c4", "#eabd55", "#a46c20", "#684418", "#fff6cd"],
  green: ["#c7f6d5", "#57b783", "#266548", "#204633", "#dcf9e6"]
};

let nextId = 0;

// Every profile meets the pedestal at the same plane so ranks align visually.
const profiles = {
  p: {
    body: `<path d="M27 63c1-3 6-4 7-10l1-6h10l1 6c1 6 6 7 7 10Z"/>
      <path d="M32 45c0-2 3-3 8-3s8 1 8 3-3 4-8 4-8-2-8-4Z" fill="BEVEL"/>
      <circle cx="40" cy="34" r="11.4"/>`,
    light: "M33.8 32a7 7 0 0 1 5.6-4.9",
    inset: "M36.2 52c-.6 3-1.7 5.2-3.8 7"
  },
  r: {
    body: `<path d="M26 63c2-3 4-5 4.5-10l.5-17h18l.5 17c.5 5 2.5 7 4.5 10Z"/>
      <path d="M24 20q0-2 2-2h5v7h5v-7h8v7h5v-7h5q2 0 2 2v10c0 4-3 5-6 8H30c-3-3-6-4-6-8Z"/>
      <path d="M30 37q10 2 20 0v3q-10 2-20 0Z" fill="BEVEL"/>`,
    light: "M27 28v2c0 2 2 4 4 5",
    inset: "M37 45v8"
  },
  n: {
    body: `<path d="M26 63c2-5 4-9 8-14 3-4 7-8 7-13-2 4-6 7-10 7l-4 4
      c-1 1-3 1-4 0l-4-4c-1-1-1-3 0-4l9-10c2-3 5-5 8-6l2-9q.4-1 1.3 0l3.4 6.8
      5.1-6.1q.9-.9 1.5.4l1.1 8.1c6 4 10 11 10 20 0 9-4 14-7 19.8Z"/>
      <circle cx="32.7" cy="32.5" r="1.55" fill="EYE" stroke="none"/>`,
    light: "M23 38l6-6c2-2 4-3 7-4",
    inset: "M24 41l2-2m9 18c2-4 5-7 8-10"
  },
  b: {
    body: `<path d="M27 63c1-4 6-6 7-13l1-9h10l1 9c1 7 6 9 7 13Z"/>
      <path d="M31 44q0-3 9-3t9 3q0 3-9 4-9-1-9-4Z" fill="BEVEL"/>
      <path d="M40 14c2 0 4 4 7 8 4 6 6 9 6 13 0 6-6 9-13 9s-13-3-13-9
      c0-4 2-7 6-13 3-4 5-8 7-8Z"/>`,
    light: "M33 31c1-4 3.2-7 5.4-10",
    inset: "M47 26l-9 10"
  },
  q: {
    body: `<path d="M26 63c2-5 7-7 8-15l1-11h10l1 11c1 8 6 10 8 15Z"/>
      <path d="M23 24q5 6 10 7 2-6 7-14 5 8 7 14 5-1 10-7l-5 18
      c-1 4-5 6-12 6s-11-2-12-6Z"/>
      <path d="M29 40q11 4 22 0v3q-11 5-22 0Z" fill="BEVEL"/>
      <circle cx="22" cy="22" r="3"/><circle cx="40" cy="15" r="3.5"/><circle cx="58" cy="22" r="3"/>`,
    light: "M31 37q4 1.6 8.6 1.6",
    inset: "M42 25l3 8"
  },
  k: {
    body: `<path d="M36.5 20v-4h-5q-1.2 0-1.2-1.2v-3.6q0-1.2 1.2-1.2h5V5.5q0-1 1.2-1h4.6
      q1.2 0 1.2 1V10h5q1.2 0 1.2 1.2v3.6q0 1.2-1.2 1.2h-5v8h-7Z"/>
      <path d="M26 63c2-4 6-7 7-15h14c1 8 5 11 7 15Z"/>
      <path d="M40 22c4-4 8-6 13-4 6 2 7 8 4 13l-4 7c-1 2-1 3-1 5
      c-2 5-7 7-12 7s-10-2-12-7c0-2 0-3-1-5l-4-7c-3-5-2-11 4-13 5-2 9 0 13 4Z"/>
      <path d="M29 42q11 5 22 0v3q-11 6-22 0Z" fill="BEVEL"/>`,
    light: "M27 28c-1-3 1-6 4-6s5 1 7 3",
    inset: "M40 24v12"
  }
};

function artwork(piece, side, id) {
  const [light, fill, shade, edge, detail] = palettes[side];
  const body = id + "-body";
  const bevel = id + "-bevel";
  const shadow = id + "-shadow";
  const profile = profiles[piece];
  const contours = profile.body.replaceAll("BEVEL", `url(#${bevel})`).replaceAll("EYE", side === "white" || side === "yellow" ? edge : detail);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"
       preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
    <defs>
      <radialGradient id="${body}" cx="27%" cy="17%" r="86%">
        <stop stop-color="${light}"/>
        <stop offset=".55" stop-color="${fill}"/>
        <stop offset="1" stop-color="${shade}"/>
      </radialGradient>
      <linearGradient id="${bevel}" x1="18%" y1="0%" x2="78%" y2="100%">
        <stop stop-color="${light}"/>
        <stop offset=".37" stop-color="${fill}"/>
        <stop offset="1" stop-color="${shade}"/>
      </linearGradient>
      <radialGradient id="${shadow}">
        <stop stop-color="#081525" stop-opacity=".35"/>
        <stop offset="1" stop-color="#081525" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <ellipse cx="40" cy="74.5" rx="20" ry="3" fill="url(#${shadow})"/>
    <g fill="url(#${body})" stroke="${edge}" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round">
      ${contours}
      <path d="M28 62h24c2 0 3 1.2 3 3v3H25v-3c0-1.8 1-3 3-3Z" fill="url(#${bevel})"/>
      <path d="M26 67h28c2.3 0 3.8 1.6 3.8 3.7v1.1c0 1.7-1.3 2.7-3 2.7H25.2
        c-1.7 0-3-1-3-2.7v-1.1c0-2.1 1.5-3.7 3.8-3.7Z" fill="url(#${bevel})"/>
      <path d="${profile.light}M26 69.5h16" fill="none" stroke="${detail}" stroke-opacity=".44" stroke-width="1.45"/>
      <path d="${profile.inset}" fill="none" stroke="${edge}" stroke-width="1.65" stroke-opacity=".62"/>
    </g>
  </svg>`;
}

export function createChessPiece(type, side) {
  const piece = type.toLowerCase();
  const wrapper = document.createElement("span");
  wrapper.className = "chess-piece";
  wrapper.dataset.art = `${piece}-${side}`;
  wrapper.innerHTML = artwork(piece, side, `piece-${++nextId}`);
  return wrapper;
}

export function pieceName(type) {
  return names[type.toLowerCase()];
}
