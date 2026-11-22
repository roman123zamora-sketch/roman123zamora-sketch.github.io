import { board } from "../ui/chessboard.js";
import { getThemes } from "../ui/board-themes.js";
import { action, session, subscribe } from "../game/session.js";

export default function shop(content) {
  content.innerHTML = `
    <section class="panel page">
      <h1>Board Shop</h1>
      <p>Earn stored pieces by capturing in matches. Equip purchased themes in <a href="#boards">Boards</a>.</p>
      <p class="balance" aria-live="polite"></p>
      <div class="theme-grid"></div>
    </section>`;
  const grid = content.querySelector(".theme-grid");

  function draw() {
    const { pieceStorage, ownedBoards } = session.profile;
    const balance = content.querySelector(".balance");
    balance.textContent = `${pieceStorage} stored pieces${session.notice ? " · " + session.notice : ""}`;
    grid.replaceChildren();
    for (const theme of getThemes()) {
      const card = document.createElement("article");
      card.className = "theme-card";
      const title = document.createElement("h2");
      title.textContent = theme.name;
      const purchase = document.createElement("button");
      purchase.type = "button";
      const owned = Object.values(ownedBoards).includes(theme.id);
      purchase.textContent = owned ? "Owned" : `Buy · ${theme.price} pieces`;
      purchase.setAttribute("aria-label", owned ? `${theme.name}, owned` : `Buy ${theme.name} for ${theme.price} pieces`);
      purchase.disabled = owned || pieceStorage < theme.price;
      purchase.addEventListener("click", () => action("buyBoard", { id: theme.id }));
      card.append(board(theme, false, true), title, purchase);
      grid.append(card);
    }
  }
  draw();
  return subscribe(kind => {
    if (kind === "catalog" || kind === "profile" || kind === "boardPurchase" || kind === "error") draw();
  });
}
