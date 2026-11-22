const key = "exalted-chess-profile-v1";
const settings = "exalted-chess-audio";
const listeners = new Set();
const replays = new Map();
let replayId = 0;
let sound = localStorage.getItem(settings) === "on";
let audio;
let worker;
let ready = false;
const pending = [];
let server;
let token;
let eventCursor = 0;
let commands = Promise.resolve();

export const session = {
  profile: { chessElo: 1000, fourElo: 1000, league: "Soil", leaguePoints: 0, pieceStorage: 0, ownedBoards: ["classic"], equippedBoard: "classic" },
  match: null,
  result: null,
  legal: null,
  notice: "",
  queue: null,
  offer: null,
  players: [],
  network: false
};

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify(kind, data) {
  for (const listener of listeners) listener(kind, data);
}

function receive({ kind, data, requestId }) {
  if (kind === "replay") {
    replays.get(requestId)?.resolve(Object.values(data));
    replays.delete(requestId);
    return;
  }
  if (kind === "error" && requestId) {
    replays.get(requestId)?.reject(new Error(data));
    replays.delete(requestId);
    return;
  }
  if (kind === "save") {
    localStorage.setItem(key, JSON.stringify(data));
    return;
  }
  if (kind === "profile") session.profile = data;
  if (kind === "legal") session.legal = data;
  if (kind === "state") {
    const prior = session.match;
    if (prior?.matchId !== data.matchId) session.result = null;
    const moves = Object.values(data.state.history).length;
    if (moves > Object.values(prior?.state.history ?? {}).length) {
      playSound(data.state.status === "check" ? "check" : data.state.history[moves - 1]?.captured ? "capture" : "move");
    }
    session.match = data;
    session.queue = null;
    session.offer = null;
  }
  if (kind === "result") {
    session.result = data;
    playSound(data.result === "win" ? "win" : "end");
  }
  if (kind === "queued" || kind === "challengeWait") session.queue = data;
  if (kind === "queueCancelled" || kind === "challengeDeclined") session.queue = null;
  if (kind === "challengeOffer" || kind === "rematchOffer") session.offer = { ...data, kind };
  if (kind === "boardPurchase") session.notice = data.ok ? "Board added to your collection." : data.reason;
  if (kind === "reject") session.notice = data.reason;
  if (kind === "error") session.notice = typeof data === "string" ? data : "The game service could not complete that action.";
  if (kind === "challengeDeclined" || kind === "rematchDeclined") session.notice = "The invitation is no longer available.";
  if (kind === "fart") playSound("end");
  notify(kind, data);
}

async function request(path, options = {}) {
  const response = await fetch(server + path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) }
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

async function poll() {
  try {
    const data = await request("/events?after=" + eventCursor);
    for (const event of data.events) {
      eventCursor = event.id;
      receive(event);
    }
    if (JSON.stringify(session.players) !== JSON.stringify(data.players)) {
      session.players = data.players;
      notify("players");
    }
  } catch {
    session.notice = "Connection to the match service was interrupted. Reconnecting…";
    notify("error");
  }
  setTimeout(poll, 550);
}

export async function connect() {
  server = document.querySelector('meta[name="exalted-server"]')?.content || "";
  if (server) {
    try {
      const previous = localStorage.getItem("exalted-server-token");
      const data = await request("/join", { method: "POST", body: JSON.stringify({ token: previous }) });
      token = data.token;
      localStorage.setItem("exalted-server-token", token);
      session.network = true;
      notify("network");
      poll();
      return;
    } catch (error) {
      session.notice = "Online service unavailable. Starting a local session.";
      notify("error", error);
      server = "";
    }
  }
  let profile;
  try { profile = JSON.parse(localStorage.getItem(key)); } catch { profile = null; }
  worker = new Worker(new URL("./local-worker.js", import.meta.url), { type: "module" });
  worker.onmessage = ({ data }) => {
    if (data.kind === "ready") {
      worker.postMessage({ op: "join", first: "You", second: profile });
      ready = true;
      for (const message of pending.splice(0)) worker.postMessage(message);
    } else receive(data);
  };
  worker.onerror = () => receive({ kind: "error", data: "The chess engine failed to start." });
}

export function action(first, second) {
  session.notice = "";
  if (first === "legal") session.legal = null;
  if (first === "leave") {
    session.match = null;
    session.result = null;
    session.legal = null;
    notify("leave");
  }
  if (first === "challengeRespond" || first === "rematchRespond") session.offer = null;
  if (session.network) {
    commands = commands.then(() => request("/action", { method: "POST", body: JSON.stringify({ kind: first, data: second }) }))
      .catch(error => receive({ kind: "error", data: error.message }));
  } else {
    const message = { op: "action", first, second };
    if (ready) worker.postMessage(message);
    else pending.push(message);
  }
}

export async function replay(game) {
  if (session.network) {
    const result = await request("/replay", { method: "POST", body: JSON.stringify({ variant: game.v, moves: Object.values(game.moves) }) });
    return Object.values(result);
  }
  return new Promise((resolve, reject) => {
    const requestId = ++replayId;
    replays.set(requestId, { resolve, reject });
    worker.postMessage({ op: "replay", first: game.v, second: Object.values(game.moves), requestId });
  });
}

const notes = { move: [290], capture: [220, 150], check: [390, 320], win: [330, 440, 550], end: [280, 170] };
function playSound(name) {
  if (!sound || !audio || audio.state !== "running") return;
  notes[name].forEach((frequency, index) => {
    const tone = audio.createOscillator();
    const volume = audio.createGain();
    const start = audio.currentTime + index * .1;
    tone.frequency.value = frequency;
    volume.gain.setValueAtTime(.08, start);
    volume.gain.exponentialRampToValueAtTime(.001, start + .13);
    tone.connect(volume).connect(audio.destination);
    tone.start(start);
    tone.stop(start + .14);
  });
}

export function soundEnabled() { return sound; }
export function toggleSound() {
  sound = !sound;
  localStorage.setItem(settings, sound ? "on" : "off");
  if (sound) unlockSound();
  return sound;
}
export function unlockSound() {
  if (!sound) return;
  audio ??= new AudioContext();
  audio.resume();
}
