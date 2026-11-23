import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRuntime } from "../game/luau-runtime.js";
import { LuauState } from "../game/vendor/luau-web.js";

const read = path => readFile(new URL("../game/" + path, import.meta.url), "utf8");
const dispatch = await createRuntime(read);
async function generate(category, rating, seeds, length, recent = []) {
  for (const seed of seeds) {
    const puzzle = await dispatch("puzzle", 0, 0, { category, rating, seed, recent, timeMs: 4500 });
    if (puzzle.category === category && (!length || puzzle.line.length === length)) return puzzle;
  }
  assert.fail(`No verified ${category} puzzle for rating ${rating}`);
}
const material = await generate("material", 400, [1, 17211, 3]);
const mate = await generate("checkmate", 400, [3, 8, 4, 5, 7, 6, 2], 1);
const different = await generate("checkmate", 400, [4, 5, 7, 8, 3, 6, 2], 1, [mate.id]);
for (const category of ["material", "checkmate"]) {
  const targeted = await generate(category, 600, [17211, 3, 2, 97, 11]);
  assert.equal(targeted.targetRating, 600);
  assert(targeted.difficulty >= 600 && targeted.difficulty <= 800);
}
const puzzles = [material, mate, different];
assert(material.gain >= 300);
assert.equal(material.materialProof, 2);
assert.notEqual(different.id, mate.id);
for (const puzzle of puzzles) assert(puzzle.origin.history.length >= 12);

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
${generator.replace(/return Puzzle\s*$/, "Puzzle.proveForTest=mateProof; Puzzle.exchangeForTest=exchange; return Puzzle")}
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
local poisoned=fixture({h1="wK",a1="wR",g2="wP",h8="bK",b8="bB",a7="bN",h7="bP"},"w")
local bait=apply(poisoned,{from="a1",to="a7"})
assert(balance(bait,"w")>balance(poisoned,"w"))
local recaptured=apply(bait,{from="b8",to="a7"})
assert(balance(recaptured,"w")<balance(poisoned,"w"))
assert(not Puzzle.validate(Chess,Bot,poisoned,Chess.allLegal(poisoned),"material",400,os.clock()+2))
local stillBehind=fixture({h1="wK",a1="wR",g2="wP",h8="bK",g8="bQ",f8="bB",a7="bN",h7="bP"},"w")
assert(balance(apply(stillBehind,{from="a1",to="a7"}),"w")<0)
assert(not Puzzle.validate(Chess,Bot,stillBehind,Chess.allLegal(stillBehind),"material",400,os.clock()+2))

-- A quiet countercheck forces the solver's only evasion before the defender
-- can capture the rook. Stopping at the apparent gain misses the loss.
local check={from="f8",to="f1"}
local evade={from="h1",to="h2"}
local take={from="f1",to="a1"}
local sequence={check,evade,take}
local counter={}
function counter.inCheck(state) return state.ply==2 end
function counter.allLegal(state) return sequence[state.ply] and {sequence[state.ply]} or {} end
function counter.tacticalMoves(state) return state.ply==3 and {take} or {} end
function counter.checkingMoveTester(state) return function(move) return state.ply==1 and move==check end end
function counter.hasLegal() return true end
function counter.hasQuiet() return true end
function counter.insufficientMaterial() return false end
function counter.mayClaimWithMove() return false end
function counter.positionKey() return "position" end
function counter.apply(state)
 local board=table.clone(state.board)
 if state.ply==3 then board.a1=nil end
 return {ply=state.ply+1,turn=state.turn=="w" and "b" or "w",board=board,positions={},halfmove=0}
end
local score,line=Puzzle.exchangeForTest(counter,{ply=1,turn="b",board={a1="wR"},positions={},halfmove=0},
 "w",14,function() end,-math.huge,math.huge,300)
assert(score==-200 and #line==3 and line[1]==check)
local lowResistance=fixture({a1="wK",b1="wR",h8="bK",g7="bP",h7="bP"},"w")
assert(not Puzzle.validate(Chess,Bot,lowResistance,Chess.allLegal(lowResistance),"material",400,os.clock()+1))
local manyMates=fixture({f6="wK",f7="wQ",h8="bK",a8="bQ",a1="wR"},"w")
assert(mateCount(manyMates)>1)
assert(not Puzzle.validate(Chess,Bot,manyMates,Chess.allLegal(manyMates),"checkmate",400,os.clock()+1))
-- A narrow forcing tree exercises the full proof horizon without timing a
-- large real-board search. Actual chess legality is covered by the fixtures below.
local forced={from="a1",to="a2"}
local tree={}
function tree.allLegal(state) return state.ply<19 and {forced} or {} end
function tree.hasLegal(state) return state.ply<19 end
function tree.inCheck(state) return state.ply==19 end
function tree.checkingMoveTester(state) return function() return state.ply==18 end end
function tree.insufficientMaterial() return false end
function tree.positionKey() return "position" end
function tree.mayClaimWithMove() return false end
function tree.apply(state)
 return {ply=state.ply+1,turn=state.turn=="w" and "b" or "w",positions={},halfmove=0}
end
tree.searchApply=tree.apply
local root={ply=0,turn="w",positions={},halfmove=0}
assert(not Puzzle.proveForTest(tree,root,9,true,function() end,true))
local extended,unique=Puzzle.proveForTest(tree,root,10,true,function() end,true)
assert(unique and #extended==19)
local replyFixture=fixture({
 d6="bB",d5="bN",b5="wB",b2="wP",a2="wP",c8="bK",a7="bP",a8="bR",
 c7="bP",h2="wR",g2="wP",f7="bP",g7="bP",e4="wP",f2="wP",e5="bN",
 e1="wK",b1="wR",c1="wB",b7="bP"
},"w")
local verified=assert(Puzzle.validate(Chess,Bot,replyFixture,Chess.allLegal(replyFixture),"checkmate",1200,os.clock()+2))
assert(#verified==3)
local black=apply(replyFixture,verified[1])
local selected=assert(Puzzle.bestBlackMove(Chess,Bot,black,Chess.allLegal(black),os.clock()+1,true))
assert(selected.from==verified[2].from and selected.to==verified[2].to)
assert(Chess.status(apply(apply(black,verified[2]),verified[3]))=="checkmate")
local stoppedEngine={choose=function() return {from="e7",to="e5"},{depth=0} end}
local blackStart=apply(Chess.initial(),{from="e2",to="e4"})
local replies=Chess.allLegal(blackStart)
assert(not Puzzle.bestBlackMove(Chess,stoppedEngine,blackStart,replies,os.clock()+1))
assert(Puzzle.bestBlackMove(Chess,stoppedEngine,blackStart,{replies[1]},os.clock()+1)==replies[1])
local searches=0
local recoveringEngine={choose=function(_,_,_,options)
 searches+=1
 if searches==1 then return replies[1],{depth=0} end
 assert(options.nodes>1100,"The retry must increase the root search budget")
 return replies[2],{depth=1}
end}
assert(Puzzle.bestBlackMove(Chess,recoveringEngine,blackStart,replies,os.clock()+1)==replies[2])
assert(searches==2)
for _,puzzle in ipairs(puzzles) do
 local state=Chess.initial()
 for _,move in ipairs(puzzle.origin.history) do
  if state.turn=="b" then
   local best=assert(Puzzle.bestBlackMove(Chess,Bot,state,Chess.allLegal(state),os.clock()+1))
   assert(move.from==best.from and move.to==best.to and move.promotion==best.promotion)
  end
  state=apply(state,move)
 end
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
 else
  assert(balance(final,puzzle.side)>=100)
  assert(balance(final,puzzle.side)-balance(state,puzzle.side)>=puzzle.gain)
 end
end
`, "Puzzle proofs", true)();
} finally {
  vm.destroy();
}

const storage = new Map();
globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
const { loadPractice, puzzleRating, resolvePuzzle } = await import("../game/puzzle-progress.js");
for (const [hearts, deltas] of [[3, [15, 10, 5]], [2, [10, 5, 0]], [1, [5, 0, -5]]]) {
  for (const [hintsUsed, delta] of deltas.entries()) {
    const active = { puzzle: { id: "used", difficulty: 400, targetRating: 400 }, hearts, hintsUsed };
    const practice = { rating: 400, recent: [], active };
    assert.equal(resolvePuzzle(practice, "solved"), delta);
    assert.equal(practice.rating, 400 + delta);
    practice.active = { ...active, puzzle: { ...active.puzzle, targetRating: practice.rating } };
    assert.equal(resolvePuzzle(practice, "solved"), 0);
    assert.equal(practice.active, null);
    assert.deepEqual(practice.rated, ["used"]);
    assert.equal(puzzleRating(400, { hearts: 0, hintsUsed }, "failed"), 390);
    assert.equal(puzzleRating(400, { hearts, hintsUsed }, "skipped"), 400);
  }
}
const active = { puzzle: { id: "timed", category: "material", difficulty: 1200, targetRating: 1235 },
  hearts: 2, hintsUsed: 1, elapsedMs: 2345.6 };
const measured = { rating: 1235, recent: [], active };
assert.equal(resolvePuzzle(measured, "skipped"), 0);
assert.deepEqual(measured.rated, []);
measured.active = active;
resolvePuzzle(measured, "solved");
assert.deepEqual(JSON.parse(storage.get("exalted-chess-puzzle-attempts-v1")).at(-1), {
  id: "timed", category: "material", difficulty: 1200, ratingBand: 1200,
  outcome: "solved", assisted: true, mistakes: 1, elapsedMs: 2346
});
storage.set("exalted-chess-puzzles-v1", JSON.stringify({
  rating: 1926, category: "checkmate", recent: ["last-puzzle"], seed: 0, active: { step: 5, hearts: 2 }
}));
assert.deepEqual(loadPractice(), {
  rating: 1925, category: "checkmate", recent: ["last-puzzle"], seed: 1, active: null, rated: ["used", "timed"]
});
assert.equal(JSON.parse(storage.get("exalted-chess-puzzles-v1")).rating, 1925);
console.log("Puzzle proofs, all rating outcomes, replay protection and migration passed.");

const { matchesPuzzleTarget, puzzleSearchTier } = await import("../game/puzzle-prefetch.js");
assert.equal(puzzleSearchTier(390), puzzleSearchTier(415));
assert.notEqual(puzzleSearchTier(595), puzzleSearchTier(600));
assert(matchesPuzzleTarget({ difficulty: 400 }, 415));
assert(!matchesPuzzleTarget({ difficulty: 400 }, 600));
assert(matchesPuzzleTarget({ difficulty: 600 }, 600));
assert(!matchesPuzzleTarget({ difficulty: 1000 }, 795));

const { findPuzzle } = await import("../game/puzzle-prefetch.js");
const selected = await findPuzzle({ run: async (_, payload) => {
  assert.equal(payload.rating, 415);
  return { id: "verified", difficulty: 400 };
} }, { category: "material", rating: 415, recent: [] }, () => 17211);
assert.equal(selected.targetRating, 415);

const { createPuzzlePrefetch } = await import("../game/puzzle-prefetch.js");
const warmupRequests = [];
let warmupReply = { difficulty: 400, id: "prepared" };
globalThis.Worker = class {
  constructor() {
    queueMicrotask(() => this.onmessage({ data: { ready: true } }));
  }
  postMessage({ id, payload }) {
    warmupRequests.push(payload);
    queueMicrotask(() => this.onmessage({ data: { id, result: warmupReply } }));
  }
  terminate() {}
};
const practice = {
  category: "checkmate", rating: 400, recent: [], rated: [], seed: 5,
  active: { puzzle: { id: "active", targetRating: 400 }, hearts: 3 }
};
let prefetch = createPuzzlePrefetch(practice);
assert.equal((await prefetch.take(405)).targetRating, 405);
assert.deepEqual(warmupRequests.map(request => request.rating), [415]);
assert.deepEqual(warmupRequests[0].recent, ["active"]);
prefetch.close();

practice.rating = 595;
practice.active.puzzle.targetRating = 595;
prefetch = createPuzzlePrefetch(practice);
assert.equal(prefetch.take(595), undefined, "A search started in the next tier cannot be reused");

practice.rating = 400;
practice.active.puzzle.targetRating = 400;
warmupReply = { retry: true };
const beforeMiss = warmupRequests.length;
prefetch = createPuzzlePrefetch(practice);
assert.equal(await prefetch.take(415), undefined);
assert.equal(warmupRequests.length, beforeMiss + 1, "An empty speculative batch leaves the next search to the actual rating");
