import { board, getTheme } from "./Board Themes.js";

const timeGroups = [
  ["Bullet", ["1 | 0", "1 | 1", "2 | 1"]],
  ["Blitz", ["3 | 0", "3 | 2", "5 | 0"]],
  ["Rapid", ["10 | 0", "10 | 5", "15 | 10"]]
];

export function renderMatch(content, { title, players, fourPlayer }) {
  content.innerHTML = `
    <div class="match">
      <aside class="panel setup" aria-labelledby="mode-title">
        <h1 id="mode-title">${title}</h1>
        <h2>Time control</h2>
        <div class="time-controls" aria-label="Preview time control">
          ${timeGroups.map(([name, options]) => `
            <div class="time-row"><span>${name}</span>
              ${options.map(time => `<button type="button" aria-pressed="${time === "3 | 0"}" data-time="${time}">${time}</button>`).join("")}
            </div>`).join("")}
        </div>
        <div class="divider"></div>
        <h2>Your ratings</h2>
        <dl class="ratings"><div><dt>Chess Elo</dt><dd>Unrated</dd></div>
          <div><dt>4-Player Elo</dt><dd>Unrated</dd></div>
          <div><dt>Stored pieces</dt><dd>0</dd></div></dl>
      </aside>
      <section class="board-area" aria-label="Starting position"></section>
      <aside class="panel match-info" aria-labelledby="match-title">
        <h2 id="match-title">Match</h2>
        <ul class="players">${players.map(player => `
          <li><span><i class="side-dot ${player.toLowerCase()}"></i>${player}</span><span class="clock">3:00</span></li>`).join("")}</ul>
        <h2>Move history</h2>
        <p class="inset">No moves yet.</p>
        <p class="help">Starting position preview. Time controls update the displayed clocks.</p>
      </aside>
    </div>`;
  content.querySelector(".board-area").append(board(getTheme(), fourPlayer));

  const buttons = content.querySelectorAll("[data-time]");
  const clocks = content.querySelectorAll(".clock");
  for (const button of buttons) {
    button.addEventListener("click", () => {
      for (const option of buttons) option.setAttribute("aria-pressed", String(option === button));
      const [minutes] = button.dataset.time.split(" | ");
      for (const clock of clocks) clock.textContent = minutes + ":00";
    });
  }
}
