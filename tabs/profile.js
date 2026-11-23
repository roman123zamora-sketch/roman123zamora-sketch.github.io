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

  function history() {
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
        <div><dt>Piece Storage</dt><dd>${data.pieceStorage}</dd></div>
        <div><dt>All-time pieces captured</dt><dd>${Number(data.allTimeCaptures ?? 0).toLocaleString()}</dd></div>
      </dl>
      <div class="replay-heading">
        <h2>Game history</h2>
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
    if (!records.length) list.innerHTML = '<p class="inset">No games recorded.</p>';
    for (const record of records) {
      const item = document.createElement("button");
      item.type = "button";
      item.textContent = `${record.v === "four" ? "4-Player Chess" : "Chess"} · ${record.opp} · ${record.place ? "Placed " + record.place : record.result} · ${record.reason}`;
      item.addEventListener("click", async () => {
        if (opening) return;
        opening = true;
        item.disabled = true;
        item.setAttribute("aria-busy", "true");
        item.textContent = "Loading replay…";
        try {
          let positions;
          if (record.v === "four") positions = (await replay(record)).map(board => ({ board }));
          else {
            const worker = createPositionTools();
            replayTools = worker;
            try {
              positions = Object.values(await worker.run("review", {
                variant: "chess", moves: Object.values(record.moves)
              }));
            } finally {
              worker.close();
              if (replayTools === worker) replayTools = undefined;
            }
          }
          if (!disposed) showReplay(record, positions);
        } catch {
          opening = false;
          if (!disposed) {
            item.disabled = false;
            item.removeAttribute("aria-busy");
            item.textContent = "Replay unavailable. Try again.";
          }
        }
      });
      list.append(item);
    }
  }

  function showReplay(record, positions) {
    let ply = 0;
    panel.innerHTML = `
      <div class="replay-heading">
        <h1 tabindex="-1">Match replay</h1>
        <button type="button" class="return-history">Back to history</button>
      </div>
      <div class="board-and-eval replay-board">
        <div class="bot-eval" hidden aria-label="Engine estimate, in pawns">
          <div class="eval-meter" aria-hidden="true"><div class="eval-white"></div></div>
          <output></output>
        </div>
        <div class="board-slot"></div>
      </div>
      <div class="action-row replay-actions">
        <button type="button" data-step="-1">Previous</button>
        <output aria-live="polite"></output>
        <button type="button" data-step="1">Next</button>
        <button type="button" data-best-move>Show best move</button>
      </div>
      <p class="help best-move-status replay-best-move" role="status"></p>`;
    panel.querySelector(".return-history").addEventListener("click", history);
    const evaluation = createEvaluationBar(panel.querySelector(".bot-eval"));
    const bestMove = createBestMoveControl(panel.querySelector("[data-best-move]"),
      panel.querySelector(".best-move-status"), draw);
    closeReplay = () => { evaluation.close(); bestMove.close(); };
    const output = panel.querySelector(".replay-actions output");
    const holder = panel.querySelector(".board-slot");
    const match = { variant: record.v, side: record.side };
    const buttons = [...panel.querySelectorAll("[data-step]")];
    function draw() {
      evaluation.update(match, { positions, ply });
      bestMove.update(record.v === "chess" ? positions[ply] : undefined, record.v);
      holder.replaceChildren(board(getTheme(), record.v === "four", false, {
        state: positions[ply], side: record.side, bestMove: bestMove.move
      }));
      output.textContent = `Move ${ply} of ${positions.length - 1}`;
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
      if (clear?.disabled) {
        clear.disabled = false;
        panel.querySelector(".history-notice").textContent = session.notice;
      }
    }
  });
  return () => { disposed = true; replayTools?.close(); closeReplay?.(); stop(); };
}
