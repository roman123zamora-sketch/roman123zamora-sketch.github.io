import { editionDetail } from "./edition-pieces.js";
import { natureGrowth } from "./nature-pieces.js";

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

const machinedEdges = {
  p: { lip: "M33 45q7 3 14 0 M34 34a6 6 0 0 1 4-6" },
  r: { lip: "M26 22v8l5 5h17 M37 20h5 M51 20h3", seam: "M32 40h16" },
  n: { lip: "M46 16c11 7 14 24 5 42", seam: "M43 36c-1 9-5 16-11 23", pin: [48, 49] },
  b: { lip: "M34 20l5-7 M30 44q9 3 19 0", seam: "M33 48q7 2 14 0" },
  q: { lip: "M27 29l4 7 M31 41q8 4 18 0 M40 20l4 7", seam: "M31 47q9 5 18 0" },
  k: { lip: "M33 12h6V7 M26 29c0-5 5-7 9-4 M30 46q10 6 20 0", seam: "M33 52q7 3 14 0" }
};

function artwork(piece, side, id) {
  const [light, fill, shade, edge, detail] = palettes[side];
  const body = id + "-body";
  const bevel = id + "-bevel";
  const shadow = id + "-shadow";
  const steel = id + "-steel";
  const edition = id + "-edition";
  const bark = id + "-bark";
  const clip = id + "-bark-clip";
  const base = pedestal.replaceAll("BEVEL", `url(#${bevel})`);
  const metalStop = (stop, fallback) => `style="stop-color:var(--metal-${side}-${stop}, var(--edition-${stop}, ${fallback}))"`;
  const profile = profiles[piece];
  const machining = machinedEdges[piece];
  const contours = profile.body.replaceAll("BEVEL", `url(#${bevel})`).replaceAll("EYE", side === "white" || side === "yellow" ? edge : detail);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"
       preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
    <defs>
      <radialGradient id="${body}" cx="27%" cy="17%" r="86%">
        <stop ${metalStop("highlight", light)}/>
        <stop offset=".55" ${metalStop("face", fill)}/>
        <stop offset="1" ${metalStop("shadow", shade)}/>
      </radialGradient>
      <linearGradient id="${bevel}" x1="18%" y1="0%" x2="78%" y2="100%">
        <stop ${metalStop("highlight", light)}/>
        <stop offset=".37" ${metalStop("face", fill)}/>
        <stop offset="1" ${metalStop("shadow", shade)}/>
      </linearGradient>
      <linearGradient id="${steel}" x2="83%" y2="98%">
        <stop ${metalStop("shadow", shade)}/>
        <stop offset=".17" ${metalStop("face", fill)}/>
        <stop offset=".31" ${metalStop("highlight", light)}/>
        <stop offset=".43" ${metalStop("face", fill)}/>
        <stop offset=".61" ${metalStop("shadow", shade)}/>
        <stop offset=".75" ${metalStop("face", fill)}/>
        <stop offset="1" ${metalStop("shadow", shade)}/>
      </linearGradient>
      <linearGradient id="${edition}" x1="12%" y1="6%" x2="90%" y2="85%">
        <stop style="stop-color:var(--edition-highlight, ${light})"/>
        <stop offset=".32" style="stop-color:var(--edition-face, ${fill})"/>
        <stop offset=".73" style="stop-color:var(--edition-shadow, ${shade})"/>
        <stop offset="1" style="stop-color:var(--edition-rim, ${fill})"/>
      </linearGradient>
      <linearGradient id="${bark}" x1="5%" y1="12%" x2="87%" y2="85%">
        <stop style="stop-color:var(--root-light)"/>
        <stop offset=".53" style="stop-color:var(--root-mid)"/>
        <stop offset="1" style="stop-color:var(--root-dark)"/>
      </linearGradient>
      <clipPath id="${clip}">${contours}${base}</clipPath>
      <radialGradient id="${shadow}">
        <stop stop-color="#081525" stop-opacity=".35"/>
        <stop offset="1" stop-color="#081525" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <ellipse cx="40" cy="74.5" rx="20" ry="3" fill="url(#${shadow})"/>
    <g class="piece-finish" style="--piece-steel: url(#${steel}); --piece-plastic: url(#${body}); --piece-edition: url(#${edition})" fill="url(#${body})" stroke="${edge}" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round">
      ${contours}
      ${base}
      <path d="${profile.light}M26 69.5h16" fill="none" stroke="${detail}" stroke-opacity=".44" stroke-width="1.45"/>
      <path d="${profile.inset}" fill="none" stroke="${edge}" stroke-width="1.65" stroke-opacity=".62"/>
      <g class="metal-rivets" fill="url(#${bevel})" stroke="${edge}" stroke-width=".6">
        <path d="${machining.lip} M28 64h24 M26 69q14-2 28 0" fill="none"
          stroke="var(--metal-${side}-highlight)" stroke-width="1.1" stroke-opacity=".83"/>
        ${machining.seam ? `<path d="${machining.seam}" fill="none" stroke-width="1.05"/>` : ""}
        ${machining.pin ? `<circle cx="${machining.pin[0]}" cy="${machining.pin[1]}" r="1.65"/>` : ""}
        <path d="M26 72h28" fill="none" stroke-width=".8"/>
      </g>
    </g>
    ${editionDetail(piece, clip)}
    <g class="nature-piece" fill="url(#${bark})" stroke="var(--root-edge)" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round">
      ${profile.body.replaceAll("BEVEL", `url(#${bark})`).replaceAll("EYE", "var(--root-edge)")}
      ${pedestal.replaceAll("BEVEL", `url(#${bark})`)}
      ${natureGrowth(piece, clip)}
    </g>
  </svg>`;
}

export function createChessPiece(type, side) {
  const piece = type.toLowerCase();
  const wrapper = document.createElement("span");
  wrapper.className = "chess-piece";
  wrapper.dataset.pieceSide = side;
  wrapper.dataset.art = `${piece}-${side}`;
  wrapper.innerHTML = artwork(piece, side, `piece-${++nextId}`);
  return wrapper;
}

export function pieceName(type) {
  return names[type.toLowerCase()];
}
