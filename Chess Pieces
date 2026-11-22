let nextPieceId = 0;

const PIECE_NAMES = {
  p: "pawn",
  n: "knight",
  b: "bishop",
  r: "rook",
  q: "queen",
  k: "king"
};

const PALETTES = {
  white: {
    top: "#ffffff",
    middle: "#e8f5ff",
    bottom: "#a9c8df",
    edge: "#506e89",
    shine: "#ffffff",
    shadow: "#476782"
  },
  black: {
    top: "#829db4",
    middle: "#344c63",
    bottom: "#142538",
    edge: "#b9d7eb",
    shine: "#e6f5ff",
    shadow: "#030b13"
  }
};

function normalizePieceType(type) {
  const value = String(type).toLowerCase();
  const name = PIECE_NAMES[value] ?? value;

  if (!["pawn", "knight", "bishop", "rook", "queen", "king"].includes(name)) {
    throw new Error(`Unknown chess piece type: ${type}`);
  }

  return name;
}

function normalizeColor(color) {
  const value = String(color).toLowerCase();

  if (value === "w" || value === "white") return "white";
  if (value === "b" || value === "black") return "black";

  throw new Error('Piece color must be "white", "black", "w", or "b".');
}

function baseShape(bodyGradient, metalGradient, palette) {
  return `
    <ellipse cx="50" cy="91" rx="31" ry="5"
      fill="${palette.shadow}" opacity=".65"/>

    <path d="M24 82
      Q24 77 29 75
      L34 72
      L66 72
      L71 75
      Q76 77 76 82
      L74 87
      Q50 93 26 87 Z"
      fill="url(#${metalGradient})"
      stroke="${palette.edge}"
      stroke-width="2"
      stroke-linejoin="round"/>

    <path d="M31 79 Q50 76 69 79"
      fill="none"
      stroke="${palette.shine}"
      stroke-width="2"
      opacity=".7"
      stroke-linecap="round"/>

    <path d="M28 86 Q50 91 72 86"
      fill="none"
      stroke="${palette.shadow}"
      stroke-width="2"
      opacity=".7"
      stroke-linecap="round"/>
  `;
}

function pieceShape(type, bodyGradient, metalGradient, palette) {
  const outline = `stroke="${palette.edge}" stroke-width="2.4"
    stroke-linejoin="round" stroke-linecap="round"`;

  const base = baseShape(bodyGradient, metalGradient, palette);

  const shapes = {
    pawn: `
      ${base}
      <path d="M39 73
        Q42 66 44 60
        L44 53
        Q38 49 38 43
        Q38 37 43 33
        Q40 29 40 24
        C40 16 44 11 50 11
        C56 11 60 16 60 24
        Q60 29 57 33
        Q62 37 62 43
        Q62 49 56 53
        L56 60
        Q58 66 61 73 Z"
        fill="url(#${bodyGradient})" ${outline}/>

      <path d="M43 55 Q50 58 57 55"
        fill="none" ${outline} opacity=".6"/>

      <path d="M44 65 Q50 68 57 65"
        fill="none"
        stroke="${palette.shine}"
        stroke-width="2"
        opacity=".65"
        stroke-linecap="round"/>

      <circle cx="45" cy="20" r="2.5"
        fill="${palette.shine}" opacity=".75"/>
    `,

    rook: `
      ${base}
      <path d="M31 28
        L31 17 L40 17 L40 24
        L46 24 L46 15 L54 15 L54 24
        L60 24 L60 17 L69 17 L69 28
        L65 35 L65 65
        Q69 68 71 73
        L29 73
        Q31 68 35 65
        L35 35 Z"
        fill="url(#${bodyGradient})" ${outline}/>

      <path d="M35 34 L65 34"
        fill="none" ${outline} opacity=".65"/>

      <path d="M40 40 L40 62 M50 40 L50 62 M60 40 L60 62"
        fill="none"
        stroke="${palette.shine}"
        stroke-width="2"
        opacity=".38"
        stroke-linecap="round"/>

      <path d="M34 70 Q50 66 66 70"
        fill="none"
        stroke="${palette.shine}"
        stroke-width="2"
        opacity=".7"
        stroke-linecap="round"/>
    `,

    knight: `
      ${base}
      <path d="M32 73
        Q36 65 38 58
        L32 52
        Q34 45 40 39
        L38 29
        Q38 24 42 19
        L44 27
        Q50 20 57 19
        Q56 26 62 31
        Q70 37 68 48
        L64 62
        Q67 67 70 73 Z"
        fill="url(#${bodyGradient})" ${outline}/>

      <path d="M40 38 Q51 42 63 37"
        fill="none" ${outline} opacity=".55"/>

      <path d="M44 29 Q48 33 53 34"
        fill="none"
        stroke="${palette.shine}"
        stroke-width="2"
        opacity=".65"
        stroke-linecap="round"/>

      <circle cx="55" cy="29" r="2.1" fill="${palette.edge}"/>
      <circle cx="55.5" cy="28.5" r=".7" fill="${palette.shine}"/>

      <path d="M41 48 Q46 57 43 67"
        fill="none"
        stroke="${palette.shine}"
        stroke-width="2"
        opacity=".45"
        stroke-linecap="round"/>
    `,

    bishop: `
      ${base}
      <path d="M36 73
        Q41 66 43 60
        L39 55
        Q42 50 45 46
        C39 42 37 36 40 30
        Q43 23 50 20
        Q57 23 60 30
        C63 36 61 42 55 46
        Q58 50 61 55
        L57 60
        Q59 66 64 73 Z"
        fill="url(#${bodyGradient})" ${outline}/>

      <path d="M48 25 L53 33 L47 41"
        fill="none"
        stroke="${palette.shine}"
        stroke-width="3"
        opacity=".8"
        stroke-linecap="round"
        stroke-linejoin="round"/>

      <path d="M43 54 Q50 58 58 54"
        fill="none" ${outline} opacity=".55"/>

      <path d="M43 65 Q50 68 58 65"
        fill="none"
        stroke="${palette.shine}"
        stroke-width="2"
        opacity=".6"
        stroke-linecap="round"/>
    `,

    queen: `
      ${base}
      <path d="M34 73
        Q39 66 41 59
        L39 52
        L34 35
        L44 43
        L42 28
        L50 39
        L58 28
        L56 43
        L66 35
        L61 52
        L59 59
        Q61 66 66 73 Z"
        fill="url(#${bodyGradient})" ${outline}/>

      <path d="M39 52 Q50 57 61 52"
        fill="none" ${outline} opacity=".6"/>

      <path d="M42 64 Q50 68 58 64"
        fill="none"
        stroke="${palette.shine}"
        stroke-width="2"
        opacity=".65"
        stroke-linecap="round"/>

      <circle cx="34" cy="33" r="4" fill="url(#${metalGradient})" ${outline}/>
      <circle cx="42" cy="25" r="4" fill="url(#${metalGradient})" ${outline}/>
      <circle cx="50" cy="36" r="4" fill="url(#${metalGradient})" ${outline}/>
      <circle cx="58" cy="25" r="4" fill="url(#${metalGradient})" ${outline}/>
      <circle cx="66" cy="33" r="4" fill="url(#${metalGradient})" ${outline}/>
    `,

    king: `
      ${base}
      <path d="M35 73
        Q40 66 42 59
        L39 52
        Q42 46 45 41
        L43 33
        L57 33
        L55 41
        Q58 46 61 52
        L58 59
        Q60 66 65 73 Z"
        fill="url(#${bodyGradient})" ${outline}/>

      <path d="M44 33 L44 25 L48 25 L48 17
        L52 17 L52 25 L56 25 L56 33 Z"
        fill="url(#${metalGradient})" ${outline}/>

      <path d="M43 52 Q50 56 57 52"
        fill="none" ${outline} opacity=".6"/>

      <path d="M43 65 Q50 68 58 65"
        fill="none"
        stroke="${palette.shine}"
        stroke-width="2"
        opacity=".65"
        stroke-linecap="round"/>
    `
  };

  return shapes[type];
}

/*
 * Returns an SVG string for one piece.
 *
 * Examples:
 *   getChessPieceSVG("queen", "white")
 *   getChessPieceSVG("k", "b")
 */
export function getChessPieceSVG(type, color) {
  const pieceType = normalizePieceType(type);
  const pieceColor = normalizeColor(color);
  const palette = PALETTES[pieceColor];
  const id = ++nextPieceId;
  const bodyGradient = `piece-body-${id}`;
  const metalGradient = `piece-metal-${id}`;
  const label = `${pieceColor} ${pieceType}`;

  return `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      width="100%"
      height="100%"
      role="img"
      aria-label="${label}"
      preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="${bodyGradient}" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${palette.top}"/>
          <stop offset="48%" stop-color="${palette.middle}"/>
          <stop offset="100%" stop-color="${palette.bottom}"/>
        </linearGradient>

        <linearGradient id="${metalGradient}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${palette.top}"/>
          <stop offset="100%" stop-color="${palette.bottom}"/>
        </linearGradient>
      </defs>

      <g>${pieceShape(pieceType, bodyGradient, metalGradient, palette)}</g>
    </svg>
  `;
}

/*
 * Returns a DOM element ready to put inside a board square.
 *
 * Example:
 *   square.appendChild(createChessPiece("pawn", "white"));
 */
export function createChessPiece(type, color) {
  const pieceType = normalizePieceType(type);
  const pieceColor = normalizeColor(color);

  const wrapper = document.createElement("span");
  wrapper.className = `chess-piece chess-piece--${pieceColor}`;
  wrapper.setAttribute("aria-label", `${pieceColor} ${pieceType}`);
  wrapper.style.cssText =
    "display:grid;place-items:center;width:100%;height:100%;";

  wrapper.innerHTML = getChessPieceSVG(pieceType, pieceColor);
  return wrapper;
}
