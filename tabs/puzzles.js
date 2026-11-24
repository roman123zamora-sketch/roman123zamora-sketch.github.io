import { isRatedPuzzle, levelEntries, levelLabel, levelLock, levelOf, levelProgress, levels,
  libraryEntries, nextPuzzleLevel, openLibraryPuzzle, puzzlesPerLevel } from "../game/puzzle-library.js";
import { loadPractice, resolvePuzzle, savePractice } from "../game/puzzle-progress.js";
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
          <span class="puzzle-heart-break" aria-hidden="true" hidden>💔</span>
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
          <div><dt>Your Elo band</dt><dd data-difficulty></dd></div>
        </dl>
        <button type="button" class="primary puzzle-primary" data-next>Play Rated</button>
        <details class="puzzle-menu">
          <summary>Levels</summary>
          <div class="puzzle-levels"></div>
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
  let advanceTimer;
  let heartTimer;
  const heartBreak = content.querySelector(".puzzle-heart-break");
  const playable = () => practice.active;
  let message = practice.active?.finishing ? "Attempt ended. Finish this puzzle in practice." : "";
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
    content.querySelector("[data-difficulty]").textContent = levelLabel(levels[levelOf(practice.rating)]);
    const mode = active?.rated ? "Rated" : active?.finishing ? "Practice after loss" : "Practice";
    content.querySelector(".puzzle-difficulty").textContent = puzzle
      ? `Difficulty ${puzzle.difficulty}${active ? " · " + mode : ""}` : "Rated and practice puzzles";
    const heartLabel = content.querySelector(".puzzle-hearts");
    heartLabel.style.visibility = puzzle ? "visible" : "hidden";
    heartLabel.setAttribute("aria-label", `${hearts} of 3 hearts remaining`);
    heartLabel.innerHTML = `<span aria-hidden="true">${"♥".repeat(hearts)}${"♡".repeat(3 - hearts)}</span>`;
    content.querySelector(".puzzle-objective").textContent = transition
      ? `${colors[position.turn]} replies · ${categories[puzzle.category]}`
      : active ? `${colors[puzzle.side]} to move · ${categories[puzzle.category]}`
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
    skip.disabled = !active || Boolean(transition || generating);
    next.setAttribute("aria-busy", String(generating));
    next.disabled = generating || Boolean(transition || promotion || active || advanceTimer);
    next.textContent = generating ? "Loading…" : active ? "Puzzle in progress"
      : advanceTimer ? "Next puzzle loading…" : finished ? "Open Levels" : "Play";

  }

  let attemptStarted;

  function startAttemptClock() {
    if (practice.active && !practice.active.finishing && !generating && !document.hidden && attemptStarted == null) {
      practice.active.elapsedMs ??= 0;
      attemptStarted = performance.now();
    }
  }

  function pauseAttemptClock(persist = true) {
    if (attemptStarted == null || !practice.active) return;
    practice.active.elapsedMs += performance.now() - attemptStarted;
    attemptStarted = undefined;
    if (persist) savePractice(practice);
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
    clearTimeout(advanceTimer);
    clearTimeout(heartTimer);
    advanceTimer = undefined;
    heartBreak.hidden = true;
    transition = undefined;
    wrong = null;
    animationPosition = null;
    selected = null;
    promotion = null;
    if (dialog.open) dialog.close();
    drag.cancel();
  }

  async function loadLibrary() {
    entries = await libraryEntries();
    if (disposed) return;
    libraryFailed = entries.length === 0;
    renderLibrary();
  }

  function renderLibrary() {
    const list = content.querySelector(".puzzle-levels");
    const focusedLevel = list.contains(document.activeElement) ? document.activeElement.dataset.level : null;
    list.replaceChildren();
    if (libraryFailed || !entries.length) {
      list.textContent = libraryFailed ? "Library unavailable. Use Play to retry." : "Loading levels…";
      return;
    }
    const current = practice.active ? levelOf(practice.active.puzzle.difficulty) : practice.lastLevel;
    const elo = levelOf(practice.rating);
    for (const [index, level] of levels.entries()) {
      const { count, available } = levelProgress(entries, practice.libraryProgress, index);
      const lock = levelLock(entries, practice, index);
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.level = index;
      button.disabled = Boolean(lock) || !available;
      if (current === index) button.setAttribute("aria-current", "true");
      const title = document.createElement("span");
      title.textContent = `${levelLabel(level)} · ${count} of ${puzzlesPerLevel} solved`;
      const detail = document.createElement("small");
      detail.textContent = [
        elo === index ? "Your Elo band" : "",
        current === index ? "Current level" : "",
        lock || (!available ? "No verified puzzles published yet." :
          available < puzzlesPerLevel ? `${available} verified puzzles published.` : "")
      ].filter(Boolean).join(" · ");
      button.append(title, detail);
      list.append(button);
      if (focusedLevel === String(index) && !button.disabled) button.focus({ preventScroll: true });
    }
  }

  async function startPuzzle(requested, automatic = false, allowReplay = false) {
    if (generating || transition || promotion) return;
    if (practice.active && requested === levelOf(practice.active.puzzle.difficulty)) {
      slot.querySelector("button.square")?.focus({ preventScroll: true });
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
      const level = requested ?? nextPuzzleLevel(entries, practice, practice.lastLevel);
      if (level === undefined || levelLock(entries, practice, level)) {
        message = libraryFailed ? "Couldn’t load the puzzle library. Try again." : "Choose an unlocked level in Levels.";
        return;
      }
      const candidates = levelEntries(entries, level).filter(entry => entry.id !== practice.active?.puzzle.id);
      const unsolved = candidates.filter(entry => practice.libraryProgress[entry.id] !== "solved");
      const playableEntries = unsolved.length || (automatic && !allowReplay) ? unsolved : candidates;
      playableEntries.sort((a, b) =>
        Number(a.id === finished?.puzzle.id) - Number(b.id === finished?.puzzle.id) ||
        Number(a.id === practice.lastSkipped) - Number(b.id === practice.lastSkipped) ||
        Math.abs(a.difficulty - practice.rating) - Math.abs(b.difficulty - practice.rating));
      for (const entry of playableEntries) {
        const puzzle = await openLibraryPuzzle(entry);
        if (disposed || request !== generation) return;
        if (!puzzle) continue;
        practice.active = { id: crypto.randomUUID(), puzzle, step: 0, hearts: 3,
          startElo: practice.rating, rated: isRatedPuzzle(practice, puzzle) };
        practice.lastLevel = level;
        savePractice(practice);
        finished = null;
        opened = true;
        message = practice.active.rated ? "" : "Practice puzzle. Your Elo stays the same.";
        break;
      }
      if (!opened) message = playableEntries.length ? "Couldn’t load the puzzle. Try again."
        : "All published puzzles in this level are solved. Choose a level to replay.";
    } catch (error) {
      if (!disposed) {
        console.error("Puzzle library unavailable.", error);
        message = "Couldn’t load the puzzle library. Try again.";
      }
    } finally {
      if (!disposed && request === generation) {
        generating = false;
        startAttemptClock();
        renderLibrary();
        render();
        if (opened) slot.querySelector("button.square")?.focus({ preventScroll: true });
      }
    }
  }

  function animateHeartBreak() {
    clearTimeout(heartTimer);
    heartBreak.hidden = true;
    // Restart the short animation even if mistakes are made quickly.
    void heartBreak.offsetWidth;
    heartBreak.hidden = false;
    heartTimer = setTimeout(() => { heartBreak.hidden = true; }, 440);
  }

  function finishPuzzle(active, step) {
    const level = levelOf(active.puzzle.difficulty);
    const alreadyComplete = levelProgress(entries, practice.libraryProgress, level).complete;
    pauseAttemptClock(false);
    const delta = resolvePuzzle(practice, active, "solved");
    finished = { puzzle: active.puzzle, hearts: active.hearts, position: step.afterMove ?? step.position };
    outcome = "solved";
    message = `Solved. Rating ${delta > 0 ? "+" + delta : delta < 0 ? "−" + Math.abs(delta) : "unchanged"}.`;
    const { count, available, complete } = levelProgress(entries, practice.libraryProgress, level);
    const nextLevel = nextPuzzleLevel(entries, practice, level);
    if (complete && !alreadyComplete) {
      message += " Level complete.";
      if (level === levels.length - 1) message += " Library complete. Open Levels to replay.";
      else {
        const lock = levelLock(entries, practice, level + 1);
        if (lock) message += ` ${lock}`;
        else if (nextLevel === undefined) message += " The next level has no published puzzles yet.";
      }
    } else if (!complete && count === available) {
      message += ` ${count} of ${puzzlesPerLevel} solved. More verified puzzles are needed to complete this level.`;
    }
    if (nextLevel !== undefined && nextLevel < level) {
      message += ` ${levelLock(entries, practice, level)} Next up: ${levelLabel(levels[nextLevel])}.`;
    }
    const canAdvance = nextLevel !== undefined && (
      nextLevel !== level ? !alreadyComplete :
        levelEntries(entries, level).some(entry => practice.libraryProgress[entry.id] !== "solved")
    );
    if (canAdvance) {
      advanceTimer = setTimeout(() => {
        advanceTimer = undefined;
        startPuzzle(nextLevel, true, nextLevel < level);
      }, complete ? 1450 : 850);
    }
    playSound("solved");
    renderLibrary();
    render();
    if (!canAdvance) next.focus({ preventScroll: true });
  }

  function attempt(move) {
    const active = playable();
    if (!active) return;
    const step = active.puzzle.steps[active.step];
    selected = null;
    if (step.move.from !== move.from || step.move.to !== move.to || step.move.promotion !== move.promotion) {
      playSound("wrong");
      wrong = move.from;
      clearTimeout(wrongTimer);
      outcome = "wrong";
      message = active.finishing ? "Incorrect move. Keep trying in practice." : "Incorrect move. Try again.";
      if (!active.finishing) {
        active.hearts--;
        animateHeartBreak();
        if (!active.hearts) {
          pauseAttemptClock(false);
          const rated = active.rated;
          const delta = resolvePuzzle(practice, active, "failed");
          outcome = "failed";
          message = `Incorrect move. ${rated ? "Rated attempt ended. " : ""}${delta ? "Rating −" + Math.abs(delta) + ". " : ""}Finish this puzzle in practice.`;
          renderLibrary();
        } else savePractice(practice);
      }
      wrongTimer = setTimeout(() => { wrong = null; render(); }, 350);
      render();
      return;
    }
    clearTimeout(wrongTimer);
    wrong = null;
    active.step++;
    active.hint = 0;
    if (active.step === active.puzzle.steps.length) {
      finishPuzzle(active, step);
      return;
    }
    playSound("move");
    outcome = "correct";
    message = "Correct. Find the next move.";
    savePractice(practice);
    if (step.afterMove && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      animationPosition = step.afterMove;
      transition = setTimeout(() => {
        animationPosition = null;
        transition = undefined;
        playSound("move");
        render();
      }, 220);
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
    savePractice(practice);
    render();
  }, listeners);
  solution.addEventListener("click", () => {
    showSolution = !showSolution;
    if (showSolution && practice.active?.rated) {
      practice.active.hintsUsed = 2;
      message = "Solution shown. Counts as two hints.";
      savePractice(practice);
    }
    render();
  }, listeners);
  skip.addEventListener("click", () => {
    const active = playable();
    if (!active || transition || generating) return;
    pauseAttemptClock(false);
    practice.lastSkipped = active.puzzle.id;
    resolvePuzzle(practice, active, "skipped");
    startPuzzle(nextPuzzleLevel(entries, practice, levelOf(active.puzzle.difficulty)));
  }, listeners);
  next.addEventListener("click", () => {
    if (finished) {
      const menu = content.querySelector(".puzzle-menu");
      menu.open = true;
      menu.querySelector("summary").focus();
    } else startPuzzle();
  }, listeners);
  content.querySelector(".puzzle-levels").addEventListener("click", event => {
    const button = event.target.closest("[data-level]");
    if (button && !button.disabled) startPuzzle(Number(button.dataset.level));
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
