import { readFile } from "node:fs/promises";
import { LuauState } from "../game/vendor/luau-web.js";

const read = path => readFile(new URL(path, import.meta.url), "utf8");
const [standard, fourPlayer, engine] = await Promise.all([
  read("../game/rules/standard-chess.luau"),
  read("../game/rules/four-player-chess.luau"),
  read("../game/engine/bot-search.luau")
]);
const load = (name, source) => `local ${name}=(function()\n${source}\nend)()\n`;
const checks = `
local function fixture(board)
 local state={board=board,turn="w",castling={},halfmove=0,fullmove=1,history={},positions={}}
 state.positions[Chess.positionKey(state)]=1
 return state
end
local function legal(engine,state,move)
 for _,option in ipairs(engine.legalMoves(state,move.from)) do
  if option.to==move.to and option.promotion==move.promotion then return true end
 end
 return false
end
local mate=fixture({f6="wK",f7="wQ",h8="bK"})
local move=Bot.choose(Chess,mate,1000,{timeMs=400,depth=2})
assert(legal(Chess,mate,move) and Chess.status(Chess.apply(mate,move))=="checkmate")
assert(Bot.choose(Chess,Chess.apply(mate,move),1000)==nil)
assert(Bot.choose(Chess,fixture({a1="wK",h8="bK"}),1000)==nil)
local start=Chess.initial()
local key=Chess.positionKey(start)
local fallback=Bot.choose(Chess,start,1000,{timeMs=0})
assert(legal(Chess,start,fallback))
local mover=Bot.choose(Chess,start,1000,{timeMs=300,depth=2})
assert(legal(Chess,start,mover))
assert(Chess.positionKey(start)==key and #start.history==0 and start.positions[key]==1)
assert(Chess.allLegal(start,"b")[1] and start.turn=="w")

-- Live difficulty can choose a weaker legal move without weakening analysis.
local function fixedRandom() return 0 end
local best,bestInfo=Bot.choose(Chess,start,400,{depth=1,timeMs=350})
local beginner,beginnerInfo=Bot.choose(Chess,start,400,{depth=1,timeMs=350,gameplay=true,random=fixedRandom})
assert(legal(Chess,start,beginner) and beginnerInfo.score<bestInfo.score)
assert(beginner.from~=best.from or beginner.to~=best.to)
local strongest=Bot.choose(Chess,start,3000,{depth=1,timeMs=350,gameplay=true,random=fixedRandom})
assert(strongest.from==best.from and strongest.to==best.to)
assert(Bot.clampRating(4000)==3000 and Bot.clampRating(100)==200)
assert(Bot.clampRating("Max")=="Max" and #Bot.ratings==15)
local forced=fixture({a1="wK",c2="bK",b8="bR"})
assert(#Chess.allLegal(forced)==1)
local lastDepth,lastNodes=0,0
local ladder=table.clone(Bot.ratings)
table.insert(ladder,"Max")
for index,rating in ipairs(ladder) do
 if index<=15 then assert(rating==index*200) end
 local forcedMove,info=Bot.choose(Chess,forced,rating,{gameplay=true,timeMs=0})
 assert(legal(Chess,forced,forcedMove))
 assert(info.maxDepth>=lastDepth and info.maxNodes>lastNodes)
 lastDepth,lastNodes=info.maxDepth,info.maxNodes
end
local exact=Bot.choose(Chess,mate,"Max",{depth=2,timeMs=400,random=function() error("Max should never sample moves") end})
assert(Chess.status(Chess.apply(mate,exact))=="checkmate")

local four=Four.initial()
local order={"R","B","Y","G"}
for _,side in ipairs(order) do
 assert(four.turn==side)
 local turn=Bot.choose(Four,four,1000,{timeMs=130,depth=2})
 assert(legal(Four,four,turn))
 local before=four
 four=Four.apply(four,turn)
 assert(before.board[turn.from] and not four.board[turn.from])
end
assert(four.turn=="R" and #four.history==4)
four.eliminated.B=true
assert(#Four.allLegal(four,"B")==0)
local state={board={d1="RK",e5="RR",e6="BK",h14="YK",n7="GK"}, turn="R",
 eliminated={},scores={R=0,B=0,Y=0,G=0},history={},fullmove=1}
local capture
for _,move in ipairs(Four.legalMoves(state,"e5")) do if move.to=="e6" then capture=move end end
assert(capture)
local probe=Four.searchApply(state,capture)
assert(probe.board.e6=="RR" and state.board.e6=="BK" and #state.history==0)
local committed=Four.apply(state,capture)
assert(committed.scores.R==20 and committed.history[1].captured=="BK")
local castlePosition=Four.initial()
castlePosition.board={h1="RK",k1="RR",a8="BK",g14="YK",n7="GK"}
local castleOnly=table.clone(Four)
castleOnly.allLegal=function(position)
 if position~=castlePosition then return Four.allLegal(position) end
 for _,option in ipairs(Four.legalMoves(position,"h1")) do
  if option.special=="castle" then return {option} end
 end
 return {}
end
local castle=Bot.choose(castleOnly,castlePosition,1000,{depth=1,timeMs=150})
local castled=Four.apply(castlePosition,castle)
assert(castled.board.j1=="RK" and castled.board.i1=="RR")

for _,kind in ipairs({"Q","R","B","N"}) do
 local promotion=Four.initial()
 promotion.board={d7="RP",e11="BR",d11="YN"}
 local promoted=Four.apply(promotion,{from="d7",to="d8",promotion=kind})
 assert(promoted.board.d8=="R"..kind and promoted.promoted.d8 and not promotion.promoted.d8)
 local relocated=Four.apply(promoted,{from="d8",to="e9"})
 assert(relocated.promoted.e9 and not relocated.promoted.d8 and promoted.promoted.d8)
 local captured=Four.apply(relocated,{from="e11",to="e9"})
 assert(captured.scores.B==1 and captured.history[3].captureValue==1)
 assert(not captured.promoted.e9 and relocated.promoted.e9)
 local capturedRook=Four.apply(captured,{from="d11",to="e9"})
 assert(capturedRook.scores.Y==5 and capturedRook.history[4].captureValue==5)
end

`;
const vm = await LuauState.createAsync();
try {
  const source = load("Chess", standard) + load("Four", fourPlayer) + load("Bot", engine) + checks;
  await vm.loadstring(source, "Engine search tests", true)();
} finally {
  vm.destroy();
}
console.log("Legal search, position isolation, mate, draw, deadline fallback and four-player turn order passed.");
