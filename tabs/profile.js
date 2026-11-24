import { drawMoveList } from "../ui/move-history.js";
import { createPositionTools } from "../game/position-tools.js";
import { createEvaluationBar } from "../ui/evaluation-bar.js";
import { createBestMoveControl } from "../ui/review-best-move.js";
import { board } from "../ui/chessboard.js";
import { getTheme } from "../ui/board-themes.js";
import { action, replay, session, subscribe } from "../game/session.js";

export default function profile(content) {
  let disposed = false;
  let opening = false;
  let replayTools;
  let closeReplay;
  const panel = document.createElement("section");
  panel.className = "panel page";
  content.append(panel);

  function history(returnId) {
    closeReplay?.();
    closeReplay = undefined;
    opening = false;
    const data = session.profile;
    const records = Object.values(data.history ?? {});
    const hasBotHistory = records.some(record => ["bot", "fourBot"].includes(record.mode));
    panel.innerHTML = `
      <h1>Profile</h1>
      <dl class="profile-stats">
        <div><dt>Chess Elo</dt><dd>${data.chessElo}</dd></div>
        <div><dt>4-Player Elo</dt><dd>${data.fourElo}</dd></div>
        <div><dt>League points</dt><dd>${data.leaguePoints}</dd></div>
        <div><dt>All-time pieces captured</dt><dd>${Number(data.allTimeCaptures ?? 0).toLocaleString()}</dd></div>
      </dl>
      <div class="replay-heading">
        <h2 tabindex="-1">Game history</h2>
        ${hasBotHistory ? '<button type="button" data-clear-bot-history>Delete bot match history</button>' : ""}
      </div>
      <p class="help history-notice" role="status"></p>
      <div class="game-history"></div>`;
    const list = panel.querySelector(".game-history");
    const clear = panel.querySelector("[data-clear-bot-history]");
    clear?.addEventListener("click", () => {
      if (!confirm("Permanently delete your saved standard and four-player bot matches?")) return;
      clear.disabled = true;
      action("clearBotHistory");
    });
    if (!records.length) list.innerHTML = '<p class="empty-state">No games recorded. Finished matches will appear here.</p>';
    for (const record of records) {
      const row = document.createElement("article");
      row.className = "inset history-entry";
      const summary = document.createElement("div");
      summary.className = "history-summary";
      const title = document.createElement("strong");
      title.textContent = record.place ? `Placed ${record.place}` : record.result;
      const detail = document.createElement("p");
      detail.textContent = [record.v === "four" ? "4-Player Chess" : "Chess", record.opp, record.reason].filter(Boolean).join(" · ");
      summary.append(title, detail);
      const controls = document.createElement("div");
      controls.className = "action-row";
      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "Delete";
      remove.dataset.deleteMatch = "";
      remove.disabled = !record.id;
      remove.addEventListener("click", () => {
        if (opening || !confirm("Delete this match from your history?")) return;
        remove.disabled = true;
        remove.dataset.deleting = "true";
        action("deleteHistoryMatch", { id: record.id });
      });
      const item = document.createElement("button");
      item.type = "button";
      item.textContent = "Review";
      item.addEventListener("click", async () => {
        if (opening) return;
        opening = true;
        item.disabled = true;
        item.setAttribute("aria-busy", "true");
        item.textContent = "Loading replay…";
        try {
          let positions;
          if (record.v === "four" && !record.fourStates) {
            positions = (await replay(record)).map(board => ({ board }));
            if (positions.length !== Object.values(record.moves).length + 1) throw new Error("Replay is incomplete.");
          }
          else {
            const worker = createPositionTools();
            replayTools = worker;
            try {
              positions = Object.values(await worker.run("review", {
                variant: record.v, moves: Object.values(record.moves),
                fourStates: record.fourStates && Object.values(record.fourStates)
              }));
            } finally {
              worker.close();
              if (replayTools === worker) replayTools = undefined;
            }
          }
          if (!positions.length || positions.some(position => !position?.board)) throw new Error("Replay is incomplete.");
          if (!disposed) showReplay(record, positions);
        } catch {
          opening = false;
          if (!disposed) {
            item.disabled = false;
            item.removeAttribute("aria-busy");
            item.textContent = "Review";
            panel.querySelector(".history-notice").textContent = "Replay unavailable. Try again.";
          }
        }
      });
      controls.append(item, remove);
      row.append(summary, controls);
      list.append(row);
      if (returnId && returnId === record.id) item.focus({ preventScroll: true });
    }
    if (returnId && !list.contains(document.activeElement)) panel.querySelector("h2").focus();
  }

  function showReplay(record, positions) {
    let ply = 0;
    panel.innerHTML = `
      <div class="replay-heading">
        <h1 tabindex="-1">Match replay</h1>
        <button type="button" class="return-history">Back to history</button>
      </div>
      <p class="replay-turn board-turn-label" role="status" hidden></p>
      <div class="board-and-eval replay-board">
        <div class="bot-eval" hidden aria-label="Engine estimate, in pawns">
          <div class="eval-meter" aria-hidden="true"><div class="eval-white"></div></div>
          <output></output>
        </div>
        <div class="board-slot"></div>
      </div>
      <div class="action-row replay-actions">
        <button type="button" data-step="-1" aria-label="Previous move">←</button>
        <output aria-live="polite"></output>
        <button type="button" data-step="1" aria-label="Next move">→</button>
        <button type="button" data-best-move>Show best move</button>
      </div>
      <p class="help best-move-status replay-best-move" role="status"></p>
      <ol class="inset move-list replay-moves" aria-label="Move history"></ol>`;
    panel.querySelector(".return-history").addEventListener("click", () => history(record.id));
    const evaluation = createEvaluationBar(panel.querySelector(".bot-eval"));
    const bestMove = createBestMoveControl(panel.querySelector("[data-best-move]"),
      panel.querySelector(".best-move-status"), draw);
    closeReplay = () => { evaluation.close(); bestMove.close(); };
    const output = panel.querySelector(".replay-actions output");
    const holder = panel.querySelector(".board-slot");
    const match = { variant: record.v, side: record.side };
    const buttons = [...panel.querySelectorAll("[data-step]")];
    const turn = panel.querySelector(".replay-turn");
    const moves = Object.values(record.moves).map((move, index) => {
      const before = positions[index].board;
      const piece = before[move.f]?.[1];
      const changesFile = move.f[0] !== move.t[0];
      const castled = piece === "K" && (Math.abs(move.f.charCodeAt(0) - move.t.charCodeAt(0)) === 2 ||
        Math.abs(Number(move.f.slice(1)) - Number(move.t.slice(1))) === 2);
      return { ...move, captured: Boolean(before[move.t]) || (piece === "P" && changesFile && record.v !== "four"),
        special: castled ? "castle" : undefined };
    });
    const list = panel.querySelector(".move-list");
    const names = { w: "White", b: "Black", R: "Red", B: "Blue", Y: "Yellow", G: "Green" };
    function draw() {
      const side = positions[ply].turn;
      turn.hidden = !names[side];
      turn.dataset.side = side ?? "";
      turn.textContent = names[side] ? `${names[side]} to move` : "";
      evaluation.update(match, { positions, ply });
      bestMove.update(positions[ply].turn ? positions[ply] : undefined, record.v);
      holder.replaceChildren(board(getTheme(), record.v === "four", false, {
        state: { ...positions[ply], lastMove: positions[ply].lastMove ?? (ply ? { from: moves[ply - 1].f, to: moves[ply - 1].t } : undefined) }, side: record.side, bestMove: bestMove.move
      }));
      output.textContent = `Move ${ply} of ${positions.length - 1}`;
      drawMoveList(list, moves, ply);
      buttons[0].disabled = ply === 0;
      buttons[1].disabled = ply === positions.length - 1;
    }
    for (const button of buttons) button.addEventListener("click", () => {
      ply += Number(button.dataset.step);
      draw();
    });
    draw();
    panel.querySelector("h1").focus();
  }

  history();
  const stop = subscribe(kind => {
    if (kind === "profile" && !opening) history();
    if (kind === "error" && !opening) {
      const clear = panel.querySelector("[data-clear-bot-history]");
      const pending = [...panel.querySelectorAll("[data-delete-match]:disabled")].filter(button => button.dataset.deleting);
      if (clear?.disabled || pending.length) {
        if (clear) clear.disabled = false;
        for (const button of pending) {
          button.disabled = false;
          delete button.dataset.deleting;
        }
        panel.querySelector(".history-notice").textContent = session.notice;
      }
    }
  });
  return () => { disposed = true; replayTools?.close(); closeReplay?.(); stop(); };
}
