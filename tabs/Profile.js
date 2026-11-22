import { board, getTheme } from "../Board Themes.js";
import { replay, session, subscribe } from "../game/session.js";

export default function profile(content) {
  let disposed = false;
  let opening = false;
  const panel = document.createElement("section");
  panel.className = "panel page";
  content.append(panel);

  function history() {
    opening = false;
    const data = session.profile;
    const stars = Object.values(data.botStars ?? {}).reduce((sum, value) => sum + value, 0);
    panel.innerHTML = `
      <h1>Profile</h1>
      <dl class="profile-stats">
        <div><dt>Chess Elo</dt><dd>${data.chessElo}</dd></div>
        <div><dt>4-Player Elo</dt><dd>${data.fourElo}</dd></div>
        <div><dt>League points</dt><dd>${data.leaguePoints}</dd></div>
        <div><dt>Piece Storage</dt><dd>${data.pieceStorage}</dd></div>
        <div><dt>Bot Stars</dt><dd>${stars}</dd></div>
      </dl>
      <h2>Game history</h2>
      <div class="game-history"></div>`;
    const list = panel.querySelector(".game-history");
    const records = Object.values(data.history ?? {});
    if (!records.length) list.innerHTML = '<p class="inset">No games recorded.</p>';
    for (const record of records) {
      const item = document.createElement("button");
      item.type = "button";
      item.textContent = `${record.v === "four" ? "4-Player Chess" : "Chess"} · ${record.opp} · ${record.place ? "Placed " + record.place : record.result} · ${record.reason}`;
      item.addEventListener("click", async () => {
        opening = true;
        try {
          const positions = await replay(record);
          if (!disposed) showReplay(record, positions);
        } catch {
          if (!disposed) item.textContent = "Replay unavailable. Try again.";
        }
      });
      list.append(item);
    }
  }

  function showReplay(record, positions) {
    let ply = 0;
    panel.innerHTML = `
      <button type="button" class="return-history">Back to history</button>
      <h1>Match replay</h1>
      <div class="replay-board"></div>
      <div class="action-row replay-actions">
        <button type="button" data-step="-1">Previous</button>
        <output aria-live="polite"></output>
        <button type="button" data-step="1">Next</button>
      </div>`;
    panel.querySelector(".return-history").addEventListener("click", history);
    const output = panel.querySelector("output");
    const holder = panel.querySelector(".replay-board");
    const buttons = [...panel.querySelectorAll("[data-step]")];
    function draw() {
      holder.replaceChildren(board(getTheme(), record.v === "four", false, {
        state: { board: positions[ply] }, side: record.side
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
  }

  history();
  const stop = subscribe(kind => { if (kind === "profile" && !opening) history(); });
  return () => { disposed = true; stop(); };
}
