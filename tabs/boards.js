import { board } from "../ui/chessboard.js";
import { getThemes } from "../ui/board-themes.js";
import { action, session, subscribe } from "../game/session.js";

export default function boards(content) {
  content.innerHTML = `
    <section class="panel page">
      <h1>My Boards</h1>
      <p>Equip an owned board to change both chess boards and the site colors.</p>
      <div class="theme-grid"></div>
    </section>`;
  const grid = content.querySelector(".theme-grid");

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
      const name = document.createElement("span");
      name.textContent = theme.name;
      button.append(board(theme, false, true), name);
      if (equippedBoard === theme.id) {
        const status = document.createElement("small");
        status.textContent = "Equipped";
        button.append(status);
      }
      button.addEventListener("click", () => action("equipBoard", { id: theme.id }));
      grid.append(button);
      if (theme.id === focusedBoard) button.focus({ preventScroll: true });
    }
  }
  draw();
  return subscribe(kind => { if (kind === "catalog" || kind === "profile") draw(); });
}
