import { board, themes } from "../Board Themes.js";

export default function shop(content) {
  content.innerHTML = `
    <section class="panel page">
      <h1>Board Shop</h1>
      <p>Browse the board collection. You can equip a theme in <a href="#boards">Boards</a>.</p>
      <div class="theme-grid"></div>
    </section>`;
  const grid = content.querySelector(".theme-grid");
  for (const theme of themes) {
    const card = document.createElement("article");
    card.className = "theme-card";
    card.innerHTML = `<h2>${theme.name}</h2>`;
    card.prepend(board(theme, false, true));
    grid.append(card);
  }
}
