import { findRatedPuzzle } from "../game/puzzle-prefetch.js";
import { rememberPuzzle, saveVerifiedPuzzle, selectVerifiedPuzzle, warmPuzzlePool } from "../game/puzzle-pool.js";
import { createPositionTools } from "../game/position-tools.js";
import { loadPractice, nextSeed, resolvePuzzle, savePractice } from "../game/puzzle-progress.js";
import { playSound, subscribe } from "../game/session.js";
import { bindBoardDrag } from "../game/board-drag.js";
import { getTheme } from "../ui/board-themes.js";
import { board } from "../ui/chessboard.js";

const categories = { checkmate: "Force checkmate.", material: "Win material through the best trade." };
const colors = { w: "White", b: "Black" };

export default function puzzles(content) {
  content.innerHTML = `
    <div class="match">
      <aside class="panel setup">
        <h1>Puzzles</h1>
        <div class="action-row puzzle-categories" aria-label="Puzzle category">
          <button type="button" data-category="checkmate">Checkmate</button>
          <button type="button" data-category="material">Material</button>
        </div>
        <div class="divider"></div>
        <dl class="puzzle-stats">
          <div><dt>Your Puzzle Rating</dt><dd data-rating></dd></div>
          <div><dt>Puzzle Difficulty (target)</dt><dd data-difficulty></dd></div>
          <div><dt>Verified difficulty</dt><dd data-estimate></dd></div>
        </dl>
      </aside>
      <section class="board-area aligned-board-area" aria-label="Puzzle board">
        <div class="board-and-eval">
          <div class="board-slot puzzle-board-slot"></div>
        </div>
        <div class="puzzle-hud">
          <p class="puzzle-objective"></p>
          <p class="puzzle-hearts"></p>
        </div>
        <p class="puzzle-message" role="status"></p>
      </section>
      <aside class="panel match-info">
        <h2>Practice controls</h2>
        <div class="action-row">
          <button type="button" data-hint>Hint</button>
          <button type="button" data-solution aria-expanded="false">See solution</button>
          <button type="button" data-skip>Skip</button>
          <button type="button" data-next hidden>Next puzzle</button>
          <button type="button" data-replay hidden>Replay last puzzle</button>
        </div>
        <ol class="puzzle-solution" hidden></ol>
        <p class="help">Active puzzles and ratings are saved in this browser.</p>
      </aside>
      <dialog class="promotion-dialog">
        <form method="dialog"><h2>Promote pawn</h2><div class="action-row">
          <button value="Q">Queen</button><button value="R">Rook</button>
          <button value="B">Bishop</button><button value="N">Knight</button>
          <button value="">Cancel</button>
        </div></form>
      </dialog>
    </div>`;

  const practice = loadPractice();
  const slot = content.querySelector(".puzzle-board-slot");
  const dialog = content.querySelector("dialog");
  const status = content.querySelector(".puzzle-message");
  const skip = content.querySelector("[data-skip]");
  const hint = content.querySelector("[data-hint]");
  const solution = content.querySelector("[data-solution]");
  const instructions = content.querySelector(".puzzle-solution");
  const next = content.querySelector("[data-next]");
  const replay = content.querySelector("[data-replay]");
  const controller = new AbortController();
  const listeners = { signal: controller.signal };
  let selected;
  let promotion;
  let generation = 0;
  let disposed = false;
  let generating = false;
  let tools;
  let reserveJob;
  let reserveTimer;
  let showSolution = false;
  let transition;
  let wrong;
  let wrongTimer;
  let animationPosition;
  let finished;
  let retry;
  let lastCompleted;
  const playable = () => retry ?? practice.active;
  let message = "";
  let outcome;

  function currentPosition(active) {
    return active.step === 0 ? active.puzzle.origin : active.puzzle.steps[active.step - 1].position;
  }

  function legalFrom(from) {
    const active = playable();
    return Object.values(active?.puzzle.steps[active.step]?.legal ?? {})
      .filter(move => move.from === from);
  }

  function canMove() {
    return playable() && !transition && !promotion;
  }

  function render() {
    const active = playable();
    const puzzle = active?.puzzle ?? finished?.puzzle;
    const hearts = active?.hearts ?? finished?.hearts ?? 0;
    const position = animationPosition ?? (active ? currentPosition(active) : finished?.position);
    const hintMove = active?.hint && active.puzzle.steps[active.step].move;
    const focused = slot.contains(document.activeElement) ? document.activeElement.dataset.square : null;
    const theme = getTheme();
    const nextFrame = board(theme, false, false, {
      frame: slot.firstElementChild,
      state: position ?? { board: {} },
      side: puzzle?.side,
      selected,
      targets: selected && active ? legalFrom(selected) : [],
      select: canMove() ? select : undefined,
      marks: hintMove ? new Set(active.hint === 1 ? [hintMove.from] : [hintMove.from, hintMove.to]) : undefined
    });
    if (nextFrame !== slot.firstElementChild) slot.replaceChildren(nextFrame);
    if (wrong) slot.querySelector(`[aria-label^="${wrong},"]`)?.classList.add("puzzle-wrong");
    if (canMove()) {
      for (const cell of slot.querySelectorAll("[data-square]")) {
        if (position.board[cell.dataset.square]?.[0] === puzzle.side && legalFrom(cell.dataset.square).length) {
          cell.classList.add("drag-enabled");
        }
      }
    }
    if (focused) slot.querySelector(`[data-square="${focused}"]`)?.focus({ preventScroll: true });

    for (const button of content.querySelectorAll("[data-category]")) {
      button.setAttribute("aria-pressed", String(button.dataset.category === practice.category));
    }
    content.querySelector("[data-rating]").textContent = practice.rating;
    content.querySelector("[data-difficulty]").textContent = puzzle?.targetRating ?? puzzle?.difficulty ?? "—";
    content.querySelector("[data-estimate]").textContent = puzzle?.difficulty ?? "—";
    const heartLabel = content.querySelector(".puzzle-hearts");
    heartLabel.hidden = !puzzle || Boolean(retry);
    heartLabel.setAttribute("aria-label", `${hearts} of 3 hearts remaining`);
    heartLabel.innerHTML = `<span aria-hidden="true">${"♥".repeat(hearts)}${"♡".repeat(3 - hearts)}</span>`;
    content.querySelector(".puzzle-objective").textContent = transition
      ? `${colors[position.turn]} replies · ${categories[puzzle.category]}`
      : active ? `${colors[puzzle.side]} to move · ${retry ? "Replay · Rating already recorded" : categories[puzzle.category]}`
      : puzzle ? categories[puzzle.category] : "";
    status.textContent = message;
    status.dataset.outcome = outcome ?? "";
    status.classList.toggle("is-loading", generating);
    slot.setAttribute("aria-busy", String(generating));
    hint.hidden = !active;
    hint.disabled = !canMove() || active?.hint === 2;
    hint.textContent = active?.hint === 1 ? "Show destination" : "Hint";
    solution.hidden = !puzzle;
    solution.disabled = Boolean(transition);
    solution.setAttribute("aria-expanded", String(showSolution));
    instructions.hidden = !showSolution;
    instructions.replaceChildren();
    if (showSolution && puzzle) {
      const names = { K: "king", Q: "queen", R: "rook", B: "bishop", N: "knight", P: "pawn" };
      for (const [index, step] of Object.values(puzzle.steps).entries()) {
        const start = index ? puzzle.steps[index - 1].position : puzzle.origin;
        const { from, to, promotion } = step.move;
        const item = document.createElement("li");
        item.textContent = `Move your ${names[start.board[from]?.[1]] ?? "piece"} from ${from} to ${to}${promotion ? ` and promote to ${names[promotion]}` : ""}.`;
        if (step.response && (index < puzzle.steps.length - 1 || puzzle.category === "material")) {
          item.textContent += ` Reply: ${step.response.from}–${step.response.to}.`;
        }
        instructions.append(item);
      }
    }
    replay.hidden = !lastCompleted || generating || (!retry && !practice.active);
    replay.disabled = Boolean(transition || promotion);
    replay.textContent = retry ? (practice.active ? "Return to rated puzzle" : "End practice") : "Replay last puzzle";
    skip.hidden = !practice.active || Boolean(retry);
    skip.disabled = Boolean(transition);
    next.hidden = Boolean(practice.active || generating);
    next.disabled = Boolean(transition);
    next.textContent = finished ? "Next puzzle" : "Try again";
  }

  let attemptStarted;

  function startAttemptClock() {
    if (practice.active && !retry && !document.hidden && attemptStarted == null) {
      practice.active.elapsedMs ??= 0;
      attemptStarted = performance.now();
    }
  }

  function pauseAttemptClock() {
    if (attemptStarted == null || !practice.active) return;
    practice.active.elapsedMs += performance.now() - attemptStarted;
    attemptStarted = undefined;
    savePractice(practice);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      pauseAttemptClock();
      reserveJob?.close();
      reserveJob = undefined;
    }
    else startAttemptClock();
  }, listeners);
  window.addEventListener("pagehide", pauseAttemptClock, listeners);
  window.addEventListener("pageshow", startAttemptClock, listeners);

  function stopAnimation() {
    clearTimeout(transition);
    clearTimeout(wrongTimer);
    transition = undefined;
    wrong = null;
    animationPosition = null;
    selected = null;
    promotion = null;
    if (dialog.open) dialog.close();
    drag.cancel();
  }

  function takeSeed() {
    const seed = nextSeed(practice);
    savePractice(practice);
    return seed;
  }

  function scheduleReserve(request) {
    clearTimeout(reserveTimer);
    reserveTimer = setTimeout(() => replenish(request), 450);
  }

  async function replenish(request) {
    if (disposed || generation !== request || document.hidden || reserveJob) return;
    const supply = await warmPuzzlePool(practice);
    if (supply > 2 || disposed || generation !== request || document.hidden || reserveJob) return;
    const worker = createPositionTools({ puzzleOnly: true });
    reserveJob = worker;
    try {
      const candidate = await findRatedPuzzle(worker, practice, takeSeed,
        () => !disposed && generation === request, 1);
      if (candidate) saveVerifiedPuzzle(candidate);
    } catch (error) {
      if (!disposed && generation === request && reserveJob === worker) console.warn("Puzzle reserve search failed.", error);
    } finally {
      worker.close();
      if (reserveJob === worker) reserveJob = undefined;
    }
  }

  async function generate(prefix = "") {
    const request = ++generation;
    clearTimeout(reserveTimer);
    tools?.close();
    reserveJob?.close();
    reserveJob = undefined;
    showSolution = false;
    stopAnimation();
    if (!prefix) finished = null;
    retry = null;
    outcome = null;
    generating = true;
    const target = practice.rating;
    message = `${prefix ? prefix + " " : ""} Searching for a verified puzzle near ${target}…`;
    render();
    try {
      const selection = await selectVerifiedPuzzle(practice);
      if (disposed || request !== generation) return;
      let candidate = selection.puzzle;
      if (!candidate) {
        tools = createPositionTools({ puzzleOnly: true });
        candidate = await findRatedPuzzle(tools, practice, takeSeed, () => !disposed && request === generation, 3);
      }
      if (disposed || request !== generation) return;
      if (!candidate) {
        message = `No fresh verified puzzle within 200 points of ${target} was found. You can search again.`;
        return;
      }
      finished = null;
      practice.active = { puzzle: candidate, step: 0, hearts: 3 };
      rememberPuzzle(practice, candidate);
      startAttemptClock();
      savePractice(practice);
      message = prefix;
      scheduleReserve(request);
    } catch (error) {
      if (!disposed && request === generation) {
        console.error("Puzzle generation failed.", error);
        message = "The puzzle generator could not run. Try again to restart it.";
      }
    } finally {
      if (!disposed && request === generation) {
        tools?.close();
        generating = false;
        render();
      }
    }
  }

  function resolve(result) {
    pauseAttemptClock();
    const active = practice.active;
    if (result !== "skipped") lastCompleted = active.puzzle;
    const delta = resolvePuzzle(practice, result);
    outcome = result;
    finished = { puzzle: active.puzzle, hearts: active.hearts, position: result === "solved"
      ? active.puzzle.steps[active.step - 1].afterMove ?? currentPosition(active)
      : currentPosition(active) };
    if (result === "failed") retry = { ...active, hint: 0 };
    message = `${result === "solved" ? "Solved" : result === "skipped" ? "Skipped" : "Out of hearts"}. Rating ${delta > 0 ? "+" + delta : delta < 0 ? "−" + Math.abs(delta) : "unchanged"}.`;
    if (retry) message += " You can replay this puzzle or move on.";
  }

  function attempt(move) {
    const active = playable();
    if (!active) return;
    const step = active.puzzle.steps[active.step];
    selected = null;
    if (step.move.from !== move.from || step.move.to !== move.to || step.move.promotion !== move.promotion) {
      if (!retry) active.hearts--;
      playSound("wrong");
      wrong = move.from;
      clearTimeout(wrongTimer);
      if (retry) message = "That move misses the tactic. Keep trying.";
      else if (!active.hearts) resolve("failed");
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
    active.hint = 0;
    const solved = active.step === active.puzzle.steps.length;
    if (solved && retry) {
      if (!practice.active) finished.position = step.afterMove ?? step.position;
      retry = null;
      outcome = "solved";
      message = "Practice complete. Rating unchanged.";
      playSound("solved");
      startAttemptClock();
    } else if (solved) {
      resolve("solved");
      playSound("solved");
      generate(message);
      return;
    } else {
      playSound("move");
      outcome = "correct";
      message = "Correct. Find the next move.";
      if (!retry) savePractice(practice);
    }
    if (!solved && step.afterMove && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      animationPosition = step.afterMove;
      transition = setTimeout(() => {
        animationPosition = null;
        transition = undefined;
        if (!solved) playSound("move");
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
    const active = playable();
    const position = currentPosition(active);
    if (position.board[square]?.[0] === active.puzzle.side) {
      selected = selected === square ? null : square;
      render();
    } else if (selected) choose(selected, square);
  }

  dialog.addEventListener("close", () => {
    const move = promotion?.find(choice => choice.promotion === dialog.returnValue);
    promotion = null;
    if (move) attempt(move);
  }, listeners);
  const drag = bindBoardDrag(slot, {
    begin(from) {
      if (!canMove()) return false;
      selected = from;
      slot.querySelector(`[data-square="${from}"]`)?.classList.add("drag-source");
      return true;
    },
    end() { slot.querySelector(".drag-source")?.classList.remove("drag-source"); },
    drop: choose
  });
  hint.addEventListener("click", () => {
    if (!canMove()) return;
    const active = playable();
    active.hint = Math.min(2, (active.hint ?? 0) + 1);
    active.hintsUsed = Math.min(2, (active.hintsUsed ?? 0) + 1);
    const { from, to } = active.puzzle.steps[active.step].move;
    message = `${active.hint === 1 ? `Move the piece on ${from}.` : `Move from ${from} to ${to}.`}`;
    if (!retry) savePractice(practice);
    render();
  }, listeners);
  solution.addEventListener("click", () => {
    showSolution = !showSolution;
    if (showSolution && practice.active && !retry) {
      practice.active.hintsUsed = 2;
      message = "Solution shown. Counts as two hints.";
      savePractice(practice);
    }
    render();
  }, listeners);
  replay.addEventListener("click", () => {
    pauseAttemptClock();
    stopAnimation();
    retry = retry ? null : { puzzle: lastCompleted, step: 0 };
    showSolution = false;
    outcome = null;
    message = retry ? "Replaying a completed attempt. Your current puzzle is paused." : "";
    startAttemptClock();
    render();
  }, listeners);
  skip.addEventListener("click", () => {
    if (!practice.active || retry || transition) return;
    resolve("skipped");
    generate(message);
  }, listeners);
  next.addEventListener("click", () => generate(outcome === "solved" ? message : ""), listeners);
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
  if (practice.active) {
    startAttemptClock();
    render();
    rememberPuzzle(practice, practice.active.puzzle);
    savePractice(practice);
    const request = generation;
    scheduleReserve(request);
  }
  else generate();
  return () => {
    pauseAttemptClock();
    disposed = true;
    generation++;
    clearTimeout(reserveTimer);
    controller.abort();
    stopAnimation();
    drag.destroy();
    tools?.close();
    reserveJob?.close();
    unsubscribe();
  };
}
