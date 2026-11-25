import { checkName, checkPassword, hashPassword, nameKey, newToken, passwordMatches, publicProfile, rankings, sessionKey } from "./accounts.mjs";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { homedir } from "node:os";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRuntime } from "../game/luau-runtime.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const dataFile = resolve(process.env.EXALTED_DATA ?? resolve(homedir(), ".exalted-chess", "profiles.json"));
const publicOrigins = new Set((process.env.EXALTED_SITE_ORIGIN ?? "").split(",").map(origin => origin.trim()).filter(Boolean));
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
const accountByName = new Map(Object.values(saved).filter(entry => entry.username).map(entry => [nameKey(entry.username), entry]));
const accountsById = new Map(Object.values(saved).filter(entry => entry.username).map(entry => [entry.id, entry]));
const sessions = new Map();
for (const entry of accountsById.values()) {
  for (const [hash, expires] of Object.entries(entry.sessions ?? {})) if (expires > Date.now()) sessions.set(hash, entry);
}
const attempts = new Map();
const sessionDuration = 30 * 86400_000;

function allowedAttempt(request) {
  const key = process.env.RENDER === "true" ? String(request.headers["x-forwarded-for"] ?? "").split(",").at(-1).trim()
    : request.socket.remoteAddress;
  const now = Date.now();
  for (const [address, attempt] of attempts) if (attempt.until <= now) attempts.delete(address);
  const attempt = attempts.get(key) ?? { until: now + 60000, count: 0 };
  attempts.set(key, attempt);
  return ++attempt.count <= 15;
}

function authorized(token) {
  const hash = sessionKey(token);
  const entry = sessions.get(hash);
  return entry?.sessions[hash] > Date.now() ? entry : null;
}

function issueSession(entry) {
  const token = newToken();
  const hash = sessionKey(token);
  entry.sessions ??= {};
  for (const [old, expiry] of Object.entries(entry.sessions)) {
    if (expiry <= Date.now() || Object.keys(entry.sessions).length >= 12) {
      delete entry.sessions[old];
      sessions.delete(old);
    }
  }
  entry.sessions[hash] = Date.now() + sessionDuration;
  sessions.set(hash, entry);
  return token;
}
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
      user.account.profile = event.data;
      changed = true;
    } else {
      user.events.push({ id: ++user.cursor, kind: event.kind, data: event.data });
      if (user.events.length > 500) user.events.shift();
      wakePolls(user);
    }
  }
  if (changed) await persist();
}

async function attachPlayer(account) {
  let user = live.get(account.id);
  if (!user) {
    user = { id: account.id, account, seen: Date.now(), cursor: 0, events: [], polls: new Set(), name: account.username };
    live.set(user.id, user);
    await dispatch("join", user.id, user.name, account.profile);
  } else {
    user.seen = Date.now();
    await dispatch("action", user.id, "resume");
  }
  return { catalog, account: { id: account.id, username: account.username } };
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
  if (publicOrigins.has(request.headers.origin)) {
    response.setHeader("Access-Control-Allow-Origin", request.headers.origin);
    response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  }
  if (url.pathname.startsWith("/api/") && request.method === "OPTIONS") {
    response.setHeader("Access-Control-Max-Age", "600");
    response.writeHead(204).end();
    return;
  }
  if (["/api/signup", "/api/login"].includes(url.pathname) && request.method === "POST") {
    if (!allowedAttempt(request)) return respond(response, 429, { error: "Too many attempts. Try again in a minute." });
    const { username, password, previousToken } = await jsonBody(request) ?? {};
    const signup = url.pathname === "/api/signup";
    if (signup) {
      const error = checkName(username) ?? checkPassword(password);
      if (error) return respond(response, 400, { error });
    }
    const key = typeof username === "string" ? nameKey(username) : "";
    const existing = accountByName.get(key);
    const existingHash = existing?.passwordHash;
    if (!signup && !await passwordMatches(password, existingHash)) {
      return respond(response, 401, { error: "Username or password is incorrect." });
    }
    const passwordHash = signup ? await hashPassword(password) : null;
    return await transact(async () => {
      let entry = existing;
      if (signup) {
        if (accountByName.has(key)) return respond(response, 409, { error: "That username is taken." });
        const legacy = typeof previousToken === "string" && Object.hasOwn(saved, previousToken) && saved[previousToken];
        entry = { id: ++nextId, username, passwordHash, sessions: {}, profile: legacy?.username ? undefined : legacy?.profile };
        if (legacy && !legacy.username) delete saved[previousToken];
        saved["account:" + entry.id] = entry;
        accountsById.set(entry.id, entry);
        accountByName.set(key, entry);
      } else if (!entry || entry.passwordHash !== existingHash) {
        return respond(response, 401, { error: "Please try signing in again." });
      }
      const token = issueSession(entry);
      await persist();
      return respond(response, 200, { token, ...await attachPlayer(entry) });
    });
  }
  const bearer = /^Bearer (\S+)$/i.exec(request.headers.authorization ?? "")?.[1];
  const account = authorized(bearer);
  if (url.pathname === "/api/join" && request.method === "POST") {
    if (!account) return respond(response, 401, { error: "Please log in." });
    const result = await transact(() => attachPlayer(account));
    return respond(response, 200, result);
  }
  if (url.pathname === "/api/account" && request.method === "POST") {
    if (!account) return respond(response, 401, { error: "Please log in." });
    if (!allowedAttempt(request)) return respond(response, 429, { error: "Too many attempts. Try again in a minute." });
    const input = await jsonBody(request) ?? {};
    if (input.kind === "logout") {
      await transact(async () => {
        const hash = sessionKey(bearer);
        delete account.sessions[hash];
        sessions.delete(hash);
        const user = live.get(account.id);
        if (user) { await dispatch("leave", user.id); wakePolls(user); live.delete(user.id); }
        await persist();
      });
      return respond(response, 200, {});
    }
    if (input.kind === "username") {
      const error = checkName(input.username);
      if (error) return respond(response, 400, { error });
      return await transact(async () => {
        const key = nameKey(input.username);
        if (accountByName.has(key) && accountByName.get(key) !== account) {
          return respond(response, 409, { error: "That username is taken." });
        }
        accountByName.delete(nameKey(account.username));
        account.username = input.username;
        accountByName.set(key, account);
        const user = live.get(account.id);
        if (user) { user.name = account.username; await dispatch("action", user.id, "rename", account.username); }
        await persist();
        return respond(response, 200, { id: account.id, username: account.username });
      });
    }
    if (input.kind === "password") {
      const error = checkPassword(input.password);
      if (error) return respond(response, 400, { error });
      const oldHash = account.passwordHash;
      if (!await passwordMatches(input.current, oldHash)) return respond(response, 400, { error: "Current password is incorrect." });
      const passwordHash = await hashPassword(input.password);
      return await transact(async () => {
        if (account.passwordHash !== oldHash) return respond(response, 409, { error: "Password changed. Try again." });
        account.passwordHash = passwordHash;
        for (const hash of Object.keys(account.sessions)) if (hash !== sessionKey(bearer)) {
          delete account.sessions[hash];
          sessions.delete(hash);
        }
        await persist();
        return respond(response, 200, {});
      });
    }
    return respond(response, 400, { error: "Unknown account change." });
  }
  if (url.pathname === "/api/rankings" && request.method === "GET") {
    if (!account) return respond(response, 401, { error: "Please log in." });
    const category = url.searchParams.get("category");
    if (!["bullet","blitz","rapid"].includes(category)) return respond(response, 400, { error: "Unknown time control." });
    return respond(response, 200, rankings([...accountsById.values()], category, url.searchParams.get("page"), (url.searchParams.get("q") ?? "").slice(0,24)));
  }
  if (/^\/api\/players\/\d+$/.test(url.pathname) && request.method === "GET") {
    if (!account) return respond(response, 401, { error: "Please log in." });
    const entry = accountsById.get(Number(url.pathname.split("/").at(-1)));
    return entry ? respond(response, 200, publicProfile(entry)) : respond(response, 404, { error: "Player not found." });
  }
  if (url.pathname === "/api/page-leave" && request.method === "POST") {
    const input = await jsonBody(request);
    const owner = authorized(input?.token);
    const user = owner && live.get(owner.id);
    if (!user || typeof input.matchId !== "string" || input.matchId.length > 64) return respond(response, 400, {});
    await transact(() => {
      if (live.get(user.id) === user) return dispatch("action", user.id, "pageLeave", { matchId: input.matchId });
    });
    return respond(response, 200, {});
  }
  if (url.pathname.startsWith("/api/")) {
    const user = account && live.get(account.id);
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
        if (live.get(user.id) !== user || authorized(bearer) !== account) return false;
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

      }
    });
  } catch (error) {
    console.error(error);
  } finally { ticking = false; }
}, 200).unref();

const port = Number(process.env.PORT) || 8080;
server.listen(port, () => console.log(`Exalted Chess listening on port ${port}`));
