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

// Original Staunton-inspired silhouettes with a shared, low plinth.
const classicProfiles = {
  p: {
    foot: 18,
    body: `<path d="M22 65C23.5 60.5 26 56.5 29.5 53.5C26.5 50 28 44 35 42V39H45V42C52 44 53.5 50 50.5 53.5C54 56.5 56.5 60.5 58 65Z"/>
      <circle cx="40" cy="33" r="8.4"/>`,
    light: "M35 32Q36 27 41 27 M31 49Q33 45 37 45 M30 56Q26 60 25 63",
    inset: "M30 53.5Q40 57 50 53.5",
    engraving: "M30 58Q40 61 50 58"
  },
  r: {
    foot: 21,
    body: `<path d="M20 65L25 59L29 53V35L23 30V20H30V24H36V20H44V24H50V20H57V30L51 35V53L55 59L60 65Z"/>
      <path d="M24 28H56L51 34H29Z M28 54H52L56 60H24Z" fill="BEVEL" stroke="none"/>`,
    light: "M25 22H28 M38 22H42 M52 22H55 M27 29H51 M32.5 36V51 M29 56H46",
    inset: "M29 35H51 M27 54H53",
    engraving: "M35 38V50 M45 38V50 M27 60H53"
  },
  n: {
    foot: 24,
    body: `<path d="M17 65Q20 58 28 53Q40 46 42 33Q38 37 31 39L23 44Q18 48 14 44L10 40Q8 37 12 34L22 25Q25 17 35 16L36 9Q36 6 40 8L46 13Q58 17 63 27Q69 40 63 53L58 65Z"/>
      <path d="M46 16Q58 22 60 35Q63 49 54 64H48Q57 49 55 35Q54 25 46 16Z" fill="BEVEL" stroke="none"/>
      <path d="M28 25Q31 22.3 34 24.8Q31.8 28 28 25Z M14 38Q16 35.7 18.7 36.7Q17.7 39.5 14 38Z" fill="EYE" stroke="none"/>`,
    light: "M12.5 35.5L23 26Q26 19 34 18 M38.5 10L42 14",
    inset: "M15 42Q19 44 23 41 M37 51Q44 45 46 36",
    engraving: "M49 23C58 31 59 45 51 58 M45 56Q42 59 39 61"
  },
  b: {
    foot: 24,
    body: `<path d="M24 65C31 62 34 57 35.5 48H44.5C46 57 49 62 56 65Z"/>
      <path d="M34 22Q37 19 40 13Q44 19 48 22L40 30L51 26Q56 33 53 40Q50 46 40 49Q30 46 27 40Q24 33 34 22Z"/>
      <path d="M28 40Q40 45 52 40L48 46Q40 50 32 46Z" fill="BEVEL" stroke="none"/>
      <circle cx="40" cy="12" r="2.7"/>`,
    light: "M29 36Q30 28 36 23 M31 42Q40 46 49 42",
    inset: "M34 47Q40 49 46 47",
    engraving: "M39 30L49 26",
    ornament: `<path d="M40 61C33 61 28 57 21 57C17 57 13 59 10 62L16 63L13 68C17 66 20 65 23 65C29 65 35 69 40 68C45 69 51 65 57 65C60 65 63 66 67 68L64 63L70 62C67 59 63 57 59 57C52 57 47 61 40 61Z" fill="BEVEL"/>
      <path d="M16 63C23 59 29 63 34 64M64 63C57 59 51 63 46 64" fill="none" stroke-opacity=".58" stroke-width=".85"/>
      <path d="M35 62Q40 60.5 45 62L44 67Q40 69 36 67Z" fill="BEVEL"/>`
  },
  q: {
    foot: 23,
    body: `<path d="M18 65Q29 59 29 43L16 22Q15 19 18 19Q20 19 21 22L30 33L27 17Q27 14 30 14Q32 14 33 17L38 31L38 13Q38 10 40 10Q42 10 42 13L43 31L48 17Q49 14 51 14Q54 15 53 18L50 33L59 22Q60 19 62 19Q65 20 64 23L51 43Q51 59 62 65Z"/>
      <path d="M29 43Q40 39 51 43L51 49Q40 45 29 49Z M26 57Q40 54 54 57L57 62Q40 58 23 62Z" fill="BEVEL" stroke="none"/>`,
    light: "M18 21L27 34 M30 17L34 30 M40 13V28 M31 45Q40 42 49 45 M29 58Q40 56 51 58",
    inset: "M30 49Q40 46 50 49 M26 60Q40 57 54 60",
    engraving: "M32 52Q40 50 48 52"
  },
  k: {
    foot: 25,
    body: `<path d="M36.5 25V17H30Q28 17 28 15V12Q28 10 30 10H36.5V5Q36.5 3 38.5 3H41.5Q43.5 3 43.5 5V10H50Q52 10 52 12V15Q52 17 50 17H43.5V25Z"/>
      <path d="M16 65Q23 59 24 50Q16 42 16 34Q16 24 25 23Q32 22 40 29Q48 22 55 23Q64 24 64 34Q64 42 56 50Q57 59 64 65Z"/>
      <path d="M40 47Q35 39 35 32L40 25L45 32Q45 39 40 47Z M24 49Q40 44 56 49L57 56Q40 51 23 56Z" fill="BEVEL" stroke="none"/>`,
    light: "M31 12H38.5V6 M20 35Q19 27 27 26 M38 33L40 29 M27 51Q40 47 53 51",
    inset: "M25 56Q40 52 55 56",
    engraving: "M23 36Q24 30 29 29 M57 36Q56 30 51 29 M26 60Q40 57 54 60"
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
