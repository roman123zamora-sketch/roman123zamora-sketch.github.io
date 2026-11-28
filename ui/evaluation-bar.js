import { createPositionTools } from "../game/position-tools.js";

function terminalScore(state, outcome) {
  if (state?.status === "checkmate") {
    return { kind: "mate", side: state.turn === "w" ? "b" : "w", terminal: true };
  }
  if (state?.status === "stalemate" || state?.status === "draw" || outcome === "draw") {
    return { kind: "draw", terminal: true };
  }
  if (outcome || state?.terminal) return { kind: "ended", terminal: true };
}

export function createEvaluationBar(element) {
  const meter = element.querySelector(".eval-meter");
  const white = element.querySelector(".eval-white");
  const caption = element.querySelector("output");
  caption.innerHTML = '<span class="eval-score" data-side="b"></span><span class="eval-score" data-side="w"></span>';
  const whiteScore = caption.querySelector('[data-side="w"]');
  const blackScore = caption.querySelector('[data-side="b"]');
  let tools;
  let generation = 0;
  let context;
  let frame;
  let terminal;
  let preview = false;
  let busy = false;
  let scores = new WeakMap();

  function cancel() {
    generation++;
    if (busy) {
      tools?.close();
      tools = undefined;
      busy = false;
    }
  }

  function analyze(state, refine = false) {
    const { board, turn, halfmove, fullmove, analysis } = state;
    return (tools ??= createPositionTools()).run(refine ? "analysisDeep" : "analysis",
      { board, turn, halfmove, fullmove, ...analysis });
  }

  function display(score, pendingLabel = "Analyzing position") {
    const mate = score?.kind === "mate";
    const share = mate ? (score.side === "w" ? 100 : 0) :
      50 + 48 * Math.tanh((score?.value ?? 0) / 410);
    if (score) white.style.blockSize = share + "%";
    element.setAttribute("aria-busy", String(!score && pendingLabel === "Analyzing position"));
    const format = value => Math.abs(value) < .5 ? "0.00" :
      (value > 0 ? "+" : "−") + (Math.abs(value) / 100).toFixed(2);
    for (const [side, name, label] of [["w", "White", whiteScore], ["b", "Black", blackScore]]) {
      if (!score) {
        label.textContent = pendingLabel === "Analyzing position" ? "…" : "—";
        label.title = pendingLabel;
      } else if (mate) {
        const wins = score.side === side;
        label.textContent = score.terminal ? (wins ? "Win" : "Lost") : (wins ? "" : "−") + `M${score.moves}`;
        label.title = score.terminal ? `Checkmate. ${wins ? name + " wins" : name + " loses"}.` :
          `${name} evaluation: ${label.textContent}`;
      } else if (score.kind !== "cp") {
        label.textContent = score.kind === "draw" ? "Draw" : "—";
        label.title = score.kind === "draw" ? "Game drawn" : "Game ended";
      } else {
        label.textContent = format(side === "w" ? score.value : -score.value);
        label.title = `${name} evaluation: ${label.textContent} pawns`;
      }
      label.setAttribute("aria-label", label.title);
    }
  }

  return {
    update(match, review, onChange, history = null, { outcome, projected = false } = {}) {
      const state = history ? history.state : review?.positions[review.ply] ?? match?.state;
      const eligible = Boolean(match?.variant === "chess" && (review || match.mode === "bot"));
      element.hidden = !eligible;
      if (!eligible) {
        cancel();
        tools?.close();
        tools = undefined;
        context = frame = undefined;
        scores = new WeakMap();
        return;
      }

      // Orientation is presentation state and can change without a new analysis.
      element.toggleAttribute("data-flipped", match.side === "b");
      meter.classList.toggle("white-on-top", match.side === "b");
      const nextContext = match.matchId ?? match;
      if (nextContext !== context) {
        scores = new WeakMap();
        white.style.blockSize = "50%";
      }
      const end = terminalScore(state, outcome);
      const endKey = end ? end.kind + (end.side ?? "") : undefined;
      if (context === nextContext && frame === state && terminal === endKey && preview === projected) return;
      context = nextContext;
      frame = state;
      terminal = endKey;
      preview = projected;
      cancel();
      const current = generation;
      if (projected) { display(null, "Waiting for confirmed move"); return; }
      if (end) { display(end); return; }
      if (!state?.analysis) { display(null, "Waiting for position"); return; }

      let score = scores.get(state);
      display(score);
      busy = true;
      async function run() {
        if (!score) {
          score = await analyze(state);
          if (generation !== current) return;
          if (score) { scores.set(state, score); display(score); }
        }
        if (!score?.refined && !score?.terminal) {
          const deeper = await analyze(state, true);
          if (generation !== current) return;
          if (deeper && (!score || deeper.depth > score.depth)) score = deeper;
          if (score) {
            score = { ...score, refined: true };
            scores.set(state, score);
            display(score);
          }
        }
        if (!score) display(null, "Evaluation unavailable");
        if (!score || !onChange || !review?.ply) return;
        const previousState = review.positions[review.ply - 1];
        const previous = scores.get(previousState) ?? await analyze(previousState, true);
        if (generation !== current || !previous) return;
        scores.set(previousState, { ...previous, refined: true });
        onChange(score, previous);
      }
      run().catch(() => {
        if (generation === current && !score) display(null, "Evaluation unavailable");
      }).finally(() => {
        if (generation === current) busy = false;
      });
    },
    close() {
      cancel();
      tools?.close();
      tools = undefined;
      context = frame = undefined;
    }
  };
}
