// Roots and foliage follow the original piece outlines, including their shared base.
const growth = {
  p: ["M29 35c5-11 19-12 22-2 2 7-9 12-15 6s2-11 8-9 M42 42c-10 9 7 12-5 21",
      "M45 31q4-8 9-5-1 4-9 5"],
  r: ["M28 18c-3 15 14 18 8 32-2 6-5 9-6 14 M42 16c-5 16 11 19 4 34-3 7 4 9 7 15 M51 17c4 12-9 15-15 19",
      "M47 33q8-7 11-3-4 5-11 3 M38 49l-7-6 2 7z"],
  n: ["M57 16C64 33 59 49 49 61 M50 14c9 13 9 24 3 36-5 10-12 11-13 17 M23 42c7-13 20-12 17-25",
      "M56 25l5-5-2 8z M57 33l5-3-3 7z M55 43l5-2-4 6z M49 52q-9 0-9 6 7 1 9-6"],
  b: ["M38 12c-1 14-11 16-7 25 4 7 16 3 16-6 M44 42c-11 8 5 12-8 22 M36 45c6-7 6-9 4-12",
      "M42 27q5-7 9-5-3 6-9 5 M43 50q7-4 9 1-4 3-9-1"],
  q: ["M22 22c11 8 4 18 19 20s15-10 16-19 M39 12c-4 9 12 20 5 31-7 9 8 13-5 22",
      "M42 34q8-8 13-4-3 6-13 4 M33 39q-8-3-8 1 4 5 8-1"],
  k: ["M38 4c-3 14 10 17 4 26-8 10-22 5-15-10 M54 20c5 11-12 12-13 22s8 13 4 22 M35 39c9 7-5 12 1 24",
      "M42 43q9-3 11 2-4 4-11-2 M35 31q-8-8-10-4 0 5 10 4"]
};

const pedestalRoots = ["M22 69c7 2 13-8 23-4s9 7 15 6", "M23 74c12-1 13-5 21-4s8 4 16 3"];
function root(path) {
  return `<path class="bark-furrow" d="${path}" stroke-width="5.8"/>
    <path class="bark-body" d="${path}" stroke-width="4.1" transform="translate(-.32 -.35)"/>
    <path class="bark-ridge" d="${path}" stroke-width="1.1" transform="translate(-1.05 -.9)"/>
    <path class="bark-grain" d="${path}" stroke-width=".65" stroke-dasharray="3 3 1 4" transform="translate(.6 .4)"/>`;
}

export function natureGrowth(piece, clip) {
  const [roots, shoots] = growth[piece];
  // Paint one complete root at a time so a foreground root covers the roots behind it.
  const rootPaths = [...roots.split(/ (?=M)/), ...pedestalRoots];
  return `<g class="nature-growth" clip-path="url(#${clip})" stroke-linecap="round" stroke-linejoin="round">
    <g fill="none">
      ${rootPaths.map(root).join("")}
    </g>
    <path class="new-growth" d="${shoots} M30 68q-3-5-7-4 0 4 7 4 M51 69q4-5 7-4-1 5-7 4 M34 69l-3 4 6-3z" stroke-width=".55"/>
  </g>`;
}
