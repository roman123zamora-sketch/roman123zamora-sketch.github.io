import { createPositionTools } from "../game/position-tools.js";

const colors = { w: "White", b: "Black", R: "Red", B: "Blue", Y: "Yellow", G: "Green" };
const pieces = { Q: "queen", R: "rook", B: "bishop", N: "knight" };

export function createBestMoveControl(button, status, redraw) {
  let tools;
  let state;
  let variant;
  let request = 0;
  let move;

  function update(position, mode) {
    if (state === position && variant === mode) return;
    request++;
    if (button.hasAttribute("aria-busy")) {
      tools?.close();
      tools = undefined;
    }
    state = position;
    variant = mode;
    move = undefined;
    button.hidden = !position;
    button.disabled = false;
    button.removeAttribute("aria-busy");
    status.textContent = "";
  }

  async function show() {
    if (!state || button.disabled) return;
    const current = ++request;
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    status.textContent = "Finding the best move…";
    try {
      const response = await (tools ??= createPositionTools()).run("bestMove", { variant, state });
      if (current !== request) return;
      move = response.move;
      const side = colors[state.turn];
      status.textContent = move
        ? `${side}’s best move: ${move.from} → ${move.to}${move.promotion ? `, promote to ${pieces[move.promotion]}` : ""}`
        : `No move is available for ${side} in this position.`;
      redraw();
    } catch {
      if (current === request) status.textContent = "Best move unavailable. Try again.";
    } finally {
      if (current === request) {
        button.disabled = false;
        button.removeAttribute("aria-busy");
      }
    }
  }

  button.addEventListener("click", show);
  return {
    update,
    get move() { return move; },
    close() {
      update(undefined, undefined);
      tools?.close();
      tools = undefined;
    }
  };
}
