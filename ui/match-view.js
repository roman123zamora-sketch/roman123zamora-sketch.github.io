import { createBestMoveControl } from "./review-best-move.js";
import { createPositionTools } from "../game/position-tools.js";
import { createEvaluationBar } from "./evaluation-bar.js";
import { bindBoardDrag } from "../game/board-drag.js";
import { board } from "./chessboard.js";
import { getTheme } from "./board-themes.js";
import { createChessPiece } from "./chess-pieces.js";
import { action, serverNow, session, subscribe, unlockSound } from "../game/session.js";

const offlineNotice = "Online play requires a connected match server. This site currently supports bot games.";

const timeGroups = [
  ["Bullet", ["1 | 0", "1 | 1", "2 | 1"]],
  ["Blitz", ["3 | 0", "3 | 2", "5 | 0"]],
  ["Rapid", ["10 | 0", "10 | 5", "15 | 10"]]
];
const sides = { w: "White", b: "Black", R: "Red", B: "Blue", Y: "Yellow", G: "Green" };
const botLevels = [...Array.from({ length: 15 }, (_, index) => 200 * (index + 1)), "Max"];
const preferences = { control: "3 | 0", w: 1000, B: 800, Y: 1000, G: 1200 };

export function renderMatch(content, { title, fourPlayer }) {
  const colors = fourPlayer ? ["R", "B", "Y", "G"] : ["w", "b"];
  const variant = fourPlayer ? "four" : "chess";
  let selected;
  let marks = new Set();
  const premoves = [];
  let premoveRequest;
  let premoveNotice = "";
  let promotion;
  let setup = false;
  let creatingInvite = false;
  let leavingInvite = false;
  let onlineInfo = false;
  let lastMatch = session.match?.matchId;
  let lastRevision = session.match?.revision;
  let lastTheme = getTheme();
  let lastMoveCount = Object.values(session.match?.state.history ?? {}).length;
  let scrollFrame;
  let targetRequest;
  let dragSource;
  let dragMove;
  let resetting = false;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let queued = false;
  let dropped;
  let starting = false;
  let claiming = false;
  let shownResult;
  let review;
  let reviewTools;

  content.innerHTML = `
    <div class="match${fourPlayer ? "" : " standard-board-layout"}">
      <aside class="panel setup">
        <h1>${title}</h1>
        <div class="match-controls"></div>
        <div class="divider"></div>
        <h2>Your ratings</h2>
        <dl class="ratings"></dl>
        <p class="match-notice help" aria-live="polite"></p>
      </aside>
      <section class="board-area${fourPlayer ? "" : " aligned-board-area"}" aria-label="${title} board">
        <p class="match-review-turn board-turn-label" role="status" hidden></p>
        <button class="quick-play primary" type="button" data-action="start">Play a bot game</button>
        <div class="board-and-eval">
          <div class="bot-eval" hidden aria-label="Engine estimate, in pawns" title="Engine estimate, in pawns">
            <div class="eval-meter" aria-hidden="true"><div class="eval-white"></div></div>
            <output></output>
          </div>
          <div class="board-slot"></div>
        </div>
        <ul class="board-clocks" aria-label="Match clocks" hidden></ul>
        <p class="board-status" aria-live="polite"></p>
      </section>
      <aside class="panel match-info">
        <h2>Match</h2>
        <ul class="players"></ul>
        <h2>Move history</h2>
        <ol class="inset move-list"></ol>
        <div class="review-controls" hidden>
          <div class="action-row">
            <button type="button" data-action="reviewPrevious" aria-label="Previous move">←</button>
            <output aria-live="polite"></output>
            <button type="button" data-action="reviewNext" aria-label="Next move">→</button>
            <button type="button" data-best-move>Show best move</button>
            <button type="button" data-action="reviewExit">Exit review</button>
          </div>
          <p class="help best-move-status" role="status"></p>
          <p class="help review-analysis" aria-live="polite"></p>
        </div>
        <div class="match-actions"></div>
        <button type="button" class="match-hint" hidden>Hint</button>
        <p class="help best-move-status match-hint-status" role="status"></p>
      </aside>
    </div>
    <dialog class="promotion-dialog result-dialog" aria-labelledby="match-result-title">
      <form method="dialog"><button type="submit" class="result-close" aria-label="Close result">×</button></form>
      <h2 id="match-result-title"></h2>
      <p></p>
      <div class="action-row">
        <button type="button" data-action="rematch">Rematch</button>
        <button type="button" data-action="newOpponent">New Game</button>
        <button type="button" data-action="review">Review</button>
      </div>
    </dialog>
    <dialog class="promotion-dialog">
      <form method="dialog">
        <h2>Promote pawn</h2>
        <div class="action-row">
          <button value="Q">Queen</button><button value="R">Rook</button>
          <button value="B">Bishop</button><button value="N">Knight</button>
          <button value="">Cancel</button>
        </div>
      </form>
    </dialog>`;
  const controls = content.querySelector(".match-controls");
  const slot = content.querySelector(".board-slot");
  const evaluation = createEvaluationBar(content.querySelector(".bot-eval"));
  const status = content.querySelector(".board-status");
  const quickPlay = content.querySelector(".quick-play");
  const dialog = content.querySelector("dialog:not(.result-dialog)");
  const resultDialog = content.querySelector(".result-dialog");
  const reviewTurn = content.querySelector(".match-review-turn");
  const reviewControls = content.querySelector(".review-controls");
  const bestMove = createBestMoveControl(reviewControls.querySelector("[data-best-move]"),
    reviewControls.querySelector(".best-move-status"), drawBoard);
  const hint = createBestMoveControl(content.querySelector(".match-hint"),
    content.querySelector(".match-hint-status"), drawBoard);
  const reviewAnalysis = content.querySelector(".review-analysis");
  const match = () => session.match?.variant === variant ? session.match : null;
  const lobby = () => session.invite?.variant === variant ? session.invite : null;
  const result = () => match()?.matchId === session.result?.matchId ? session.result : null;
  const currentTargets = () => {
    if (!targetsReady()) return [];
    const moves = Object.values(session.legal.moves);
    return claiming ? moves.filter(move => move.claimable) : moves;
  };
  const active = () => match() && !match().state.terminal && !result();
  const control = () => {
    const [minutes, increment] = preferences.control.split(" | ").map(Number);
    return { baseSeconds: minutes * 60, increment };
  };

  function boardAcceptsInput() {
    const data = match();
    return active() && !session.movePending && !resetting && !promotion && !data.state.eliminated?.[data.side];
  }

  function targetsReady() {
    const reply = session.legal;
    return Boolean(reply && reply.from === selected &&
      (reply.requestId == null || reply.requestId === targetRequest));
  }

  function requestTargets(from) {
    selected = from;
    targetRequest = (targetRequest ?? 0) + 1;
    action("legal", { from, requestId: targetRequest });
  }

  function clearSelection() {
    selected = null;
    dropped = null;
  }

  function submit(move, queuedMove = false, dragged = false) {
    const data = match();
    if (!boardAcceptsInput() || data.state.turn !== data.side) return;
    if (!queuedMove) clearPremoves();
    dragMove = dragged ? move : undefined;
    if (claiming) {
      claiming = false;
      action("claimDraw", move);
      drawControls();
    } else {
      action("move", move);
    }
    clearSelection();
    drawBoard();
    drawStatus();
  }

  function finishDestination(from, to, dragged = false) {
    const target = currentTargets().find(move => move.to === to);
    dropped = null;
    if (!target) {
      clearSelection();
      drawBoard();
      status.textContent = "That move is not legal.";
      if (!reduceMotion.matches) {
        slot.querySelector(`[data-square="${from}"] .chess-piece`)?.animate(
          [{ opacity: .68 }, { opacity: 1 }], { duration: 120 }
        );
      }
      return false;
    }
    const move = { from, to };
    if (target.promotion) {
      promotion = { move, matchId: match().matchId, revision: match().revision, dragged };
      dialog.returnValue = "";
      dialog.showModal();
      return true;
    }
    submit(move, false, dragged);
    return true;
  }

  function chooseDestination(from, to, dragged = false) {
    const data = match();
    if (!boardAcceptsInput() || !from || from === to || !to) return false;
    if (data.state.turn !== data.side) {
      if (!dragged) return false;
      const piece = data.state.board[from];
      if (piece?.[0] !== data.side) return false;
      premoves.push({ from, to, piece });
      premoveNotice = "";
      drawBoard();
      drawStatus();
      return true;
    }
    if (selected !== from) requestTargets(from);
    if (targetsReady()) return finishDestination(from, to, dragged);
    dropped = { to, dragged };
    return true;
  }

  function select(address) {
    cancelPremovesOnClick();
    if (!boardAcceptsInput() || match().state.turn !== match().side) return;
    if (selected && currentTargets().some(move => move.to === address)) {
      chooseDestination(selected, address);
      return;
    }
    if (match().state.board[address]?.[0] === match().side) {
      dropped = null;
      if (selected === address) clearSelection();
      else requestTargets(address);
    } else if (selected) {
      chooseDestination(selected, address);
      return;
    }
    drawBoard();
    drawStatus();
  }

  dialog.addEventListener("close", () => {
    const choice = promotion;
    promotion = null;
    if (choice && dialog.returnValue && choice.matchId === match()?.matchId && choice.revision === match()?.revision) {
      if (choice.queuedMove) premoveNotice = "Premove played.";
      submit({ ...choice.move, promotion: dialog.returnValue }, choice.queuedMove, choice.dragged);
    } else if (choice?.queuedMove) {
      clearPremoves();
      premoveNotice = "Premove canceled.";
      drawBoard();
      drawStatus();
    }
  });

  function clearPremoves() {
    const hadMoves = premoves.length > 0 || premoveRequest != null;
    premoves.length = 0;
    premoveRequest = undefined;
    return hadMoves;
  }

  function cancelPremovesOnClick() {
    if (!clearPremoves()) return;
    premoveNotice = "Premoves cleared.";
    drawBoard();
    drawStatus();
  }

  function checkPremove(data) {
    if (!active() || data.state.eliminated?.[data.side]) {
      clearPremoves();
      return;
    }
    const next = premoves[0];
    if (!next) return;
    if (data.state.board[next.from] !== next.piece) {
      clearPremoves();
      premoveNotice = "Premove canceled. The piece is no longer on its starting square.";
      return;
    }
    if (data.state.turn !== data.side || !boardAcceptsInput() || premoveRequest != null) return;
    targetRequest = (targetRequest ?? 0) + 1;
    premoveRequest = targetRequest;
    action("legal", { from: next.from, requestId: premoveRequest });
  }

  function playPremove() {
    const data = match();
    const queued = premoves[0];
    premoveRequest = undefined;
    if (!queued || !boardAcceptsInput() || data.state.turn !== data.side ||
        data.state.board[queued.from] !== queued.piece) return;
    const target = Object.values(session.legal.moves).find(move => move.to === queued.to &&
      (!queued.promotion || move.promotion === queued.promotion));
    if (!target) {
      clearPremoves();
      premoveNotice = "Premove canceled. The move is no longer legal.";
    } else {
      premoves.shift();
      const move = { from: queued.from, to: queued.to, promotion: queued.promotion };
      if (target.promotion && !move.promotion) {
        promotion = { move, matchId: data.matchId, revision: data.revision, queuedMove: true };
        dialog.returnValue = "";
        dialog.showModal();
      } else {
        premoveNotice = "Premove played.";
        submit(move, true);
        return;
      }
    }
    drawBoard();
    drawStatus();
  }

  function drawBoard(animateMove = false) {
    const move = animateMove ? match()?.state.lastMove : null;
    const origin = move && slot.querySelector(`[data-square="${move.from}"]`)?.getBoundingClientRect();
    const focused = document.activeElement?.dataset.square;
    const data = match();
    hint.update(!review && boardAcceptsInput() && /bot/i.test(data?.mode) && data.state.turn === data.side
      ? data.state : undefined, variant);
    evaluation.update(data, review, (score, previous) => {
      if (score.kind !== "cp" || previous.kind !== "cp") return;
      const change = (score.value - previous.value) / 100;
      reviewAnalysis.textContent = Math.abs(change) < .05 ? "Little change in the engine estimate." :
        `${change > 0 ? "White" : "Black"} gained about ${Math.abs(change).toFixed(1)} pawns of advantage on this move.`;
    });
    const nextFrame = board(getTheme(), fourPlayer, false, {
      frame: slot.firstElementChild,
      state: review?.positions[review.ply] ?? data?.state, side: data?.side, selected, targets: selected ? currentTargets() : [],
      premoves,
      bestMove: review ? bestMove.move : hint.move,
      select: active() ? select : undefined, marks: review ? undefined : marks,
      mark: address => { if (marks.has(address)) marks.delete(address); else marks.add(address); }
    });
    if (nextFrame !== slot.firstElementChild) slot.replaceChildren(nextFrame);
    for (const square of slot.querySelectorAll("[data-square]")) {
      square.classList.toggle("drag-source", square.dataset.square === dragSource);
      if (boardAcceptsInput() && data?.state.board[square.dataset.square]?.[0] === data?.side) {
        const piece = square.querySelector(".chess-piece");
        if (piece) {
          square.classList.add("drag-enabled");
        }
      }
    }
    if (origin) {
      const destination = slot.querySelector(`[data-square="${move.to}"]`);
      const piece = destination?.querySelector(".chess-piece");
      if (piece && !reduceMotion.matches) {
        const bounds = destination.getBoundingClientRect();
        piece.animate([
          { translate: `${origin.left - bounds.left}px ${origin.top - bounds.top}px` },
          { translate: "0 0" }
        ], { duration: 120, easing: "ease-out" });
      }
    }
    if (focused) slot.querySelector(`[data-square="${focused}"]`)?.focus({ preventScroll: true });
  }

  function drawReview() {
    reviewControls.hidden = !review;
    const side = review?.positions[review.ply]?.turn;
    reviewTurn.hidden = !sides[side];
    reviewTurn.dataset.side = side ?? "";
    reviewTurn.textContent = sides[side] ? `${sides[side]} to move` : "";
    bestMove.update(review?.positions[review.ply], variant);
    if (!review) bestMove.close();
    if (!review) return;
    const { ply, positions, history } = review;
    const move = history[ply - 1];
    reviewControls.querySelector("output").textContent = move
      ? `${ply}/${positions.length - 1} · ${move.from}–${move.to}${move.promotion ? "=" + move.promotion : ""}`
      : "Starting position";
    reviewControls.querySelector('[data-action="reviewPrevious"]').disabled = ply === 0;
    reviewControls.querySelector('[data-action="reviewNext"]').disabled = ply === positions.length - 1;
    reviewAnalysis.textContent = fourPlayer ? "Move replay" : "Engine estimate from White’s and Black’s perspectives.";
  }

  async function startReview() {
    const data = match();
    if (!result() || review || reviewTools) return;
    const history = Object.values(data.state.history);
    const recorded = result().review;
    const worker = recorded ? null : createPositionTools();
    reviewTools = worker;
    status.textContent = "Loading game review…";
    try {
      const positions = Object.values(recorded ?? await worker.run("review", {
        variant, moves: history.map(move => ({ f: move.from, t: move.to, c: move.color, p: move.promotion }))
      }));
      if (reviewTools !== worker || data.matchId !== match()?.matchId) return;
      review = { positions, history, ply: positions.length - 1 };
      drawReview();
      drawBoard();
      drawControls();
      reviewControls.querySelector('[data-action="reviewPrevious"]:enabled, [data-action="reviewExit"]').focus();
    } catch {
      if (reviewTools === worker) status.textContent = "Game review could not be loaded. Try again.";
    } finally {
      worker?.close();
      if (reviewTools === worker) reviewTools = undefined;
    }
  }

  function drawResult() {
    const outcome = result();
    if (!outcome || outcome.final === false || outcome.result === "aborted" || shownResult === outcome.matchId) return;
    shownResult = outcome.matchId;
    const labels = { win: "Victory", loss: "Loss", draw: outcome.reason === "Stalemate" ? "Stalemate" : "Draw" };
    const title = outcome.placements?.[match().side] === 4 ? "Loss" : labels[outcome.result];
    resultDialog.querySelector("h2").textContent = title;
    resultDialog.querySelector("p").textContent = outcome.reason === title ? "" : outcome.reason;
    resultDialog.querySelector('[data-action="newOpponent"]').hidden = !["online", "fourOnline"].includes(match().mode);
    if (dialog.open) dialog.close();
    resultDialog.showModal();
  }

  function drawStatus() {
    const data = match();
    const outcome = result();
    if (outcome) {
      const labels = { win: "Victory", loss: "Defeat", draw: "Draw", aborted: "Match aborted" };
      const place = outcome.placements?.[data.side];
      status.textContent = (place > 1 ? `Placed ${place} of 4` : labels[outcome.result]) +
        " · " + outcome.reason;
    } else if (data) {
      status.textContent = data.state.terminal ? "Game ended" :
        data.state.eliminated?.[data.side] ? "Eliminated · Watching the remaining players" :
        resetting ? "Resetting game…" :
        session.movePending ? "Sending move…" :
        claiming ? "Choose a move to support your draw claim." :
        `${sides[data.state.turn]} to move${data.state.status === "check" ? " · Check" : ""}${/bot/i.test(data.mode) && data.state.turn !== data.side ? " · Bot thinking" : ""}`;
    } else if (lobby()) {
      status.textContent = `Waiting for players · ${lobby().count} of ${lobby().needed} joined`;
    } else status.textContent = "";
    if (active() && premoves.length) {
      status.textContent += ` · Premove queued: ${premoves.map(move => `${move.from}–${move.to}`).join(", ")}`;
    }
    if (active() && premoveNotice) status.textContent += ` · ${premoveNotice}`;
    status.classList.toggle("in-check", data?.state.status === "check" && !outcome);
  }

  function drawPlayers() {
    const data = match();
    const list = content.querySelector(".players");
    const clocks = content.querySelector(".board-clocks");
    clocks.hidden = !data?.clocks && !lobby();
    clocks.replaceChildren();
    list.replaceChildren();
    for (const side of colors) {
      const name = sides[side];
      const item = document.createElement("li");
      const label = document.createElement("span");
      const dot = document.createElement("i");
      dot.className = "side-dot " + name.toLowerCase();
      label.append(dot, document.createTextNode(data?.players?.[side] ?? name));
      const clock = document.createElement("span");
      clock.className = "clock";
      clock.dataset.side = side;
      item.classList.toggle("turn", data?.state.turn === side && !result());
      item.classList.toggle("eliminated", !!data?.state.eliminated?.[side]);
      item.append(label);
      if (!clocks.hidden) {
        const chip = document.createElement("li");
        chip.textContent = name;
        chip.classList.toggle("turn", data?.state.turn === side && !result());
        chip.classList.toggle("eliminated", !!data?.state.eliminated?.[side]);
        chip.append(clock);
        clocks.append(chip);
      } else item.append(clock);
      const captured = Object.values(data?.state.history ?? {}).filter(move => move.color === side && move.captured);
      if (captured.length) {
        const pieces = document.createElement("span");
        pieces.className = "captures";
        pieces.setAttribute("aria-label", `${captured.length} captured pieces`);
        for (const move of captured) {
          pieces.append(createChessPiece(move.captured[1], sides[move.captured[0]].toLowerCase()));
        }
        if (fourPlayer) {
          const score = document.createElement("span");
          score.className = "capture-score";
          score.textContent = `${data.state.scores?.[side] ?? 0} pts`;
          pieces.append(score);
        }
        item.append(pieces);
      }
      list.append(item);
    }
    updateClocks();
  }

  function updateClocks() {
    const data = match();
    for (const clock of content.querySelectorAll(".clock")) {
      const side = clock.dataset.side;
      const seconds = (result()?.clocks ?? data?.clocks)?.[side] ?? lobby()?.baseSeconds;
      if (seconds == null) {
        clock.textContent = data?.ratings?.[side] ?? "";
      } else {
        const elapsed = side === data?.state.turn && !result() && !data.state.eliminated?.[side]
          ? Math.max(0, serverNow() - data.turnStarted) : 0;
        const remaining = Math.max(0, Math.ceil(seconds - elapsed));
        const label = Math.floor(remaining / 60) + ":" + String(remaining % 60).padStart(2, "0");
        if (clock.textContent !== label) clock.textContent = label;
      }
    }
  }

  function drawHistory() {
    const history = Object.values(match()?.state.history ?? {});
    const list = content.querySelector(".move-list");
    list.replaceChildren();
    for (const move of history) {
      const row = document.createElement("li");
      row.textContent = `${sides[move.color]}  ${move.from}${move.captured ? "×" : "–"}${move.to}${move.promotion ? "=" + move.promotion : ""}${move.special === "castle" ? " · Castling" : ""}`;
      list.append(row);
    }
    if (!history.length) {
      const row = document.createElement("li");
      row.className = "empty-moves";
      row.textContent = "No moves yet.";
      list.append(row);
    }
    list.scrollTop = list.scrollHeight;
  }

  function drawControls() {
    const data = match();
    const waiting = lobby();
    const otherMatch = (session.match && !data && !session.result) || (session.invite && !waiting);
    quickPlay.hidden = !!(otherMatch || active() || result() || session.invite || creatingInvite || queued || session.queue);
    quickPlay.disabled = starting;
    quickPlay.setAttribute("aria-busy", String(starting));
    quickPlay.textContent = starting ? "Starting…" : "Play a bot game";
    const ratings = fourPlayer ? ["B", "Y", "G"] : ["w"];
    const selector = ratings.map(side => `
      <label class="rating-choice">${side === "w" ? "Bot rating" : sides[side] + " bot rating"}
        <select data-rating="${side}">
          ${botLevels.map(rating =>
            `<option value="${rating}"${rating === preferences[side] ? " selected" : ""}>${rating}</option>`).join("")}
        </select>
      </label>`).join("");
    const botMode = (setup && !active()) || starting || /bot/i.test(data?.mode ?? "");
    const timeLocked = !!(otherMatch || active() || creatingInvite || queued || session.queue);
    const displayedControl = active() && data?.baseSeconds
      ? `${data.baseSeconds / 60} | ${data.increment}`
      : preferences.control;
    const timeControls = botMode ? "" : `
      <h2>Time control</h2>
      <div class="time-controls">
        ${timeGroups.map(([name, options]) => `<div class="time-row"><span>${name}</span>
          ${options.map(time => `<button type="button" aria-pressed="${time === displayedControl}" data-time="${time}"${timeLocked ? " disabled" : ""}>${time}</button>`).join("")}
        </div>`).join("")}
      </div>`;
    if (waiting) {
      controls.innerHTML = `
        <h2>Challenge link</h2>
        <div class="invite-link">
          <input type="text" aria-label="Challenge link" readonly>
          <button type="button" data-action="copyInvite">Copy</button>
        </div>
        <p class="help invite-feedback" role="status">Share this link to invite ${waiting.needed - 1 === 1 ? "a friend" : "three friends"}.
          Clocks start when everyone joins.</p>
        <button type="button" data-action="leaveInvite"${leavingInvite ? " disabled" : ""}>${waiting.host ? "Close challenge" : "Leave challenge"}</button>`;
      const url = new URL(location.href);
      url.searchParams.set("invite", waiting.code);
      url.hash = fourPlayer ? "4-player-chess" : "chess";
      controls.querySelector(".invite-link input").value = url.href;
      content.querySelector(".match-actions").replaceChildren();
      drawRatings();
      return;
    }
    controls.innerHTML = timeControls + (otherMatch
      ? '<p class="help">A match or challenge is open in the other chess tab.</p>'
      : active()
        ? '<div class="action-stack"><button type="button" data-action="leave">Leave match</button></div>'
        : `
          ${botMode ? '<p class="help">Bot games are untimed.</p>' : `
            <div class="online-actions">
              <button type="button" data-action="${session.queue || queued ? "cancelQueue" : "queue"}">${session.queue || queued ? "Cancel search" : "Play online"}</button>
              <button type="button" data-action="createInvite"${creatingInvite ? ' disabled aria-busy="true"' : ""}>${creatingInvite ? "Creating link…" : "Challenge"}</button>
            </div>
            <p class="online-status help" role="status">${onlineInfo && !session.network ? offlineNotice : ""}</p>`}
          ${setup ? selector : ""}
          <button type="button" class="primary" data-action="${setup ? "start" : "setup"}"${starting ? ' disabled aria-busy="true"' : ""}>${starting ? "Starting…" : setup ? "Start match" : "Play bots"}</button>
          ${setup && !starting ? '<button type="button" class="help" data-action="cancelSetup">Back to time controls</button>' : ""}`);

    if (session.offer) {
      const panel = document.createElement("div");
      const label = document.createElement("p");
      label.textContent = (session.offer.name || "A player") + (session.offer.kind === "rematchOffer" ? " wants a rematch." : " challenged you.");
      panel.className = "match-offer inset";
      panel.append(label);
      panel.insertAdjacentHTML("beforeend", '<div class="action-row"><button data-action="accept">Accept</button><button data-action="decline">Decline</button></div>');
      controls.append(panel);
    }
    const actions = content.querySelector(".match-actions");
    const bot = /bot/i.test(data?.mode ?? "");
    const abort = !bot && !Object.values(data?.state.history ?? {}).some(move => move.color === data?.side);
    const onlineFinished = ["online", "fourOnline"].includes(data?.mode);
    actions.innerHTML = result() ? `<button data-action="rematch">Rematch</button>
      ${onlineFinished && !session.queue && !queued ? '<button data-action="newOpponent">New Game</button>' : ""}
      ${review ? "" : '<button data-action="review">Review</button>'}` :
      active() ? `${bot ? `<button data-action="undo"${Object.values(data.state.history).some(move => move.color === data.side) ? "" : " disabled"}>Undo</button>
        <button data-action="reset"${resetting ? ' disabled aria-busy="true"' : ""}>${resetting ? "Resetting…" : "Reset game"}</button>` : ""}
        ${data.state.turn === data.side && data.state.claimReason ? '<button data-action="claim">Claim draw</button>' :
          data.state.turn === data.side && data.state.mayClaimWithMove ? `<button data-action="claimMove" aria-pressed="${claiming}">${claiming ? "Cancel draw claim" : "Claim with move"}</button>` : ""}
        <button data-action="${abort ? "abort" : "resign"}">${abort ? "Abort" : "Resign"}</button>` : "";
    drawRatings();
  }

  function drawRatings() {
    const profile = session.profile;
    content.querySelector(".ratings").innerHTML = `
      <div><dt>Chess Elo</dt><dd>${profile.chessElo}</dd></div>
      <div><dt>4-Player Elo</dt><dd>${profile.fourElo}</dd></div>
      <div><dt>${profile.league} League</dt><dd>${profile.leaguePoints} pts</dd></div>`;
    const queueStatus = session.queue ? `Waiting for players (${session.queue.players ?? session.queue.count}/${session.queue.needed})` : "";
    content.querySelector(".match-notice").textContent = session.notice || queueStatus;
  }

  async function click(event) {
    const button = event.target.closest("button");
    if (!button || dialog.contains(button)) return;
    if (button.dataset.time) {
      preferences.control = button.dataset.time;
      for (const option of controls.querySelectorAll("[data-time]")) {
        option.setAttribute("aria-pressed", String(option === button));
      }
    }
    if (!session.network && ["queue", "createInvite"].includes(button.dataset.action)) {
      onlineInfo = true;
      controls.querySelector(".online-status").textContent = offlineNotice;
      return;
    }
    switch (button.dataset.action) {
      case "review":
        resultDialog.close();
        startReview();
        break;
      case "reviewPrevious": case "reviewNext":
        if (review) {
          review.ply = Math.max(0, Math.min(review.positions.length - 1,
            review.ply + (button.dataset.action === "reviewNext" ? 1 : -1)));
          drawReview();
          drawBoard();
        }
        break;
      case "reviewExit":
        review = undefined;
        drawReview();
        drawBoard();
        drawStatus();
        drawControls();
        content.querySelector('.match-actions [data-action="review"]')?.focus();
        break;
      case "newOpponent":
        if (!session.network || !result() || session.invite || creatingInvite || queued || session.queue) break;
        resultDialog.close();
        queued = true;
        action(fourPlayer ? "queueFour" : "queue", { ...control(), newOpponent: true });
        drawControls();
        break;
      case "rematch":
        resultDialog.close();
        if (session.queue || queued) {
          queued = false;
          action("cancelQueue");
        }
        action("rematch");
        break;
      case "setup":
        onlineInfo = false;
        setup = true;
        drawControls();
        controls.querySelector("select")?.focus();
        break;
      case "cancelSetup":
        setup = false;
        drawControls();
        controls.querySelector('[data-action="setup"]')?.focus();
        break;
      case "start":
        if (starting || creatingInvite || session.invite || active()) break;
        if (session.queue) action("cancelQueue");
        unlockSound();
        starting = true;
        drawControls();
        action(fourPlayer ? "fourBot" : "bot", fourPlayer
          ? { ratings: { B: preferences.B, Y: preferences.Y, G: preferences.G } }
          : { rating: preferences.w });
        break;
      case "queue":
        queued = true;
        action(fourPlayer ? "queueFour" : "queue", control());
        drawControls();
        break;
      case "createInvite":
        if (creatingInvite || session.invite || active()) break;
        creatingInvite = true;
        action("createInvite", { ...control(), four: fourPlayer });
        drawControls();
        break;
      case "copyInvite": {
        const field = controls.querySelector(".invite-link input");
        const feedback = controls.querySelector(".invite-feedback");
        try {
          await navigator.clipboard.writeText(field.value);
          feedback.textContent = "Link copied.";
        } catch {
          field.focus();
          field.select();
          feedback.textContent = "Link selected. Use your device’s Copy command.";
        }
        break;
      }
      case "leaveInvite":
        if (leavingInvite) break;
        leavingInvite = true;
        action("leaveInvite");
        drawControls();
        break;
      case "accept": case "decline":
        action(session.offer.kind === "rematchOffer" ? "rematchRespond" : "challengeRespond", { accept: button.dataset.action === "accept" });
        drawControls();
        break;
      case "cancelQueue": queued = false; action("cancelQueue"); break;
      case "leave":
        if (!active() || confirm("Leave this match?")) action("leave");
        break;
      case "resign":
        if (confirm("Resign this match?")) action("resign");
        break;
      case "reset":
        if (!resetting && confirm("Reset this game to the starting position?")) {
          resetting = true;
          clearPremoves();
          clearBoardInput();
          drawBoard();
          drawControls();
          drawStatus();
          action("reset");
        }
        break;
      case "claim": action("claimDraw"); drawBoard(); drawStatus(); break;
      case "claimMove":
        claiming = !claiming;
        drawControls();
        drawBoard();
        drawStatus();
        break;
      case "undo": case "abort": action(button.dataset.action); break;
    }
  }

  function change(event) {
    if (event.target.matches("select[data-rating]")) preferences[event.target.dataset.rating] = event.target.value === "Max" ? "Max" : Number(event.target.value);
  }

  content.addEventListener("click", click);
  content.addEventListener("change", change);
  const drag = bindBoardDrag(slot, {
    begin(from) {
      if (!boardAcceptsInput()) return false;
      dragSource = from;
      dropped = null;
      if (match().state.turn === match().side) {
        clearPremoves();
        premoveNotice = "";
        requestTargets(from);
      }
      drawBoard();
      return true;
    },
    end() {
      dragSource = null;
      slot.querySelector(".drag-source")?.classList.remove("drag-source");
    },
    drop: (from, to) => chooseDestination(from, to, true)
  });
  document.addEventListener("click", cancelPremovesOnClick);
  function clearBoardInput(keepDrag = false) {
    clearSelection();
    if (!keepDrag) dragSource = null;
    promotion = null;
    if (dialog.open) dialog.close();
    if (!keepDrag) drag.cancel();
  }

  const subscription = subscribe(kind => {
    let animateMove = false;
    if (kind === "legal") {
      if (premoveRequest != null && session.legal.requestId === premoveRequest) {
        playPremove();
        return;
      }
      if (!targetsReady()) return;
      if (dropped && boardAcceptsInput()) finishDestination(selected, dropped.to, dropped.dragged);
      else drawBoard();
      return;
    }
    if (kind === "state" || kind === "error" || kind === "reject") {
      starting = false;
      if (kind !== "state") {
        resetting = false;
        queued = false;
      }
    }
    if (kind === "state") {
      queued = false;
      const data = match();
      const newMatch = data?.matchId !== lastMatch;
      const history = Object.values(data?.state.history ?? {});
      const moveCount = history.length;
      const lastMove = history.at(-1);
      const justDragged = dragMove && lastMove?.color === data?.side &&
        lastMove.from === dragMove.from && lastMove.to === dragMove.to;
      animateMove = !newMatch && moveCount === lastMoveCount + 1 && !justDragged;
      dragMove = undefined;
      lastMoveCount = moveCount;
      if (newMatch || data?.revision !== lastRevision) {
        const keepDrag = !newMatch && dragSource && active() &&
          data.state.turn !== data.side && data.state.board[dragSource]?.[0] === data.side;
        clearBoardInput(keepDrag);
        premoveRequest = undefined;
        claiming = false;
      }
      if (newMatch) {
        resetting = false;
        reviewTools?.close();
        reviewTools = undefined;
        review = undefined;
        drawReview();
        resultDialog.close();
        marks = new Set();
        clearPremoves();
        premoveNotice = "";
        claiming = false;
        if (data && window.matchMedia("(max-width: 65rem)").matches) {
          cancelAnimationFrame(scrollFrame);
          scrollFrame = requestAnimationFrame(() => slot.scrollIntoView({ block: "nearest" }));
        }
      }
      lastMatch = data?.matchId;
      lastRevision = data?.revision;
      if (data) checkPremove(data);
    }
    if (["inviteRoom", "inviteClosed", "state", "reject", "error"].includes(kind)) {
      creatingInvite = false;
      leavingInvite = false;
    }
    if (kind === "inviteRoom") {
      queued = false;
      setup = false;
    }
    if (kind === "queueCancelled" || kind === "challengeDeclined") queued = false;
    if (kind === "leave" || kind === "result") resetting = false;
    if (kind === "leave") {
      reviewTools?.close();
      reviewTools = undefined;
      review = undefined;
      drawReview();
      resultDialog.close();
      setup = false;
      starting = false;
    }
    if (["undoState", "leave", "result", "reject", "error"].includes(kind)) {
      clearBoardInput();
      clearPremoves();
      premoveNotice = "";
      claiming = false;
    }
    if (kind === "profile" || kind === "catalog") {
      const theme = getTheme();
      if (theme !== lastTheme) drawBoard();
      lastTheme = theme;
    }
    if (["state", "result", "leave", "reject", "error", "inviteRoom", "inviteClosed"].includes(kind)) {
      drawBoard(animateMove);
      drawPlayers();
      drawHistory();
      drawStatus();
    }
    // Preserve the native rating menu while unrelated profile or presence updates arrive.
    if (!["players", "legal", "profile", "catalog"].includes(kind)) drawControls();
    if (kind === "profile") drawRatings();
    if (kind === "result") drawResult();
  });
  const clock = setInterval(updateClocks, 250);
  drawControls();
  drawBoard();
  drawPlayers();
  drawHistory();
  drawStatus();
  drawResult();
  return () => {
    resultDialog.close();
    reviewTools?.close();
    reviewTools = undefined;
    subscription();
    evaluation.close();
    bestMove.close();
    hint.close();
    document.removeEventListener("click", cancelPremovesOnClick);
    clearBoardInput();
    drag.destroy();
    cancelAnimationFrame(scrollFrame);
    clearInterval(clock);
    content.removeEventListener("click", click);
    content.removeEventListener("change", change);
  };
}
