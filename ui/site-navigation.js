import { applyEquippedTheme } from "./board-themes.js";
import { connect, soundEnabled, toggleSound, unlockSound, subscribe } from "../game/session.js";
import chess from "../tabs/chess.js";
import fourPlayerChess from "../tabs/four-player-chess.js";
import shop from "../tabs/shop.js";
import boards from "../tabs/boards.js";
import profile from "../tabs/profile.js";
import learn from "../tabs/learn.js";

const pages = new Map([
  ["chess", chess],
  ["4-player-chess", fourPlayerChess],
  ["shop", shop],
  ["boards", boards],
  ["profile", profile],
  ["learn", learn]
]);
const content = document.querySelector("#content");
const links = document.querySelectorAll("nav a");

let cleanup;

function navigate() {
  cleanup?.();
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
  cleanup = pages.get(page)(content);
}

window.addEventListener("hashchange", navigate);
navigate();

const audio = document.querySelector("#audio");
audio.setAttribute("aria-pressed", String(soundEnabled()));
audio.addEventListener("click", () => audio.setAttribute("aria-pressed", String(toggleSound())));
document.addEventListener("pointerdown", unlockSound, { once: true });
let previousMatch;
subscribe((kind, match) => {
  if (kind === "profile" || kind === "catalog") applyEquippedTheme();
  if (kind !== "state" || match.matchId === previousMatch) return;
  previousMatch = match.matchId;
  const page = match.variant === "four" ? "#4-player-chess" : "#chess";
  if ((location.hash || "#chess") !== page) location.hash = page;
});
connect();
