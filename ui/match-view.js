import { createEvaluationBar } from "./evaluation-bar.js";
import { bindTouchBoard } from "../game/touch-board.js";
import { board } from "./chessboard.js";
import { getTheme } from "./board-themes.js";
import { createChessPiece, setPieceDragImage } from "./chess-pieces.js";
import { action, serverNow, session, subscribe, unlockSound } from "../game/session.js";

const offlineNotice = "Online play requires a connected match server. This site currently supports bot games.";

const timeGroups = [
  ["Bullet", ["1 | 0", "1 | 1", "2 | 1"]],
  ["Blitz", ["3 | 0", "3 | 2", "5 | 0"]],
  ["Rapid", ["10 | 0", "10 | 5", "15 | 10"]]
];
const sides = { w: "White", b: "Black", R: "Red", B: "Blue", Y: "Yellow", G: "Green" };
const preferences = { control: "3 | 0", w: 1000, B: 800, Y: 1000, G: 1200 };

export function renderMatch(content, { title, fourPlayer }) {
  const colors = fourPlayer ? ["R", "B", "Y", "G"] : ["w", "b"];
  const variant = fourPlayer ? "four" : "chess";
  let selected;
  let marks = new Set();
  let premove;
  let promotion;
  let setup = false;
  let challenge = false;
  let onlineInfo = false;
  let lastMatch = session.match?.matchId;
  let lastRevision = session.match?.revision;
  let lastTheme = getTheme();
  let lastMoveCount = Object.values(session.match?.state.history ?? {}).length;
  let scrollFrame;
  let targetRequest;
  let dragSource;
  let resetting = false;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let queued = false;
  let dragged;
  let dropped;
  let clearDragImage;
  let starting = false;
  let claiming = false;

  content.innerHTML = `
    <div class="match">
      <aside class="panel setup">
        <h1>${title}</h1>
        <div class="match-controls"></div>
        <div class="divider"></div>
        <h2>Your ratings</h2>
        <dl class="ratings"></dl>
        <p class="match-notice help" aria-live="polite"></p>
      </aside>
      <section class="board-area" aria-label="${title} board">
        <button class="quick-play primary" type="button" data-action="start">Play a bot game</button>
        <div class="board-and-eval">
          <div class="bot-eval" hidden aria-label="Engine estimate, in pawns" title="Engine estimate, in pawns">
            <div class="eval-meter" aria-hidden="true"><div class="eval-white"></div></div>
            <output></output>
          </div>
          <div class="board-slot"></div>
        </div>
        <p class="board-status" aria-live="polite"></p>
      </section>
      <aside class="panel match-info">
        <h2>Match</h2>
        <ul class="players"></ul>
        <h2>Move history</h2>
        <ol class="inset move-list"></ol>
        <div class="match-actions"></div>
      </aside>
    </div>
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
  const dialog = content.querySelector("dialog");
  const match = () => session.match?.variant === variant ? session.match : null;
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

  function submit(move) {
    const data = match();
    if (!boardAcceptsInput()) return;
    if (claiming) {
      claiming = false;
      action("claimDraw", move);
      drawControls();
    } else if (data.state.turn !== data.side) {
      premove = move;
    } else {
      action("move", move);
    }
    clearSelection();
    drawBoard();
    drawStatus();
  }

  function finishDestination(from, to) {
    const target = currentTargets().find(move => move.to === to);
    dropped = null;
    if (!target) {
      clearSelection();
      drawBoard();
      if (!reduceMotion.matches) {
        slot.querySelector(`[data-square="${from}"] .chess-piece`)?.animate(
          [{ opacity: .68 }, { opacity: 1 }], { duration: 120 }
        );
      }
      return false;
    }
    const move = { from, to };
    if (target.promotion) {
      promotion = { move, matchId: match().matchId, revision: match().revision };
      dialog.returnValue = "";
      dialog.showModal();
      return true;
    }
    submit(move);
    return true;
  }

  function chooseDestination(from, to) {
    if (!boardAcceptsInput() || !from || from === to || !to) return false;
    if (selected !== from) requestTargets(from);
    if (targetsReady()) return finishDestination(from, to);
    dropped = to;
    return true;
  }

  function select(address) {
    if (!boardAcceptsInput()) return;
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
    } else {
      premove = null;
    }
    drawBoard();
    drawStatus();
  }

  dialog.addEventListener("close", () => {
    const choice = promotion;
    promotion = null;
    if (choice && dialog.returnValue && choice.matchId === match()?.matchId && choice.revision === match()?.revision) {
      submit({ ...choice.move, promotion: dialog.returnValue });
    }
  });

  function drawBoard(animateMove = false) {
    const move = animateMove ? match()?.state.lastMove : null;
    const origin = move && slot.querySelector(`[data-square="${move.from}"]`)?.getBoundingClientRect();
    const focused = document.activeElement?.dataset.square;
    const data = match();
    evaluation.update(data);
    slot.replaceChildren(board(getTheme(), fourPlayer, false, {
      state: data?.state, side: data?.side, selected, targets: selected ? currentTargets() : [],
      select: active() ? select : undefined, marks,
      mark: address => { if (marks.has(address)) marks.delete(address); else marks.add(address); }
    }));
    for (const square of slot.querySelectorAll("[data-square]")) {
      square.classList.toggle("drag-source", square.dataset.square === dragSource);
      if (boardAcceptsInput() && data?.state.board[square.dataset.square]?.[0] === data?.side) {
        const piece = square.querySelector(".chess-piece");
        if (piece) {
          piece.draggable = true;
          square.classList.add("touch-source");
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

  function drawStatus() {
    const data = match();
    const outcome = result();
    if (outcome) {
      const labels = { win: "Victory", loss: "Defeat", draw: "Draw", aborted: "Match aborted" };
      const place = outcome.placements?.[data.side];
      status.textContent = (place > 1 ? `Placed ${place} of 4` : labels[outcome.result]) +
        " · " + outcome.reason + (outcome.stars ? ` · ${"★".repeat(outcome.stars)}` : "");
    } else if (data) {
      status.textContent = data.state.terminal ? "Game ended" :
        data.state.eliminated?.[data.side] ? "Eliminated · Watching the remaining players" :
        session.movePending ? "Sending move…" :
        premove ? `Premove queued · ${premove.from}–${premove.to}` :
        claiming ? "Choose a move to support your draw claim." :
        `${sides[data.state.turn]} to move${data.state.status === "check" ? " · Check" : ""}${/bot/i.test(data.mode) && data.state.turn !== data.side ? " · Bot thinking" : ""}`;
    } else status.textContent = "";
    status.classList.toggle("in-check", data?.state.status === "check" && !outcome);
  }

  function drawPlayers() {
    const data = match();
    const list = content.querySelector(".players");
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
      item.append(label, clock);
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
      const seconds = (result()?.clocks ?? data?.clocks)?.[side];
      if (seconds == null) {
        clock.textContent = data?.ratings?.[side] ?? "";
      } else {
        const elapsed = side === data.state.turn && !result() && !data.state.eliminated?.[side]
          ? Math.max(0, serverNow() - data.turnStarted) : 0;
        const remaining = Math.max(0, Math.ceil(seconds - elapsed));
        clock.textContent = Math.floor(remaining / 60) + ":" + String(remaining % 60).padStart(2, "0");
      }
    }
  }

  function drawHistory() {
    const history = Object.values(match()?.state.history ?? {});
    const list = content.querySelector(".move-list");
    list.replaceChildren();
    for (const move of history) {
      const row = document.createElement("li");
      row.textContent = `${sides[move.color]}  ${move.from}${move.captured ? "×" : "–"}${move.to}${move.promotion ? "=" + move.promotion : ""}`;
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
    const otherMatch = session.match && !data && !session.result;
    quickPlay.hidden = !!(otherMatch || active() || result() || queued || session.queue);
    quickPlay.disabled = starting;
    quickPlay.setAttribute("aria-busy", String(starting));
    quickPlay.textContent = starting ? "Starting…" : "Play a bot game";
    const ratings = fourPlayer ? ["B", "Y", "G"] : ["w"];
    const selector = ratings.map(side => `
      <label class="rating-choice">${side === "w" ? "Bot rating" : sides[side] + " bot rating"}
        <select data-rating="${side}">
          ${Array.from({ length: 11 }, (_, i) => 400 + 200 * i).map(rating =>
            `<option${rating === preferences[side] ? " selected" : ""}>${rating}</option>`).join("")}
        </select>
      </label>`).join("");
    const botMode = (setup && !active()) || starting || /bot/i.test(data?.mode ?? "");
    const timeLocked = !!(otherMatch || active());
    const timeControls = botMode ? "" : `
      <h2>Time control</h2>
      <div class="time-controls">
        ${timeGroups.map(([name, options]) => `<div class="time-row"><span>${name}</span>
          ${options.map(time => `<button type="button" aria-pressed="${!timeLocked && time === preferences.control}" data-time="${time}"${timeLocked ? " disabled" : ""}>${time}</button>`).join("")}
        </div>`).join("")}
      </div>`;
    controls.innerHTML = timeControls + (otherMatch
      ? '<p class="help">A match is in progress in the other chess tab.</p>'
      : active()
        ? '<div class="action-stack"><button type="button" data-action="leave">Leave match</button></div>'
        : `
          ${botMode ? '<p class="help">Bot games are untimed.</p>' : `
            <div class="online-actions">
              <button type="button" data-action="${session.queue || queued ? "cancelQueue" : "queue"}">${session.queue || queued ? "Cancel search" : "Play online"}</button>
              <button type="button" data-action="challengeMenu">Challenge</button>
            </div>
            <p class="online-status help" role="status">${onlineInfo && !session.network ? offlineNotice : ""}</p>`}
          ${setup ? selector : ""}
          <button type="button" class="primary" data-action="${setup ? "start" : "setup"}"${starting ? ' disabled aria-busy="true"' : ""}>${starting ? "Starting…" : setup ? "Start match" : "Play bots"}</button>
          ${setup && !starting ? '<button type="button" class="help" data-action="cancelSetup">Back to time controls</button>' : ""}`);

    if (challenge && !botMode && !active() && session.network) {
      const form = document.createElement("div");
      form.className = "action-stack";
      for (const player of session.players) {
        const label = document.createElement("label");
        const pick = document.createElement("input");
        pick.type = fourPlayer ? "checkbox" : "radio";
        pick.name = "challenge-player";
        pick.value = player.id;
        label.append(pick, document.createTextNode(" " + player.name));
        form.append(label);
      }
      const invite = document.createElement("button");
      invite.dataset.action = "challenge";
      invite.textContent = "Send challenge";
      invite.disabled = !session.players.length;
      form.append(invite);
      controls.append(form);
    }
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
    actions.innerHTML = result() ? '<button data-action="rematch">Rematch</button><button data-action="leave">New match</button>' :
      active() ? `${bot ? `<button data-action="undo"${Object.values(data.state.history).some(move => move.color === data.side) ? "" : " disabled"}>Undo</button>
        <button data-action="reset">Reset game</button>` : ""}
        ${data.state.turn === data.side && data.state.claimReason ? '<button data-action="claim">Claim draw</button>' :
          data.state.turn === data.side && data.state.mayClaimWithMove ? `<button data-action="claimMove" aria-pressed="${claiming}">${claiming ? "Cancel draw claim" : "Claim with move"}</button>` : ""}
        <button data-action="${abort ? "abort" : "resign"}">${abort ? "Abort" : "Resign"}</button>` : "";
    const profile = session.profile;
    content.querySelector(".ratings").innerHTML = `
      <div><dt>Chess Elo</dt><dd>${profile.chessElo}</dd></div>
      <div><dt>4-Player Elo</dt><dd>${profile.fourElo}</dd></div>
      <div><dt>Stored pieces</dt><dd>${profile.pieceStorage}</dd></div>
      <div><dt>${profile.league} League</dt><dd>${profile.leaguePoints} pts</dd></div>`;
    const queueStatus = session.queue ? `Waiting for players (${session.queue.players ?? session.queue.count}/${session.queue.needed})` : "";
    content.querySelector(".match-notice").textContent = session.notice || queueStatus;
  }

  function click(event) {
    const button = event.target.closest("button");
    if (!button || dialog.contains(button)) return;
    if (button.dataset.time) {
      preferences.control = button.dataset.time;
      for (const option of controls.querySelectorAll("[data-time]")) {
        option.setAttribute("aria-pressed", String(option === button));
      }
    }
    if (!session.network && ["queue", "challengeMenu"].includes(button.dataset.action)) {
      onlineInfo = true;
      controls.querySelector(".online-status").textContent = offlineNotice;
      return;
    }
    switch (button.dataset.action) {
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
      case "challengeMenu": challenge = !challenge; drawControls(); break;
      case "challenge": {
        const ids = [...controls.querySelectorAll("input:checked")].map(input => Number(input.value));
        if (ids.length) action("challenge", { ...control(), ...(fourPlayer ? { userIds: ids } : { userId: ids[0] }) });
        break;
      }
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
          clearSelection();
          drawBoard();
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
      case "undo": case "rematch": case "abort": action(button.dataset.action); break;
    }
  }

  function change(event) {
    if (event.target.matches("select[data-rating]")) preferences[event.target.dataset.rating] = Number(event.target.value);
  }

  content.addEventListener("click", click);
  content.addEventListener("change", change);
  slot.addEventListener("dragstart", event => {
    const piece = event.target.closest(".chess-piece[draggable=true]");
    if (!piece || !boardAcceptsInput()) { event.preventDefault(); return; }
    dragged = piece.closest("[data-square]").dataset.square;
    clearDragImage?.();
    clearDragImage = setPieceDragImage(piece, event.dataTransfer);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", dragged);
  });
  slot.addEventListener("dragover", event => {
    if (dragged && event.target.closest("[data-square]")) event.preventDefault();
  });
  slot.addEventListener("drop", event => {
    if (!dragged) return;
    event.preventDefault();
    const from = dragged;
    dragged = null;
    clearDragImage?.();
    chooseDestination(from, event.target.closest("[data-square]")?.dataset.square);
  });
  const touch = bindTouchBoard(slot, {
    begin(from) {
      if (!boardAcceptsInput()) return false;
      dragSource = from;
      dropped = null;
      requestTargets(from);
      drawBoard();
      return true;
    },
    end() {
      dragSource = null;
      slot.querySelector(".drag-source")?.classList.remove("drag-source");
    },
    drop: chooseDestination
  });
  slot.addEventListener("dragend", () => {
    dragged = null;
    clearDragImage?.();
  });

  function clearBoardInput() {
    clearSelection();
    dragSource = null;
    dragged = null;
    promotion = null;
    if (dialog.open) dialog.close();
    clearDragImage?.();
    touch.cancel();
  }

  const subscription = subscribe(kind => {
    let animateMove = false;
    if (kind === "legal") {
      if (!targetsReady()) return;
      if (dropped && boardAcceptsInput()) finishDestination(selected, dropped);
      else drawBoard();
      return;
    }
    if (kind === "state" || kind === "error" || kind === "reject") {
      starting = false;
      resetting = false;
    }
    if (kind === "state") {
      queued = false;
      const data = match();
      const newMatch = data?.matchId !== lastMatch;
      const history = Object.values(data?.state.history ?? {});
      const moveCount = history.length;
      const lastMove = history.at(-1);
      animateMove = !newMatch && moveCount === lastMoveCount + 1 && lastMove?.color !== data?.side;
      lastMoveCount = moveCount;
      if (newMatch || data?.revision !== lastRevision) {
        clearBoardInput();
        claiming = false;
      }
      if (newMatch) {
        marks = new Set();
        premove = null;
        claiming = false;
        if (data && window.matchMedia("(max-width: 65rem)").matches) {
          cancelAnimationFrame(scrollFrame);
          scrollFrame = requestAnimationFrame(() => slot.scrollIntoView({ block: "nearest" }));
        }
      }
      lastMatch = data?.matchId;
      lastRevision = data?.revision;
      if (data && active() && premove && data.state.turn === data.side) {
        const next = premove;
        premove = null;
        action("move", next);
      }
    }
    if (kind === "leave") {
      setup = false;
      starting = false;
    }
    if (["undoState", "leave", "result", "reject", "error"].includes(kind)) {
      clearBoardInput();
      premove = null;
      claiming = false;
    }
    if (kind === "profile" || kind === "catalog") {
      const theme = getTheme();
      if (theme !== lastTheme) drawBoard();
      lastTheme = theme;
    }
    if (["state", "result", "leave", "reject", "error"].includes(kind)) {
      drawBoard(animateMove);
      drawPlayers();
      drawHistory();
      drawStatus();
    }
    if (kind !== "players" || challenge) drawControls();
  });
  const clock = setInterval(updateClocks, 250);
  drawControls();
  drawBoard();
  drawPlayers();
  drawHistory();
  drawStatus();
  return () => {
    subscription();
    evaluation.close();
    clearBoardInput();
    touch.destroy();
    cancelAnimationFrame(scrollFrame);
    clearDragImage?.();
    clearInterval(clock);
    content.removeEventListener("click", click);
    content.removeEventListener("change", change);
  };
}
