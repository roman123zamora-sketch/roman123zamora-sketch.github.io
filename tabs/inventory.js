import { board } from "../ui/chessboard.js";
import { getThemes } from "../ui/board-themes.js";
import { action, session, subscribe } from "../game/session.js";

export default function inventory(content) {
  content.innerHTML = `
    <section class="panel page">
      <h1>Inventory</h1>
      <p>Equip an owned board to change both chess boards and the site colors.</p>
      <p class="help collection-notice" role="status"></p>
      <div class="theme-grid"></div>
    </section>`;
  const grid = content.querySelector(".theme-grid");
  const notice = content.querySelector(".collection-notice");
  let equipping;
  let timeout;

  function draw() {
    const { equippedBoard, ownedBoards } = session.profile;
    const focusedBoard = grid.contains(document.activeElement) ? document.activeElement.dataset.board : null;
    grid.replaceChildren();
    for (const theme of getThemes().filter(theme => Object.values(ownedBoards).includes(theme.id))) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "theme-card";
      button.dataset.board = theme.id;
      button.setAttribute("aria-pressed", String(equippedBoard === theme.id));
      button.setAttribute("aria-busy", String(equipping === theme.id));
      button.setAttribute("aria-disabled", String(Boolean(equipping)));
      const name = document.createElement("span");
      name.textContent = theme.name;
      button.append(board(theme, false, true), name);
      if (equippedBoard === theme.id) {
        const status = document.createElement("small");
        status.textContent = "Equipped";
        button.append(status);
      }
      button.addEventListener("click", () => {
        if (equipping || equippedBoard === theme.id) return;
        equipping = theme.id;
        notice.textContent = `Equipping ${theme.name}…`;
        draw();
        timeout = setTimeout(() => {
          equipping = null;
          notice.textContent = "The board hasn’t changed yet. Try again.";
          draw();
        }, 8000);
        action("equipBoard", { id: theme.id });
      });
      grid.append(button);
      if (theme.id === focusedBoard) button.focus({ preventScroll: true });
    }
  }
  draw();
  const stop = subscribe(kind => {
    if (equipping && (kind === "error" || (kind === "profile" && session.profile.equippedBoard === equipping))) {
      clearTimeout(timeout);
      equipping = null;
      notice.textContent = kind === "error" ? session.notice : "Board equipped.";
    }
    if (kind === "catalog" || kind === "profile" || kind === "error") draw();
  });
  return () => { clearTimeout(timeout); stop(); };
}
