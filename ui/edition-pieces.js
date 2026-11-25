// Material detail follows the sculpted profile. A different anchor keeps ornament out of notches and crown tips.
const anchors = { p: [33, 29], r: [30, 22], n: [40, 22], b: [36, 23], q: [33, 32], k: [32, 29] };

export function editionDetail(piece, clip) {
  const [x, y] = anchors[piece];
  return `<g class="edition-detail" clip-path="url(#${clip})" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path class="edition-plane-shadow" transform="translate(.9 1.4)"/>
    <path class="edition-plane"/>
    <g transform="translate(${x} ${y})">
      <path class="edition-relief" transform="translate(.5 .65)" stroke="#151221" stroke-opacity=".58" stroke-width="2.8"/>
      <path class="edition-relief" stroke="currentColor" stroke-width="1.45"/>
      <path class="edition-grain" stroke="currentColor" stroke-width=".85"/>
    </g>
    <path d="M27 72q13 1.8 26 0" stroke="#19151e" stroke-opacity=".64" stroke-width="1.6"/>
    <path d="M28 69q12-1.2 24 0" stroke="currentColor" stroke-width="1.3"/>
  </g>`;
}
