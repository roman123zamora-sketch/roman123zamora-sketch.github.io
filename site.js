import chess from "./tabs/Chess.js";
import fourPlayerChess from "./tabs/4-Player Chess.js";
import shop from "./tabs/Shop.js";
import boards from "./tabs/Boards.js";
import profile from "./tabs/Profile.js";

const pages = new Map([
  ["chess", chess],
  ["4-player-chess", fourPlayerChess],
  ["shop", shop],
  ["boards", boards],
  ["profile", profile]
]);
const content = document.querySelector("#content");
const links = document.querySelectorAll("nav a");

function navigate() {
  const hash = location.hash.slice(1);
  const page = pages.has(hash) ? hash : "chess";
  for (const link of links) {
    if (link.hash === "#" + page) {
      link.setAttribute("aria-current", "page");
      document.title = link.textContent + " | Exalted Chess";
    } else {
      link.removeAttribute("aria-current");
    }
  }
  content.replaceChildren();
  pages.get(page)(content);
}

window.addEventListener("hashchange", navigate);
navigate();
