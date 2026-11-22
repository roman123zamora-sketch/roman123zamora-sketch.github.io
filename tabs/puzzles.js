import { createPositionTools } from "../game/position-tools.js";
import { loadPractice, nextSeed, resolvePuzzle, savePractice } from "../game/puzzle-progress.js";
import { subscribe } from "../game/session.js";
import { bindTouchBoard } from "../game/touch-board.js";
import { getTheme } from "../ui/board-themes.js";
import { setPieceDragImage } from "../ui/chess-pieces.js";
import { board } from "../ui/chessboard.js";

const categories = { checkmate: "Force checkmate.", material: "Win material through the best trade." };
const colors = { w: "White", b: "Black" };

export default function puzzles(content) {
  content.innerHTML = `
    <section class="panel page puzzle-page">
      <h1>Puzzles</h1>
      <div class="puzzle-layout">
        <div class="puzzle-stage">
          <div class="puzzle-hud">
            <p class="puzzle-objective"></p>
            <p class="puzzle-hearts"></p>
          </div>
          <div class="puzzle-board-slot"></div>
          <p class="puzzle-message" role="status"></p>
        </div>
        <div class="puzzle-controls">
          <div class="action-row puzzle-categories" aria-label="Puzzle category">
            <button type="button" data-category="checkmate">Checkmate</button>
            <button type="button" data-category="material">Material</button>
          </div>
          <dl class="puzzle-stats"><div><dt>Your Puzzle Rating</dt><dd data-rating></dd></div>
            <div><dt>Puzzle Difficulty</dt><dd data-difficulty></dd></div></dl>
          <div class="action-row puzzle-actions">
            <button type="button" data-skip>Skip</button>
            <button type="button" data-next hidden>Next puzzle</button>
          </div>
          <p class="help">Active puzzles and ratings are saved in this browser.</p>
        </div>
      </div>
      <dialog class="promotion-dialog">
        <form method="dialog"><h2>Promote pawn</h2><div class="action-row">
          <button value="Q">Queen</button><button value="R">Rook</button>
          <button value="B">Bishop</button><button value="N">Knight</button>
          <button value="">Cancel</button>
        </div></form>
      </dialog>
    </section>`;

  const practice = loadPractice();
  const slot = content.querySelector(".puzzle-board-slot");
  const dialog = content.querySelector("dialog");
  const status = content.querySelector(".puzzle-message");
  const skip = content.querySelector("[data-skip]");
  const next = content.querySelector("[data-next]");
  const controller = new AbortController();
  const listeners = { signal: controller.signal };
  let selected;
  let dragged;
  let clearGhost;
  let promotion;
  let generation = 0;
  let disposed = false;
  let generating = false;
  let tools;
  let transition;
  let wrong;
  let wrongTimer;
  let animationPosition;
  let finished;
  let message = "";
  let outcome;

  function currentPosition(active) {
    return active.step === 0 ? active.puzzle.origin : active.puzzle.steps[active.step - 1].position;
  }

  function legalFrom(from) {
    return Object.values(practice.active?.puzzle.steps[practice.active.step]?.legal ?? {})
      .filter(move => move.from === from);
  }

  function canMove() {
    return practice.active && !transition && !promotion;
  }

  function render() {
    const active = practice.active;
    const puzzle = active?.puzzle ?? finished?.puzzle;
    const hearts = active?.hearts ?? finished?.hearts ?? 0;
    const position = animationPosition ?? (active ? currentPosition(active) : finished?.position);
    const focused = slot.contains(document.activeElement) ? document.activeElement.dataset.square : null;
    const theme = getTheme();
    slot.replaceChildren(board(theme, false, false, {
      state: position ?? { board: {} },
      side: puzzle?.side,
      selected,
      targets: selected && active ? legalFrom(selected) : [],
      select: canMove() ? select : undefined
    }));
    if (wrong) slot.querySelector(`[aria-label^="${wrong},"]`)?.classList.add("puzzle-wrong");
    if (canMove()) {
      for (const cell of slot.querySelectorAll("[data-square]")) {
        if (position.board[cell.dataset.square]?.[0] === puzzle.side && legalFrom(cell.dataset.square).length) {
          cell.classList.add("touch-source");
          cell.querySelector(".chess-piece").draggable = true;
        }
      }
    }
    if (focused) slot.querySelector(`[data-square="${focused}"]`)?.focus({ preventScroll: true });

    for (const button of content.querySelectorAll("[data-category]")) {
      button.setAttribute("aria-pressed", String(button.dataset.category === practice.category));
    }
    content.querySelector("[data-rating]").textContent = practice.rating;
    content.querySelector("[data-difficulty]").textContent = puzzle?.difficulty ?? "—";
    const heartLabel = content.querySelector(".puzzle-hearts");
    heartLabel.hidden = !puzzle;
    heartLabel.setAttribute("aria-label", `${hearts} of 3 hearts remaining`);
    heartLabel.innerHTML = `<span aria-hidden="true">${"♥".repeat(hearts)}${"♡".repeat(3 - hearts)}</span>`;
    content.querySelector(".puzzle-objective").textContent = transition
      ? `${colors[position.turn]} replies · ${categories[puzzle.category]}`
      : active ? `${colors[puzzle.side]} to move · ${categories[puzzle.category]}`
      : puzzle ? categories[puzzle.category] : "";
    status.textContent = message;
    status.dataset.outcome = outcome ?? "";
    skip.hidden = !active;
    skip.disabled = Boolean(transition);
    next.hidden = Boolean(active || generating);
    next.disabled = Boolean(transition);
    next.textContent = finished ? "Next puzzle" : "Try again";
  }

  function stopAnimation() {
    clearTimeout(transition);
    clearTimeout(wrongTimer);
    transition = undefined;
    wrong = null;
    animationPosition = null;
    selected = null;
    dragged = null;
    clearGhost?.();
    promotion = null;
    if (dialog.open) dialog.close();
    touch.cancel();
  }

  async function generate(prefix = "") {
    const request = ++generation;
    tools?.close();
    tools = createPositionTools();
    const worker = tools;
    stopAnimation();
    finished = null;
    outcome = null;
    generating = true;
    message = prefix ? `${prefix} Generating a fresh puzzle…` : "Generating a verified puzzle…";
    render();
    try {
      let candidate;
      for (let attempt = 0; attempt < 3; attempt++) {
        const seed = nextSeed(practice);
        savePractice(practice);
        const puzzle = await worker.run("puzzle", {
          category: practice.category, rating: practice.rating, seed, recent: practice.recent
        });
        if (disposed || request !== generation) return;
        if (!puzzle.retry && (!candidate ||
            Math.abs(puzzle.difficulty - practice.rating) < Math.abs(candidate.difficulty - practice.rating))) {
          candidate = puzzle;
        }
        if (candidate && Math.abs(candidate.difficulty - practice.rating) <= 200) break;
      }
      if (candidate) {
        practice.active = { puzzle: candidate, step: 0, hearts: 3 };
        savePractice(practice);
        message = prefix;
      } else {
        message = "A puzzle could not be verified in time. Try again for a fresh position.";
      }
    } catch {
      if (!disposed && request === generation) message = "Puzzle generation interrupted. Try again.";
    } finally {
      worker.close();
      if (!disposed && request === generation) {
        generating = false;
        render();
      }
    }
  }

  function resolve(result) {
    const active = practice.active;
    const delta = resolvePuzzle(practice, result);
    outcome = result;
    finished = { puzzle: active.puzzle, hearts: active.hearts, position: currentPosition(active) };
    message = delta > 0 ? `Solved. Rating +${delta}.`
      : `${result === "solved" ? "Solved" : result === "skipped" ? "Skipped" : "Out of hearts"}. Rating ${delta < 0 ? "−" + Math.abs(delta) : "unchanged"}.`;
    if (result === "failed") {
      const line = Object.values(active.puzzle.line).map(move => `${move.from}–${move.to}${move.promotion ? "=" + move.promotion : ""}`);
      message += ` Solution: ${line.join(", ")}.`;
    }
  }

  function attempt(move) {
    const active = practice.active;
    if (!active) return;
    const step = active.puzzle.steps[active.step];
    selected = null;
    if (step.move.from !== move.from || step.move.to !== move.to || step.move.promotion !== move.promotion) {
      active.hearts--;
      wrong = move.from;
      clearTimeout(wrongTimer);
      if (!active.hearts) resolve("failed");
      else {
        outcome = "wrong";
        message = "That move misses the tactic. Try again.";
        savePractice(practice);
      }
      wrongTimer = setTimeout(() => { wrong = null; render(); }, 350);
      render();
      return;
    }
    clearTimeout(wrongTimer);
    wrong = null;
    active.step++;
    const solved = active.step === active.puzzle.steps.length;
    if (solved) resolve("solved");
    else {
      outcome = "correct";
      message = "Correct. Find the next move.";
      savePractice(practice);
    }
    if (step.afterMove && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      animationPosition = step.afterMove;
      transition = setTimeout(() => {
        animationPosition = null;
        transition = undefined;
        render();
      }, 240);
    }
    render();
  }

  function choose(from, to) {
    if (!canMove() || from === to) return false;
    const moves = legalFrom(from).filter(move => move.to === to);
    if (!moves.length) {
      message = "That move is illegal in this position.";
      render();
      return false;
    }
    if (moves.some(move => move.promotion)) {
      promotion = moves;
      dialog.returnValue = "";
      dialog.showModal();
    } else attempt(moves[0]);
    return true;
  }

  function select(square) {
    if (!canMove()) return;
    const position = currentPosition(practice.active);
    if (position.board[square]?.[0] === practice.active.puzzle.side) {
      selected = selected === square ? null : square;
      render();
    } else if (selected) choose(selected, square);
  }

  dialog.addEventListener("close", () => {
    const move = promotion?.find(choice => choice.promotion === dialog.returnValue);
    promotion = null;
    if (move) attempt(move);
  }, listeners);
  const touch = bindTouchBoard(slot, {
    begin(from) { selected = from; return Boolean(canMove()); },
    end() {},
    drop: choose
  });
  slot.addEventListener("dragstart", event => {
    const piece = event.target.closest(".chess-piece[draggable=true]");
    if (!piece || !canMove()) { event.preventDefault(); return; }
    dragged = piece.closest("[data-square]").dataset.square;
    clearGhost?.();
    clearGhost = setPieceDragImage(piece, event.dataTransfer);
    event.dataTransfer.setData("text/plain", dragged);
  }, listeners);
  slot.addEventListener("dragover", event => { if (dragged) event.preventDefault(); }, listeners);
  slot.addEventListener("drop", event => {
    if (!dragged) return;
    event.preventDefault();
    const from = dragged;
    dragged = null;
    clearGhost?.();
    choose(from, event.target.closest("[data-square]")?.dataset.square);
  }, listeners);
  slot.addEventListener("dragend", () => { dragged = null; clearGhost?.(); }, listeners);
  skip.addEventListener("click", () => {
    if (!practice.active || transition) return;
    resolve("skipped");
    generate(message);
  }, listeners);
  next.addEventListener("click", () => generate(), listeners);
  for (const button of content.querySelectorAll("[data-category]")) {
    button.addEventListener("click", () => {
      if (button.dataset.category === practice.category) return;
      if (practice.active && !confirm("Skip this puzzle and switch categories?")) return;
      if (practice.active) resolve("skipped");
      practice.category = button.dataset.category;
      savePractice(practice);
      generate();
    }, listeners);
  }
  const unsubscribe = subscribe(kind => {
    if (kind === "profile" || kind === "catalog") render();
  });
  if (practice.active) render();
  else generate();
  return () => {
    disposed = true;
    generation++;
    controller.abort();
    stopAnimation();
    touch.destroy();
    tools?.close();
    unsubscribe();
  };
}
