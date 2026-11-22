import { createChessPiece } from "../Chess Pieces.js";

export function bindTouchBoard(board, { begin, drop }) {
  let gesture;
  const controller = new AbortController();
  const options = { signal: controller.signal };

  function clear() {
    if (!gesture) return;
    const { id, ghost } = gesture;
    gesture = null;
    ghost?.remove();
    if (board.hasPointerCapture(id)) board.releasePointerCapture(id);
  }

  board.addEventListener("pointerdown", event => {
    if (event.pointerType === "mouse" || !event.isPrimary || gesture) return;
    const square = event.target.closest(".touch-source");
    if (!square) return;
    const piece = square.querySelector(".chess-piece");
    if (!piece) return;
    const [type, color] = piece.dataset.art.split("-");
    gesture = {
      id: event.pointerId, from: square.dataset.square, type, color,
      x: event.clientX, y: event.clientY, size: piece.getBoundingClientRect().width
    };
  }, options);

  board.addEventListener("pointermove", event => {
    if (gesture?.id !== event.pointerId) return;
    if (!gesture.ghost) {
      if (Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) < 7) return;
      board.setPointerCapture(event.pointerId);
      const ghost = createChessPiece(gesture.type, gesture.color);
      ghost.classList.add("touch-piece");
      ghost.setAttribute("aria-hidden", "true");
      ghost.style.inlineSize = gesture.size + "px";
      document.body.append(ghost);
      gesture.ghost = ghost;
      begin(gesture.from);
    }
    gesture.ghost.style.translate = `calc(${event.clientX}px - 50%) calc(${event.clientY}px - 70%)`;
  }, options);

  function end(event) {
    if (gesture?.id !== event.pointerId) return;
    const from = gesture.from;
    const destination = gesture.ghost && event.type === "pointerup"
      ? document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-square]")
      : null;
    clear();
    if (destination && board.contains(destination)) drop(from, destination.dataset.square);
  }

  for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) {
    board.addEventListener(type, end, options);
  }
  return () => {
    clear();
    controller.abort();
  };
}
