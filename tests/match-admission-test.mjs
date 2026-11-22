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
