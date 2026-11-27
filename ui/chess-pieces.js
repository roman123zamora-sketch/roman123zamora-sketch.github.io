const names = { p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king" };

const palettes = {
  white: ["#ffffff", "#f1f0ed", "#aeadaa", "#545452", "#ffffff"],
  black: ["#686868", "#303030", "#111111", "#131313", "#c7c7c7"],
  red: ["#ffd0c5", "#e17469", "#922c36", "#5b222a", "#ffdfd0"],
  blue: ["#c2e6ff", "#5c96dd", "#284f86", "#163454", "#dbf2ff"],
  yellow: ["#fff6c4", "#eabd55", "#a46c20", "#684418", "#fff6cd"],
  green: ["#c7f6d5", "#57b783", "#266548", "#204633", "#dcf9e6"]
};

let nextId = 0;

// Every profile meets the pedestal at the same plane so ranks align visually.
const teamProfiles = {
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
    body: `<path d="M25 63C28 55 34 51 38 44c2-3.5 3-7.2 2.5-10.6
      -1.4 2.8-3.5 5-6.5 6.2l-5.3 5.1c-1.8 1.7-4.5 2-6.5.6l-3.1-2.1
      c-1.8-1.3-2.3-3.4-1.1-5.2l8-11.2 2.3-5.5c1.5-3.5 4.5-5.7 8.2-6.4l.9-7.2
      q.2-1.3 1.3-.5l6 5.7c8.3 1.6 14.5 8.2 16.3 16.5 2.3 10.7-.9 24-6.4 33.6Z"/>
      <path d="M44.7 14.7c7.7 3.4 11.8 10.3 12.1 18.8.4 10.2-3.2 20.1-7.8 27.5
      h5.6c4.6-9.2 7.6-21.3 5.5-31.3-1.7-7.7-7.2-13.7-15.4-15Z" fill="BEVEL" stroke="none"/>
      <path d="M31 25.8q2-2 4.5-.7-1.8 2.6-4.5.7ZM21.2 38.9q1.3-1.9 3.2-1-.8 2.1-3.2 1Z" fill="EYE" stroke="none"/>`,
    light: "M21.8 35.9l6.2-9 2.3-5.2c1.2-2.4 3.6-4 6-4.5",
    inset: "M22 42q2.7 1.2 4.8-.9m10.3 14.8c5.2-6.2 8.3-13.1 9.1-20"
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

const pedestal = `<path d="M28 62h24c2 0 3 1.2 3 3v3H25v-3c0-1.8 1-3 3-3Z" fill="BEVEL"/>
      <path d="M26 67h28c2.3 0 3.8 1.6 3.8 3.7v1.1c0 1.7-1.3 2.7-3 2.7H25.2
        c-1.7 0-3-1-3-2.7v-1.1c0-2.1 1.5-3.7 3.8-3.7Z" fill="BEVEL"/>`;

// The monochrome profiles share a baseline and low, proportioned feet.
const classicProfiles = {
  p: {
    foot: 16,
    body: `<path d="M27 65Q35 60 36 48L44 48Q45 60 53 65Z"/>
      <circle cx="40" cy="38" r="10.5"/>`,
    light: "M33 36Q34.5 31.5 39 31 M37.5 53Q36.5 59 33 62",
    inset: "M36 50Q40 51.5 44 50"
  },
  r: {
    foot: 23,
    body: `<path d="M19 65L24 58L26 39L20 35V20H29V28H35V20H45V28H51V20H60V35L54 39L56 58L61 65Z"/>
      <path d="M21 34H59L54 39H26Z M24 58H56L60 64H20Z" fill="BEVEL" stroke="none"/>`,
    light: "M22 22H27 M37 22H43 M53 22H58 M23 35H56 M28.5 42L27 56",
    inset: "M26 39H54 M25 58H55"
  },
  n: {
    foot: 23,
    body: `<path d="M20 65Q23 59 33 53Q42 46 44 34Q40 39 33 40L26 46Q23 49 19 47L13 43Q11 41 14 37L25 27L29 20Q32 16 37 15L40 7Q42 6 43 9L47 15Q59 18 64 29Q70 43 58 65Z"/>
      <path d="M47 17Q61 21 63 34Q66 47 56 64H49Q59 47 58 34Q57 24 47 17Z" fill="BEVEL" stroke="none"/>
      <path d="M30.5 27Q33.5 23.8 37 26Q34.5 29.8 30.5 27Z M17.5 40Q19.3 37.5 22 39Q21 41.6 17.5 40Z" fill="EYE" stroke="none"/>`,
    light: "M16.5 37.5L27 28L30.5 22Q33 18.5 37 18 M42 10L44 15",
    inset: "M20 44Q23 45 26 42 M41 51Q48 44 49 36"
  },
  b: {
    foot: 19,
    body: `<path d="M22 65Q30 59 33 47Q24 44 26 35Q28 25 39 10Q40 8 42 10Q47 16 49 21L37 33L51 27Q57 36 53 43Q51 46 47 47Q50 59 58 65Z"/>
      <path d="M28 42Q39 47 52 42L48 47Q40 50 32 47Z" fill="BEVEL" stroke="none"/>`,
    light: "M30 35Q33 25 40 14 M39 32L48 28 M35 51Q34 57 29 61",
    inset: "M32 46Q40 49 48 46"
  },
  q: {
    foot: 22,
    body: `<path d="M19 65Q30 57 33 45Q28 43 25 37L17 21Q16 17 20 17Q22 17 24 20L31 29L35 15Q37 10 40 10Q43 10 45 15L49 29L56 20Q58 17 60 17Q64 17 63 21L55 37Q52 43 47 45Q50 57 61 65Z"/>
      <path d="M25 36Q40 42 55 36L52 41Q40 48 28 41Z" fill="BEVEL" stroke="none"/>`,
    light: "M20 20L27 32 M36 17L34 27 M43 17L46 28 M28 38Q38 42 49 39",
    inset: "M32 45Q40 48 48 45"
  },
  k: {
    foot: 23,
    body: `<path d="M36 25V17H28Q26 17 26 15V12Q26 10 28 10H36V4Q36 2 38 2H42Q44 2 44 4V10H52Q54 10 54 12V15Q54 17 52 17H44V25Z"/>
      <path d="M18 65Q29 58 32 46Q24 42 24 34Q24 27 32 25Q40 22 48 25Q56 27 56 34Q56 42 48 46Q51 58 62 65Z"/>
      <path d="M26 39Q40 45 54 39L49 45Q40 50 31 45Z" fill="BEVEL" stroke="none"/>`,
    light: "M29 12H38V5 M28 34Q28 29 35 27 M32 42Q40 45 49 42",
    inset: "M32 46Q40 49 48 46"
  }
};

function classicPedestal(halfWidth) {
  const left = 40 - halfWidth;
  const right = 40 + halfWidth;
  return `<path d="M${left + 4} 64H${right - 4}Q${right - 1} 64 ${right - 1} 67
    L${right} 69V71Q${right} 74 ${right - 3} 74H${left + 3}Q${left} 74 ${left} 71V69
    L${left + 1} 67Q${left + 1} 64 ${left + 4} 64Z" fill="BEVEL"/>
    <path d="M${left + 2} 69Q40 70.5 ${right - 2} 69" fill="none" stroke-opacity=".4"/>`;
}

function artwork(piece, side, id) {
  const [light, fill, shade, edge, detail] = palettes[side];
  const body = id + "-body";
  const bevel = id + "-bevel";
  const shadow = id + "-shadow";
  const classic = side === "white" || side === "black";
  const profile = (classic ? classicProfiles : teamProfiles)[piece];
  const foot = classic ? classicPedestal(profile.foot) : pedestal;
  const base = foot.replaceAll("BEVEL", `url(#${bevel})`);
  const rim = classic ? `M${46 - profile.foot} 66.4H40` : "M26 69.5h16";
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
        <stop stop-color="#111111" stop-opacity=".35"/>
        <stop offset="1" stop-color="#111111" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <ellipse cx="40" cy="74.5" rx="${profile.foot ?? 20}" ry="3" fill="url(#${shadow})"/>
    <g class="piece-finish" fill="url(#${body})" stroke="${edge}" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round">
      ${contours}
      ${base}
      <path d="${profile.light} ${rim}" fill="none" stroke="${detail}" stroke-opacity=".44" stroke-width="1.45"/>
      <path d="${profile.inset}" fill="none" stroke="${edge}" stroke-width="1.65" stroke-opacity=".62"/>
    </g>
  </svg>`;
}

export function createChessPiece(type, side, theme = "classic") {
  const piece = type.toLowerCase();
  const wrapper = document.createElement("span");
  wrapper.className = "chess-piece";
  wrapper.dataset.pieceSide = side;
  wrapper.dataset.art = `${piece}-${side}`;
  wrapper.dataset.artTheme = theme;
  const id = `piece-${++nextId}`;
  wrapper.innerHTML = artwork(piece, side, id);
  return wrapper;
}

const sideNames = { w: "white", b: "black", R: "red", B: "blue", Y: "yellow", G: "green" };

export function showPromotionChoices(dialog, side) {
  for (const button of dialog.querySelectorAll("button[value]:not([value=''])")) {
    button.querySelector(".chess-piece")?.remove();
    button.prepend(createChessPiece(button.value, sideNames[side]));
  }
  dialog.returnValue = "";
  dialog.showModal();
}

export function pieceName(type) {
  return names[type.toLowerCase()];
}
