import { board, getTheme, setTheme, themes } from "../Board Themes.js";

export default function boards(content) {
  content.innerHTML = `
    <section class="panel page">
      <h1>My Boards</h1>
      <p>Equip a theme for both chess boards. Your choice is saved in this browser.</p>
      <div class="theme-grid"></div>
    </section>`;
  const grid = content.querySelector(".theme-grid");
  const equipped = getTheme().id;

  for (const theme of themes) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "theme-card";
    button.setAttribute("aria-pressed", String(equipped === theme.id));
    const name = document.createElement("span");
    name.textContent = theme.name;
    button.append(board(theme, false, true), name);
    button.addEventListener("click", () => {
      setTheme(theme);
      grid.querySelector('[aria-pressed="true"]').setAttribute("aria-pressed", "false");
      button.setAttribute("aria-pressed", "true");
    });
    grid.append(button);
  }
}
