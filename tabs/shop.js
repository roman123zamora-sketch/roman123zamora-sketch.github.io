import { board } from "../ui/chessboard.js";
import { getThemes } from "../ui/board-themes.js";
import { action, session, subscribe } from "../game/session.js";

export default function shop(content) {
  content.innerHTML = `
    <section class="panel page">
      <h1>Shop</h1>
      <div class="action-row shop-sections" role="group" aria-label="Shop sections">
        <button type="button" data-shop="boards" aria-pressed="true" aria-controls="shop-boards">Boards</button>
        <button type="button" data-shop="pieces" aria-pressed="false" aria-controls="shop-pieces">Pieces</button>
        <button type="button" data-shop="accessories" aria-pressed="false" aria-controls="shop-accessories">Accessories</button>
      </div>
      <p class="balance" aria-live="polite"></p>
      <section id="shop-boards" aria-label="Boards">
        <p class="help">Equip purchased boards in your <a href="#inventory">Inventory</a>.</p>
        <div class="theme-grid"></div>
      </section>
      <section id="shop-pieces" aria-label="Pieces" hidden><p class="help">No pieces available yet.</p></section>
      <section id="shop-accessories" aria-label="Accessories" hidden><p class="help">No accessories available yet.</p></section>
    </section>`;
  const grid = content.querySelector(".theme-grid");

  const sections = [...content.querySelectorAll("[data-shop]")];
  for (const button of sections) {
    button.addEventListener("click", () => {
      for (const section of sections) {
        const active = section === button;
        section.setAttribute("aria-pressed", String(active));
        content.querySelector("#shop-" + section.dataset.shop).hidden = !active;
      }
    });
  }

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
