import { isRatedPuzzle, levelEntries, levelLabel, levelLock, levelOf, levelProgress, levels,
  libraryEntries, nextPuzzleLevel, openLibraryPuzzle, puzzleCategories, puzzleChoice, puzzlesPerCategory } from "../game/puzzle-library.js";
import { loadPractice, resolvePuzzle, savePractice } from "../game/puzzle-progress.js";
import { playSound, subscribe } from "../game/session.js";
import { bindBoardDrag } from "../game/board-drag.js";
import { getTheme } from "../ui/board-themes.js";
import { board } from "../ui/chessboard.js";

const categories = { checkmate: "Checkmate", material: "Material" };
const colors = { w: "White", b: "Black" };

export default function puzzles(content) {
  content.innerHTML = `
    <div class="match standard-board-layout puzzle-library-layout">
      <section class="board-area aligned-board-area puzzle-play" aria-label="Puzzle board">
        <p class="puzzle-turn" role="status" tabindex="-1"></p>
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
        <p class="help puzzle-intro">Choose a puzzle type, then pick an Elo band.</p>
        <div class="puzzle-picker" aria-label="Puzzle types">
          ${puzzleCategories.map(category => `
            <details class="puzzle-menu" name="puzzle-types" data-category="${category}">
              <summary>${categories[category]}</summary>
              <div class="puzzle-levels"></div>
            </details>`).join("")}
          <button type="button" data-retry hidden>Retry loading levels</button>
          <p class="help picker-notice" role="status"></p>
        </div>
      </aside>
      <aside class="panel puzzle-progress-panel" aria-label="Puzzle progress">
        <h2>Puzzle progress</h2>
        <dl class="puzzle-stats">
          <div><dt>Checkmate Puzzle Rating</dt><dd data-rating="checkmate"></dd></div>
          <div><dt>Material Puzzle Rating</dt><dd data-rating="material"></dd></div>
        </dl>
        <p class="help puzzle-difficulty"></p>
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
  const layout = content.querySelector(".puzzle-library-layout");
  const picker = content.querySelector(".puzzle-picker");
  const pickerNotice = picker.querySelector(".picker-notice");
  const retry = picker.querySelector("[data-retry]");
  const menus = Array.from(picker.querySelectorAll(".puzzle-menu"));
  const turn = content.querySelector(".puzzle-turn");
  const lastCategory = practice.active?.puzzle.category ?? practice.lastCategory;
  if (lastCategory) {
    const current = menus.find(menu => menu.dataset.category === lastCategory);
    if (current) current.open = true;
  }
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
    layout.dataset.idle = String(!puzzle);
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

    for (const entry of content.querySelectorAll("[data-rating]")) {
      entry.textContent = practice.ratings[entry.dataset.rating];
    }
    const mode = active?.rated ? "Rated" : active?.finishing ? "Practice after loss" : "Practice";
    content.querySelector(".puzzle-difficulty").textContent = puzzle
      ? `Difficulty ${puzzle.difficulty}${active ? " · " + mode : ""}` : "Rated and practice puzzles";
    const heartLabel = content.querySelector(".puzzle-hearts");
    heartLabel.style.visibility = puzzle ? "visible" : "hidden";
    heartLabel.setAttribute("aria-label", `${hearts} of 3 hearts remaining`);
    heartLabel.innerHTML = `<span aria-hidden="true">${"♥".repeat(hearts)}${"♡".repeat(3 - hearts)}</span>`;
    const side = transition ? position.turn : active?.puzzle.side;
    const turnText = side ? `${colors[side]} to move` : "";
    if (turn.textContent !== turnText) turn.textContent = turnText;
    turn.dataset.side = side ?? "";
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
    const focused = document.activeElement;
    const focusMenu = focused.closest(".puzzle-menu");
    const focusLevel = focused.dataset.level;
    const current = practice.active ?? finished;
    const currentLevel = current ? levelOf(current.puzzle.difficulty) : practice.lastLevel;
    const currentCategory = current?.puzzle.category ?? practice.lastCategory;
    retry.hidden = !libraryFailed;
    retry.disabled = generating;
    picker.setAttribute("aria-busy", String(generating));
    for (const menu of menus) {
      const category = menu.dataset.category;
      const elo = levelOf(practice.ratings[category]);
      const list = menu.querySelector(".puzzle-levels");
      list.replaceChildren();
      if (libraryFailed || !entries.length) {
        list.textContent = libraryFailed ? "Levels couldn’t load." : "Loading levels…";
        continue;
      }
      const lockDescriptions = new Map();
      for (const [index, level] of levels.entries()) {
        const { count, available } = levelProgress(entries, practice.libraryProgress, index, category);
        const lock = levelLock(entries, practice, index, category);
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.level = index;
        button.disabled = generating || Boolean(lock) || !available;
        const isCurrent = currentLevel === index && currentCategory === category;
        if (isCurrent) button.setAttribute("aria-current", "true");
        const heading = document.createElement("strong");
        heading.textContent = levelLabel(level);
        const tally = document.createElement("span");
        tally.className = "level-tally";
        tally.textContent = `${count} / ${available || puzzlesPerCategory} solved`;
        const detail = document.createElement("small");
        const existingDescription = lockDescriptions.get(lock);
        if (lock) {
          if (existingDescription) button.setAttribute("aria-describedby", existingDescription);
          else {
            detail.id = `lock-${category}-${index}`;
            lockDescriptions.set(lock, detail.id);
          }
        }
        detail.textContent = [
          isCurrent ? "Current level" : elo === index ? "Your Elo band" : "",
          (existingDescription ? "Locked" : lock) || (count === puzzlesPerCategory ? "Complete · Replay" : !available ? "No puzzles available" : "")
        ].filter(Boolean).join(" · ");
        button.append(heading, tally, detail);
        list.append(button);
        if (focusMenu === menu && focusLevel === String(index) && !button.disabled) button.focus({ preventScroll: true });
      }
    }
  }

  async function startPuzzle(category, requested, automatic = false, allowReplay = false) {
    if (generating || transition || promotion) return;
    if (practice.active?.puzzle.category === category && requested === levelOf(practice.active.puzzle.difficulty)) {
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
    const restoreSelector = picker.contains(document.activeElement) &&
      document.activeElement.matches("[data-level]");
    pickerNotice.textContent = automatic ? "" : "Loading puzzle…";
    renderLibrary();
    render();
    try {
      if (!entries.length) await loadLibrary();
      if (disposed || request !== generation) return;
      const level = requested ?? nextPuzzleLevel(entries, practice, practice.lastLevel, category);
      if (level === undefined || levelLock(entries, practice, level, category)) {
        message = libraryFailed ? "Couldn’t load the puzzle library. Try again." : "Choose an unlocked level.";
        return;
      }
      const candidates = levelEntries(entries, level, category).filter(entry => entry.id !== practice.active?.puzzle.id);
      const unsolved = candidates.filter(entry => practice.libraryProgress[entry.id] !== "solved");
      const playableEntries = (unsolved.length || (automatic && !allowReplay) ? unsolved : candidates).sort((a, b) =>
        Number(a.id === finished?.puzzle.id) - Number(b.id === finished?.puzzle.id) ||
        Number(a.id === practice.lastSkipped) - Number(b.id === practice.lastSkipped) ||
        Math.abs(a.difficulty - practice.ratings[category]) - Math.abs(b.difficulty - practice.ratings[category]));
      for (const entry of playableEntries) {
        const puzzle = await openLibraryPuzzle(entry);
        if (disposed || request !== generation) return;
        if (!puzzle) continue;
        practice.active = { id: crypto.randomUUID(), puzzle, step: 0, hearts: 3,
          rated: isRatedPuzzle(practice, puzzle) };
        practice.lastLevel = level;
        practice.lastCategory = category;
        savePractice(practice);
        finished = null;
        opened = true;
        message = practice.active.rated ? "" : "Practice puzzle. Your rating stays the same.";
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
        pickerNotice.textContent = opened || automatic ? "" : message;
        if (opened) {
          if (!automatic && (turn.getBoundingClientRect().top < 0 ||
              turn.getBoundingClientRect().bottom > innerHeight)) {
            turn.scrollIntoView({ block: "center" });
          }
          (automatic ? slot.querySelector("button.square") : turn)?.focus({ preventScroll: true });
        } else if (restoreSelector) {
          const menu = menus.find(item => item.dataset.category === category);
          const levelButton = menu?.querySelector(`[data-level="${requested}"]:not(:disabled)`);
          (levelButton ?? menu?.querySelector("summary"))?.focus({ preventScroll: true });
        }
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
    const { category, difficulty } = active.puzzle;
    const level = levelOf(difficulty);
    const prior = levelProgress(entries, practice.libraryProgress, level, category);
    pauseAttemptClock(false);
    const delta = resolvePuzzle(practice, active, "solved");
    finished = { puzzle: active.puzzle, hearts: active.hearts, position: step.afterMove ?? step.position };
    outcome = "solved";
    message = `Solved. ${categories[category]} rating ${delta > 0 ? "+" + delta : delta < 0 ? "−" + Math.abs(delta) : "unchanged"}.`;
    const { complete } = levelProgress(entries, practice.libraryProgress, level, category);
    const nextLevel = nextPuzzleLevel(entries, practice, level, category);
    if (complete && !prior.complete) {
      message += ` ${categories[category]} level complete.`;
      if (level < levels.length - 1 && nextLevel === undefined) {
        const lock = levelLock(entries, practice, level + 1, category);
        if (lock) message += ` ${lock}`;
      }
    }
    if (nextLevel !== undefined && nextLevel < level) {
      message += ` ${levelLock(entries, practice, level, category)} Next up: ${levelLabel(levels[nextLevel])}.`;
    }
    if (nextLevel !== undefined && !prior.complete) {
      advanceTimer = setTimeout(() => {
        advanceTimer = undefined;
        startPuzzle(category, nextLevel, true, nextLevel < level);
      }, complete ? 1450 : 850);
    } else {
      message += " Choose a level to continue or replay.";
    }
    playSound("solved");
    renderLibrary();
    render();
  }

  function attempt(move) {
    const active = playable();
    if (!active) return;
    const step = active.puzzle.steps[active.step];
    selected = null;
    const accepted = puzzleChoice(step, move);
    if (!accepted) {
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
      finishPuzzle(active, accepted);
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
    finished = { puzzle: active.puzzle, hearts: active.hearts, position: currentPosition(active) };
    practice.lastSkipped = active.puzzle.id;
    resolvePuzzle(practice, active, "skipped");
    const { category, difficulty } = active.puzzle;
    const level = levelOf(difficulty);
    const unlocked = nextPuzzleLevel(entries, practice, level, category);
    if (!levelLock(entries, practice, level, category)) startPuzzle(category, level);
    else if (unlocked !== undefined) startPuzzle(category, unlocked);
    else {
      message = "Puzzle skipped. Choose an unlocked level.";
      renderLibrary();
      render();
    }
  }, listeners);
  retry.addEventListener("click", () => {
    libraryFailed = false;
    renderLibrary();
    loadLibrary().then(() => {
      if (!disposed && !libraryFailed) menus[0].querySelector("summary").focus();
    });
  }, listeners);
  picker.addEventListener("click", event => {
    const button = event.target.closest("[data-level]");
    if (button && !button.disabled) startPuzzle(button.closest("[data-category]").dataset.category, Number(button.dataset.level));
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
