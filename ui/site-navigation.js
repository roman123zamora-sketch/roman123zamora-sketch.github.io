import { applyEquippedTheme } from "./board-themes.js";
import { action, connect, soundEnabled, toggleSound, unlockSound, playSound, session, subscribe } from "../game/session.js";
import chess from "../tabs/chess.js";
import fourPlayerChess from "../tabs/four-player-chess.js";
import inventory from "../tabs/inventory.js";
import profile from "../tabs/profile.js";
import learn from "../tabs/learn.js";
import puzzles from "../tabs/puzzles.js";

const pages = new Map([
  ["chess", chess],
  ["4-player-chess", fourPlayerChess],
  ["inventory", inventory],
  ["profile", profile],
  ["learn", learn],
  ["puzzles", puzzles]
]);
const content = document.querySelector("#content");
const links = document.querySelectorAll("nav a");

let cleanup;
let focusPage = false;
document.querySelector(".skip-link").addEventListener("click", event => {
  event.preventDefault();
  content.focus();
});
for (const link of links) {
  link.addEventListener("click", event => {
    if (event.detail === 0) {
      if (link.hash === location.hash) content.focus();
      else focusPage = true;
    }
  });
}

function navigate() {
  const previousBoard = content.querySelector(".aligned-board-area .board-and-eval")?.getBoundingClientRect();
  cleanup?.();
  const hash = ["#boards", "#shop"].includes(location.hash) ? "inventory" : location.hash.slice(1);
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
  content.style.minBlockSize = "";

  const nextBoard = content.querySelector(".aligned-board-area .board-and-eval");
  if (previousBoard && nextBoard && previousBoard.bottom > 0 && previousBoard.top < innerHeight) {
    const target = Math.max(0, scrollY + nextBoard.getBoundingClientRect().top - previousBoard.top);
    const available = document.documentElement.scrollHeight - innerHeight;
    if (target > available) {
      // A shorter tab can otherwise pull the board down as the viewport scroll clamps.
      content.style.minBlockSize = `${Math.ceil(innerHeight + target - (content.getBoundingClientRect().top + scrollY))}px`;
    }
    if (Math.abs(scrollY - target) >= 1) window.scrollTo({ top: target, behavior: "instant" });
  }
  if (focusPage) {
    focusPage = false;
    content.focus({ preventScroll: true });
  }
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
  if (control && !control.contains(event.relatedTarget)) playSound("hover", 0, control.dataset.soundBoard);
});
document.addEventListener("click", event => {
  const control = event.target.closest(soundControl);
  if (control && control !== audio && !control.hasAttribute("data-premove-control")) unlockSound("button", control.dataset.soundBoard);
  else if (control !== audio) unlockSound();
}, { capture: true });
let previousMatch;
subscribe((kind, match) => {
  if (kind === "profile" || kind === "catalog") applyEquippedTheme();
  if (kind === "inviteRoom") {
    const page = match.variant === "four" ? "#4-player-chess" : "#chess";
    if ((location.hash || "#chess") !== page) location.hash = page;
  }
  if (kind !== "state" || match.matchId === previousMatch) return;
  previousMatch = match.matchId;
  if (location.hash === "#puzzles" || (!session.network && !["", "#chess", "#4-player-chess"].includes(location.hash))) return;
  const page = match.variant === "four" ? "#4-player-chess" : "#chess";
  if ((location.hash || "#chess") !== page) location.hash = page;
});
const inviteUrl = new URL(location.href);
const inviteCode = inviteUrl.searchParams.get("invite");
await connect();
if (inviteCode !== null && session.network) {
  action("joinInvite", { code: inviteCode });
  const stopWatching = subscribe(kind => {
    if (!["inviteRoom", "state", "reject"].includes(kind)) return;
    stopWatching();
    const current = new URL(location.href);
    current.searchParams.delete("invite");
    history.replaceState(history.state, "", current);
  });
} else if (inviteCode !== null) {
  const notice = content.querySelector(".match-notice");
  if (notice) notice.textContent = "The match server is unavailable. Refresh to try this challenge link again.";
}
