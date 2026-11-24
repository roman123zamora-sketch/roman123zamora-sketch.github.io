import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { levelEntries, levels,
  puzzleCategories, puzzleChoice, puzzlesPerCategory, puzzlesPerLevel } from "../game/puzzle-library.js";
import { LuauState } from "../game/vendor/luau-web.js";

const read = path => readFile(new URL("../game/" + path, import.meta.url), "utf8");
const index = JSON.parse(await readFile(new URL("../assets/puzzles/index.json", import.meta.url), "utf8"));
const published = await Promise.all(Object.entries(index).flatMap(([category, entries]) =>
  entries.map(async entry => {
    const puzzle = JSON.parse(await readFile(
      new URL(`../assets/puzzles/${category}/${entry.id}.json`, import.meta.url), "utf8"));
    assert.equal(puzzle.id, entry.id);
    assert.equal(puzzle.difficulty, entry.difficulty);
    assert.equal(puzzle.idea, entry.idea);
    assert.equal(puzzle.revision, entry.revision);
    assert.match(puzzle.fen, /^[^ ]+ [wb] [^ ]+ [^ ]+ \d+ \d+$/);
    assert(["PGN Mentor", "Exalted self-play"].includes(puzzle.source.archive));
    return puzzle;
  })));
const puzzles = published;
const alternateStep = puzzles.flatMap(puzzle => puzzle.steps).find(step => step.alternatives?.length);
assert(alternateStep, "The revised library contains verified alternate solutions");
assert.equal(puzzleChoice(alternateStep, alternateStep.alternatives[0].steps[0].move), alternateStep.alternatives[0]);
assert(puzzles.length >= levels.length * puzzlesPerLevel);
assert.equal(new Set(puzzles.map(puzzle => puzzle.id)).size, puzzles.length);
assert.equal(new Set(puzzles.map(puzzle => puzzle.fen.split(" ")[0])).size, puzzles.length);
for (const level of levels.keys()) {
  const deck = levelEntries(puzzles, level);
  for (const category of puzzleCategories) {
    assert(deck.filter(puzzle => puzzle.category === category).length >= puzzlesPerCategory);
  }
}
assert.deepEqual(Object.keys(index).sort(), ["checkmate", "material"]);
const step = puzzles[0].steps[0];
assert.equal(puzzleChoice(step, step.move), step);
assert.equal(puzzleChoice(step, { from: step.move.to, to: step.move.from }), undefined);
const [mate, different] = puzzles.filter(puzzle => puzzle.category === "checkmate" && puzzle.line.length === 1);
assert.notEqual(mate.id, different.id);
for (const puzzle of puzzles) {
  assert(puzzle.origin.history.length >= 12);
  if (puzzle.category === "material") {
    assert([2, 3].includes(puzzle.materialProof));
    assert(puzzle.gain >= 175);
  }
}

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
${generator.replace(/return Puzzle\s*$/, "Puzzle.proveForTest=mateProof; Puzzle.exchangeForTest=exchange; Puzzle.defenseForTest=defense; return Puzzle")}
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
local function sameBoard(actual, expected, id)
 for square,piece in pairs(actual.board) do assert(expected.board[square]==piece,id.." missing piece on "..square) end
 for square,piece in pairs(expected.board) do assert(actual.board[square]==piece,id.." extra piece on "..square) end
 assert(actual.turn==expected.turn and Chess.status(actual)==expected.status,id.." displayed state differs from legal replay")
end
local function sameMove(a,b)
 return a.from==b.from and a.to==b.to and a.promotion==b.promotion
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
local verified=assert(Puzzle.validate(Chess,Bot,replyFixture,Chess.allLegal(replyFixture),"checkmate",1200,os.clock()+5,true,2))
assert(#verified==3)
local black=apply(replyFixture,verified[1])
local selected=assert(Puzzle.bestBlackMove(Chess,Bot,black,Chess.allLegal(black),os.clock()+1,true))
assert(mateCount(apply(black,selected))>=1)
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
 for _,move in ipairs(puzzle.origin.history) do state=apply(state,move) end
 for square,piece in pairs(state.board) do assert(puzzle.origin.board[square]==piece) end
 for square,piece in pairs(puzzle.origin.board) do assert(state.board[square]==piece) end
 assert(state.turn==puzzle.side and state.ep==puzzle.origin.ep)
 for right,value in pairs(state.castling) do assert(puzzle.origin.castling[right]==value) end
 local final=state
 for ply,move in ipairs(puzzle.line) do
  if puzzle.category=="checkmate" and ply%2==1 then
   local turns=math.floor((#puzzle.line-ply+2)/2)
   local accepted
   if turns==1 then
    assert(mateCount(final)==1,puzzle.id.." has an ambiguous final mate")
   else
    assert(not Puzzle.proveForTest(Chess,final,turns-1,true,function() end,false),puzzle.id.." has a shorter mate")
    for _,option in ipairs(Chess.allLegal(final)) do
     local defended=Chess.apply(final,option)
     if Puzzle.proveForTest(Chess,defended,turns-1,false,function() end,false) then
      assert(not accepted,puzzle.id.." has an ambiguous displayed move")
      accepted=option
     end
    end
    assert(accepted and accepted.from==move.from and accepted.to==move.to and
      accepted.promotion==move.promotion,puzzle.id.." does not force the stated mate")
   end
  end
  local step=puzzle.steps[math.ceil(ply/2)]
  if ply%2==1 then
   assert(sameMove(move,step.move),puzzle.id.." has a mismatched solver move")
   local legal=Chess.allLegal(final)
   for _,alternative in ipairs(step.alternatives or {}) do
    local branch=final
    for i,option in ipairs(alternative.line) do
     local frame=alternative.steps[math.ceil(i/2)]
     assert(sameMove(option,i%2==1 and frame.move or frame.response))
     branch=apply(branch,option)
     sameBoard(branch,i%2==1 and (frame.afterMove or frame.position) or frame.position,puzzle.id)
    end
    assert(balance(branch,puzzle.side)>=math.max(100,balance(state,puzzle.side)+puzzle.gain),
     puzzle.id.." alternate does not earn the promised gain")
   end
   assert(#legal==#step.legal,puzzle.id.." has a mismatched legal-move list")
   for _,option in ipairs(legal) do
    local found=false
    for _,displayed in ipairs(step.legal) do if sameMove(option,displayed) then found=true; break end end
    assert(found,puzzle.id.." omitted a legal move")
   end
   final=apply(final,move)
   sameBoard(final,step.afterMove or step.position,puzzle.id)
  else
   assert(sameMove(move,step.response),puzzle.id.." has a mismatched defender move")
   final=apply(final,move)
   sameBoard(final,step.position,puzzle.id)
  end
 end
 if puzzle.category=="checkmate" then
  assert(Chess.status(final)=="checkmate")

 else
  assert(balance(final,puzzle.side)>=100)
  local target=balance(state,puzzle.side)+puzzle.gain
  assert(balance(final,puzzle.side)>=target)
  if puzzle.materialProof==2 then
   assert(Puzzle.defenseForTest(Chess,state,puzzle.line[1],puzzle.side,function() end,target,puzzle.intermediateChecks)>=target)
  else
   assert(puzzle.verification.depth>=15 and #puzzle.verification.replies>0)
   for _,reply in ipairs(puzzle.verification.replies) do
    local branch=apply(state,puzzle.line[1])
    local payoff=false
    for index,move in ipairs(reply.line) do
     branch=apply(branch,move)
     if index%2==0 and balance(branch,puzzle.side)>=target then payoff=true end
    end
    assert((payoff or balance(apply(state,puzzle.line[1]),puzzle.side)>=target) and balance(branch,puzzle.side)>=target)
    assert(Chess.status(branch)~="checkmate")
   end
  end

 end
end
`, "Puzzle proofs", true)();
} finally {
  vm.destroy();
}

await import("./puzzle-progression-test.mjs");
