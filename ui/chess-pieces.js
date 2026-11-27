const names = { p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king" };

const palettes = {
  white: ["#ffffff", "#f1f0ed", "#aeadaa", "#545452", "#ffffff"],
  black: ["#737373", "#353535", "#151515", "#111111", "#d0d0d0"],
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

// Monochrome silhouettes share a 74-unit baseline and a shallow turned foot.
const classicProfiles = {
  p: {
    foot: 17,
    body: `<path d="M23 65C30 60 35 54 36 47L36.5 42H43.5L44 47C45 54 50 60 57 65Z"/>
      <circle cx="40" cy="34" r="10"/>`,
    light: "M33 33Q34 27 40 27 M33 58Q36 54 37 50",
    inset: "M35.8 47Q40 49 44.2 47",
    engraving: "M28 63Q40 65 52 63"
  },
  r: {
    foot: 24,
    body: `<path d="M17 65L22 59L26 55V37L20 32V19H29V26H35V19H45V26H51V19H60V32L54 37V55L58 59L63 65Z"/>
      <path d="M21 31H59L54 36H26Z M24 58H56L61 64H19Z M49 38H53V55H49Z" fill="BEVEL" stroke="none"/>`,
    light: "M22 21H27 M37 21H43 M53 21H58 M25 32H53 M29 39V53",
    inset: "M27 37H53 M24 58H56",
    engraving: "M32 39V52 M22 62H57"
  },
  n: {
    foot: 22,
    body: `<path d="M18 65C23 58 34 55 40 47C44 42 45 37 45 33C41 38 35 40 30 41L23 47Q19 50 15 47L11 44Q8 41 12 37L23 27C27 19 32 17 37 16L39 8Q40 6 42 8L48 15C59 19 65 28 65 39C65 49 60 57 57 65Z"/>
      <path d="M47 17C57 22 61 31 60 40C59 49 55 57 52 64H46C53 54 56 45 55 37C55 28 51 22 47 17Z" fill="BEVEL" stroke="none"/>
      <path d="M29 26Q32 23 36 26Q33 29.5 29 26Z M14.5 41Q16 38.5 19.5 39.7Q18 42.4 14.5 41Z" fill="EYE" stroke="none"/>`,
    light: "M15 36L25 28Q29 21 36 19 M40.5 10L44 15",
    inset: "M16 45Q20 47 24 43 M39 53Q48 46 49 37",
    engraving: "M50 25C57 35 57 46 50 57"
  },
  b: {
    foot: 19,
    body: `<path d="M21 65C30 62 34 55 35 45H45C46 55 50 62 59 65Z"/>
      <path d="M40 11C43 16 46 19 48.5 23L37 34L51.75 29C57 39 51 47 40 48C30 48 24 42 26 34C28 26 35 20 40 11Z"/>
      <path d="M28 41Q40 47 52 41Q49 48 40 49Q31 48 28 41Z" fill="BEVEL"/>`,
    light: "M30 36Q32 26 39 18 M32 44Q40 47 48 44 M38 34L49 30",
    inset: "M35 49Q40 51 45 49",
    ornament: `<path d="M40 61C33 61 28 57 21 57C17 57 13 59 10 62L16 63L13 68C17 66 20 65 23 65C29 65 35 69 40 68C45 69 51 65 57 65C60 65 63 66 67 68L64 63L70 62C67 59 63 57 59 57C52 57 47 61 40 61Z" fill="BEVEL"/>
      <path d="M16 63C23 59 29 63 34 64M64 63C57 59 51 63 46 64" fill="none" stroke-opacity=".58" stroke-width=".85"/>
      <path d="M35 62Q40 60.5 45 62L44 67Q40 69 36 67Z" fill="BEVEL"/>`
  },
  q: {
    foot: 22,
    body: `<path d="M18 65C26 61 30 54 31 44L17 24Q14 20 17 18Q20 16 23 20L31 31L27 17Q26 13 29 12Q32 11 34 16L38 30L37 13Q37 8 40 8Q43 8 43 13L42 30L46 16Q48 11 51 12Q54 13 53 17L49 31L57 20Q60 16 63 18Q66 20 63 24L49 44C50 54 54 61 62 65Z"/>
      <path d="M28 39Q40 34 52 39L49 45Q40 41 31 45Z" fill="BEVEL" stroke="none"/>`,
    light: "M19 20L27 32 M30 15L34 26 M40 11V26 M31 40Q40 37 49 40",
    inset: "M31 45Q40 42 49 45",
    engraving: "M28 59Q40 55 52 59"
  },
  k: {
    foot: 24,
    body: `<path d="M36.5 27V17H29Q27 17 27 15V12Q27 10 29 10H36.5V4Q36.5 2 38.5 2H41.5Q43.5 2 43.5 4V10H51Q53 10 53 12V15Q53 17 51 17H43.5V27Z"/>
      <path d="M16 65C24 61 29 54 30 47C24 43 21 38 22 33C23 25 32 23 40 27C48 23 57 25 58 33C59 38 56 43 50 47C51 54 56 61 64 65Z"/>
      <path d="M24 39Q32 35 40 40Q48 35 56 39Q54 44 50 47Q40 44 30 47Q26 44 24 39Z" fill="BEVEL" stroke="none"/>`,
    light: "M30 12H38.5V5 M26 35Q27 29 33 29 M29 40Q35 39 40 42",
    inset: "M30 47Q40 44 50 47",
    engraving: "M29 58Q40 54 51 58"
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
  const ornament = profile.ornament?.replaceAll("BEVEL", `url(#${bevel})`) ?? "";
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
    <g class="piece-finish" fill="url(#${body})" stroke="${edge}" stroke-width="${classic ? 1.15 : 1.25}" stroke-linecap="round" stroke-linejoin="round">
      ${contours}
      ${base}
      ${ornament}
      <path d="${profile.light} ${rim}" fill="none" stroke="${detail}" stroke-opacity=".44" stroke-width="1.45"/>
      <path d="${profile.inset}" fill="none" stroke="${edge}" stroke-width="${classic ? 1.05 : 1.65}" stroke-opacity=".62"/>
      ${profile.engraving ? `<path d="${profile.engraving}" fill="none" stroke="${detail}" stroke-width=".9" stroke-opacity=".52"/>` : ""}
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
