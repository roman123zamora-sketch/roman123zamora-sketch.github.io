import { board, getTheme } from "./Board Themes.js";
import { createChessPiece } from "./Chess Pieces.js";
import { action, session, subscribe, unlockSound } from "./game/session.js";

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
  let lastMatch = session.match?.matchId;
  let queued = false;
  let dragged;
  let dropped;

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
        <div class="board-slot"></div>
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
  const status = content.querySelector(".board-status");
  const dialog = content.querySelector("dialog");
  const match = () => session.match?.variant === variant ? session.match : null;
  const result = () => match()?.matchId === session.result?.matchId ? session.result : null;
  const currentTargets = () => session.legal?.from === selected ? Object.values(session.legal.moves) : [];
  const active = () => match() && !result();
  const control = () => {
    const [minutes, increment] = preferences.control.split(" | ").map(Number);
    return { baseSeconds: minutes * 60, increment };
  };

  function submit(move) {
    const data = match();
    if (data && data.state.turn !== data.side) premove = move;
    else action("move", move);
    selected = null;
    drawBoard();
    drawStatus();
  }

  function select(address) {
    const data = match();
    if (!active() || data.state.eliminated?.[data.side]) return;
    const target = currentTargets().find(move => move.to === address);
    if (selected && target) {
      dropped = null;
      const move = { from: selected, to: address };
      if (target.promotion) {
        promotion = move;
        dialog.returnValue = "";
        dialog.showModal();
      } else submit(move);
    } else if (data.state.board[address]?.[0] === data.side && selected !== address) {
      selected = address;
      action("legal", { from: address });
    } else {
      selected = null;
      premove = null;
    }
    drawBoard();
    drawStatus();
  }

  dialog.addEventListener("close", () => {
    if (promotion && dialog.returnValue) submit({ ...promotion, promotion: dialog.returnValue });
    promotion = null;
  });

  function drawBoard() {
    const focused = document.activeElement?.dataset.square;
    const data = match();
    slot.replaceChildren(board(getTheme(), fourPlayer, false, {
      state: data?.state, side: data?.side, selected, targets: selected ? currentTargets() : [],
      select: active() ? select : undefined, marks,
      mark: address => { if (marks.has(address)) marks.delete(address); else marks.add(address); }
    }));
    for (const square of slot.querySelectorAll("[data-square]")) {
      if (data?.state.board[square.dataset.square]?.[0] === data?.side) {
        const piece = square.querySelector(".chess-piece");
        if (piece) piece.draggable = true;
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
      status.textContent = data.state.eliminated?.[data.side] ? "Eliminated · Watching the remaining players" :
        premove ? `Premove queued · ${premove.from}–${premove.to}` :
        `${sides[data.state.turn]} to move${data.state.status === "check" ? " · Check" : ""}`;
    } else status.textContent = "";
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
      const seconds = data?.clocks?.[side];
      if (seconds == null) {
        clock.textContent = data?.ratings?.[side] ?? "";
      } else {
        const elapsed = side === data.state.turn && !result() && !data.state.eliminated?.[side]
          ? Math.max(0, Date.now() / 1000 - data.turnStarted) : 0;
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
    const ratings = fourPlayer ? ["B", "Y", "G"] : ["w"];
    const selector = ratings.map(side => `
      <label class="rating-choice">${side === "w" ? "Bot rating" : sides[side] + " bot rating"}
        <select data-rating="${side}">
          ${Array.from({ length: 11 }, (_, i) => 400 + 200 * i).map(rating =>
            `<option${rating === preferences[side] ? " selected" : ""}>${rating}</option>`).join("")}
        </select>
      </label>`).join("");
    controls.innerHTML = otherMatch
      ? '<p class="help">A match is in progress in the other chess tab.</p>'
      : active()
        ? '<button type="button" data-action="leave">Leave match</button>'
        : `
          <h2>Time control</h2>
          <div class="time-controls">
            ${timeGroups.map(([name, options]) => `<div class="time-row"><span>${name}</span>
              ${options.map(time => `<button type="button" aria-pressed="${time === preferences.control}" data-time="${time}">${time}</button>`).join("")}
            </div>`).join("")}
          </div>
          ${session.network ? `<div class="action-stack">
            <button data-action="${session.queue || queued ? "cancelQueue" : "queue"}">${session.queue || queued ? "Cancel search" : "Find match"}</button>
            <button data-action="challengeMenu">Challenge</button>
          </div>` : '<p class="help">Time controls apply to online games. Bot games are untimed.</p>'}
          ${setup ? selector : ""}
          <button type="button" class="primary" data-action="${setup ? "start" : "setup"}">${setup ? "Start match" : "Play bots"}</button>`;

    if (challenge && !active() && session.network) {
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
      panel.append(label);
      panel.insertAdjacentHTML("beforeend", '<div class="action-row"><button data-action="accept">Accept</button><button data-action="decline">Decline</button></div>');
      controls.append(panel);
    }
    const actions = content.querySelector(".match-actions");
    const bot = /bot/i.test(data?.mode ?? "");
    const abort = !bot && !Object.values(data?.state.history ?? {}).some(move => move.color === data?.side);
    actions.innerHTML = result() ? '<button data-action="rematch">Rematch</button><button data-action="leave">New match</button>' :
      active() ? `${bot ? '<button data-action="undo">Undo</button>' : ""}
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
    switch (button.dataset.action) {
      case "setup": setup = true; drawControls(); break;
      case "start":
        if (session.queue) action("cancelQueue");
        unlockSound();
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
      case "undo": case "rematch": case "abort": action(button.dataset.action); break;
    }
  }

  function change(event) {
    if (event.target.matches("select[data-rating]")) preferences[event.target.dataset.rating] = Number(event.target.value);
  }

  content.addEventListener("click", click);
  content.addEventListener("change", change);
  slot.addEventListener("dragstart", event => {
    dragged = event.target.closest("[data-square]")?.dataset.square;
    if (!dragged) return;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", dragged);
  });
  slot.addEventListener("dragover", event => {
    if (dragged && event.target.closest("[data-square]")) event.preventDefault();
  });
  slot.addEventListener("drop", event => {
    event.preventDefault();
    const to = event.target.closest("[data-square]")?.dataset.square;
    if (!active() || !dragged || !to || dragged === to) return;
    selected = dragged;
    dropped = to;
    action("legal", { from: selected });
  });
  slot.addEventListener("dragend", () => { dragged = null; });

  const subscription = subscribe(kind => {
    if (kind === "legal") {
      if (dropped && session.legal.from === selected) {
        const to = dropped;
        dropped = null;
        if (currentTargets().some(target => target.to === to)) select(to);
        else drawBoard();
      } else drawBoard();
      return;
    }
    if (kind === "state") {
      queued = false;
      const data = match();
      if (data?.matchId !== lastMatch) { marks = new Set(); premove = null; selected = null; }
      lastMatch = data?.matchId;
      if (data && premove && data.state.turn === data.side) {
        const next = premove;
        premove = null;
        action("move", next);
      }
    }
    if (kind === "undoState" || kind === "leave" || kind === "result") {
      selected = null;
      premove = null;
      dropped = null;
    }
    if (kind === "state" || kind === "result" || kind === "profile" || kind === "leave") {
      drawBoard();
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
    clearInterval(clock);
    content.removeEventListener("click", click);
    content.removeEventListener("change", change);
  };
}
