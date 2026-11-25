import { applyEquippedTheme } from "./board-themes.js";
import { action, connect, soundEnabled, toggleSound, unlockSound, playSound, session, subscribe } from "../game/session.js";
import { showWelcome } from "./account-view.js";
import rankings from "../tabs/rankings.js";
import { changeAccount } from "../game/session.js";
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
  ["rankings", rankings],
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
  if (document.body.classList.contains("signed-out")) return;
  const previousBoard = content.querySelector(".aligned-board-area .board-and-eval")?.getBoundingClientRect();
  cleanup?.();
  const hash = ["#boards", "#shop"].includes(location.hash) ? "inventory" : location.hash.slice(1);
  const page = hash.startsWith("rankings/") ? "rankings" : pages.has(hash) ? hash : "chess";
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
  if (control && !control.contains(event.relatedTarget)) playSound("hover");
});
document.addEventListener("click", event => {
  const control = event.target.closest(soundControl);
  if (control && control !== audio && !control.hasAttribute("data-premove-control")) unlockSound("button");
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
function enterGame() {
  document.body.classList.remove("signed-out");
  navigate();
  const url = new URL(location.href);
  const invite = url.searchParams.get("invite");
  if (invite !== null) {
    action("joinInvite", { code: invite });
    url.searchParams.delete("invite");
    history.replaceState(history.state, "", url);
  }
}

document.querySelector("#logout").addEventListener("click", async event => {
  const button = event.currentTarget;
  button.disabled = true;
  try { await changeAccount({ kind: "logout" }); }
  catch (error) { button.disabled = false; button.textContent = "Retry logout"; }
});

if (await connect()) enterGame();
else showWelcome(content, enterGame, session.notice);
