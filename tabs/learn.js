import { bindBoardDrag } from "../game/board-drag.js";
import { createPositionTools } from "../game/position-tools.js";
import { readSetting, subscribe, writeSetting } from "../game/session.js";
import { getTheme } from "../ui/board-themes.js";
import { board } from "../ui/chessboard.js";
import { course } from "./learn-lessons.js";

const progressKey = "exalted-chess-learn-v1";
const pieces = { Q: "Queen", R: "Rook", B: "Bishop", N: "Knight" };
const outcomes = { checkmate: "Checkmate", stalemate: "Stalemate" };
const points = { P: 1, N: 3, B: 3, R: 5, Q: 9 };

export default function learn(content) {
  let saved;
  try { saved = JSON.parse(readSetting(progressKey)); } catch { saved = null; }
  const completed = new Set(Array.isArray(saved?.completed) ? saved.completed : []);
  const last = Array.isArray(saved?.last) ? saved.last.slice(0, 2) : [0, 0];
  const panel = document.createElement("article");
  panel.className = "panel page learn";
  content.append(panel);
  let closeLesson;

  function openHome() {
    closeLesson?.();
    closeLesson = undefined;
    const total = course.reduce((sum, module) => sum + module.lessons.length, 0);
    const finished = course.reduce((sum, module, index) =>
      sum + module.lessons.filter((_, lesson) => completed.has(`${index}:${lesson}`)).length, 0);
    panel.innerHTML = `
      <h1 tabindex="-1">Chess Foundations</h1>
      <div class="learn-summary">
        <progress max="${total}" value="${finished}" aria-label="Course completion"></progress>
        <span>${finished} of ${total} lessons complete</span>
        <button type="button" class="primary" data-continue>${finished ? "Continue course" : "Start course"}</button>
      </div>
      <div class="learn-module-grid">
        ${course.map((module, index) => {
          const count = module.lessons.filter((_, lesson) => completed.has(`${index}:${lesson}`)).length;
          const progress = count ? `${count} of ${module.lessons.length} done`
            : `${module.lessons.length} ${module.lessons.length === 1 ? "lesson" : "lessons"}`;
          return `<h2 class="learn-module-title">
            <button type="button" class="learn-module-card" data-module="${index}">
              <strong>${module.title}</strong>
              <span class="learn-module-description">${module.description}</span>
              <small>${progress}</small>
            </button>
          </h2>`;
        }).join("")}
      </div>`;
    panel.querySelector("[data-continue]").onclick = () => {
      const module = course[last[0]];
      if (module?.lessons[last[1]] && !completed.has(last.join(":"))) return openLesson(...last);
      const index = course.findIndex((entry, m) => entry.lessons.some((_, n) => !completed.has(`${m}:${n}`)));
      if (index < 0) openLesson(0, 0);
      else openModule(index);
    };
    for (const button of panel.querySelectorAll("[data-module]")) {
      button.onclick = () => openModule(Number(button.dataset.module));
    }
  }

  function openModule(index) {
    const next = course[index].lessons.findIndex((_, lesson) => !completed.has(`${index}:${lesson}`));
    openLesson(index, Math.max(0, next));
  }

  function openLesson(moduleIndex, lessonIndex) {
    closeLesson?.();
    const module = course[moduleIndex];
    const lesson = module.lessons[lessonIndex];
    const key = `${moduleIndex}:${lessonIndex}`;
    last.splice(0, last.length, moduleIndex, lessonIndex);
    const save = () => writeSetting(progressKey, JSON.stringify({ completed: [...completed], last }));
    save();
    panel.innerHTML = `
      <div class="learn-workspace">
        <section class="inset learn-context" aria-label="Lesson">
          <div class="replay-heading">
              <button type="button" data-course>All topics</button>
            <span class="help">${module.title} · ${lessonIndex + 1} of ${module.lessons.length}</span>
        </div>
          <h1 tabindex="-1">${lesson.title}</h1>
          <p>${lesson.explanation}</p>
          <p class="learn-task" data-task>${lesson.goal}</p>
          <label class="learn-picker">Lesson
            <select data-lesson>${module.lessons.map((item, index) =>
              `<option value="${index}" ${index === lessonIndex ? "selected" : ""}>${item.title}${completed.has(`${moduleIndex}:${index}`) ? " (complete)" : ""}</option>`).join("")}</select>
          </label>
        </section>
        <section class="learn-position" aria-label="Lesson diagram">
          <div class="learn-board-meta">
            <span data-turn></span>
            <button type="button" data-flip ${lesson.side === "b" ? "" : "hidden"}>Flip board</button>
          </div>
          <div class="board-slot" aria-busy="true"></div>
        </section>
        <section class="inset learn-practice" aria-label="Answers and progress">
          <div class="action-row learn-answers"></div>
          <p class="help" data-material hidden></p>
          <p class="learn-feedback" role="status">Loading the board…</p>
          <button type="button" data-retry-lesson hidden>Retry loading board</button>
          <div class="action-row learn-next">
            <button type="button" data-reset hidden>Try again</button>
            <button type="button" data-previous>Previous</button>
            <button type="button" class="primary" data-next>Next lesson</button>
          </div>
        </section>
      </div>
      <dialog class="promotion-dialog" aria-labelledby="learn-promotion-title">
        <form method="dialog">
          <h2 id="learn-promotion-title">Pick a piece</h2>
          <div class="action-row">${Object.entries(pieces).map(([value, name]) =>
            `<button value="${value}">${name}</button>`).join("")}<button value="">Cancel</button></div>
        </form>
      </dialog>`;

    const $ = selector => panel.querySelector(selector);
    const slot = $(".board-slot");
    const status = $(".learn-feedback");
    const dialog = $("dialog");
    const task = $("[data-task]");
    const reset = $("[data-reset]");
    const answers = $(".learn-answers");
    const tools = createPositionTools();
    const controller = new AbortController();
    const events = { signal: controller.signal };
    const start = lesson.practiceStart ?? 0;
    let frames;
    let promotions;
    let ply = start;
    let frame;
    let promotion;
    let selected;
    let timer;
    let playing = false;
    let solved = false;
    let side = lesson.side ?? "w";

    function report(text, outcome = "") {
      status.textContent = text;
      status.dataset.outcome = outcome;
    }

    function success() {
      solved = true;
      completed.add(key);
      save();
      const option = $("[data-lesson]").selectedOptions[0];
      if (!option.textContent.endsWith("(complete)")) option.textContent += " (complete)";
      report(lesson.feedback, "correct");
    }

    function render() {
      if (!frame) return;
      const state = { ...frame.state, checkedColors: [], lastMove: null };
      const canMove = !playing && !solved && !promotion;
      const moves = canMove && !lesson.options
        ? Object.values(frame.legal ?? {}).filter(move => move.from === selected)
        : [];
      const next = board(getTheme(), false, false, {
        frame: slot.firstElementChild, state, side, targets: moves,
        select: canMove ? select : undefined
      });
      if (next !== slot.firstElementChild) slot.replaceChildren(next);
      for (const square of slot.querySelectorAll(".square")) {
        const name = square.dataset.square;
        if (canMove && (lesson.setup.line || lesson.promotion) && state.board[name]?.[0] === state.turn) {
          square.classList.add("drag-enabled");
        }
      }
      const ending = !solved && ["Checkmate", "Stalemate", "Neither"].includes(lesson.answer) ? null : { checkmate: "Checkmate", stalemate: "Stalemate", draw: "Draw", check: "Check" }[state.status];
      $("[data-turn]").textContent = lesson.setup.board && !Object.keys(lesson.setup.board).length
        ? `${side === "w" ? "White" : "Black"}’s view`
        : `${state.turn === "w" ? "White" : "Black"} to move${ending ? " · " + ending : ""}`;
      for (const button of answers.querySelectorAll("button")) button.disabled = playing || solved;
      reset.hidden = !solved && ply === start;
      reset.disabled = playing;
      if (lesson.material) {
        const totals = { w: 0, b: 0 };
        for (const entry of Object.values(state.history ?? {})) {
          if (entry.captured) totals[entry.color] += points[entry.captured[1]] ?? 0;
        }
        const display = $("[data-material]");
        display.hidden = false;
        display.textContent = `Points taken: White ${totals.w} · Black ${totals.b}`;
      }
    }

    function show(nextFrame) {
      const previous = frame.state.board;
      const move = nextFrame.move;
      const motions = [[move.from, move.to]];
      if (move.special === "castleK" || move.special === "castleQ") {
        const kingSide = move.special === "castleK";
        motions.push([ (kingSide ? "h" : "a") + move.from[1], (kingSide ? "f" : "d") + move.from[1] ]);
      }
      const cell = name => slot.querySelector(`.square[aria-label^="${name},"]`);
      const origins = motions.map(([from, to]) => [cell(from)?.getBoundingClientRect(), to]);
      const capturedSquare = move.special === "enpassant" ? move.to[0] + move.from[1] : null;
      const captured = capturedSquare && previous[capturedSquare] && cell(capturedSquare)?.querySelector(".chess-piece");
      const motionAllowed = !matchMedia("(prefers-reduced-motion: reduce)").matches;
      let fading;
      if (captured && motionAllowed) {
        const rect = captured.getBoundingClientRect();
        fading = captured.cloneNode(true);
        fading.classList.add("learn-fade");
        fading.setAttribute("aria-hidden", "true");
        fading.style.cssText = `left:${rect.left}px;top:${rect.top}px;width:${rect.width}px`;
        document.body.append(fading);
        fading.animate([{opacity: 1}, {opacity: 0}], {duration: 200}).finished.then(() => fading.remove());
      }
      frame = nextFrame;
      selected = undefined;
      render();
      if (!motionAllowed) return;
      for (const [origin, to] of origins) {
        const destination = cell(to);
        if (!origin || !destination) continue;
        const rect = destination.getBoundingClientRect();
        destination.querySelector(".chess-piece")?.animate([
          { translate: `${origin.left - rect.left}px ${origin.top - rect.top}px` },
          { translate: "0 0" }
        ], { duration: 210, easing: "ease-out" });
      }
    }

    function playFollowingMoves() {
      if (ply >= frames.length - 1) {
        playing = false;
        success();
        render();
        return;
      }
      if (frames[ply].state.turn === frames[start].state.turn) {
        playing = false;
        selected = frames[ply + 1].move.from;
        task.textContent = lesson.followUp ?? "Find your next move.";
        report("");
        render();
        return;
      }
      timer = setTimeout(() => {
        show(frames[++ply]);
        playFollowingMoves();
      }, matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 420);
    }

    function choose(from, to) {
      if (!frame || playing || solved || promotion || from === to) return false;
      selected = from;
      const legal = Object.values(frame.legal ?? {}).filter(move => move.from === from && move.to === to);
      if (!legal.length) {
        const friendly = frame.state.board[to]?.[0] === frame.state.turn;
        report(lesson.mistakes?.[to] ?? (friendly ? "Your piece is already there."
          : frame.state.status === "check" ? "Your king would still be in check."
          : "That piece can’t move there."), "wrong");
        render();
        return false;
      }
      if (lesson.promotion && from === lesson.setup.promotion.from && to === lesson.setup.promotion.to) {
        promotion = true;
        dialog.returnValue = "";
        dialog.showModal();
        return true;
      }
      const expected = frames[ply + 1]?.move;
      if (expected?.from !== from || expected?.to !== to) {
        report(lesson.mistakes?.[to] ?? "You can move there. Try the move above.", "wrong");
        render();
        return false;
      }
      playing = true;
      show(frames[++ply]);
      playFollowingMoves();
      return true;
    }

    function select(square) {
      if (lesson.square) {
        if (square === lesson.square) { selected = square; success(); }
        else report(lesson.mistakes?.[square] ?? `You picked ${square}. Try again.`, "wrong");
        render();
        return;
      }
      if (lesson.options) return;
      if (frame.state.board[square]?.[0] === frame.state.turn && !selected) {
        selected = square;
        render();
      } else if (selected && !choose(selected, square) && frame.state.board[square]?.[0] === frame.state.turn) {
        selected = square;
        render();
      }
    }

    function restart() {
      clearTimeout(timer);
      playing = false;
      solved = false;
      ply = start;
      task.textContent = lesson.goal;
      frame = frames[ply];
      selected = lesson.focus ?? frames[ply + 1]?.move.from ?? lesson.setup.promotion?.from;
      report("");
      render();
    }

    const drag = bindBoardDrag(slot, {
      begin(from) { return !playing && !solved && !promotion && Boolean(lesson.setup.line || lesson.promotion)
        && frame?.state.board[from]?.[0] === frame?.state.turn; },
      end() {},
      drop: choose
    });
    for (const choice of lesson.options ?? []) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = choice;
      button.addEventListener("click", () => {
        const actual = ["Checkmate", "Stalemate", "Neither"].includes(lesson.answer)
          ? (outcomes[frame.state.status] ?? "Neither")
          : lesson.answer;
        if (choice === actual) success();
        else report("Look at the board and try again.", "wrong");
        render();
      }, events);
      answers.append(button);
    }
    dialog.addEventListener("close", () => {
      promotion = false;
      if (promotions?.[dialog.returnValue]) {
        success();
        show(promotions[dialog.returnValue]);
      } else render();
    }, events);
    $("[data-course]").onclick = () => { openHome(); panel.querySelector("h1").focus(); };
    $("[data-lesson]").onchange = event => openLesson(moduleIndex, Number(event.target.value));
    $("[data-flip]").onclick = () => { side = side === "w" ? "b" : "w"; render(); };
    reset.onclick = () => {
      restart();
      const firstSquare = slot.querySelector(`[data-square="${selected ?? lesson.square}"]`);
      (answers.querySelector("button") ?? firstSquare ?? $("h1")).focus({ preventScroll: true });
    };
    $("[data-previous]").disabled = moduleIndex === 0 && lessonIndex === 0;
    $("[data-previous]").onclick = () => lessonIndex
      ? openLesson(moduleIndex, lessonIndex - 1)
      : openLesson(moduleIndex - 1, course[moduleIndex - 1].lessons.length - 1);
    const lastLesson = moduleIndex === course.length - 1 && lessonIndex === module.lessons.length - 1;
    if (lastLesson) $("[data-next]").textContent = "Course home";
    $("[data-next]").onclick = () => {
      if (lastLesson) { openHome(); panel.querySelector("h1").focus(); }
      else if (lessonIndex + 1 < module.lessons.length) openLesson(moduleIndex, lessonIndex + 1);
      else openLesson(moduleIndex + 1, 0);
    };
    const stop = subscribe(kind => { if (kind === "profile" || kind === "catalog") render(); });
    closeLesson = () => {
      clearTimeout(timer);
      controller.abort();
      drag.destroy();
      stop();
      tools.close();
      dialog.close();
    };
    $("[data-retry-lesson]").onclick = () => openLesson(moduleIndex, lessonIndex);
    $("h1").focus();
    tools.run("courseLesson", { ...lesson.setup, attackFrom: undefined })
      .then(result => {
        if (controller.signal.aborted) return;
        frames = Object.values(result.frames);
        promotions = result.promotions;
        slot.setAttribute("aria-busy", "false");
        restart();
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          slot.setAttribute("aria-busy", "false");
          report("The board couldn’t load.", "wrong");
          $("[data-retry-lesson]").hidden = false;
        }
      });
    for (const button of answers.querySelectorAll("button")) button.disabled = true;
  }

  openHome();
  return () => closeLesson?.();
}
