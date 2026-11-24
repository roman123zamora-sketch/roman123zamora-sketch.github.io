import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { homedir } from "node:os";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRuntime } from "../game/luau-runtime.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const dataFile = resolve(process.env.EXALTED_DATA ?? resolve(homedir(), ".exalted-chess", "profiles.json"));
const publicOrigin = process.env.EXALTED_SITE_ORIGIN;
const files = /^(?:index\.html|assets\/(?:[a-z0-9-]+\.svg|puzzles\/(?:index|archive|(?:checkmate|material)\/[0-9]+)\.json)|styles\/[a-z0-9-]+\.css|(?:ui|tabs)\/[a-z0-9-]+\.js|game\/(?:[a-z0-9-]+\.(?:js|luau)|(?:rules|engine)\/[a-z0-9-]+\.luau|vendor\/(?:luau-web\.js|lib\/[a-z0-9-]+\.js)))$/;
const actions = new Set([
  "profile", "clearBotHistory", "deleteHistoryMatch", "equipBoard", "bot", "fourBot", "queue", "queueFour", "challenge",
  "challengeRespond", "createInvite", "joinInvite", "leaveInvite", "move", "claimDraw", "reset", "legal", "undo", "resign", "abort", "leave", "cancelQueue",
  "rematch", "rematchRespond", "rematchCancel"
]);
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml", ".json": "application/json; charset=utf-8" };
const runtime = await createRuntime(path => readFile(resolve(root, "game", path), "utf8"));
const catalog = await runtime("catalog");

let saved = {};
try { saved = JSON.parse(await readFile(dataFile, "utf8")); } catch (error) {
  if (error.code !== "ENOENT") throw error;
}
await mkdir(dirname(dataFile), { recursive: true });
let nextId = Math.max(0, ...Object.values(saved).map(entry => entry.id));
const live = new Map();
const tokens = new Map();
let transactions = Promise.resolve();
let writes = Promise.resolve();

function wakePolls(user) {
  for (const wake of user.polls) wake();
}

function transact(callback) {
  const result = transactions.then(callback);
  transactions = result.catch(() => {});
  return result;
}

function persist() {
  const snapshot = JSON.stringify(saved);
  writes = writes.catch(() => {}).then(async () => {
    await writeFile(dataFile + ".tmp", snapshot, { mode: 0o600 });
    await rename(dataFile + ".tmp", dataFile);
  });
  return writes;
}

async function dispatch(op, id, first, second) {
  const result = await runtime(op, Date.now() / 1000, id, first, second);
  if (op === "replay") return result;
  let changed = false;
  for (const event of Object.values(result)) {
    const user = live.get(event.user);
    if (!user) continue;
    if (event.kind === "save") {
      saved[user.token].profile = event.data;
      changed = true;
    } else {
      user.events.push({ id: ++user.cursor, kind: event.kind, data: event.data });
      if (user.events.length > 500) user.events.shift();
      wakePolls(user);
    }
  }
  if (changed) await persist();
}

async function jsonBody(request) {
  let size = 0;
  const chunks = [];
  for await (const part of request) {
    size += part.length;
    if (size > 32_000) throw Object.assign(new Error("Request too large"), { status: 413 });
    chunks.push(part);
  }
  try { return JSON.parse(Buffer.concat(chunks)); }
  catch { throw Object.assign(new Error("Invalid JSON"), { status: 400 }); }
}

function respond(response, code, body) {
  response.writeHead(code, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  response.end(JSON.stringify(body));
}

function selectData(kind, data) {
  const input = data && typeof data === "object" ? data : {};
  const address = value => typeof value === "string" && /^[a-n](?:[1-9]|1[0-4])$/.test(value) ? value : undefined;
  const rating = value => {
    if (value === "Max") return value;
    const parsed = typeof value === "string" && /^\d{3,4}$/.test(value) ? Number(value) : value;
    return Number.isFinite(parsed) ? Math.max(200, Math.min(3000, parsed)) : 1000;
  };
  const number = value => Number.isSafeInteger(value) ? value : undefined;
  const context = {
    matchId: typeof input.matchId === "string" ? input.matchId.slice(0, 64) : undefined,
    revision: number(input.revision)
  };
  const timer = { baseSeconds: number(input.baseSeconds), increment: number(input.increment) };
  switch (kind) {
    case "claimDraw":
    case "move":
      if (kind === "claimDraw" && data == null) return undefined;
      return { ...context, from: address(input.from), to: address(input.to), promotion: ["Q", "R", "B", "N"].includes(input.promotion) ? input.promotion : undefined };
    case "legal": return { ...context, from: address(input.from), requestId: number(input.requestId) };
    case "bot": return { rating: rating(input.rating) };
    case "fourBot": return { ratings: { B: rating(input.ratings?.B), Y: rating(input.ratings?.Y), G: rating(input.ratings?.G) } };
    case "deleteHistoryMatch": case "equipBoard": return { id: typeof input.id === "string" ? input.id.slice(0, 48) : undefined };
    case "queue": case "queueFour": return { ...timer, newOpponent: input.newOpponent === true };
    case "createInvite": return { ...timer, four: input.four === true, code: randomUUID() };
    case "joinInvite": return {
      code: typeof input.code === "string" && /^[a-f0-9-]{36}$/.test(input.code) ? input.code : ""
    };
    case "challenge": return { ...timer, userId: number(input.userId), userIds: Array.isArray(input.userIds) ? [...new Set(input.userIds.slice(0, 3).map(number).filter(Boolean))] : undefined };
    case "challengeRespond": case "rematchRespond": return { accept: input.accept === true };
    default: return undefined;
  }
}

async function serve(request, response) {
  const url = new URL(request.url, "http://localhost");
  if (url.pathname.startsWith("/api/")) response.setHeader("Vary", "Origin");
  if (publicOrigin && request.headers.origin === publicOrigin) {
    response.setHeader("Access-Control-Allow-Origin", publicOrigin);
    response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  }
  if (url.pathname.startsWith("/api/") && request.method === "OPTIONS") {
    response.setHeader("Access-Control-Max-Age", "600");
    response.writeHead(204).end();
    return;
  }
  if (url.pathname === "/api/join" && request.method === "POST") {
    const input = await jsonBody(request);
    const result = await transact(async () => {
      const previous = typeof input?.token === "string" && Object.hasOwn(saved, input.token) ? input.token : null;
      const token = previous ?? randomUUID();
      const entry = saved[token] ??= { id: ++nextId };
      if (!tokens.has(token)) {
        const user = { id: entry.id, token, seen: Date.now(), cursor: 0, events: [], polls: new Set(), name: `Player ${entry.id}` };
        live.set(user.id, user);
        tokens.set(token, user);
        await dispatch("join", user.id, user.name, entry.profile);
      } else {
        const user = tokens.get(token);
        user.seen = Date.now();
        await dispatch("action", user.id, "resume");
      }
      if (!previous) await persist();
      return { token, catalog };
    });
    return respond(response, 200, result);
  }
  if (url.pathname === "/api/page-leave" && request.method === "POST") {
    const input = await jsonBody(request);
    const user = typeof input?.token === "string" && tokens.get(input.token);
    if (!user || typeof input.matchId !== "string" || input.matchId.length > 64) return respond(response, 400, {});
    await transact(() => {
      if (tokens.get(user.token) === user) return dispatch("action", user.id, "pageLeave", { matchId: input.matchId });
    });
    return respond(response, 200, {});
  }
  if (url.pathname.startsWith("/api/")) {
    const bearer = /^Bearer (\S+)$/i.exec(request.headers.authorization ?? "")?.[1];
    const user = tokens.get(bearer);
    if (!user) return respond(response, 401, "Session expired. Reload to reconnect.");
    user.seen = Date.now();
    if (url.pathname === "/api/events" && request.method === "GET") {
      const after = Number(url.searchParams.get("after")) || 0;
      if (url.searchParams.has("wait") && user.cursor <= after) {
        await new Promise(resolve => {
          const finish = () => {
            clearTimeout(timeout);
            user.polls.delete(finish);
            response.off("close", finish);
            resolve();
          };
          const timeout = setTimeout(finish, 12000);
          user.polls.add(finish);
          response.once("close", finish);
        });
      }
      if (response.destroyed) return;
      return respond(response, 200, {
        waiting: url.searchParams.has("wait"),
        serverTime: Date.now() / 1000,
        events: user.events.filter(event => event.id > after),
        players: [...live.values()].filter(player => player !== user).map(({ id, name }) => ({ id, name }))
      });
    }
    if (url.pathname === "/api/action" && request.method === "POST") {
      const { kind, data } = await jsonBody(request) ?? {};
      if (!actions.has(kind)) return respond(response, 400, "Unknown action.");
      const accepted = await transact(async () => {
        if (tokens.get(bearer) !== user) return false;
        await dispatch("action", user.id, kind, selectData(kind, data));
        if (kind === "leave") {
          user.events.push({ id: ++user.cursor, kind: "left" });
          if (user.events.length > 500) user.events.shift();
      wakePolls(user);
        }
        return true;
      });
      return respond(response, accepted ? 200 : 401, accepted ? {} : "Session expired.");
    }
    if (url.pathname === "/api/replay" && request.method === "POST") {
      const { variant, moves } = await jsonBody(request) ?? {};
      const clean = Array.isArray(moves) ? moves.slice(0, 500).map(move => ({
        f: typeof move?.f === "string" ? move.f.slice(0, 3) : "",
        t: typeof move?.t === "string" ? move.t.slice(0, 3) : "",
        p: ["Q", "R", "B", "N"].includes(move?.p) ? move.p : undefined,
        c: ["w", "b", "R", "Y", "G", "B"].includes(move?.c) ? move.c : ""
      })).filter(move => move.f && move.t && move.c) : [];
      const result = await transact(() => dispatch("replay", user.id, variant === "four" ? "four" : "chess", clean));
      return respond(response, 200, result);
    }
    return respond(response, 404, "Not found.");
  }

  const path = url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname.slice(1));
  if (!["GET", "HEAD"].includes(request.method) || !files.test(path)) return respond(response, 404, "Not found.");
  let contents;
  try { contents = await readFile(resolve(root, path)); }
  catch (error) { if (error.code === "ENOENT") return respond(response, 404, "Not found."); throw error; }
  if (path === "index.html") {
    contents = contents.toString().replace(/name="exalted-server" content="[^"]*"/, 'name="exalted-server" content="/api"');
  }
  response.writeHead(200, { "Content-Type": types[extname(path)] ?? "text/plain; charset=utf-8" });
  response.end(request.method === "HEAD" ? undefined : contents);
}

const server = createServer((request, response) => {
  serve(request, response).catch(error => {
    const status = error.status || 500;
    if (status === 500) console.error(error);
    if (!response.headersSent) respond(response, status, status === 500 ? "Match service error." : error.message);
  });
});
let ticking = false;
setInterval(async () => {
  if (ticking) return;
  ticking = true;
  try {
    await transact(async () => {
      await dispatch("tick");
      for (const user of live.values()) {
        if (Date.now() - user.seen < 30_000) continue;
        await dispatch("leave", user.id);
        wakePolls(user);
        live.delete(user.id);
        tokens.delete(user.token);
      }
    });
  } catch (error) {
    console.error(error);
  } finally { ticking = false; }
}, 200).unref();

const port = Number(process.env.PORT) || 8080;
server.listen(port, () => console.log(`Exalted Chess listening on port ${port}`));
