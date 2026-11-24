const colors = { w: "White", b: "Black", R: "Red", B: "Blue", Y: "Yellow", G: "Green" };

export function drawMoveList(list, history, ply) {
  list.replaceChildren();
  if (history.length === 0) {
    const row = document.createElement("li");
    row.className = "empty-moves";
    row.textContent = "No moves yet.";
    list.append(row);
    return;
  }
  for (const [index, move] of history.entries()) {
    const row = document.createElement("li");
    const { c = move.color, f = move.from, t = move.to, p = move.promotion } = move;
    const castling = move.special?.startsWith("castle");
    row.textContent = `${colors[c]}  ${f}${move.captured ? "×" : "–"}${t}${p ? "=" + p : ""}${castling ? " · Castling" : ""}`;
    if (index + 1 === ply) row.setAttribute("aria-current", "step");
    list.append(row);
  }
  const current = list.querySelector('[aria-current="step"]');
  if (!current) list.scrollTop = 0;
  else if (current.offsetTop < list.scrollTop) list.scrollTop = current.offsetTop;
  else if (current.offsetTop + current.offsetHeight > list.scrollTop + list.clientHeight) {
    list.scrollTop = current.offsetTop + current.offsetHeight - list.clientHeight;
  }
}
