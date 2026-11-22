import { createRuntime } from "./runtime.js";

const runtime = createRuntime(async path => {
  const response = await fetch(new URL(path, import.meta.url));
  if (!response.ok) throw new Error("Could not load " + path);
  return response.text();
});
const now = () => Date.now() / 1000;

async function run(op, first, second, requestId) {
  try {
    const dispatch = await runtime;
    const output = await dispatch(op, now(), 1, first, second);
    if (op === "replay") postMessage({ kind: "replay", data: output, requestId });
    else for (const event of Object.values(output)) postMessage(event);
  } catch (error) {
    if (op !== "tick") postMessage({ kind: "error", data: String(error), requestId });
  }
}

onmessage = ({ data }) => run(data.op, data.first, data.second, data.requestId);
setInterval(() => run("tick"), 125);
postMessage({ kind: "ready" });
