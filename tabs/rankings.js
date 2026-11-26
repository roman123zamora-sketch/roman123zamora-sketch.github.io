import { accountRequest } from "../game/session.js";

const categories = ["bullet", "blitz", "rapid"];
const title = category => category[0].toUpperCase() + category.slice(1);
const views = Object.fromEntries(categories.map(category => [category, { page: 1, query: "" }]));
let category = "blitz";

function avatar(username, id) {
  const badge = document.createElement("span");
  badge.className = "player-avatar";
  badge.style.setProperty("--avatar-hue", Number(id) * 47 % 360);
  badge.textContent = username.slice(0, 2).toUpperCase();
  badge.setAttribute("aria-hidden", "true");
  return badge;
}

function addStat(list, name, value) {
  const label = document.createElement("dt");
  const data = document.createElement("dd");
  label.textContent = name;
  data.textContent = value;
  list.append(label, data);
}

export default function rankings(content) {
  const panel = document.createElement("section");
  panel.className = "panel page rankings";
  content.append(panel);
  let generation = 0;
  const player = /^#rankings\/(\d+)$/.exec(location.hash)?.[1];
  if (player) {
    panel.innerHTML = '<a class="rank-back" href="#rankings">← Back to Rankings</a><h1>Player profile</h1><p role="status">Loading profile…</p>';
    const current = ++generation;
    accountRequest("/players/" + player).then(profile => {
      if (current !== generation) return;
      const heading = panel.querySelector("h1");
      heading.replaceChildren(avatar(profile.username, profile.id), document.createTextNode(profile.username));
      heading.classList.add("account-heading");
      panel.querySelector('[role="status"]').remove();
      const stats = document.createElement("dl");
      stats.className = "profile-stats public-stats";
      for (const type of categories) addStat(stats, title(type) + " Elo", profile.ratings[type]);
      addStat(stats, "Four-player Elo", profile.fourElo);
      addStat(stats, "Total pieces captured", profile.allTimeCaptures);
      panel.append(stats);
      const history = document.createElement("h2");
      history.textContent = "Match history";
      panel.append(history);
      if (!profile.history.length) {
        const empty = document.createElement("p");
        empty.textContent = "No recorded matches yet.";
        panel.append(empty);
      } else {
        const list = document.createElement("ul");
        list.className = "public-match-list";
        for (const game of profile.history) {
          const row = document.createElement("li");
          row.textContent = [game.v === "four" ? "Four-player" : game.category ? title(game.category) : "Standard",
            game.result === "placed" ? "Placed " + game.place : title(game.result ?? "finished"),
            game.opp, game.ts && new Date(game.ts * 1000).toLocaleDateString()].filter(Boolean).join(" · ");
          list.append(row);
        }
        panel.append(list);
      }
    }).catch(error => { if (current === generation) panel.querySelector('[role="status"]').textContent = error.message; });
    return () => { generation++; };
  }

  panel.innerHTML = `<h1>Rankings</h1>
    <div class="ranking-categories" aria-label="Time control">${categories.map(type =>
      `<button type="button" data-category="${type}">${title(type)}</button>`).join("")}</div>
    <form class="rank-search" role="search"><label>Search by username <input name="q" maxlength="24" type="search"></label>
      <button type="submit">Search</button><button type="button" data-clear>Clear</button></form>
    <p class="rank-status" role="status"></p>
    <div class="ranking-table" role="region" aria-label="Leaderboard" tabindex="0">
      <table><thead><tr>${["Place #","Player","Elo","Wins","Draws","Losses"].map(label =>
        `<th scope="col">${label}</th>`).join("")}</tr></thead><tbody></tbody></table>
    </div>
    <div class="rank-pages" aria-label="Rankings pages">
      <button data-jump="-10" aria-label="Back ten pages">«</button>
      <button data-jump="-1" aria-label="Previous page">←</button>
      <output aria-live="polite"></output>
      <button data-jump="1" aria-label="Next page">→</button>
      <button data-jump="10" aria-label="Forward ten pages">»</button>
    </div>`;
  const form = panel.querySelector("form");
  const table = panel.querySelector("tbody");
  const status = panel.querySelector(".rank-status");
  const buttons = [...panel.querySelectorAll("[data-jump]")];

  async function load() {
    const id = ++generation;
    const view = views[category];
    form.elements.q.value = view.query;
    panel.querySelector("[data-clear]").disabled = !view.query;
    for (const button of panel.querySelectorAll("[data-category]")) button.setAttribute("aria-pressed", String(button.dataset.category === category));
    buttons.forEach(button => { button.disabled = true; });
    status.textContent = "Loading rankings…";
    table.replaceChildren();
    try {
      const query = new URLSearchParams({category, page: view.page, q:view.query});
      const result = await accountRequest("/rankings?" + query);
      if (id !== generation) return;
      view.page = result.page;
      view.pages = result.pages;
      panel.querySelector("output").textContent = `Page ${result.page} of ${result.pages}`;
      for (const button of buttons) button.disabled = Number(button.dataset.jump) < 0 ? view.page === 1 : view.page === view.pages;
      for (const player of result.rows) {
        const row = table.insertRow();
        row.insertCell().textContent = player.place;
        const link = document.createElement("a");
        link.href = "#rankings/" + player.id;
        link.append(avatar(player.username, player.id), document.createTextNode(player.username));
        row.insertCell().append(link);
        row.insertCell().textContent = player.rating;
        const games = player.wins + player.draws + player.losses;
        for (const count of [player.wins, player.draws, player.losses]) {
          const cell = row.insertCell();
          const number = document.createElement("span");
          number.className = "rank-count";
          number.textContent = count;
          const percent = document.createElement("span");
          percent.className = "rank-percent";
          percent.textContent = (games ? Math.round(100 * count / games) : 0) + "%";
          cell.append(number, percent);
        }
      }
      status.textContent = result.rows.length ? "" : view.query ? "No ranked players match this username. Clear search to browse." : "No ranked players in this category yet.";
    } catch (error) {
      if (id === generation) status.textContent = error.message;
    }
  }

  panel.addEventListener("click", event => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.hasAttribute("data-clear")) {
      views[category].query = "";
      views[category].page = 1;
    } else if (button.dataset.category) category = button.dataset.category;
    else if (button.dataset.jump) {
      const view = views[category];
      view.page = Math.min(view.pages, Math.max(1, view.page + Number(button.dataset.jump)));
    } else return;
    load();
  });
  form.onsubmit = event => {
    event.preventDefault();
    views[category].page = 1;
    views[category].query = form.elements.q.value.trim();
    load();
  };
  load();
  return () => { generation++; };
}
