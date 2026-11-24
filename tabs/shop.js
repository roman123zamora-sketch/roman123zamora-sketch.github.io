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
      <p class="balance"></p>
      <p class="help collection-notice" role="status"></p>
      <section id="shop-boards" aria-label="Boards">
        <p class="help">Equip purchased boards in your <a href="#inventory">Inventory</a>.</p>
        <div class="theme-grid"></div>
      </section>
      <section id="shop-pieces" aria-label="Pieces" hidden><p class="empty-state">No pieces available yet.</p></section>
      <section id="shop-accessories" aria-label="Accessories" hidden><p class="empty-state">No accessories available yet.</p></section>
    </section>`;
  const grid = content.querySelector(".theme-grid");
  const notice = content.querySelector(".collection-notice");
  let buying;
  let lastPurchase;
  let timeout;

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
    balance.textContent = `${pieceStorage} stored pieces`;
    const focused = grid.contains(document.activeElement) ? document.activeElement.dataset.theme : null;
    grid.replaceChildren();
    for (const theme of getThemes()) {
      const card = document.createElement("article");
      card.className = "theme-card";
      const title = document.createElement("h2");
      title.textContent = theme.name;
      const purchase = document.createElement("button");
      purchase.type = "button";
      const owned = Object.values(ownedBoards).includes(theme.id);
      purchase.dataset.theme = theme.id;
      purchase.textContent = owned ? "Owned" : buying === theme.id ? "Buying…" : `Buy · ${theme.price} pieces`;
      const affordable = pieceStorage >= theme.price;
      purchase.disabled = owned || !affordable || Boolean(buying);
      purchase.setAttribute("aria-busy", String(buying === theme.id));
      if (!owned && !affordable) purchase.title = `Requires ${theme.price - pieceStorage} more stored pieces`;
      purchase.setAttribute("aria-label", owned ? `${theme.name}, owned` : `Buy ${theme.name} for ${theme.price} pieces`);
      purchase.addEventListener("click", () => {
        if (buying) return;
        lastPurchase = buying = theme.id;
        notice.textContent = `Buying ${theme.name}…`;
        draw();
        timeout = setTimeout(() => {
          buying = null;
          notice.textContent = "The purchase is taking longer than expected. Check your collection before retrying.";
          draw();
        }, 8000);
        action("buyBoard", { id: theme.id });
      });
      card.append(board(theme, false, true), title, purchase);
      grid.append(card);
      if (theme.id === focused && !purchase.disabled) purchase.focus({ preventScroll: true });
    }
  }
  draw();
  const stop = subscribe((kind, data) => {
    if ((kind === "boardPurchase" && data.id === lastPurchase) || (kind === "error" && buying) ||
        (kind === "profile" && buying && Object.values(session.profile.ownedBoards).includes(buying))) {
      clearTimeout(timeout);
      buying = null;
      notice.textContent = session.notice || "Board added to your collection.";
    }
    if (["catalog", "profile", "boardPurchase", "error"].includes(kind)) draw();
  });
  return () => { clearTimeout(timeout); stop(); };
}
