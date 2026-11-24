const key = "exalted-chess-profile-v1";
const settings = "exalted-chess-audio";
const listeners = new Set();
const replays = new Map();
let replayId = 0;
let sound = readSetting(settings) !== "off";
let audio;
let worker;
let ready = false;
const pending = [];
let server;
let token;
let eventCursor = 0;
let clockOffset = 0;
let reconnecting = false;
let commands = Promise.resolve();

export function readSetting(name) {
  try { return localStorage.getItem(name); }
  catch { return null; }
}

export function writeSetting(name, value) {
  try { localStorage.setItem(name, value); }
  catch {
    // Storage restrictions should not interrupt gameplay.
  }
}

export const session = {
  catalog: null,
  profile: { chessElo: 1000, fourElo: 1000, league: "Soil", leaguePoints: 0, allTimeCaptures: 0, equippedBoard: "classic" },
  match: null,
  result: null,
  legal: null,
  movePending: false,
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
  for (const listener of listeners) {
    try { listener(kind, data); }
    catch (error) { console.error("Exalted Chess view failed to update.", error); }
  }
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
    writeSetting(key, JSON.stringify(data));
    return;
  }
  if (kind === "left") {
    clearMatch();
    return;
  }
  if (kind === "catalog") session.catalog = data;
  if (kind === "profile") session.profile = data;
  if (kind === "legal") {
    if (data.matchId && (data.matchId !== session.match?.matchId || data.revision !== session.match?.revision)) return;
    session.legal = data;
  }
  if (kind === "state") {
    const prior = session.match;
    if (prior?.matchId !== data.matchId) session.result = null;
    if (prior?.matchId !== data.matchId || prior?.revision !== data.revision || data.revision == null) {
      session.legal = null;
      session.movePending = false;
    }
    const moves = Object.values(data.state.history);
    if (prior?.matchId === data.matchId && moves.length > Object.values(prior.state.history).length) {
      playSound(data.state.status === "check" ? "check" : moves.at(-1)?.captured ? "capture" : "move");
    }
    session.match = data;
    session.notice = "";
    session.queue = null;
    session.offer = null;
  }
  if (kind === "result") {
    session.movePending = false;
    session.result = data;
    playSound(data.result === "win" ? "win" : "end");
  }
  if (kind === "queued" || kind === "challengeWait") session.queue = data;
  if (kind === "queueCancelled" || kind === "challengeDeclined") session.queue = null;
  if (kind === "challengeOffer" || kind === "rematchOffer") session.offer = { ...data, kind };
  if (kind === "reject") {
    session.movePending = false;
    session.notice = data.reason;
  }
  if (kind === "error") {
    session.movePending = false;
    session.notice = typeof data === "string" ? data : "The game service could not complete that action.";
  }
  if (kind === "challengeDeclined" || kind === "rematchDeclined") session.notice = "The invitation is no longer available.";
  if (kind === "fart") playSound("end");
  notify(kind, data);
}

async function request(path, options = {}) {
  const response = await fetch(server + path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) }
  });
  if (!response.ok) throw Object.assign(new Error(await response.text()), { status: response.status });
  return response.json();
}

export function serverNow() {
  return Date.now() / 1000 + clockOffset;
}

function clearMatch() {
  session.match = null;
  session.movePending = false;
  session.result = null;
  session.legal = null;
  notify("leave");
}

async function joinServer() {
  const previous = token ?? readSetting("exalted-server-token");
  const data = await request("/join", { method: "POST", body: JSON.stringify({ token: previous }) });
  token = data.token;
  writeSetting("exalted-server-token", token);
  session.network = true;
  if (data.catalog) receive({ kind: "catalog", data: data.catalog });
  notify("network");
}

async function poll() {
  try {
    const start = Date.now();
    const data = await request("/events?after=" + eventCursor);
    if (typeof data.serverTime === "number") clockOffset = data.serverTime - (start + Date.now()) / 2000;
    if (reconnecting) {
      reconnecting = false;
      session.notice = "";
      notify("network");
    }
    for (const event of data.events) {
      eventCursor = event.id;
      receive(event);
    }
    if (JSON.stringify(session.players) !== JSON.stringify(data.players)) {
      session.players = data.players;
      notify("players");
    }
  } catch (error) {
    reconnecting = true;
    session.notice = "Connection to the match service was interrupted. Reconnecting…";
    notify("error");
    if (error.status === 401) {
      try {
        await joinServer();
        eventCursor = 0;
        reconnecting = false;
        session.queue = null;
        session.offer = null;
        session.notice = session.match ? "The previous match ended while you were disconnected." : "";
        clearMatch();
      } catch {
        // Retry via the next poll while the service is unavailable.
      }
    }
  }
  setTimeout(poll, 550);
}

export async function connect() {
  server = document.querySelector('meta[name="exalted-server"]')?.content || "";
  if (server) {
    try {
      await joinServer();
      poll();
      return;
    } catch (error) {
      session.notice = "Online service unavailable. Starting a local session.";
      notify("error", error);
      server = "";
    }
  }
  startLocalWorker();
}

function startLocalWorker() {
  let profile;
  try { profile = JSON.parse(readSetting(key)); } catch { profile = null; }
  try {
    worker = new Worker(new URL("./local-worker.js", import.meta.url), { type: "module" });
  } catch {
    failLocalWorker();
    return false;
  }
  worker.onmessage = ({ data }) => {
    if (data.kind === "ready") {
      worker.postMessage({ op: "join", first: "You", second: profile });
      ready = true;
      for (const message of pending.splice(0)) worker.postMessage(message);
    } else if (data.kind === "workerFailed") {
      console.warn("Chess engine initialization failed.", data.data);
      failLocalWorker();
    } else receive(data);
  };
  worker.onerror = failLocalWorker;
  return true;
}

function failLocalWorker() {
  worker?.terminate();
  worker = null;
  ready = false;
  pending.length = 0;
  const error = new Error("The local chess engine could not load. Try starting a game again.");
  for (const replay of replays.values()) replay.reject(error);
  replays.clear();
  if (session.match) clearMatch();
  receive({ kind: "error", data: error.message });
}

export function action(first, second) {
  if (!session.network && !worker && !startLocalWorker()) return;
  if (first === "move" || first === "claimDraw") {
    if (!session.match || session.movePending) return;
    session.movePending = true;
  }
  if (session.match && (first === "move" || first === "claimDraw" || first === "legal")) {
    second = { ...second, matchId: session.match.matchId, revision: session.match.revision };
  }
  session.notice = "";
  if (first === "legal") session.legal = null;
  if (first === "leave" && !session.network) clearMatch();
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
  if (!worker || !ready) throw new Error("The local chess engine is unavailable.");
  return new Promise((resolve, reject) => {
    const requestId = ++replayId;
    replays.set(requestId, { resolve, reject });
    worker.postMessage({ op: "replay", first: game.v, second: Object.values(game.moves), requestId });
  });
}

const notes = {
  move: [290], capture: [220, 150], check: [390, 320], win: [330, 440, 550], end: [280, 170],
  hover: [560], button: [420], wrong: [240, 185], solved: [440, 550, 660]
};

const fallbackSounds = new Map();

function cueSettings(name) {
  return name === "hover" ? { duration: .09, level: .12 }
    : name === "button" ? { duration: .13, level: .24 }
    : { duration: .19, level: .34 };
}

function playFallback(name) {
  let player = fallbackSounds.get(name);
  if (!player) {
    const { duration, level } = cueSettings(name);
    const sampleRate = 22050;
    const samples = Math.ceil((duration + (notes[name].length - 1) * .1) * sampleRate);
    const bytes = new Uint8Array(44 + samples * 2);
    const wav = new DataView(bytes.buffer);
    for (const [offset, label] of [[0, "RIFF"], [8, "WAVE"], [12, "fmt "], [36, "data"]]) {
      bytes.set([...label].map(character => character.charCodeAt(0)), offset);
    }
    for (const [offset, value] of [[4, bytes.length - 8], [16, 16], [24, sampleRate], [28, sampleRate * 2], [40, samples * 2]]) {
      wav.setUint32(offset, value, true);
    }
    for (const [offset, value] of [[20, 1], [22, 1], [32, 2], [34, 16]]) wav.setUint16(offset, value, true);
    for (let index = 0; index < samples; index++) {
      const time = index / sampleRate;
      let sample = 0;
      for (const [note, frequency] of notes[name].entries()) {
        const age = time - note * .1;
        if (age >= 0 && age < duration) {
          const phase = (age * frequency) % 1;
          const envelope = Math.min(age / .008, 1) * Math.exp(-5 * age / duration);
          sample += (1 - 4 * Math.abs(phase - .5)) * level * envelope;
        }
      }
      wav.setInt16(44 + index * 2, Math.round(sample * 32767), true);
    }
    player = new Audio("data:audio/wav;base64," + btoa(String.fromCharCode(...bytes)));
    fallbackSounds.set(name, player);
  }
  player.currentTime = 0;
  return player.play();
}

export function playSound(name) {
  if (!sound) return;
  if (audio?.state !== "running") {
    playFallback(name).catch(() => {});
    return;
  }
  const { duration, level } = cueSettings(name);
  notes[name].forEach((frequency, index) => {
    const tone = audio.createOscillator();
    const volume = audio.createGain();
    const start = audio.currentTime + index * .1;
    tone.type = "triangle";
    tone.frequency.value = frequency;
    volume.gain.setValueAtTime(.001, start);
    volume.gain.exponentialRampToValueAtTime(level, start + .008);
    volume.gain.exponentialRampToValueAtTime(.001, start + duration - .01);
    tone.connect(volume).connect(audio.destination);
    tone.start(start);
    tone.stop(start + duration);
  });
}

export function soundEnabled() { return sound; }
export function toggleSound() {
  sound = !sound;
  writeSetting(settings, sound ? "on" : "off");
  if (sound) unlockSound("button");
  else for (const player of fallbackSounds.values()) player.pause();
  return sound;
}
export function unlockSound(cue) {
  if (!sound) return;
  const AudioContext = globalThis.AudioContext ?? globalThis.webkitAudioContext;
  try {
    if (AudioContext && (!audio || audio.state === "closed")) audio = new AudioContext();
  } catch {
    // Some browsers expose Web Audio even when they cannot start an audio device.
  }
  if (audio?.state === "running") {
    if (cue) playSound(cue);
    return;
  }
  const resumed = audio?.resume().catch(() => {});
  if (cue) {
    // Try media playback while the click still counts as a user gesture.
    playFallback(cue).catch(async () => {
      await resumed;
      if (audio?.state === "running") playSound(cue);
    });
  }
}
