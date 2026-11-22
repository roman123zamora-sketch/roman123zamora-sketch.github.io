import { createPositionTools } from "../game/position-tools.js";

export function createEvaluationBar(element) {
  const meter = element.querySelector(".eval-meter");
  const white = element.querySelector(".eval-white");
  const caption = element.querySelector("output");
  let tools;
  let matchId;
  let revision;
  let generation = 0;

  function display(score) {
    const share = score?.kind === "mate" ? (score.side === "w" ? 100 : 0) :
      50 + 48 * Math.tanh((score?.value ?? 0) / 480);
    white.style.blockSize = share + "%";
    if (!score) caption.textContent = "…";
    else if (score.kind === "mate") {
      const side = score.side === "w" ? "White" : "Black";
      caption.textContent = score.moves ? `${side} · Mate in ${score.moves}` : `${side} · Checkmate`;
    } else {
      const rounded = Number((score.value / 100).toFixed(1));
      caption.textContent = rounded === 0 ? "Equal" : `${rounded > 0 ? "White" : "Black"} +${Math.abs(rounded).toFixed(1)}`;
    }
  }

  return {
    update(match) {
      const eligible = match?.mode === "bot" && match.variant === "chess" && match.state.analysis;
      element.hidden = !eligible;
      if (!eligible) {
        matchId = undefined;
        revision = undefined;
        generation++;
        tools?.close();
        tools = undefined;
        return;
      }
      if (match.matchId === matchId && match.revision === revision) return;
      if (match.matchId !== matchId) display(null);
      matchId = match.matchId;
      revision = match.revision;
      meter.classList.toggle("white-on-top", match.side === "b");
      const current = ++generation;
      const { board, turn, halfmove, fullmove, analysis } = match.state;
      (tools ??= createPositionTools()).run("analysis", { board, turn, halfmove, fullmove, ...analysis })
        .then(score => { if (generation === current) display(score); })
        .catch(() => {
          if (generation === current) {
            display(null);
            caption.textContent = "Unavailable";
          }
        });
    },
    close() {
      generation++;
      tools?.close();
    }
  };
}
