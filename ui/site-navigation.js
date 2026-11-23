import { applyEquippedTheme } from "./board-themes.js";
import { connect, soundEnabled, toggleSound, unlockSound, playSound, subscribe } from "../game/session.js";
import chess from "../tabs/chess.js";
import fourPlayerChess from "../tabs/four-player-chess.js";
import shop from "../tabs/shop.js";
import inventory from "../tabs/inventory.js";
import profile from "../tabs/profile.js";
import learn from "../tabs/learn.js";
import puzzles from "../tabs/puzzles.js";

const pages = new Map([
  ["chess", chess],
  ["4-player-chess", fourPlayerChess],
  ["shop", shop],
  ["inventory", inventory],
  ["profile", profile],
  ["learn", learn],
  ["puzzles", puzzles]
]);
const content = document.querySelector("#content");
const links = document.querySelectorAll("nav a");

let cleanup;

function navigate() {
  cleanup?.();
  const hash = location.hash === "#boards" ? "inventory" : location.hash.slice(1);
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
function showSoundSetting(enabled) {
  audio.setAttribute("aria-pressed", String(enabled));
  audio.title = enabled ? "Mute game sounds" : "Enable game sounds";
  audio.textContent = enabled ? "Sound" : "Sound off";
}
showSoundSetting(soundEnabled());
audio.addEventListener("click", () => showSoundSetting(toggleSound()));
const soundControl = 'button:not(:disabled):not([data-square]):not([aria-disabled="true"]), a[href]:not([aria-disabled="true"])';
document.addEventListener("pointerdown", event => {
  if (event.isTrusted && event.pointerType === "mouse" && !audio.contains(event.target)) unlockSound();
}, { capture: true });
document.addEventListener("pointerup", event => {
  if (event.isTrusted && event.pointerType !== "mouse" && !audio.contains(event.target)) unlockSound();
}, { capture: true });
document.addEventListener("keydown", event => {
  if (event.isTrusted && !audio.contains(event.target)) unlockSound();
}, { capture: true });
document.addEventListener("pointerover", event => {
  if (event.pointerType !== "mouse") return;
  const control = event.target.closest(soundControl);
  if (control && !control.contains(event.relatedTarget)) playSound("hover");
});
document.addEventListener("click", event => {
  const control = event.target.closest(soundControl);
  if (control && control !== audio) unlockSound("button");
  else if (control !== audio) unlockSound();
}, { capture: true });
let previousMatch;
subscribe((kind, match) => {
  if (kind === "profile" || kind === "catalog") applyEquippedTheme();
  if (kind !== "state" || match.matchId === previousMatch) return;
  previousMatch = match.matchId;
  if (location.hash === "#puzzles") return;
  const page = match.variant === "four" ? "#4-player-chess" : "#chess";
  if ((location.hash || "#chess") !== page) location.hash = page;
});
connect();
