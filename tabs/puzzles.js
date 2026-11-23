import { createPuzzlePrefetch, findPuzzle } from "../game/puzzle-prefetch.js";
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
            <button type="button" data-hint>Hint</button>
            <button type="button" data-solution aria-expanded="false">See solution</button>
            <button type="button" data-skip>Skip</button>
            <button type="button" data-next hidden>Next puzzle</button>
          </div>
          <ol class="puzzle-solution" hidden></ol>
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
  const hint = content.querySelector("[data-hint]");
  const solution = content.querySelector("[data-solution]");
  const instructions = content.querySelector(".puzzle-solution");
  const next = content.querySelector("[data-next]");
  const controller = new AbortController();
  const listeners = { signal: controller.signal };
  let selected;
  let promotion;
  let generation = 0;
  let disposed = false;
  let generating = false;
  let tools;
  let prefetch;
  let pendingPool;
  let showSolution = false;
  let transition;
  let advanceTimer;
  let wrong;
  let wrongTimer;
  let animationPosition;
  let finished;
  let retry;
  const playable = () => practice.active ?? retry;
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
    slot.replaceChildren(board(theme, false, false, {
      state: position ?? { board: {} },
      side: puzzle?.side,
      selected,
      targets: selected && active ? legalFrom(selected) : [],
      select: canMove() ? select : undefined,
      marks: hintMove ? new Set(active.hint === 1 ? [hintMove.from] : [hintMove.from, hintMove.to]) : undefined
    }));
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
    content.querySelector("[data-difficulty]").textContent = puzzle?.difficulty ?? "—";
    const heartLabel = content.querySelector(".puzzle-hearts");
    heartLabel.hidden = !puzzle || Boolean(retry);
    heartLabel.setAttribute("aria-label", `${hearts} of 3 hearts remaining`);
    heartLabel.innerHTML = `<span aria-hidden="true">${"♥".repeat(hearts)}${"♡".repeat(3 - hearts)}</span>`;
    content.querySelector(".puzzle-objective").textContent = transition
      ? `${colors[position.turn]} replies · ${categories[puzzle.category]}`
      : active ? `${colors[puzzle.side]} to move · ${retry ? "Unrated practice" : categories[puzzle.category]}`
      : puzzle ? categories[puzzle.category] : "";
    status.textContent = message;
    status.dataset.outcome = outcome ?? "";
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
        if (step.response && index < puzzle.steps.length - 1) {
          item.textContent += ` Reply: ${step.response.from}–${step.response.to}.`;
        }
        instructions.append(item);
      }
    }
    skip.hidden = !practice.active;
    skip.disabled = Boolean(transition);
    next.hidden = Boolean(practice.active || generating);
    next.disabled = Boolean(transition);
    next.textContent = finished ? "Next puzzle" : "Try again";
  }

  function stopAnimation() {
    clearTimeout(transition);
    clearTimeout(advanceTimer);
    clearTimeout(wrongTimer);
    transition = undefined;
    wrong = null;
    animationPosition = null;
    selected = null;
    promotion = null;
    if (dialog.open) dialog.close();
    drag.cancel();
  }

  async function generate(prefix = "", usePrefetch = true) {
    const request = ++generation;
    tools?.close();
    pendingPool?.close();
    const pool = prefetch;
    pendingPool = pool;
    prefetch = undefined;
    const prepared = usePrefetch && pool?.take(practice.rating);
    if (!prepared) pool?.close();
    showSolution = false;
    stopAnimation();
    finished = null;
    retry = null;
    outcome = null;
    generating = true;
    message = prefix ? `${prefix} Generating a fresh puzzle…` : "Generating a verified puzzle…";
    render();
    try {
      let candidate = await prepared;
      pool?.close();
      if (pendingPool === pool) pendingPool = undefined;
      if (disposed || request !== generation) return;
      if (!candidate) {
        tools = createPositionTools();
        candidate = await findPuzzle(tools, practice, () => {
          const seed = nextSeed(practice);
          savePractice(practice);
          return seed;
        });
      }
      if (disposed || request !== generation) return;
      if (candidate) {
        practice.active = { puzzle: candidate, step: 0, hearts: 3 };
        savePractice(practice);
        message = prefix;
        prefetch = createPuzzlePrefetch(practice);
      } else {
        message = "A puzzle could not be verified in time. Try again for a fresh position.";
      }
    } catch {
      if (!disposed && request === generation) message = "Puzzle generation interrupted. Try again.";
    } finally {
      if (!disposed && request === generation) {
        tools?.close();
        generating = false;
        render();
      }
    }
  }

  function resolve(result) {
    const active = practice.active;
    const delta = resolvePuzzle(practice, result);
    prefetch?.take(practice.rating);
    outcome = result;
    finished = { puzzle: active.puzzle, hearts: active.hearts, position: result === "solved"
      ? active.puzzle.steps[active.step - 1].afterMove ?? currentPosition(active)
      : currentPosition(active) };
    if (result === "failed") retry = { ...active, hint: 0 };
    message = delta > 0 ? `Solved. Rating +${delta}.`
      : `${result === "solved" ? "Solved" : result === "skipped" ? "Skipped" : "Out of hearts"}. Rating ${delta < 0 ? "−" + Math.abs(delta) : "unchanged"}.`;
    if (retry) message += " Keep trying in unrated practice.";
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
      finished.position = step.afterMove ?? step.position;
      retry = null;
      outcome = "solved";
      message = "Practice complete. Rating unchanged.";
      playSound("solved");
    } else if (solved) {
      resolve("solved");
      playSound("solved");
      const resultMessage = message;
      advanceTimer = setTimeout(() => generate(resultMessage), 1000);
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
    active.assisted = true;
    const { from, to } = active.puzzle.steps[active.step].move;
    message = `${active.hint === 1 ? `Move the piece on ${from}.` : `Move from ${from} to ${to}.`} Rating stays unchanged.`;
    if (!retry) savePractice(practice);
    render();
  }, listeners);
  solution.addEventListener("click", () => {
    showSolution = !showSolution;
    if (showSolution && practice.active) {
      practice.active.assisted = true;
      message = "Solution shown. Rating stays unchanged.";
      savePractice(practice);
    }
    render();
  }, listeners);
  skip.addEventListener("click", () => {
    if (!practice.active || transition) return;
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
      generate("", false);
    }, listeners);
  }
  const unsubscribe = subscribe(kind => {
    if (kind === "profile" || kind === "catalog") render();
  });
  if (practice.active) {
    render();
    prefetch = createPuzzlePrefetch(practice);
  }
  else generate();
  return () => {
    disposed = true;
    generation++;
    controller.abort();
    stopAnimation();
    drag.destroy();
    tools?.close();
    prefetch?.close();
    pendingPool?.close();
    unsubscribe();
  };
}
