// Offline strength smoke test. Use --production for actual move budgets.
import { readFile } from "node:fs/promises";
import { LuauState } from "../game/vendor/luau-web.js";

const read = path => readFile(new URL("../game/" + path, import.meta.url), "utf8");
const [rules, bot] = await Promise.all([read("rules/standard-chess.luau"), read("engine/bot-search.luau")]);
const production = process.argv.includes("--production");
const pairFilter = process.argv.find(argument => argument.startsWith("--pair="))?.slice("--pair=".length);
const vm = await LuauState.createAsync();
try {
  await vm.loadstring(`
local Chess=(function()\n${rules}\nend)()
local Bot=(function()\n${bot}\nend)()
local ratings=table.clone(Bot.ratings)
table.insert(ratings,"Max")
local function key(move) return move.from..move.to..(move.promotion or "") end
local function apply(state,notation)
 for _,move in ipairs(Chess.legalMoves(state,string.sub(notation,1,2))) do
  if key(move)==notation then return Chess.apply(state,move) end
 end
 error("Illegal benchmark move "..notation)
end
local function fixture(board,turn)
 local state={board=board,turn=turn or "w",castling={},halfmove=0,fullmove=1,history={},positions={}}
 state.positions[Chess.positionKey(state)]=1
 return state
end
local cases={
 {"Hanging queen",fixture({g1="wK",h8="bK",a1="wR",a7="bQ"}),"a1a7"},
 {"Mate in one",fixture({f6="wK",f7="wQ",h8="bK"}),"f7g7"},
 {"Poisoned rook",fixture({h1="wK",e8="bK",d4="wQ",g2="wP",d5="bR",e6="bB",g7="bP"}),"!d4d5"},
 {"Quiet defense",fixture({g1="wK",h8="bK",a2="wR",g2="wP",h2="wN",e1="bR",b4="bB"}),{h2f1=true,g1f2=true}},
 {"Branching tactic",fixture({g1="wK",g8="bK",a1="wR",d1="wQ",c3="wN",d5="wP",e4="bQ",a8="bR",f7="bP",g7="bP"}),"a1a8"},
 {"Pawn endgame",fixture({e3="wK",e2="wP",d5="bK"}),{e3d3=true,e3f3=true,e3f4=true}}
}
function runPositions(index)
  local rating=ratings[index]
  local result={}
  for i,case in ipairs(cases) do
   local found=0
   for seed=1,6 do
    math.randomseed(seed+180*i)
    local move=assert(Bot.choose(Chess,case[2],rating,{gameplay=true}))
    local ordered=key(move)
    apply(case[2],ordered)
    local expected=case[3]
    local match
    if i==2 then match=Chess.status(apply(case[2],ordered))=="checkmate"
    elseif type(expected)=="table" then match=expected[ordered]
    elseif string.sub(expected,1,1)=="!" then match=ordered~=string.sub(expected,2)
    else match=ordered==expected end
    if match then found+=1 end
   end
   table.insert(result,found)
  end
  return tostring(rating).." "..table.concat(result,"/")
end
local openings={
 {"e2e4","c7c6","d2d4","d7d5","b1c3","d5e4","c3e4","c8f5"},
 {"d2d4","d7d5","c2c4","e7e6","b1c3","g8f6","c1g5","f8e7"}
}
local reduced={}
for _,rating in ipairs(ratings) do
 local _,info=Bot.choose(Chess,Chess.initial(),rating,{gameplay=true,timeMs=0})
 reduced[rating]=math.max(50,math.floor(info.maxNodes/34))
end
function runGame(pair,opening,strongerSide)
 math.randomseed(330+pair*31+opening)
 local state=Chess.initial()
 for _,move in ipairs(openings[opening]) do state=apply(state,move) end
 for ply=0,144 do
  local status=Chess.status(state)
  if status=="checkmate" then return state.turn==strongerSide and "loss" or "win",ply end
  if status=="draw" or status=="stalemate" or Chess.claimReason(state) then return "draw",ply end
  if ply==144 then return "cap",ply end
  local rating=ratings[state.turn==strongerSide and pair+1 or pair]
  local options=${production ? "{gameplay=true}" : "{gameplay=true,timeMs=14,nodes=reduced[rating]}"}
  state=apply(state,key(assert(Bot.choose(Chess,state,rating,options))))
 end
end
`, "Bot ladder benchmark", true)();
  const run = (name, args = "") => vm.loadstring(`return ${name}(${args})`, name, true)();
  const levels = Array.from({ length: 15 }, (_, i) => 200 * (i + 1)).concat("Max");
  if (!process.argv.includes("--games-only")) {
    console.log("Hits of six per level: hanging queen / mate / avoid poisoned rook / quiet defense / branching / endgame.");
    console.log("Expected moves are fixed fixtures, with alternatives accepted for quiet defense and the pawn endgame.");
    for (let index = 1; index <= levels.length; index++) console.log((await run("runPositions", index))[0]);
  }
  if (!process.argv.includes("--positions-only")) {
    console.log(production ? "Production budgets." : "Reduced budgets: 14 ms and 1/34 of each level's node allowance.");
    for (let pair = 1; pair < levels.length; pair++) {
      if (pairFilter && pairFilter !== String(levels[pair])) continue;
      const tally = { win: 0, loss: 0, draw: 0, cap: 0 };
      for (const opening of [1, 2]) {
        for (const side of ["w", "b"]) {
          const [result] = await run("runGame", `${pair},${opening},"${side}"`);
          tally[result]++;
        }
      }
      console.log(`${levels[pair]} vs ${levels[pair - 1]}`, tally);
    }
  }
} finally {
  vm.destroy();
}
