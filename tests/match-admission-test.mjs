import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRuntime } from "../game/luau-runtime.js";

const dispatch = await createRuntime(path => readFile(new URL("../game/" + path, import.meta.url), "utf8"));
let time = 1_000;
const send = async (...args) => Object.values(await dispatch(args[0], time++, ...args.slice(1)));
const action = (id, kind, data) => send("action", id, kind, data);

await send("join", 1, "First");
await send("join", 2, "Second");
await send("join", 3, "Third");
assert.equal((await action(1, "queue"))[0].kind, "queued");
await action(2, "challenge", { userId: 1 });
const created = (await action(1, "challengeRespond", { accept: true })).filter(event => event.kind === "state");
assert.equal(created.length, 2);
assert.equal(created[0].data.matchId, created[1].data.matchId);

const extraPlayer = await action(3, "queue");
assert.deepEqual(extraPlayer.map(event => [event.user, event.kind]), [[3, "queued"]]);

const white = created.find(event => event.data.side === "w").user;
const black = created.find(event => event.data.side === "b").user;
assert.equal((await action(black, "move", { from: "e7", to: "e5" }))[0].kind, "reject");
assert.equal((await action(white, "move", { from: "e7", to: "e5" }))[0].kind, "reject");

const moved = (await action(white, "move", { from: "e2", to: "e4" })).filter(event => event.kind === "state");
assert.equal(moved.length, 2);
for (const event of moved) {
  assert.equal(event.data.matchId, created[0].data.matchId);
  assert.equal(event.data.state.board.e4, "wP");
  assert.equal(event.data.state.turn, "b");
}
const currentState = moved.find(event => event.user === black).data;
const stale = await action(black, "move", {
  from: "e7", to: "e5", matchId: currentState.matchId, revision: currentState.revision - 1
});
assert.equal(stale[0].kind, "reject");
const legal = await action(black, "legal", {
  from: "e7", matchId: currentState.matchId, revision: currentState.revision, requestId: 12
});
assert.equal(legal[0].data.requestId, 12);
assert.equal(legal[0].data.revision, currentState.revision);
const resumed = (await action(black, "resume")).filter(event => event.kind === "state");
assert.equal(resumed.length, 1);
assert.equal(resumed[0].user, black);
assert.equal(resumed[0].data.state.board.e4, "wP");
console.log("Match admission, invalid requests, synchronization and refresh snapshot passed.");

const reviewed = await dispatch("review", time, 0, {
  variant: "chess", moves: [{ f: "e2", t: "e4", c: "w" }]
});
assert.equal(reviewed.length, 2);
assert.equal(reviewed[0].board.e2, "wP");
assert.equal(reviewed[1].lastMove.to, "e4");
assert.equal(reviewed[1].turn, "b");
assert(reviewed[1].analysis.positions);

await action(white, "resign");
await action(3, "cancelQueue");
assert.equal((await action(white, "queue", { newOpponent: true }))[0].kind, "queued");
assert.equal((await action(black, "queue"))[0].kind, "queued");
const newGame = (await action(3, "queue")).filter(event => event.kind === "state");
assert.deepEqual(new Set(newGame.map(event => event.user)), new Set([white, 3]));
console.log("Review snapshots and New Game opponent exclusion passed.");

const suggestion = await dispatch("bestMove", time, 0, { variant: "chess", state: reviewed[1] });
assert.equal(reviewed[1].board[suggestion.move.from][0], "b");
const replyFrames = await dispatch("review", time, 0, { variant: "chess", moves: [
  { f: "e2", t: "e4", c: "w" },
  { f: suggestion.move.from, t: suggestion.move.to, p: suggestion.move.promotion, c: "b" }
] });
assert.equal(replyFrames.at(-1).turn, "w");
const mateFrames = await dispatch("review", time, 0, { variant: "chess", moves: [
  { f: "f2", t: "f3", c: "w" }, { f: "e7", t: "e5", c: "b" },
  { f: "g2", t: "g4", c: "w" }, { f: "d8", t: "h4", c: "b" }
] });
const winningMove = await dispatch("bestMove", time, 0, { variant: "chess", state: mateFrames[3] });
assert.deepEqual(winningMove.move, { from: "d8", to: "h4" });
assert.deepEqual(await dispatch("bestMove", time, 0, { variant: "chess", state: mateFrames[4] }), {});
console.log("Best-move analysis returns a legal reply or forced mate, and handles game over.");

await send("join", 4, "Collector", {
  pieceStorage: 9, allTimeCaptures: 12, botStars: { 400: 3 },
  history: [{ mode: "bot" }, { mode: "fourBot" }, { mode: "online" }]
});
const cleanProfile = (await action(4, "clearBotHistory")).find(event => event.kind === "profile").data;
assert.deepEqual(cleanProfile.history, [{ mode: "online" }]);
assert.equal(cleanProfile.botStars, undefined);
assert.equal(cleanProfile.allTimeCaptures, 12);
assert.equal(cleanProfile.pieceStorage, 9);

await send("join", 5, "Opponent");
await action(black, "cancelQueue");
await action(4, "queue");
const captureMatch = (await action(5, "queue")).filter(event => event.kind === "state");
const capturingWhite = captureMatch.find(event => event.data.side === "w").user;
const defendingBlack = captureMatch.find(event => event.data.side === "b").user;
await action(capturingWhite, "move", { from: "e2", to: "e4" });
await action(defendingBlack, "move", { from: "d7", to: "d5" });
const capture = (await action(capturingWhite, "move", { from: "e4", to: "d5" })).find(event => event.kind === "profile");
assert.equal(capture.data.allTimeCaptures, capturingWhite === 4 ? 13 : 1);
await action(defendingBlack, "resign");
const afterResult = (await action(capturingWhite, "profile")).find(event => event.kind === "profile").data;
assert.equal(afterResult.allTimeCaptures, capture.data.allTimeCaptures);
assert(afterResult.pieceStorage > capture.data.pieceStorage);
console.log("Bot-only history deletion, actual captures, and independent piece storage passed.");
