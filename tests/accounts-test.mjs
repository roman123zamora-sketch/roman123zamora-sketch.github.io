import assert from "node:assert/strict";
import { checkName, checkPassword, hashPassword, nameKey, newToken, passwordMatches, publicProfile, rankings, sessionKey } from "../server/accounts.mjs";

for (const username of ["ClassicChess", "Grasshopper", "Dick", "1f2u3c4k"]) assert.equal(checkName(username), undefined);
for (const username of ["FUck67", "ass9", "MegaCUCK9", "hacker<script>"]) assert(checkName(username));
assert.equal(nameKey("ChessKing"), nameKey("chessking"));
assert(checkPassword("short"));
assert(checkPassword("🧩".repeat(33)));
const hash = await hashPassword("my chess password");
assert(!hash.includes("chess password"));
assert.notEqual(await hashPassword("my chess password"), hash);
assert(await passwordMatches("my chess password", hash));
assert(!await passwordMatches("a wrong password", hash));
const token = newToken();
assert.notEqual(token, sessionKey(token));
assert.equal(sessionKey("invalid"), undefined);

const entries = Array.from({ length: 5030 }, (_, index) => ({
  id: index + 1, username: "Player" + (index + 1), passwordHash: hash,
  sessions: { [sessionKey(token)]: Date.now() },
  profile: { ranked: { blitz: { rating: 7000 - index, wins: 6, draws: 3, losses: 1 } } }
}));
assert.equal(rankings(entries, "blitz", 11, "").rows[0].place, 1001);
assert.equal(rankings(entries, "blitz", 99, "").rows.at(-1).place, 5000);
assert.equal(rankings(entries, "blitz", 2, "").rows[0].place, 101);
assert.equal(rankings(entries, "blitz", 1, "pLaYeR384").rows[0].place, 384);
assert.equal(rankings(entries, "rapid", 1, "").rows.length, 0);
assert(!JSON.stringify(publicProfile(entries[0])).includes(hash));
assert.equal(publicProfile(entries[0]).ratings.bullet, 1000);
console.log("Username moderation, password hashes, session digests, ranking limits and real search positions passed.");
