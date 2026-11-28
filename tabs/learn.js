import { bindBoardDrag } from "../game/board-drag.js";
import { createPositionTools } from "../game/position-tools.js";
import { accountStorageKey, playPositionMove, playPickUpSound, playSound, readSetting, writeSetting } from "../game/session.js";
import { getTheme } from "../ui/board-themes.js";
import { showPromotionChoices } from "../ui/chess-pieces.js";
import { board } from "../ui/chessboard.js";
import { course, sections } from "./learn-lessons.js";

const progressKey = "exalted-chess-learn-v2";
const outcomes = { checkmate: "Checkmate", stalemate: "Stalemate" };
const values = { P: 1, N: 3, B: 3, R: 5, Q: 9 };
const moveList = frame => Object.values(frame?.legal ?? {});

function readProgress() {
  function parse(key) {
    try { return JSON.parse(readSetting(accountStorageKey(key))); }
    catch { return null; }
  }
  const saved = parse(progressKey);
  if (saved) return saved;
  const legacy = new Set(parse("exalted-chess-learn-v1")?.completed ?? []);
  return {
    completed: course.filter(lesson => lesson.legacy?.every(key => legacy.has(key))).map(lesson => lesson.id),
    steps: {},
    active: null
  };
}

export default function learn(content) {
  const saved = readProgress();
  const completed = new Set((saved.completed ?? []).filter(id => course.some(lesson => lesson.id === id)));
  const steps = saved.steps ?? {};
  let active = saved.active;
  let closeExercise;
  const panel = document.createElement("article");
  panel.className = "panel page learn";
  content.append(panel);

  const save = () => writeSetting(accountStorageKey(progressKey), JSON.stringify({ completed: [...completed], steps, active }));

  function home(focus = false) {
    closeExercise?.();
    closeExercise = undefined;
    panel.classList.remove("learn-in-lesson");
    const next = course.find(lesson => lesson.id === active && !completed.has(lesson.id)) ??
      course.find(lesson => !completed.has(lesson.id));
    panel.innerHTML = `
      <h1 tabindex="-1">Learn</h1>
      <div class="learn-summary">
        <progress max="${course.length}" value="${completed.size}" aria-label="Course completion"></progress>
        <span>${completed.size} of ${course.length} lessons complete</span>
        ${next ? `<button type="button" class="primary" data-open="${next.id}">${completed.size || steps[next.id] ? "Continue learning" : "Start learning"}</button>
          <strong class="learn-up-next">${next.title}</strong>` : "<strong>Course complete. Pick any lesson to replay.</strong>"}
      </div>
      ${sections.map((title, section) => `
        <section class="learn-section">
          <h2>${title}</h2>
          <ol start="${course.findIndex(lesson => lesson.section === section) + 1}">
            ${course.filter(lesson => lesson.section === section).map(lesson => `
              <li><button type="button" class="learn-row" data-open="${lesson.id}" ${next === lesson ? 'aria-current="step"' : ""}>
                <strong>${lesson.title}</strong><span>${completed.has(lesson.id) ? "Complete" : next === lesson ? "Up next" : "Open"}</span><span aria-hidden="true">→</span>
              </button></li>`).join("")}
          </ol>
        </section>`).join("")}`;
    for (const button of panel.querySelectorAll("[data-open]")) {
      button.onclick = () => {
        const lesson = course.find(item => item.id === button.dataset.open);
        const stored = steps[lesson.id];
        open(lesson, stored?.step ?? 0, stored?.ply);
      };
    }
    if (focus) panel.querySelector("h1").focus();
  }

  function open(lesson, index = 0, resumePly) {
    closeExercise?.();
    panel.classList.add("learn-in-lesson");
    if (!Number.isInteger(index) || index < 0 || index >= lesson.steps.length) index = 0;
    const step = lesson.steps[index];
    const following = course[course.indexOf(lesson) + 1];
    const last = index === lesson.steps.length - 1;
    const start = step.practiceStart ?? 0;
    const remember = (stepIndex, ply) => {
      active = lesson.id;
      steps[lesson.id] = { step: stepIndex, ply };
      save();
    };
    remember(index, resumePly);
    panel.innerHTML = `
      <div class="learn-workspace">
        <header class="learn-context">
          <button type="button" data-course>← Course</button>
          <span class="help">${sections[lesson.section]} · Step ${index + 1} of ${lesson.steps.length}</span>
          <h1 tabindex="-1">${lesson.title}</h1>
          <p class="learn-task"></p>
        </header>
        <section class="learn-position" aria-label="Lesson board">
          <p class="learn-turn"></p>
          <div class="board-slot" aria-busy="true"></div>
        </section>
        <section class="learn-practice" aria-label="Practice controls">
          <div class="action-row learn-answers"></div>
          <p class="help" data-observation hidden></p>
          <p class="learn-feedback" role="status">Loading board…</p>
          <div class="action-row learn-next">
            <button type="button" data-hint>Hint</button>
            <button type="button" data-reset>Reset position</button>
            <button type="button" data-retry hidden>Retry loading board</button>
            <button type="button" class="primary" data-next hidden>Continue</button>
          </div>
        </section>
      </div>
      <dialog class="promotion-dialog" aria-labelledby="learn-promotion-title">
        <form method="dialog">
          <h2 id="learn-promotion-title">Pick a piece</h2>
          <div class="action-row"><button value="Q">Queen</button><button value="R">Rook</button>
            <button value="B">Bishop</button><button value="N">Knight</button><button value="">Cancel</button></div>
        </form>
      </dialog>`;

    const $ = selector => panel.querySelector(selector);
    const slot = $(".board-slot");
    const status = $(".learn-feedback");
    const task = $(".learn-task");
    const dialog = $("dialog");
    const hint = $("[data-hint]");
    const reset = $("[data-reset]");
    const next = $("[data-next]");
    const tools = createPositionTools();
    const events = new AbortController();
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frames, promotions, alternatives, frame, selected, timer;
    let ply = start;
    let hints = 0;
    let playing = false;
    let solved = false;
    let promotion = false;
    let marks = step.marks ?? [];
    task.textContent = step.instruction;

    function report(text, outcome = "") {
      status.textContent = text;
      status.dataset.outcome = outcome;
    }

    function render() {
      const canAct = frame && !playing && !solved && !promotion;
      const canSelect = canAct && (!step.choices || step.from);
      hint.disabled = !canAct;
      reset.disabled = !frames;
      next.hidden = !solved;
      for (const button of $(".learn-answers").children) button.disabled = !canAct;
      if (!frame) return;
      const state = frame.state;
      const guided = step.setup.promotion ?? frames?.[ply + 1]?.move;
      const targets = canSelect && selected && !step.square
        ? moveList(frame).filter(move => move.from === selected && (!guided || move.to === guided.to)) : [];
      const result = board(getTheme(), false, false, {
        frame: slot.firstElementChild, state, selected, targets, marks: new Set(marks),
        select: canSelect ? select : undefined,
        canDrag: canSelect && !step.square ? square => state.board[square]?.[0] === state.turn : undefined
      });
      if (slot.firstElementChild !== result) slot.replaceChildren(result);
      const outcome = solved && (outcomes[state.status] ?? (state.status === "draw" ? "Draw" : ""));
      $(".learn-turn").textContent = outcome || `${state.turn === "w" ? "White" : "Black"} to move`;
      const entry = $("[data-observation]");
      const moves = Object.values(state.history ?? {});
      if (step.material) {
        const score = { w: 0, b: 0 };
        for (const move of moves) if (move.captured) score[move.color] += values[move.captured[1]] ?? 0;
        entry.textContent = `Points taken · White ${score.w} · Black ${score.b}`;
      } else if (step.history) entry.textContent = moves.map(move => `${move.from}–${move.to}`).join(" · ");
      else if (state.halfmove === 100) entry.textContent = "50 of 50 moves each without a capture or pawn move";
      else entry.textContent = "";
      entry.hidden = !entry.textContent;
    }

    function success() {
      solved = true;
      selected = undefined;
      marks = step.reveal ?? [];
      if (last) {
        completed.add(lesson.id);
        delete steps[lesson.id];
        active = null;
        save();
      } else remember(index + 1);
      next.textContent = last ? (following ? `Continue to ${following.title}` : "Finish course") : "Continue";
      report(step.feedback, "correct");
      render();
      next.focus({ preventScroll: true });
    }

    function show(nextFrame) {
      const from = nextFrame.move.from;
      const to = nextFrame.move.to;
      const cell = square => slot.querySelector(`.square[aria-label^="${square},"]`);
      const origin = cell(from)?.getBoundingClientRect();
      const timing = playPositionMove(nextFrame.move, frame.state);
      if (nextFrame.state.status === "checkmate") playSound("mate", timing + .13);
      else if (nextFrame.state.status === "check") playSound("check", timing + .036);
      frame = nextFrame;
      selected = undefined;
      render();
      const destination = cell(to);
      if (origin && destination && !reducedMotion) {
        const rect = destination.getBoundingClientRect();
        destination.querySelector(".chess-piece")?.animate([
          { translate: `${origin.left - rect.left}px ${origin.top - rect.top}px` },
          { translate: "0 0" }
        ], { duration: 200, easing: "ease-out" });
      }
    }

    function focusSquare() {
      return step.from ?? frames[ply + 1]?.move?.from ?? step.setup.promotion?.from;
    }

    function continueLine() {
      if (ply === frames.length - 1) { playing = false; success(); return; }
      if (frame.state.turn === frames[start].state.turn) {
        playing = false;
        remember(index, ply);
        selected = focusSquare();
        task.textContent = step.followUp ?? step.instruction;
        report("");
        render();
        return;
      }
      timer = setTimeout(() => { show(frames[++ply]); continueLine(); }, reducedMotion ? 0 : 430);
    }

    function wrong(text) {
      playSound("wrong");
      report(text, "wrong");
      render();
      return false;
    }

    function choose(from, to) {
      if (!frame || playing || solved || promotion || from === to) return false;
      selected = from;
      marks = step.marks ?? [];
      const legal = moveList(frame).find(move => move.from === from && move.to === to);
      if (!legal) {
        if (step.mistakes?.[to]) marks = [...marks, to];
        return wrong(step.mistakes?.[to] ?? (frame.state.board[to]?.[0] === frame.state.turn
          ? "Your own piece is on that square."
          : frame.state.status === "check" ? "That would leave your king in check." : "That move is illegal here."));
      }
      if (step.choices) return wrong("That move is legal. Use the choices below to answer the question.");
      const alt = from === step.from && alternatives?.[to];
      if (alt) {
        if (!alt.success) {
          if (alt.reply) {
            marks = [alt.reply.from, alt.reply.to];
            return wrong(`From ${alt.reply.from}, Black could take your piece on ${alt.reply.to}.`);
          }
          return wrong("That move is legal, but Black still has a way out.");
        }
        show(alt.frame);
        success();
        return true;
      }
      const instruction = step.setup.promotion ?? frames[ply + 1]?.move;
      if (from !== instruction?.from || to !== instruction?.to) return wrong("That move is legal, but it doesn’t meet the goal yet.");
      if (step.setup.promotion) {
        promotion = true;
        showPromotionChoices(dialog, frame.state.turn);
        render();
      } else {
        playing = true;
        show(frames[++ply]);
        continueLine();
      }
      return true;
    }

    function select(square) {
      if (step.square) {
        if (square === step.square) { success(); return; }
        wrong("Look for a piece that could take back.");
        return;
      }
      if (selected && selected !== square && choose(selected, square)) return;
      if (frame.state.board[square]?.[0] === frame.state.turn) {
        selected = square;
        playPickUpSound();
        render();
      }
    }

    function restart(resume) {
      clearTimeout(timer);
      solved = false;
      promotion = false;
      hints = 0;
      const valid = Number.isInteger(resume) && resume >= start && resume < frames.length - 1
        && frames[resume].state.turn === frames[start].state.turn;
      ply = valid ? resume : start;
      marks = step.marks ?? [];
      task.textContent = ply > start ? step.followUp ?? step.instruction : step.instruction;
      frame = frames[ply];
      selected = focusSquare();
      report("");
      remember(index, ply);
      playing = Boolean(step.animateStart && ply === start && start > 0 && !reducedMotion);
      if (playing) {
        frame = frames[start - 1];
        selected = undefined;
        timer = setTimeout(() => {
          playing = false;
          show(frames[start]);
          selected = focusSquare();
          render();
        }, 450);
      }
      render();
    }

    const drag = bindBoardDrag(slot, {
      begin: from => !playing && !solved && !promotion && !step.square && (!step.choices || step.from)
        && frame?.state.board[from]?.[0] === frame?.state.turn,
      end() {},
      drop: choose
    });
    for (const choice of step.choices ?? []) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = choice;
      button.onclick = () => {
        const answer = step.choices.includes("Checkmate") ? outcomes[frame.state.status] ?? "Neither" : step.answer;
        if (choice === answer) success();
        else wrong(step.mistakes?.[choice] ??
          (step.history ? "Check the move sequence under the board." : "Look at the position and try again."));
      };
      $(".learn-answers").append(button);
    }
    dialog.addEventListener("close", () => {
      promotion = false;
      if (promotions?.[dialog.returnValue]) {
        show(promotions[dialog.returnValue]);
        success();
      } else render();
    }, { signal: events.signal });

    hint.onclick = () => {
      hints++;
      const from = focusSquare();
      const to = step.setup.promotion?.to ?? frames[ply + 1]?.move?.to ??
        Object.keys(alternatives ?? {}).find(square => alternatives[square].success);
      const king = step.choices && Object.keys(frame.state.board).find(square => frame.state.board[square] === frame.state.turn + "K");
      const clues = [...(step.marks ?? []), ...(from ? [from] : []), ...(king ? [king] : [])];
      if (hints > 1 && to) clues.push(to);
      marks = clues;
      report(hints > 1 ? (to ? `Try ${from} to ${to}.` : step.square ? `Tap ${step.square}.` : `Answer: ${step.answer}.`)
        : (from ? `Start with the piece on ${from}.` : step.square ? "Look for the piece that can take back." :
          step.marks?.length ? "Look at the shaded squares." : "Use the rule in the instruction to answer."));
      render();
    };
    reset.onclick = () => restart();
    $("[data-course]").onclick = () => home(true);
    $("[data-retry]").onclick = () => open(lesson, index, resumePly);
    next.onclick = () => {
      if (!last) open(lesson, index + 1);
      else if (following) open(following, steps[following.id]?.step ?? 0, steps[following.id]?.ply);
      else home(true);
    };
    closeExercise = () => {
      clearTimeout(timer);
      events.abort();
      drag.destroy();
      tools.close();
      dialog.close();
    };
    $("h1").focus();
    render();
    tools.run("courseLesson", step.setup).then(model => {
      if (events.signal.aborted) return;
      frames = Object.values(model.frames);
      ({ promotions, alternatives } = model);
      slot.setAttribute("aria-busy", "false");
      restart(resumePly);
    }).catch(() => {
      if (events.signal.aborted) return;
      slot.setAttribute("aria-busy", "false");
      report("The board couldn’t load.", "wrong");
      $("[data-retry]").hidden = false;
    });
  }

  home();
  return () => closeExercise?.();
}
