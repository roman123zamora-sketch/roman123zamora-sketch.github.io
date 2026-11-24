import { board } from "../ui/chessboard.js";
import { getThemes } from "../ui/board-themes.js";
import { action, session, subscribe } from "../game/session.js";

export default function inventory(content) {
  content.innerHTML = `
    <section class="panel page">
      <h1>Inventory</h1>
      <p>Equip any theme to change the boards and site colors. Unequip it to return to the default Blue look.</p>
      <p class="help collection-notice" role="status"></p>
      <div class="theme-grid"></div>
    </section>`;
  const grid = content.querySelector(".theme-grid");
  const notice = content.querySelector(".collection-notice");
  let equipping;
  let timeout;

  function draw() {
    const { equippedBoard } = session.profile;
    const focusedBoard = grid.contains(document.activeElement) ? document.activeElement.dataset.board : null;
    grid.replaceChildren();
    for (const theme of getThemes()) {
      const equipped = equippedBoard === theme.id;
      const card = document.createElement("article");
      card.className = "theme-card";
      card.toggleAttribute("data-equipped", equipped);
      const name = document.createElement("h2");
      name.textContent = theme.name;
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.board = theme.id;
      button.textContent = equipped ? "Unequip" : "Equip";
      button.setAttribute("aria-label", `${button.textContent} ${theme.name}`);
      button.setAttribute("aria-busy", String(equipping?.theme === theme.id));
      button.setAttribute("aria-disabled", String(Boolean(equipping)));
      card.append(board(theme, false, true), name, button);
      button.addEventListener("click", () => {
        if (equipping) return;
        const target = equipped ? "" : theme.id;
        equipping = { theme: theme.id, target };
        notice.textContent = equipped ? `Unequipping ${theme.name}…` : `Equipping ${theme.name}…`;
        draw();
        timeout = setTimeout(() => {
          equipping = null;
          notice.textContent = "The board hasn’t changed yet. Try again.";
          draw();
        }, 8000);
        action("equipBoard", { id: target });
      });
      grid.append(card);
      if (theme.id === focusedBoard) button.focus({ preventScroll: true });
    }
  }
  draw();
  const stop = subscribe(kind => {
    if (equipping && (kind === "error" || (kind === "profile" && session.profile.equippedBoard === equipping.target))) {
      clearTimeout(timeout);
      const { target } = equipping;
      equipping = null;
      notice.textContent = kind === "error" ? session.notice : target ? "Board equipped." : "Board unequipped. Default Blue restored.";
    }
    if (kind === "catalog" || kind === "profile" || kind === "error") draw();
  });
  return () => { clearTimeout(timeout); stop(); };
}
