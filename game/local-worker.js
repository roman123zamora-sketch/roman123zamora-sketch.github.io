import { createRuntime } from "./luau-runtime.js";

const runtime = createRuntime(async path => {
  const response = await fetch(new URL(path, import.meta.url));
  if (!response.ok) throw new Error("Could not load " + path);
  return response.text();
}, { cooperativeSearch: true });
const now = () => Date.now() / 1000;
let lastTickError;
let botThinking = false;
let tickTimer;

function emit(event) {
  if (event.kind === "state") {
    const { mode, side, state } = event.data;
    botThinking = /bot/i.test(mode) && state.turn !== side;
  } else if (event.kind === "result") {
    botThinking = false;
  }
  postMessage(event);
}

async function run(op, first, second, requestId) {
  try {
    const dispatch = await runtime;
    const output = await dispatch(op, now(), 1, first, second);
    if (op === "tick") lastTickError = undefined;
    if (op === "action" && first === "leave") botThinking = false;
    if (op === "join") postMessage({ kind: "catalog", data: await dispatch("catalog") });
    if (op === "replay") postMessage({ kind: "replay", data: output, requestId });
    else for (const event of Object.values(output)) emit(event);
  } catch (error) {
    const message = String(error);
    if (op !== "tick" || lastTickError !== message) {
      emit({ kind: "error", data: message, requestId });
    }
    if (op === "tick") lastTickError = message;
  }
}

function scheduleTick() {
  if (tickTimer !== undefined) return;
  tickTimer = setTimeout(async () => {
    // Keep a single timer and an in-flight tick, even in throttled tabs.
    await run("tick");
    tickTimer = undefined;
    scheduleTick();
  }, botThinking ? 16 : 125);
}

onmessage = ({ data }) => run(data.op, data.first, data.second, data.requestId);
scheduleTick();
postMessage({ kind: "ready" });
