import { board } from "../ui/chessboard.js";
import { getTheme } from "../ui/board-themes.js";

export default function inventory(content) {
  content.innerHTML = `
    <section class="panel page">
      <h1>Inventory</h1>
      <div class="theme-grid">
        <article class="theme-card" data-equipped>
          <h2>Classic</h2>
          <p class="help">Always active</p>
        </article>
      </div>
    </section>`;
  content.querySelector(".theme-card").prepend(board(getTheme(), false, true));
}
