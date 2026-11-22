import { board, themes } from "../Board Themes.js";
import { action, session, subscribe } from "../game/session.js";

export default function boards(content) {
  content.innerHTML = `
    <section class="panel page">
      <h1>My Boards</h1>
      <p>Choose an owned theme to equip it on both chess boards.</p>
      <div class="theme-grid"></div>
    </section>`;
  const grid = content.querySelector(".theme-grid");

  function draw() {
    const { equippedBoard, ownedBoards } = session.profile;
    grid.replaceChildren();
    for (const theme of themes.filter(theme => Object.values(ownedBoards).includes(theme.id))) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "theme-card";
      button.setAttribute("aria-pressed", String(equippedBoard === theme.id));
      const name = document.createElement("span");
      name.textContent = theme.name;
      button.append(board(theme, false, true), name);
      button.addEventListener("click", () => action("equipBoard", { id: theme.id }));
      grid.append(button);
    }
  }
  draw();
  return subscribe(kind => { if (kind === "profile") draw(); });
}
