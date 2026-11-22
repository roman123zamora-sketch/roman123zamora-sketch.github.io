import {execFileSync} from "node:child_process";
import {readFile} from "node:fs/promises";
import {LuauState} from "../game/vendor/luau-web.js";
const read=path=>readFile(new URL(path,import.meta.url),"utf8");
const revision = process.argv[2] ?? "e4b8329";
const rating = Number(process.argv[3] ?? 1000);
if (!Number.isInteger(rating) || rating < 400 || rating > 2400) throw new Error("Rating must be 400–2400.");
const old = execFileSync("git", ["show", revision + ":game/engine/bot-search.luau"], {
  cwd: new URL("../", import.meta.url), encoding: "utf8"
});
const [rules, candidate] = await Promise.all([
  read("../game/rules/standard-chess.luau"), read("../game/engine/bot-search.luau")
]);
// Apply the same clock ceiling to the earlier engine at its existing budget checks.
const baseline=old.replace("local budget={nodes=prof.nodes or math.huge}",`local deadline=os.clock()+0.06
 local remaining=prof.nodes
 local budget=setmetatable({},{
  __index=function() return os.clock()>=deadline and 0 or remaining end,
  __newindex=function(_,_,value) remaining=value end
 })`);
const vm=await LuauState.createAsync();
const wrap=(name,source)=>`local ${name}=(function()\n${source}\nend)()\n`;
const script=wrap("Chess",rules)+wrap("Old",baseline)+wrap("New",candidate)+`
local function moveKey(move) return move and (move.from..move.to..(move.promotion or "")) or "none" end
local function play(state,notation)
 for _,move in ipairs(Chess.legalMoves(state,notation:sub(1,2))) do
  if moveKey(move)==notation then return Chess.apply(state,move) end
 end
 error("Bad benchmark position: "..notation)
end
local function pos(board,turn)
 local state={board=board,turn=turn or "w",castling={},halfmove=0,fullmove=1,history={},positions={}}
 state.positions[Chess.positionKey(state)]=1
 return state
end
local tactics={
 {pos({f6="wK",f7="wQ",h8="bK"}),"f7g7"},
 {pos({g1="wK",h8="bK",a1="wR",a7="bQ"}),"a1a7"},
 {pos({g1="wK",h8="bK",c3="wN",d5="wP",e4="bQ"}),"c3e4"},
 {pos({e1="wK",h8="bK",d2="wB",h6="bR"}),"d2h6"},
 {pos({a1="wK",h8="bK",g7="wP"}),"g7g8Q"}
}
function tactical()
 local report={}
 for i,test in ipairs(tactics) do
  local state,expected=test[1],test[2]
  math.randomseed(412+i)
  local a=Old.choose(Chess,state,${rating})
  local b=New.choose(Chess,state,${rating},{timeMs=60})
  report[i]=expected..":"..moveKey(a)..":"..moveKey(b)
 end
 return table.concat(report,", ")
end
local starts={
 {},
 {"e2e4","c7c6","d2d4","d7d5","b1c3","d5e4","c3e4","c8f5"},
 {"d2d4","d7d5","c2c4","e7e6","b1c3","g8f6","c1g5","f8e7"},
 {"e2e4","e7e5","g1f3","b8c6","f1c4","f8c5"}
}
function game(i,newSide)
 math.randomseed(900+i)
 local state=Chess.initial()
 for _,m in ipairs(starts[i]) do state=play(state,m) end
 local count,oldTime,newTime,oldN,newN,oldMax,newMax=0,0,0,0,0,0,0
 while count<120 do
  local status=Chess.status(state)
  if status=="checkmate" then return state.turn==newSide and "loss" or "win",count,oldTime,oldN,newTime,newN,oldMax,newMax end
  if status=="draw" or status=="stalemate" or Chess.claimReason(state) then return "draw",count,oldTime,oldN,newTime,newN,oldMax,newMax end
  local current=state.turn==newSide
  local start=os.clock()
  local move
  if current then move=New.choose(Chess,state,${rating},{timeMs=60}) else move=Old.choose(Chess,state,${rating}) end
  local elapsed=os.clock()-start
  if current then newTime+=elapsed; newN+=1; newMax=math.max(newMax,elapsed)
  else oldTime+=elapsed; oldN+=1; oldMax=math.max(oldMax,elapsed) end
  state=play(state,moveKey(move))
  count+=1
 end
 return "cap",count,oldTime,oldN,newTime,newN,oldMax,newMax
end
`;
try {
  await vm.loadstring(script, "Benchmark setup", true)();
  console.log(`Baseline ${revision} vs working tree, level ${rating}, 60 ms per side, 120-ply cap.`);
  console.log("Tactics (expected:baseline:candidate)", ...(await vm.loadstring("return tactical()", "Tactics", true)()));
  const record = { win: 0, loss: 0, draw: 0, cap: 0 };
  let baselineTime = 0, baselineTurns = 0, baselinePeak = 0;
  let currentTime = 0, currentTurns = 0, currentPeak = 0;
  for (let position = 1; position <= 4; position++) {
    for (const side of ["w", "b"]) {
      const [result, plies, oldTime, oldN, newTime, newN, oldMax, newMax] =
        await vm.loadstring(`return game(${position},"${side}")`, "Benchmark game", true)();
      record[result]++;
      baselineTime += oldTime; baselineTurns += oldN; baselinePeak = Math.max(baselinePeak, oldMax);
      currentTime += newTime; currentTurns += newN; currentPeak = Math.max(currentPeak, newMax);
      console.log(`Position ${position}, candidate as ${side === "w" ? "White" : "Black"}: ${result}, ${plies} plies.`);
    }
  }
  console.log(record, {
    baselineMeanMs: Math.round(baselineTime / baselineTurns * 1000),
    candidateMeanMs: Math.round(currentTime / currentTurns * 1000),
    baselinePeakMs: Math.round(baselinePeak * 1000),
    candidatePeakMs: Math.round(currentPeak * 1000)
  });
} finally {
  vm.destroy();
}
