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
    body: `<path d="M26 63c3.2-5.1 8.4-9.9 11.8-15.9 1.2-2.1 2.1-4.4 2.6-6.7
      -2 2.4-4.8 3.9-7.8 4.4l-7.8 4.5c-3 1.4-6.6.1-8-2.5
      -1.1-2.1-.4-4.4 1.5-6l9.3-8.3 4-6.9c1.7-3.1 4.5-5.4 7.7-6.7l-.1-7.3
      c0-.9 1.1-1.3 1.7-.6l4.5 5.7 3.7-4.2c.6-.7 1.7-.4 1.8.5l1 6.1
      c6.1 3.2 9.1 8.8 9.1 15.4 0 10.2-4.4 20.5-7.3 28.5Z"/>
      <path d="M48.7 21.2c5.4 4.2 7.7 9.4 7.4 15.7-.3 7.7-3.2 14.4-6.6 20.6" fill="none" stroke="EYE" stroke-opacity=".38"/>
      <path d="M32.6 29.5q2.2-2.2 4.6-.7-1.7 2.7-4.6.7ZM19.5 43.2q1.5-2.1 3.6-1.1-.9 2.2-3.6 1.1Z" fill="EYE" stroke="none"/>`,
    light: "M20.6 39.5l9.2-8.3 3.4-6.3c1.6-2.1 3.5-3.6 5.8-4.7",
    inset: "M21 46.6q2.8.2 5-1.6m10.7 14.1c4.6-5.2 8-10.9 9.7-17"
  },
  b: {
    body: `<path d="M26 63c1.6-4.5 5.7-7 6.5-13.2l1-9h13l1 9c.8 6.2 4.9 8.7 6.5 13.2Z"/>
      <path d="M29 44c0-2.3 4.5-3.7 11-3.7s11 1.4 11 3.7-4.5 4.2-11 4.2S29 46.3 29 44Z" fill="BEVEL"/>
      <path d="M39 11q1-1.3 2 0c2.5 3.4 5.1 7.3 7.1 11.5l-6.7 7 .6 2.4 8-5.1
      c1.7 3.7 2.5 6.8 2.2 9.4-.4 5.2-5.5 7.9-12.2 7.9s-11.8-2.7-12.2-7.9
      c-.4-4.8 3.1-11.9 5.7-16.2 1.8-3.1 3.7-6.2 5.5-9Z"/>`,
    light: "M31.1 33c1.2-5.4 3.7-10.9 7.4-16",
    inset: "M42 32l-2.6 2.1m-3.3 17.7c-.7 3.3-2.2 5.7-4.2 7.7"
  },
  q: {
    body: `<path d="M26 63c2-4.2 6.3-7 7.2-14.5l1.1-11.5h11.4l1.1 11.5c.9 7.5 5.2 10.3 7.2 14.5Z"/>
      <path d="M23 24q5.3 5.8 10.1 6.7 2-6.5 6.9-13.7 4.9 7.2 6.9 13.7 4.8-.9 10.1-6.7l-5 18
      c-1 4-5 6-12 6s-11-2-12-6Z"/>
      <path d="M29 40q11 4 22 0v3q-11 5-22 0Z" fill="BEVEL"/>
      <circle cx="22" cy="22" r="3"/><circle cx="40" cy="15" r="3.5"/><circle cx="58" cy="22" r="3"/>`,
    light: "M31 37q4 1.6 8.6 1.6",
    inset: "M42 25l3 8"
  },
  k: {
    body: `<path d="M36.5 20v-4h-5q-1.2 0-1.2-1.2v-3.6q0-1.2 1.2-1.2h5V5.5q0-1 1.2-1h4.6
      q1.2 0 1.2 1V10h5q1.2 0 1.2 1.2v3.6q0 1.2-1.2 1.2h-5v10h-7Z"/>
      <path d="M26 63c2-4 6-7 7-15h14c1 8 5 11 7 15Z"/>
      <path d="M40 25c4-4 8-6 13-4 6 2 7 8 4 13l-4 7c-1 2-1 3-1 5
      c-2 4-7 6-12 6s-10-2-12-6c0-2 0-3-1-5l-4-7c-3-5-2-11 4-13 5-2 9 0 13 4Z"/>
      <path d="M29 45q11 5 22 0v3q-11 6-22 0Z" fill="BEVEL"/>`,
    light: "M27 31c-1-3 1-6 4-6s5 1 7 3",
    inset: "M40 27v12"
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
