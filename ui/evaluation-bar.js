import { createPositionTools } from "../game/position-tools.js";

export function createEvaluationBar(element) {
  const meter = element.querySelector(".eval-meter");
  const white = element.querySelector(".eval-white");
  const caption = element.querySelector("output");
  caption.innerHTML = '<span class="eval-score" data-side="b"></span><span class="eval-score" data-side="w"></span>';
  const whiteScore = caption.querySelector('[data-side="w"]');
  const blackScore = caption.querySelector('[data-side="b"]');
  let tools;
  let matchId;
  let revision;
  let generation = 0;
  let scores = new WeakMap();

  function analyze(state) {
    const { board, turn, halfmove, fullmove, analysis } = state;
    return (tools ??= createPositionTools()).run("analysis", { board, turn, halfmove, fullmove, ...analysis });
  }

  function display(score) {
    const share = score?.kind === "mate" ? (score.side === "w" ? 100 : 0) :
      50 + 48 * Math.tanh((score?.value ?? 0) / 480);
    white.style.blockSize = share + "%";
    const format = value => value === 0 ? "0.00" : (value > 0 ? "+" : "−") + (Math.abs(value) / 100).toFixed(2);
    const mate = score?.kind === "mate";
    const winning = mate ? `M${score.moves}` : null;
    whiteScore.textContent = !score ? "…" : mate ? (score.side === "w" ? winning : "−" + winning) : format(score.value);
    blackScore.textContent = !score ? "…" : mate ? (score.side === "b" ? winning : "−" + winning) : format(-score.value);
    for (const [side, label] of [["White", whiteScore], ["Black", blackScore]]) {
      label.title = `${side} evaluation: ${label.textContent}`;
      label.setAttribute("aria-label", label.title);
    }
  }

  return {
    update(match, review, onChange, history = null) {
      const state = history ? history.state : review?.positions[review.ply] ?? match?.state;
      const eligible = Boolean(state?.analysis && match.variant === "chess" && (review || match.mode === "bot"));
      element.hidden = !eligible;
      if (!eligible) {
        matchId = undefined;
        revision = undefined;
        generation++;
        tools?.close();
        tools = undefined;
        scores = new WeakMap();
        return;
      }
      const key = history ? state : review ? `review:${review.ply}` : match.revision;
      if (match.matchId === matchId && key === revision) return;
      if (match.matchId !== matchId) scores = new WeakMap();
      if (history || review || typeof revision === "object" || match.matchId !== matchId) display(null);
      matchId = match.matchId;
      revision = key;
      element.toggleAttribute("data-flipped", match.side === "b");
      meter.classList.toggle("white-on-top", match.side === "b");
      const current = ++generation;
      async function getScore(frame) {
        if (scores.has(frame.board)) return scores.get(frame.board);
        const score = await analyze(frame);
        if (generation === current) scores.set(frame.board, score);
        return score;
      }
      getScore(state).then(async score => {
        if (generation !== current) return;
        display(score);
        if (!onChange || !review?.ply) return;
        const previous = await getScore(review.positions[review.ply - 1]);
        if (generation === current) onChange(score, previous);
      }).catch(() => {
        if (generation !== current) return;
        display(null);
        for (const label of [whiteScore, blackScore]) {
          label.textContent = "—";
          label.title = "Evaluation unavailable";
          label.setAttribute("aria-label", label.title);
        }
      });
    },
    close() {
      generation++;
      tools?.close();
    }
  };
}
