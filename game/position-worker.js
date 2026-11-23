import { createRuntime } from "./luau-runtime.js";

const runtime = createRuntime(async path => {
  const response = await fetch(new URL(path, import.meta.url));
  if (!response.ok) throw new Error("Could not load " + path);
  return response.text();
}, { puzzleOnly: new URL(import.meta.url).searchParams.has("puzzle") });

self.onmessage = async ({ data: { op, payload, id } }) => {
  try {
    const dispatch = await runtime;
    self.postMessage({ id, result: await dispatch(op, 0, 0, payload) });
  } catch (error) {
    self.postMessage({ id, error: String(error) });
  }
};

runtime.then(() => self.postMessage({ ready: true })).catch(error => {
  self.postMessage({ startupError: String(error) });
});
