import { createPositionTools } from "../game/position-tools.js";
import { getTheme } from "../ui/board-themes.js";
import { board } from "../ui/chessboard.js";
import { subscribe } from "../game/session.js";

const examples = [
  ["Pawn", "A pawn moves one square forward. From its starting square it can go two squares if both are clear. To capture, it moves one square diagonally forward. At the far end of the board it promotes to a queen, rook, bishop, or knight.",
    { a1: "wK", h7: "bK", d2: "wP", e3: "bP" }, "d2"],
  ["Rook", "A rook moves any number of clear squares along a row or column.",
    { a1: "wK", h7: "bK", d4: "wR" }, "d4"],
  ["Bishop", "A bishop moves any number of clear squares diagonally.",
    { a1: "wK", h7: "bK", d4: "wB" }, "d4"],
  ["Queen", "A queen moves any number of clear squares along a row, column, or diagonal.",
    { a1: "wK", h7: "bK", d4: "wQ" }, "d4"],
  ["Knight", "A knight moves in an L: two squares in one direction, then one square sideways. It is the only piece that can jump over other pieces.",
    { a1: "wK", h7: "bK", d4: "wN", d5: "wP", e4: "wP" }, "d4"],
  ["King", "A king moves one square in any direction, as long as the destination is safe. Here the black rook attacks the e-file, so the king cannot step onto it.",
    { d4: "wK", h7: "bK", e8: "bR" }, "d4"]
];

export default function learn(content) {
  content.innerHTML = `
    <article class="page panel learn">
      <h1>How the Chess Pieces Move</h1>
      <p>Pieces stay on the board and can capture only opposing pieces. A piece cannot move through another piece unless it is a knight.</p>
      <p>Each example shows White to move. The outline marks the piece, dots mark moves, and a ring marks a capture.</p>
      <p class="lesson-status" role="status">Loading example moves…</p>
      <div class="lesson-grid"></div>
    </article>`;
  const grid = content.querySelector(".lesson-grid");
  const status = content.querySelector(".lesson-status");
  const tools = createPositionTools();
  let disposed = false;
  let targets;
  const slots = examples.map(([name, explanation]) => {
    const section = document.createElement("section");
    section.className = "lesson-piece inset";
    const title = document.createElement("h2");
    title.textContent = name;
    const text = document.createElement("p");
    text.textContent = explanation;
    const slot = document.createElement("div");
    section.append(title, text, slot);
    grid.append(section);
    return slot;
  });
  function renderBoards() {
    examples.forEach(([, , pieces, from], index) => {
      slots[index].replaceChildren(board(getTheme(), false, false, {
        state: { board: pieces },
        selected: from,
        targets: targets ? Object.values(targets[index]) : []
      }));
    });
  }
  renderBoards();
  tools.run("lesson", examples.map(([, , pieces, from]) => ({ board: pieces, from })))
    .then(result => {
      if (disposed) return;
      targets = Object.values(result);
      renderBoards();
      status.textContent = "";
    })
    .catch(() => {
      if (!disposed) status.textContent = "Example moves could not load. Reopen Learn to try again.";
    })
    .finally(() => tools.close());
  const unsubscribe = subscribe(kind => {
    if (kind === "profile" || kind === "catalog") renderBoards();
  });
  return () => {
    disposed = true;
    unsubscribe();
    tools.close();
  };
}
