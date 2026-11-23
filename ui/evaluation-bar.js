import { createPositionTools } from "../game/position-tools.js";

export function createEvaluationBar(element) {
  const meter = element.querySelector(".eval-meter");
  const white = element.querySelector(".eval-white");
  const caption = element.querySelector("output");
  let tools;
  let matchId;
  let revision;
  let generation = 0;
  let scores = new Map();

  function analyze(state) {
    const { board, turn, halfmove, fullmove, analysis } = state;
    return (tools ??= createPositionTools()).run("analysis", { board, turn, halfmove, fullmove, ...analysis });
  }

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
    update(match, review, onChange) {
      const state = review?.positions[review.ply] ?? match?.state;
      const eligible = Boolean(state?.analysis && match.variant === "chess" && (review || match.mode === "bot"));
      element.hidden = !eligible;
      if (!eligible) {
        matchId = undefined;
        revision = undefined;
        generation++;
        tools?.close();
        tools = undefined;
        scores.clear();
        return;
      }
      const key = review ? `review:${review.ply}` : match.revision;
      if (match.matchId === matchId && key === revision) return;
      if (match.matchId !== matchId) scores.clear();
      if (review || match.matchId !== matchId) display(null);
      matchId = match.matchId;
      revision = key;
      meter.classList.toggle("white-on-top", match.side === "b");
      const current = ++generation;
      async function getScore(frame, frameKey) {
        if (review && scores.has(frameKey)) return scores.get(frameKey);
        const score = await analyze(frame);
        if (review && generation === current) scores.set(frameKey, score);
        return score;
      }
      getScore(state, key).then(async score => {
        if (generation !== current) return;
        display(score);
        if (!onChange || !review?.ply) return;
        const previous = await getScore(review.positions[review.ply - 1], `review:${review.ply - 1}`);
        if (generation === current) onChange(score, previous);
      }).catch(() => {
        if (generation === current) caption.textContent = "Unavailable";
      });
    },
    close() {
      generation++;
      tools?.close();
    }
  };
}
