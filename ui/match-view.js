import { drawMoveList } from "./move-history.js";
import { createBestMoveControl } from "./review-best-move.js";
import { createPositionTools } from "../game/position-tools.js";
import { createEvaluationBar } from "./evaluation-bar.js";
import { bindBoardDrag } from "../game/board-drag.js";
import { board } from "./chessboard.js";
import { getTheme } from "./board-themes.js";
import { createChessPiece, pieceName } from "./chess-pieces.js";
import { premoveIntent, projectPremoves } from "../game/premove-preview.js";
import { action, playSound, serverNow, session, subscribe, unlockSound } from "../game/session.js";

const offlineNotice = "Online play requires a connected match server. This site currently supports bot games.";

const timeGroups = [
  ["Bullet", ["1 | 0", "1 | 1", "2 | 1"]],
  ["Blitz", ["3 | 0", "3 | 2", "5 | 0"]],
  ["Rapid", ["10 | 0", "10 | 5", "15 | 10"]]
];
const sides = { w: "White", b: "Black", R: "Red", B: "Blue", Y: "Yellow", G: "Green" };
const captureValue = { K: 20, Q: 9, R: 5, B: 3, N: 3, P: 1 };
const captureOrder = "KQRBNP";
const botLevels = [...Array.from({ length: 15 }, (_, index) => 200 * (index + 1)), "Max"];
const preferences = { control: "3 | 0", w: 1000, B: 800, Y: 1000, G: 1200 };

function boardFrame({ board, turn, lastMove, status, checkedColors, eliminated, halfmove, fullmove, analysis }) {
  return { board, turn, lastMove, status, checkedColors, eliminated, halfmove, fullmove, analysis };
}

export function renderMatch(content, { title, fourPlayer }) {
  const colors = fourPlayer ? ["R", "B", "Y", "G"] : ["w", "b"];
  const variant = fourPlayer ? "four" : "chess";
  let selected;
  let marks = new Set();
  const premoves = [];
  let premoveRequest;
  let premoveInFlight;
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
  let historyPly = null;
  let historyTools;
  let historyFrames = [];
  if (session.match?.variant === variant) {
    historyFrames[Object.values(session.match.state.history).length] = boardFrame(session.match.state);
  }

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
        <div class="action-row board-history-controls" role="group" aria-label="Board move history" hidden>
          <button type="button" data-action="historyPrevious" aria-label="Previous move">←</button>
          <output aria-live="polite"></output>
          <button type="button" data-action="historyNext" aria-label="Next move">→</button>
        </div>
        <p class="board-status" aria-live="polite"></p>
        <div class="action-row premove-controls" hidden>
          <button type="button" data-premove-control data-action="undoPremove">Undo last premove</button>
          <button type="button" data-premove-control data-action="clearPremoves">Clear premoves</button>
        </div>
      </section>
      <aside class="panel match-info">
        <h2>Match</h2>
        <ul class="players"></ul>
        <h2>Move history</h2>
        <ol class="inset move-list"></ol>
        <div class="review-controls" hidden>
          <div class="action-row">
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
  const historyControls = content.querySelector(".board-history-controls");
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
    const moves = !claiming && match()?.legalBySource ? Object.values(match().legalBySource[selected] ?? {}) : Object.values(session.legal.moves);
    return claiming ? moves.filter(move => move.claimable) : moves;
  };
  const active = () => match() && !match().state.terminal && !result();
  const control = () => {
    const [minutes, increment] = preferences.control.split(" | ").map(Number);
    return { baseSeconds: minutes * 60, increment };
  };

  function boardAcceptsInput(forPremove = false) {
    const data = match();
    return active() && (forPremove || historyPly === null) && !session.movePending && !resetting && !promotion && !data.state.eliminated?.[data.side];
  }

  function targetsReady() {
    if (!claiming && match()?.legalBySource) return Boolean(selected);
    const reply = session.legal;
    return Boolean(reply && reply.from === selected &&
      (reply.requestId == null || reply.requestId === targetRequest));
  }

  function requestTargets(from) {
    selected = from;
    targetRequest = (targetRequest ?? 0) + 1;
    if (claiming || !match()?.legalBySource) action("legal", { from, requestId: targetRequest });
  }

  function clearSelection() {
    selected = null;
    dropped = null;
  }

  function submit(move, queuedMove = false, dragged = false) {
    const data = match();
    if (!boardAcceptsInput(queuedMove) || data.state.turn !== data.side) return;
    if (!queuedMove) clearPremoves();
    if (claiming) {
      claiming = false;
      action("claimDraw", move);
      drawControls();
    } else {
      action("move", move);
    }
    dragMove = dragged || session.submittedMove ? move : undefined;
    clearSelection();
    drawBoard();
    drawStatus();
  }

  function finishDestination(from, to, dragged = false) {
    const target = currentTargets().find(move => move.to === to);
    dropped = null;
    if (!target) {
      playSound("wrong");
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
      const move = premoveIntent(plannedBoard().board, from, to, data.side);
      if (!move) {
        playSound("wrong");
        return false;
      }
      if (move.needsPromotion) {
        promotion = { preview: move, matchId: data.matchId };
        dialog.returnValue = "";
        dialog.showModal();
      } else queuePremove(move);
      return true;
    }
    if (selected !== from) requestTargets(from);
    if (targetsReady()) return finishDestination(from, to, dragged);
    dropped = { to, dragged };
    return true;
  }

  function plannedBoard() {
    const realBoard = match()?.state.board;
    return premoves.length ? projectPremoves(realBoard, premoves) : { board: realBoard };
  }

  function queuePremove(move) {
    premoves.push(move);
    clearSelection();
    premoveNotice = "";
    playSound("queue");
    drawBoard();
    drawStatus();
  }

  function select(address) {
    if (!boardAcceptsInput() || review) return;
    const data = match();
    const planning = data.state.turn !== data.side;
    if (!planning) cancelPremoves();
    if (!planning && selected && currentTargets().some(move => move.to === address)) {
      chooseDestination(selected, address);
      return;
    }
    if (plannedBoard().board[address]?.[0] === data.side) {
      dropped = null;
      if (selected === address) clearSelection();
      else {
        playSound("lift");
        if (planning) selected = address;
        else requestTargets(address);
      }
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
    if (!choice || choice.matchId !== match()?.matchId) return;
    if (choice.preview) {
      if (dialog.returnValue && active()) {
        queuePremove({ ...choice.preview, promotion: dialog.returnValue });
      }
      checkPremove(match());
      return;
    }
    if (dialog.returnValue && choice.revision === match().revision) {
      submit({ ...choice.move, promotion: dialog.returnValue }, false, choice.dragged);
    }
  });

  function clearPremoves() {
    const hadMoves = premoves.length > 0;
    premoves.length = 0;
    premoveRequest = undefined;
    premoveInFlight = undefined;
    return hadMoves;
  }

  function cancelPremoves(lastOnly = false) {
    const submitted = premoveInFlight ? 1 : 0;
    if (premoves.length <= submitted) return;
    if (lastOnly && premoves.length > 1) premoves.pop();
    else if (submitted) premoves.length = submitted;
    else clearPremoves();
    clearSelection();
    playSound("release");
    premoveNotice = "Premove canceled.";
    drawBoard();
    drawStatus();
  }

  function cancelPremovesOnClick(event) {
    const path = event.composedPath();
    if (!path.includes(slot) && !path.includes(dialog) &&
        !event.target.closest("[data-premove-control], .board-history-controls")) cancelPremoves();
  }

  function invalidatePremoves() {
    clearPremoves();
    clearSelection();
    playSound("wrong");
    premoveNotice = "Premove canceled. The move is no longer legal.";
  }

  function checkPremove(data) {
    if (!active() || data.state.eliminated?.[data.side]) {
      clearPremoves();
      return;
    }
    const next = premoves[0];
    if (!next || premoveInFlight) return;
    if (data.state.board[next.from] !== next.piece) {
      invalidatePremoves();
      return;
    }
    if (data.state.turn !== data.side || !boardAcceptsInput(true) || premoveRequest != null) return;
    if (data.legalBySource) { playPremove(data.legalBySource[next.from] ?? {}); return; }
    targetRequest = (targetRequest ?? 0) + 1;
    premoveRequest = targetRequest;
    action("legal", { from: next.from, requestId: premoveRequest });
  }

  function playPremove(moves = session.legal.moves) {
    const data = match();
    const queued = premoves[0];
    premoveRequest = undefined;
    if (!queued || !boardAcceptsInput(true) || data.state.turn !== data.side) return;
    const target = Object.values(moves).find(move => move.to === queued.to &&
      (!queued.promotion || move.promotion === queued.promotion));
    if (target) {
      premoveInFlight = queued;
      submit({ from: queued.from, to: queued.to, promotion: queued.promotion }, true);
      return;
    }
    invalidatePremoves();
    drawBoard();
    drawStatus();
  }

  function drawBoard(animateMove = false) {
    drawTurn();
    const historical = historyPly === null ? undefined : historyFrames[historyPly];
    const browsing = review || historyPly !== null;
    const preview = plannedBoard();
    const submitted = session.submittedMove;
    if (submitted && match() && !browsing && !premoveInFlight) {
      const actual = match().state.board;
      const move = submitted.special?.startsWith("castle")
        ? premoveIntent(actual, submitted.from, submitted.to, match().side)
        : { ...submitted, piece: actual[submitted.from] };
      if (move?.piece) {
        const projected = projectPremoves(actual, [{ ...move, promotion: submitted.promotion }]).board;
        if (submitted.special === "enpassant") delete projected[submitted.to[0] + submitted.from.slice(1)];
        preview.board = projected;
      }
    }
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
    }, historyPly === null ? null : { state: historical });
    const nextFrame = board(getTheme(), fourPlayer, false, {
      frame: slot.firstElementChild,
      state: review?.positions[review.ply] ?? historical ?? data?.state, side: data?.side,
      selected: browsing ? undefined : selected, targets: !browsing && selected ? currentTargets() : [],
      preview: browsing ? undefined : preview.destinations || submitted ? preview : undefined,
      bestMove: review ? bestMove.move : browsing ? undefined : hint.move,
      select: active() && !browsing ? select : undefined, marks: browsing ? undefined : marks,
      mark: address => { if (marks.has(address)) marks.delete(address); else marks.add(address); }
    });
    if (nextFrame !== slot.firstElementChild) slot.replaceChildren(nextFrame);
    for (const square of slot.querySelectorAll("[data-square]")) {
      square.classList.toggle("drag-source", square.dataset.square === dragSource);
      if (!review && boardAcceptsInput() && preview.board?.[square.dataset.square]?.[0] === data?.side) {
        const piece = square.querySelector(".chess-piece");
        if (piece) {
          square.classList.add("drag-enabled");
        }
      }
    }
    if (origin) {
      const destination = slot.querySelector(`[data-square="${move.to}"]`);
      const piece = destination?.querySelector(".chess-piece");
      if (piece && !preview.destinations?.has(move.to) && !reduceMotion.matches) {
        const bounds = destination.getBoundingClientRect();
        piece.animate([
          { translate: `${origin.left - bounds.left}px ${origin.top - bounds.top}px` },
          { translate: "0 0" }
        ], { duration: 120, easing: "ease-out" });
      }
    }
    if (focused) slot.querySelector(`[data-square="${focused}"]`)?.focus({ preventScroll: true });
  }

  function drawTurn() {
    const position = review?.positions[review.ply] ??
      (historyPly !== null ? historyFrames[historyPly] : active() ? match().state : undefined);
    const side = position?.turn;
    reviewTurn.hidden = !sides[side];
    reviewTurn.dataset.side = side ?? "";
    reviewTurn.textContent = sides[side] ? `${sides[side]} to move` : "";
  }

  function drawReview() {
    reviewControls.hidden = !review;
    bestMove.update(review?.positions[review.ply], variant);
    if (!review) bestMove.close();
    if (!review) return;
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
      review = { positions, ply: positions.length - 1 };
      drawReview();
      drawBoard();
      drawControls();
      drawHistory();
      historyControls.querySelector('button:enabled')?.focus();
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
    const controls = content.querySelector(".premove-controls");
    controls.hidden = !active() || !premoves.length;
    for (const button of controls.querySelectorAll("button")) button.disabled = Boolean(premoveInFlight) && premoves.length === 1;
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
        [data.state.status === "check" ? "Check" : "",
          /bot/i.test(data.mode) && data.state.turn !== data.side ? "Bot thinking" : ""].filter(Boolean).join(" · ");
    } else if (lobby()) {
      status.textContent = `Waiting for players · ${lobby().count} of ${lobby().needed} joined`;
    } else status.textContent = "";
    if (active() && premoves.length) {
      status.textContent += `${status.textContent ? " · " : ""}Premove queued: ${premoves.map(move => `${move.from}–${move.to}`).join(", ")}`;
    }
    if (active() && premoveNotice) status.textContent += `${status.textContent ? " · " : ""}${premoveNotice}`;
    status.classList.toggle("in-check", data?.state.status === "check" && !outcome);
  }

  function drawPlayers() {
    const data = match();
    const list = content.querySelector(".players");
    const timed = Boolean(data?.clocks || lobby());
    const history = Object.values(data?.state.history ?? {});
    const totals = Object.fromEntries(colors.map(side => [side, 0]));
    if (fourPlayer) Object.assign(totals, data?.state.scores);
    else {
      for (const [side, type] of Object.values(data?.state.board ?? {})) {
        if (type !== "K") totals[side] += captureValue[type];
      }
    }
    const [leader, second] = colors.slice().sort((a, b) => totals[b] - totals[a]);
    const lead = totals[leader] - totals[second];
    const value = move => move.captureValue ?? (move.grey ? 0 : captureValue[move.captured[1]] ?? 0);
    list.replaceChildren();
    for (const side of colors) {
      const name = sides[side];
      const item = document.createElement("li");
      const label = document.createElement("span");
      const dot = document.createElement("i");
      dot.className = "side-dot " + name.toLowerCase();
      label.className = "player-name";
      const player = data?.players?.[side];
      label.append(dot, document.createTextNode(timed && player ? `${name} · ${player}` : player ?? name));
      const clock = document.createElement("span");
      clock.className = timed ? "clock match-clock" : "clock";
      clock.dataset.side = side;
      item.classList.toggle("turn", data?.state.turn === side && !result());
      item.classList.toggle("eliminated", !!data?.state.eliminated?.[side]);
      item.append(label, clock);
      const captured = history.filter(move => move.color === side && move.captured)
        .sort((first, second) => value(second) - value(first) ||
          captureOrder.indexOf(first.captured[1]) - captureOrder.indexOf(second.captured[1]));
      const leads = side === leader && lead > 0;
      if (captured.length || leads) {
        const pieces = document.createElement("span");
        pieces.className = "captures";
        const descriptions = captured.map(move => {
          const type = move.captured[1];
          const color = sides[move.captured[0]];
          const piece = createChessPiece(type, color.toLowerCase());
          const points = value(move);
          const description = `${color} ${pieceName(type)}${fourPlayer ? `, ${points} ${points === 1 ? "point" : "points"}` : ""}`;
          piece.title = description;
          pieces.append(piece);
          return description;
        });
        pieces.setAttribute("role", "group");
        if (leads) {
          const score = document.createElement("span");
          score.className = "capture-score";
          score.textContent = `+${lead}`;
          const unit = lead === 1 ? "point" : "points";
          const description = fourPlayer
            ? `${lead} capture ${unit} ahead of second place`
            : `${lead} material ${unit} ahead`;
          score.title = description;
          descriptions.push(description);
          pieces.append(score);
        }
        pieces.setAttribute("aria-label", descriptions.join(". "));
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
    const data = match();
    const history = Object.values(data?.state.history ?? {});
    const latest = review ? review.positions.length - 1 : history.length;
    const ply = review?.ply ?? historyPly ?? latest;
    historyControls.hidden = !data;
    historyControls.querySelector('[data-action="historyPrevious"]').disabled = ply === 0;
    historyControls.querySelector('[data-action="historyNext"]').disabled = ply === latest;
    historyControls.querySelector("output").textContent = review ? `Move ${ply} of ${latest}`
      : historyPly !== null ? (historyFrames[ply] ? `Viewing history · ${ply}/${latest}` : "Loading history…")
      : result() ? "Final position" : "";
    drawMoveList(content.querySelector(".move-list"), history, ply);
  }

  function returnToLive() {
    historyPly = null;
    historyTools?.close();
    historyTools = undefined;
  }

  async function stepHistory(direction) {
    if (review) {
      review.ply = Math.max(0, Math.min(review.positions.length - 1, review.ply + direction));
      drawReview();
    } else {
      const data = match();
      if (!data) return;
      const history = Object.values(data.state.history);
      const latest = history.length;
      const next = Math.max(0, Math.min(latest, (historyPly ?? latest) + direction));
      if (next === latest) returnToLive();
      else {
        historyPly = next;
        clearBoardInput(false, Boolean(promotion));
        claiming = false;
        if (!historyFrames[next] && !historyTools) {
          const worker = createPositionTools();
          historyTools = worker;
          drawBoard();
          drawHistory();
          try {
            const frames = Object.values(await worker.run("review", {
              variant,
              moves: history.map(move => ({ f: move.from, t: move.to, c: move.color, p: move.promotion })),
              fourStates: data.fourStates && Object.values(data.fourStates)
            }));
            if (historyTools !== worker) return;
            historyFrames = frames.map(boardFrame);
          } catch {
            if (historyTools !== worker) return;
            returnToLive();
            status.textContent = "Move history could not be loaded. Try again.";
          } finally {
            worker.close();
            if (historyTools === worker) historyTools = undefined;
          }
        }
      }
    }
    drawBoard();
    drawHistory();
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
    const botMode = setup || starting || (active() && /bot/i.test(data?.mode ?? ""));
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
      case "undoPremove": cancelPremoves(true); break;
      case "clearPremoves": cancelPremoves(); break;
      case "review":
        resultDialog.close();
        startReview();
        break;
      case "historyPrevious": case "historyNext":
        stepHistory(button.dataset.action === "historyNext" ? 1 : -1);
        break;
      case "reviewExit":
        review = undefined;
        drawReview();
        drawBoard();
        drawStatus();
        drawControls();
        drawHistory();
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
        if (selected) requestTargets(selected);
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
      playSound("lift");
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
  function handlePremoveEscape(event) {
    if (event.key === "Escape" && !dialog.open) cancelPremoves();
  }
  document.addEventListener("keydown", handlePremoveEscape);
  document.addEventListener("click", cancelPremovesOnClick);
  function clearBoardInput(keepDrag = false, keepPromotion = false) {
    clearSelection();
    if (!keepDrag) dragSource = null;
    if (!keepPromotion) {
      promotion = null;
      if (dialog.open) dialog.close();
    }
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
      const wasBrowsing = historyPly !== null;
      if (newMatch || moveCount !== lastMoveCount || data?.state.terminal) returnToLive();
      if (newMatch) historyFrames = [];
      else if (moveCount < lastMoveCount) historyFrames.length = moveCount + 1;
      if (data) historyFrames[moveCount] = boardFrame(data.state);
      const justDragged = dragMove && lastMove?.color === data?.side &&
        lastMove.from === dragMove.from && lastMove.to === dragMove.to;
      const confirmedPremove = !newMatch && premoveInFlight && moveCount > lastMoveCount &&
        lastMove?.color === data?.side && lastMove.from === premoveInFlight.from && lastMove.to === premoveInFlight.to;
      if (confirmedPremove) {
        premoves.shift();
        premoveInFlight = undefined;
        premoveNotice = "Premove played.";
      }
      animateMove = !newMatch && moveCount === lastMoveCount + 1 && !justDragged && !confirmedPremove && !wasBrowsing;
      dragMove = undefined;
      lastMoveCount = moveCount;
      if (newMatch || data?.revision !== lastRevision) {
        const keepDrag = !newMatch && dragSource && active() &&
          data.state.turn !== data.side && plannedBoard().board?.[dragSource]?.[0] === data.side;
        clearBoardInput(keepDrag, !newMatch && active() && Boolean(promotion?.preview));
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
    if (["leave", "result", "undoState"].includes(kind)) returnToLive();
    if (kind === "leave" || kind === "result") resetting = false;
    if (kind === "result") {
      setup = false;
      starting = false;
      onlineInfo = false;
    }
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
      if (kind === "reject" && (session.notice === "Illegal move" || premoves.length)) playSound("wrong");
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
    returnToLive();
    reviewTools?.close();
    reviewTools = undefined;
    subscription();
    evaluation.close();
    bestMove.close();
    hint.close();
    document.removeEventListener("click", cancelPremovesOnClick);
    document.removeEventListener("keydown", handlePremoveEscape);
    clearBoardInput();
    drag.destroy();
    cancelAnimationFrame(scrollFrame);
    clearInterval(clock);
    content.removeEventListener("click", click);
    content.removeEventListener("change", change);
  };
}
