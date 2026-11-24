import { createPlasticSample, plasticSampleUrl } from "./plastic-sounds.js";

const key = "exalted-chess-profile-v1";
const settings = "exalted-chess-audio";
const listeners = new Set();
const replays = new Map();
let replayId = 0;
let sound = readSetting(settings) !== "off";
let audio;
let audioOutput;
let terminalCue;
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
  invite: null,
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
    if (prior?.matchId !== data.matchId) {
      session.result = null;
      terminalCue = undefined;
    }
    if (prior?.matchId !== data.matchId || prior?.revision !== data.revision || data.revision == null) {
      session.legal = null;
      session.movePending = false;
    }
    const moves = Object.values(data.state.history);
    if (prior?.matchId === data.matchId && moves.length > Object.values(prior.state.history).length) {
      const move = moves.at(-1);
      const piece = prior.state.board[move.from]?.[1];
      const landing = playMoveSound(move, piece);
      const fourMate = Object.entries(data.state.eliminationReason ?? {}).some(([side, reason]) =>
        reason === "Checkmate" && prior.state.eliminationReason?.[side] !== reason);
      if (data.state.status === "checkmate" || fourMate) {
        playSound("mate", landing + .13);
        terminalCue = { matchId: data.matchId, until: performance.now() + (landing + .43) * 1000 };
      } else if (data.state.status === "check" || (!data.state.terminal &&
          Object.values(data.state.checkedColors ?? {}).some(side => side !== move.color))) {
        playSound("check", landing + .036);
      }
    }
    session.match = data;
    session.invite = null;
    session.notice = "";
    session.queue = null;
    session.offer = null;
  }
  if (kind === "result") {
    session.movePending = false;
    const duplicate = session.result?.matchId === data.matchId && session.result.result === data.result;
    session.result = data;
    if (!duplicate && data.matchId === session.match?.matchId) {
      const delay = terminalCue?.matchId === data.matchId ? Math.max(0, (terminalCue.until - performance.now()) / 1000) : 0;
      playSound(data.result === "win" ? "win" : data.result === "loss" ? "loss" : "draw", delay);
    }
  }
  if (kind === "inviteRoom") {
    if (session.result) clearMatch();
    session.invite = data;
    session.queue = null;
    session.offer = null;
    session.notice = "";
  }
  if (kind === "inviteClosed") {
    session.invite = null;
    session.notice = data.reason ?? "";
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
        session.invite = null;
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

const fallbackSounds = new Map();
const audioBuffers = new WeakMap();
const pendingSounds = new Set();

function playFallback(sample) {
  let player = fallbackSounds.get(sample);
  if (!player) {
    player = new Audio(plasticSampleUrl(sample));
    fallbackSounds.set(sample, player);
  }
  player.currentTime = 0;
  return player.play();
}

export function playSound(name, delay = 0) {
  const sample = createPlasticSample(name);
  if (!sound) return sample.duration;
  if (audio?.state !== "running") {
    if (!delay) playFallback(sample).catch(() => {});
    else {
      const timer = setTimeout(() => {
        pendingSounds.delete(timer);
        if (sound) playFallback(sample).catch(() => {});
      }, delay * 1000);
      pendingSounds.add(timer);
    }
    return sample.duration;
  }
  let buffer = audioBuffers.get(sample);
  if (!buffer) {
    buffer = audio.createBuffer(2, sample.channels[0].length, sample.sampleRate);
    for (const [index, channel] of sample.channels.entries()) buffer.copyToChannel(channel, index);
    audioBuffers.set(sample, buffer);
  }
  const source = audio.createBufferSource();
  source.buffer = buffer;
  source.connect(audioOutput);
  source.start(audio.currentTime + delay);
  return sample.duration;
}

export function playMoveSound(move, piece) {
  const weight = piece === "P" ? "light" : ["K", "Q"].includes(piece) ? "heavy" : "mid";
  if (move.special?.startsWith("castle")) return playSound("castle-heavy");
  if (move.promotion) return playSound(move.captured ? "promote-capture" : "promote-heavy");
  return playSound((move.captured || move.special === "enpassant" ? "capture-" : "move-") + weight);
}

export function playPositionMove(move, position) {
  if (!move || !position?.board) return playSound("move-mid");
  return playMoveSound({ ...move, captured: position.board[move.to] }, position.board[move.from]?.[1]);
}

export function soundEnabled() { return sound; }
export function toggleSound() {
  sound = !sound;
  writeSetting(settings, sound ? "on" : "off");
  if (audioOutput) audioOutput.gain.value = Number(sound);
  if (sound) unlockSound("button");
  else {
    for (const player of fallbackSounds.values()) player.pause();
    for (const timer of pendingSounds) clearTimeout(timer);
    pendingSounds.clear();
  }
  return sound;
}
export function unlockSound(cue) {
  if (!sound) return;
  const AudioContext = globalThis.AudioContext ?? globalThis.webkitAudioContext;
  try {
    if (AudioContext && (!audio || audio.state === "closed")) {
      audio = new AudioContext();
      audioOutput = audio.createGain();
      audioOutput.connect(audio.destination);
    }
  } catch {
    // Some browsers expose Web Audio even when they cannot start an audio device.
  }
  if (audio?.state === "running") {
    if (cue) playSound(cue);
    return;
  }
  const resumed = audio?.resume().catch(() => {});
  if (cue) {
    playFallback(createPlasticSample(cue)).catch(async () => {
      await resumed;
      if (audio?.state === "running") playSound(cue);
    });
  }
}
