import { createChessPiece } from "../ui/chess-pieces.js";

export function bindTouchBoard(board, { begin, end: finish, drop }) {
  let gesture;
  let returning;
  const controller = new AbortController();
  const options = { signal: controller.signal };

  function clear() {
    returning?.animation.cancel();
    returning?.ghost.remove();
    if (returning) finish();
    returning = null;
    if (!gesture) return;
    const { id, ghost } = gesture;
    gesture = null;
    ghost?.remove();
    if (ghost) finish();
    if (board.hasPointerCapture(id)) board.releasePointerCapture(id);
  }

  board.addEventListener("pointerdown", event => {
    if (event.pointerType === "mouse" || !event.isPrimary || gesture) return;
    clear();
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
      if (!begin(gesture.from)) { clear(); return; }
    }
    gesture.ghost.style.translate = `calc(${event.clientX}px - 50%) calc(${event.clientY}px - 70%)`;
  }, options);

  function end(event) {
    if (gesture?.id !== event.pointerId) return;
    const { from, ghost, id, x, y } = gesture;
    const destination = ghost && event.type === "pointerup"
      ? document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-square]")
      : null;
    if (!ghost || event.type !== "pointerup") { clear(); return; }

    gesture = null;
    if (board.hasPointerCapture(id)) board.releasePointerCapture(id);
    const accepted = destination && board.contains(destination) && drop(from, destination.dataset.square);
    if (accepted || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      ghost.remove();
      finish();
      return;
    }
    const animation = ghost.animate([
      { translate: ghost.style.translate, opacity: .92 },
      { translate: `calc(${x}px - 50%) calc(${y}px - 70%)`, opacity: 0 }
    ], { duration: 110, easing: "ease-out" });
    returning = { ghost, animation };
    animation.onfinish = () => {
      if (returning?.ghost !== ghost) return;
      returning = null;
      ghost.remove();
      finish();
    };
  }

  for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) {
    board.addEventListener(type, end, options);
  }
  return {
    cancel: clear,
    destroy() { clear(); controller.abort(); }
  };
}
