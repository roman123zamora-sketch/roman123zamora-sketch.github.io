import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRuntime } from "../game/luau-runtime.js";
import { LuauState } from "../game/vendor/luau-web.js";

const read = path => readFile(new URL("../game/" + path, import.meta.url), "utf8");
const dispatch = await createRuntime(read);
const puzzles = [];
for (const [category, rating, seed] of [
  ["material", 400, 1], ["checkmate", 400, 1], ["checkmate", 1250, 6]
]) {
  const puzzle = await dispatch("puzzle", 0, 0, { category, rating, seed, timeMs: 4500 });
  assert.equal(puzzle.category, category);
  assert(puzzle.origin.history.length >= 12);
  puzzles.push(puzzle);
}
const [material, mate, longer] = puzzles;
assert(material.gain >= 300);
assert.equal(mate.line.length, 1);
assert.equal(longer.line.length, 3);
const different = await dispatch("puzzle", 0, 0, {
  category: mate.category, rating: 400, seed: mate.seed, recent: [mate.id], timeMs: 4500
});
assert(different.id && different.id !== mate.id);

// Rebuild every generated position with the real rules, including rights and
// en passant, then verify every displayed move and independently count mates.
const lua = value => {
  if (value === null || value === undefined) return "nil";
  if (Array.isArray(value)) return "{" + value.map(lua).join(",") + "}";
  if (typeof value === "object") return "{" + Object.entries(value).map(([key, item]) => "[" + lua(key) + "]=" + lua(item)).join(",") + "}";
  return JSON.stringify(value);
};
const [engine, generator, bot] = await Promise.all([
  read("rules/standard-chess.luau"), read("puzzle-search.luau"), read("engine/bot-search.luau")
]);
const vm = await LuauState.createAsync();
try {
  await vm.loadstring(`
local Chess=(function()\n${engine}\nend)()
local Puzzle=(function()
${generator}
end)()
local Bot=(function()
${bot}
end)()
local puzzles=${lua(puzzles)}
local function apply(state,move)
 for _,legal in ipairs(Chess.legalMoves(state,move.from)) do
  if legal.to==move.to and legal.promotion==move.promotion then return Chess.apply(state,legal) end
 end
 error("Illegal puzzle move")
end
local values={P=100,N=310,B=330,R=500,Q=900}
local function balance(state,side)
 local total=0
 for _,piece in pairs(state.board) do
  total+=(string.sub(piece,1,1)==side and 1 or -1)*(values[string.sub(piece,2,2)] or 0)
 end
 return total
end
local function mateCount(state)
 local count=0
 for _,move in ipairs(Chess.allLegal(state)) do
  local next=Chess.searchApply(state,move)
  if Chess.inCheck(next,next.turn) and not Chess.hasLegal(next) then count+=1 end
 end
 return count
end
local function fixture(board,turn)
 local state={board=board,turn=turn,castling={},halfmove=0,fullmove=1,history={},positions={}}
 state.positions[Chess.positionKey(state)]=1
 return state
end
local overwhelming=fixture({f7="wK",c1="wQ",d5="wQ",g7="wR",b4="bK",d2="bP"},"w")
assert(mateCount(overwhelming)==1,"The old uniqueness check would accept this trivial mate")
for _,category in ipairs({"checkmate","material"}) do
 assert(not Puzzle.validate(Chess,Bot,overwhelming,Chess.allLegal(overwhelming),category,400,os.clock()+1))
end
local lowResistance=fixture({a1="wK",b1="wR",h8="bK",g7="bP",h7="bP"},"w")
assert(not Puzzle.validate(Chess,Bot,lowResistance,Chess.allLegal(lowResistance),"material",400,os.clock()+1))
local manyMates=fixture({f6="wK",f7="wQ",h8="bK",a8="bQ",a1="wR"},"w")
assert(mateCount(manyMates)>1)
assert(not Puzzle.validate(Chess,Bot,manyMates,Chess.allLegal(manyMates),"checkmate",400,os.clock()+1))
for _,puzzle in ipairs(puzzles) do
 local state=Chess.initial()
 for _,move in ipairs(puzzle.origin.history) do state=apply(state,move) end
 for square,piece in pairs(state.board) do assert(puzzle.origin.board[square]==piece) end
 for square,piece in pairs(puzzle.origin.board) do assert(state.board[square]==piece) end
 assert(state.turn==puzzle.side and state.ep==puzzle.origin.ep)
 for right,value in pairs(state.castling) do assert(puzzle.origin.castling[right]==value) end
 if puzzle.category=="checkmate" then
  if #puzzle.line==1 then
   assert(mateCount(state)==1)
  else
   assert(mateCount(state)==0)
   local defended=Chess.apply(state,puzzle.line[1])
   for _,defense in ipairs(Chess.allLegal(defended)) do
    assert(mateCount(Chess.apply(defended,defense))==1)
   end
  end
 end
 local final=state
 for _,move in ipairs(puzzle.line) do final=apply(final,move) end
 if puzzle.category=="checkmate" then assert(Chess.status(final)=="checkmate")
 else assert(balance(final,puzzle.side)-balance(state,puzzle.side)>=puzzle.gain) end
end
`, "Puzzle proofs", true)();
} finally {
  vm.destroy();
}

globalThis.localStorage = { getItem: () => null, setItem() {} };
const { loadPractice, possibleRatings, puzzleRating, resolvePuzzle } = await import("../game/puzzle-progress.js");
for (const [result, hearts, delta] of [
  ["solved", 3, 50], ["solved", 2, 30], ["solved", 1, 20], ["failed", 0, -16], ["skipped", 3, 0]
]) {
  const practice = { rating: 400, recent: [], active: { puzzle: { id: "used", difficulty: 400 }, hearts } };
  const assisted = { ...practice, active: { ...practice.active, assisted: true } };
  assert.deepEqual([...possibleRatings(assisted)], [400]);
  assert.equal(resolvePuzzle(assisted, result), 0);
  assert.equal(assisted.rating, 400);
  assert(possibleRatings(practice).has(400 + delta));
  assert.equal(resolvePuzzle(practice, result), delta);
  assert.equal(practice.rating, 400 + delta);
  assert.equal(practice.active, null);
  assert.deepEqual(practice.recent, ["used"]);
}
assert.deepEqual([...possibleRatings({
  rating: 400, active: { puzzle: { difficulty: 400 }, hearts: 3 }
})].sort((a, b) => a - b), [384, 400, 420, 430, 450]);
for (const [rating, rewards] of [
  [100, [50, 30, 20]], [1200, [30, 20, 15]], [1999, [11, 11, 11]],
  [2000, [10, 10, 10]], [2399, [10, 10, 10]], [2400, [10, 10, 10]]
]) {
  for (const [index, reward] of rewards.entries()) {
    for (const difficulty of [400, 1400]) {
      assert.equal(puzzleRating(rating, { puzzle: { difficulty }, hearts: 3 - index }, "solved"), rating + reward);
    }
  }
}
localStorage.getItem = () => JSON.stringify({
  rating: 567, category: "checkmate", recent: ["last-puzzle"], seed: 0, active: { step: 5, hearts: 2 }
});
assert.deepEqual(loadPractice(), {
  rating: 567, category: "checkmate", recent: ["last-puzzle"], seed: 1, active: null
});
console.log("Legal histories, one- and two-move mates, all mate defenses, settled material, fresh seeds, and every rating outcome passed.");
