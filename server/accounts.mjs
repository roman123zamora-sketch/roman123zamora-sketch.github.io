import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const derive = promisify(scrypt);
const blocked = /bitch|cuck|fuck|shit|nigger|nigga|faggot|retard|whore|slut|dickhead|cunt|pussy|bastard|kike|spic|chink|wetback|tranny|coon|dyke|scumbag|jackass|dumbass|asshole/i;
const ordinary = /classic|class|chessmaster|assembly|assassin|assistant|assist|assert|assign|asset|assess|passion|pass|bass|glass|grass|compass|mass|brass|sassafras/gi;
export const nameKey = name => name.toLowerCase();
export function checkName(name) {
  if (typeof name !== "string" || !/^[A-Za-z0-9_]{3,24}$/.test(name)) return "Use 3–24 letters, numbers, or underscores.";
  if (blocked.test(name) || /ass/i.test(name.replace(ordinary, " "))) return "That username contains a blocked word.";
}
export function checkPassword(value) {
  return typeof value === "string" && value.length >= 10 && Buffer.byteLength(value) <= 128
    ? undefined : "Use a password of at least 10 characters and at most 128 bytes.";
}
export async function hashPassword(value, salt = randomBytes(16).toString("hex")) {
  return salt + ":" + (await derive(value, salt, 64)).toString("hex");
}
const dummy = "0".repeat(32) + ":" + "0".repeat(128);
export async function passwordMatches(value, stored = dummy) {
  if (typeof value !== "string" || Buffer.byteLength(value) > 128) return false;
  const hash = await hashPassword(value, stored.split(":")[0]);
  return timingSafeEqual(Buffer.from(hash), Buffer.from(stored)) && stored !== dummy;
}
export const sessionKey = token => typeof token === "string" && /^[a-f0-9]{64}$/.test(token)
  ? createHash("sha256").update(token).digest("hex") : undefined;
export const newToken = () => randomBytes(32).toString("hex");

export function publicProfile(entry) {
  const profile = entry.profile ?? {};
  const ratings = Object.fromEntries(["bullet","blitz","rapid"].map(category =>
    [category, profile.ranked?.[category]?.rating ?? 1000]));
  return { id: entry.id, username: entry.username, ratings, fourElo: profile.fourElo ?? 1000,
    allTimeCaptures: profile.allTimeCaptures ?? 0, history: Object.values(profile.history ?? {}).map(({ v, category, result, reason, place, ts, opp }) =>
      ({ v, category, result, reason, place, ts, opp })) };
}

export function rankings(entries, category, requestedPage, query) {
  const ranked = entries.filter(entry => entry.username && entry.profile?.ranked?.[category])
    .map(entry => ({ id: entry.id, username: entry.username, ...entry.profile.ranked[category] }))
    .sort((a,b) => b.rating - a.rating || a.id - b.id)
    .slice(0,5000).map((entry,index) => ({...entry, place:index+1}));
  const matches = query ? ranked.filter(entry => nameKey(entry.username).includes(nameKey(query))) : ranked;
  const pages = Math.max(1, Math.ceil(matches.length/100));
  const page = Math.min(pages, Math.max(1, Math.trunc(Number(requestedPage)) || 1));
  return { page, pages, rows: matches.slice((page-1)*100,page*100) };
}
