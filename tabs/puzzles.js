import { levels, levelOf, levelLabel, libraryEntries, openLibraryPuzzle, ratedEntries } from "../game/puzzle-library.js";
import { rememberPuzzle } from "../game/puzzle-pool.js";
import { libraryProgress, loadPractice, markLibraryResult, resolvePuzzle, savePractice } from "../game/puzzle-progress.js";
import { playSound, subscribe } from "../game/session.js";
import { bindBoardDrag } from "../game/board-drag.js";
import { getTheme } from "../ui/board-themes.js";
import { board } from "../ui/chessboard.js";

const categories = { checkmate: "Force checkmate.", material: "Win material through the best trade." };
const colors = { w: "White", b: "Black" };

export default function puzzles(content) {
  content.innerHTML = `
    <div class="puzzle-library-layout">
      <section class="board-area puzzle-play" aria-label="Puzzle board">
        <div class="puzzle-heading">
          <p class="puzzle-objective"></p><p class="help puzzle-difficulty"></p>
        </div>
        <div class="board-and-eval">
          <div class="board-slot puzzle-board-slot"></div>
        </div>
        <div class="puzzle-game-controls">
          <p class="puzzle-hearts"></p>
          <div class="action-row">
            <button type="button" data-hint>Hint</button>
            <button type="button" data-solution aria-expanded="false">See solution</button>
            <button type="button" data-skip>Skip</button>
          </div>
        </div>
        <p class="puzzle-message" role="status"></p>
        <ol class="puzzle-solution" hidden></ol>
      </section>
      <aside class="panel puzzle-library-panel">
        <h1>Puzzles</h1>
        <dl class="puzzle-stats">
          <div><dt>Your Puzzle Elo</dt><dd data-rating></dd></div>
          <div><dt>Difficulty target</dt><dd data-difficulty></dd></div>
        </dl>
        <button type="button" class="primary puzzle-primary" data-next>Play Rated</button>
        <details class="puzzle-menu">
          <summary>Browse Levels</summary>
          <div class="puzzle-levels"></div>
        </details>
        <details class="puzzle-menu">
          <summary>Review</summary>
          <div class="puzzle-review"></div>
        </details>
      </aside>
      <dialog class="promotion-dialog" aria-labelledby="puzzle-promotion-title">
        <form method="dialog"><h2 id="puzzle-promotion-title">Promote pawn</h2><div class="action-row">
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
  let entries = [];
  let archived = [];
  let libraryFailed = false;
  const controller = new AbortController();
  const listeners = { signal: controller.signal };
  let selected;
  let promotion;
  let generation = 0;
  let disposed = false;
  let generating = false;

  let showSolution = false;
  let transition;
  let wrong;
  let wrongTimer;
  let animationPosition;
  let finished;
  let retry;

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
    return playable() && !generating && !transition && !promotion;
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

    content.querySelector("[data-rating]").textContent = practice.rating;
    content.querySelector("[data-difficulty]").textContent = practice.rating;
    content.querySelector(".puzzle-difficulty").textContent = puzzle ? `Difficulty ${puzzle.difficulty}` : "Rated and practice puzzles";
    const heartLabel = content.querySelector(".puzzle-hearts");
    heartLabel.style.visibility = puzzle && !retry ? "visible" : "hidden";
    heartLabel.setAttribute("aria-label", `${hearts} of 3 hearts remaining`);
    heartLabel.innerHTML = `<span aria-hidden="true">${"♥".repeat(hearts)}${"♡".repeat(3 - hearts)}</span>`;
    content.querySelector(".puzzle-objective").textContent = transition
      ? `${colors[position.turn]} replies · ${categories[puzzle.category]}`
      : active ? `${colors[puzzle.side]} to move · ${retry ? `Practice · ${categories[puzzle.category]}` : categories[puzzle.category]}`
      : puzzle ? categories[puzzle.category] : "Choose Play Rated or browse a level.";
    status.textContent = message;
    status.dataset.outcome = outcome ?? "";
    status.classList.toggle("is-loading", generating);
    slot.setAttribute("aria-busy", String(generating));
    hint.disabled = !canMove() || active?.hint === 2;
    hint.textContent = active?.hint === 1 ? "Show destination" : "Hint";
    solution.disabled = !puzzle || Boolean(transition || generating);
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
    skip.disabled = !practice.active || Boolean(retry || transition || generating);
    next.setAttribute("aria-busy", String(generating));
    next.disabled = generating || Boolean(transition || promotion) || Boolean(practice.active && !retry);
    next.textContent = generating ? "Loading…" : retry && practice.active ? "Resume rated puzzle"
      : practice.active ? "Rated puzzle in progress" : finished ? "Next Puzzle" : "Play Rated";

  }

  let attemptStarted;

  function startAttemptClock() {
    if (practice.active && !retry && !generating && !document.hidden && attemptStarted == null) {
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
    if (document.hidden) pauseAttemptClock();
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

  function reviewEntries() {
    return [...new Map([...archived, ...entries].map(entry => [entry.id, entry])).values()];
  }

  async function loadLibrary() {
    entries = await libraryEntries();
    if (disposed) return;
    libraryFailed = entries.length === 0;
    renderLibrary();
    if (Object.values(libraryProgress(practice)).includes("failed") && !archived.length) {
      archived = await libraryEntries("archive");
      if (!disposed) renderLibrary();
    }
  }

  function renderLibrary() {
    const progress = libraryProgress(practice);
    const levelList = content.querySelector(".puzzle-levels");
    const reviewList = content.querySelector(".puzzle-review");
    levelList.replaceChildren();
    reviewList.replaceChildren();
    if (libraryFailed || !entries.length) {
      const note = libraryFailed ? "Library unavailable. Use Play Rated to retry." : "Loading levels…";
      levelList.textContent = note;
      reviewList.textContent = note;
      return;
    }

    for (const [index, level] of levels.entries()) {
      const available = entries.filter(entry => levelOf(entry.difficulty) === index);
      const solved = available.filter(entry => progress[entry.id] === "solved").length;
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.level = index;
      button.disabled = !available.length;
      button.textContent = `${levelLabel(level)} · ${solved} of ${available.length} solved`;
      levelList.append(button);
    }

    const missed = reviewEntries().filter(entry => progress[entry.id] === "failed");
    if (!missed.length) reviewList.textContent = "Missed library puzzles appear here.";
    for (const entry of missed) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.review = entry.id;
      button.textContent = `${entry.category === "material" ? "Material" : "Checkmate"} · ${entry.difficulty}`;
      reviewList.append(button);
    }
  }

  async function startPuzzle(mode = "rated", key) {
    if (generating || transition || promotion) return;
    if (mode === "rated" && practice.active) {
      if (!retry) return;
      stopAnimation();
      retry = null;
      showSolution = false;
      message = "Rated puzzle resumed.";
      startAttemptClock();
      render();
      return;
    }

    const request = ++generation;
    generating = true;
    pauseAttemptClock();
    stopAnimation();
    showSolution = false;
    outcome = null;
    message = "Loading a verified puzzle…";
    let opened = false;
    render();
    try {
      if (!entries.length) await loadLibrary();
      if (disposed || request !== generation) return;
      const progress = libraryProgress(practice);
      const candidates = mode === "rated" ? ratedEntries(entries, practice)
        : mode === "review" ? reviewEntries().filter(entry => entry.id === key && progress[entry.id] === "failed")
        : entries.filter(entry => levelOf(entry.difficulty) === Number(key) && entry.id !== practice.active?.puzzle.id)
          .sort((a, b) => Number(a.id === finished?.puzzle.id) - Number(b.id === finished?.puzzle.id) ||
            Number(progress[a.id] === "solved") - Number(progress[b.id] === "solved"));
      let puzzle;
      for (const entry of candidates) {
        puzzle = await openLibraryPuzzle(entry, practice.rating);
        if (disposed || request !== generation) return;
        if (puzzle) break;
      }
      if (!puzzle) {
        message = candidates.length || libraryFailed ? "Couldn’t load the puzzle. Try again."
          : "No nearby unseen rated puzzles remain. Browse a level or review your misses.";
        return;
      }
      finished = null;
      opened = true;
      if (mode === "rated") {
        retry = null;
        practice.category = puzzle.category;
        practice.active = { puzzle, step: 0, hearts: 3 };
        rememberPuzzle(practice, puzzle);
        startAttemptClock();
        savePractice(practice);
        message = "";
      } else {
        retry = { puzzle, step: 0 };
        rememberPuzzle(practice, puzzle);
        savePractice(practice);
        message = mode === "review" ? "Review attempt. Your Elo stays the same." : "Level practice. Your Elo stays the same.";
      }
    } catch (error) {
      if (!disposed) {
        console.error("Puzzle library unavailable.", error);
        message = "Couldn’t load the puzzle library. Try again.";
      }
    } finally {
      if (!disposed && request === generation) {
        generating = false;
        startAttemptClock();
        render();
        if (opened) slot.querySelector("button.square")?.focus();
      }
    }
  }

  function resolve(result) {
    pauseAttemptClock();
    const active = practice.active;
    const delta = resolvePuzzle(practice, result);
    outcome = result;
    finished = { puzzle: active.puzzle, hearts: active.hearts, position: result === "solved"
      ? active.puzzle.steps[active.step - 1].afterMove ?? currentPosition(active)
      : currentPosition(active) };
    renderLibrary();
    message = `${result === "solved" ? "Solved" : result === "skipped" ? "Skipped" : "Out of hearts"}. Rating ${delta > 0 ? "+" + delta : delta < 0 ? "−" + Math.abs(delta) : "unchanged"}.`;
    if (result === "failed") message += " You can retry it in Review.";
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
      if (outcome === "failed") next.focus({ preventScroll: true });
      return;
    }
    clearTimeout(wrongTimer);
    wrong = null;
    active.step++;
    active.hint = 0;
    const solved = active.step === active.puzzle.steps.length;
    if (solved && retry) {
      markLibraryResult(practice, active.puzzle.id, "solved");
      savePractice(practice);
      renderLibrary();
      finished = { puzzle: active.puzzle, hearts: 0, position: step.afterMove ?? step.position };
      retry = null;
      outcome = "solved";
      message = "Practice complete. Rating unchanged.";
      playSound("solved");
      startAttemptClock();
    } else if (solved) {
      resolve("solved");
      playSound("solved");
      render();
      next.focus({ preventScroll: true });
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
  skip.addEventListener("click", () => {
    if (!practice.active || retry || transition || generating) return;
    resolve("skipped");
    render();
    next.focus({ preventScroll: true });
  }, listeners);
  next.addEventListener("click", () => startPuzzle(), listeners);
  content.querySelector(".puzzle-levels").addEventListener("click", event => {
    const button = event.target.closest("[data-level]");
    if (button) startPuzzle("level", button.dataset.level);
  }, listeners);
  content.querySelector(".puzzle-review").addEventListener("click", event => {
    const button = event.target.closest("[data-review]");
    if (button) startPuzzle("review", button.dataset.review);
  }, listeners);
  const unsubscribe = subscribe(kind => {
    if (kind === "profile" || kind === "catalog") render();
  });
  startAttemptClock();
  render();
  renderLibrary();
  loadLibrary().catch(error => {
    if (disposed) return;
    console.error("Puzzle library unavailable.", error);
    libraryFailed = true;
    renderLibrary();
  });
  return () => {
    pauseAttemptClock();
    disposed = true;
    generation++;
    controller.abort();
    stopAnimation();
    drag.destroy();
    unsubscribe();
  };
}
