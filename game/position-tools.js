export function createPositionTools() {
  const worker = new Worker(new URL("./position-worker.js", import.meta.url), { type: "module" });
  const pending = new Map();
  let id = 0;
  let failure;
  let ready = false;
  worker.onmessage = ({ data }) => {
    if (data.ready) {
      ready = true;
      for (const request of pending.values()) worker.postMessage(request.message);
      return;
    }
    const request = pending.get(data.id);
    if (!request) return;
    pending.delete(data.id);
    if (data.error) request.reject(new Error(data.error));
    else request.resolve(data.result);
  };
  worker.onerror = () => {
    failure = new Error("Position tools failed to load.");
    for (const request of pending.values()) request.reject(failure);
    pending.clear();
  };
  return {
    run(op, payload) {
      if (failure) return Promise.reject(failure);
      return new Promise((resolve, reject) => {
        const key = ++id;
        const message = { id: key, op, payload };
        pending.set(key, { resolve, reject, message });
        if (ready) worker.postMessage(message);
      });
    },
    close() {
      worker.terminate();
      failure = new Error("Position tools closed.");
      for (const request of pending.values()) request.reject(failure);
      pending.clear();
    }
  };
}
