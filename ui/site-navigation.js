import { action, connect, soundEnabled, toggleSound, unlockSound, playSound, session, subscribe } from "../game/session.js";
import { showWelcome } from "./account-view.js";
import rankings from "../tabs/rankings.js";
import { changeAccount, returnToWelcome } from "../game/session.js";
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
const soundControl = 'button:not(:disabled):not([data-square]):not([aria-disabled="true"]), a[href]:not([aria-disabled="true"]), details > summary';
document.addEventListener("pointerdown", event => {
  if (event.isTrusted && event.pointerType === "mouse" && !audio.contains(event.target)) unlockSound();
}, { capture: true });
document.addEventListener("pointerup", event => {
  if (event.isTrusted && event.pointerType !== "mouse" && !audio.contains(event.target)) unlockSound();
}, { capture: true });
let tabbing = false;
document.addEventListener("keydown", event => {
  if (event.isTrusted && event.key === "Tab") {
    tabbing = true;
    setTimeout(() => { tabbing = false; }, 0);
  }
  if (event.isTrusted && !audio.contains(event.target)) unlockSound();
}, { capture: true });
let lastFocusCue = -Infinity;
const themeControl = ".theme-card button[data-board]";
document.addEventListener("pointerover", event => {
  if (event.pointerType !== "mouse") return;
  const control = event.target.closest(soundControl);
  if (control && !control.matches(themeControl) && !control.contains(event.relatedTarget)) playSound("hover");
});
document.addEventListener("focusin", event => {
  const control = event.target.closest(soundControl);
  const now = performance.now();
  if (tabbing && event.isTrusted && control?.matches(":focus-visible") && !control.matches(themeControl) &&
      now - lastFocusCue >= 100) {
    lastFocusCue = now;
    playSound("hover");
  }
});
document.addEventListener("click", event => {
  const control = event.target.closest(soundControl);
  if (!control || control === audio || control.matches(themeControl)) return;
  if (control.matches("[data-premove-control], [data-step], .move-history-entry, .board-history-controls button, [data-action='undo'], [data-action='start'], [data-action='rematch'], dialog.promotion-dialog:not(.result-dialog) button[value]:not([value=''])")) {
    unlockSound();
    return;
  }
  if (control.matches("summary")) unlockSound(control.parentElement.open ? "close" : "open");
  else if (control.matches("[data-action='setup'], [data-action='review'], [data-mode], [data-open-replay]")) unlockSound("open");
  else if (control.matches("[data-action='cancelSetup'], [data-action='reviewExit'], [data-action='leaveInvite'], .return-history, dialog button[value='']")) unlockSound("close");
  else unlockSound("button");
}, { capture: true });
let previousMatch;
subscribe((kind, match) => {
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
  document.querySelector("#logout").textContent = session.account ? "Log out" : "Log In";
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
  if (!session.account) return returnToWelcome();
  button.disabled = true;
  try { await changeAccount({ kind: "logout" }); }
  catch (error) { button.disabled = false; button.textContent = "Retry logout"; }
});

if (await connect()) enterGame();
else showWelcome(content, enterGame, session.notice);
