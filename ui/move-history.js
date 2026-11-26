const colors = { w: "White", b: "Black", R: "Red", B: "Blue", Y: "Yellow", G: "Green" };

export function drawMoveList(list, history, ply, selectPly) {
  const previous = list.querySelector('[aria-current="step"]');
  if (history.length === 0) {
    if (list.firstElementChild?.classList.contains("empty-moves")) return;
    const row = document.createElement("li");
    row.className = "empty-moves";
    row.textContent = "No moves yet.";
    list.replaceChildren(row);
    return;
  }
  if (list.firstElementChild?.classList.contains("empty-moves")) list.replaceChildren();
  while (list.children.length > history.length) list.lastElementChild.remove();

  for (const [index, move] of history.entries()) {
    const step = index + 1;
    let button = list.children[index]?.firstElementChild;
    if (!button) {
      const row = document.createElement("li");
      button = document.createElement("button");
      button.type = "button";
      button.className = "move-history-entry";
      button.addEventListener("click", () => selectPly(step));
      row.append(button);
      list.append(row);
    }
    const { c = move.color, f = move.from, t = move.to, p = move.promotion } = move;
    const castling = move.special?.startsWith("castle");
    const label = `${colors[c]}  ${f}${move.captured ? "×" : "–"}${t}${p ? "=" + p : ""}${castling ? " · Castling" : ""}`;
    if (button.textContent !== label) button.textContent = label;
    if (step === ply) button.setAttribute("aria-current", "step");
    else button.removeAttribute("aria-current");
  }
  const current = list.querySelector('[aria-current="step"]');
  if (current === previous) return;
  if (!current) {
    list.scrollTop = 0;
    return;
  }
  const row = current.parentElement;
  if (row.offsetTop < list.scrollTop) list.scrollTop = row.offsetTop;
  else if (row.offsetTop + row.offsetHeight > list.scrollTop + list.clientHeight) {
    list.scrollTop = row.offsetTop + row.offsetHeight - list.clientHeight;
  }
}
