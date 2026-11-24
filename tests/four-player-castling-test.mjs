import { readFile } from "node:fs/promises";
import { LuauState } from "../game/vendor/luau-web.js";

const rules = await readFile(new URL("../game/rules/four-player-chess.luau", import.meta.url), "utf8");
const vm = await LuauState.createAsync();
await vm.loadstring(`
local Four=(function()
${rules}
end)()
local fixtures={
 {"R","h1","k1","j1","i1","d1","f1","g1"},
 {"B","a8","a11","a10","a9","a4","a6","a7"},
 {"Y","g14","d14","e14","f14","k14","i14","h14"},
 {"G","n7","n4","n5","n6","n11","n9","n8"},
}
local function castle(state,from,to)
 for _,move in ipairs(Four.legalMoves(state,from)) do
  if move.to==to and move.special=="castle" then return move end
 end
end
for _,f in ipairs(fixtures) do
 local side,king,shortRook,shortEnd,shortTransit,longRook,longEnd,longTransit=table.unpack(f)
 local state=Four.initial()
 state.turn=side
 assert(not castle(state,king,shortEnd),side.." starts blocked")
 state.board={[king]=side.."K",[shortRook]=side.."R",[longRook]=side.."R"}
 for _,target in ipairs({{shortRook,shortEnd,shortTransit},{longRook,longEnd,longTransit}}) do
  local rook,destination,transit=table.unpack(target)
  local option=assert(castle(state,king,destination),side.." castle missing")
  local after=Four.apply(state,option)
  assert(after.board[destination]==side.."K" and after.board[transit]==side.."R")
  assert(not after.board[king] and not after.board[rook] and not after.castling[rook])
  assert(after.lastMove.special=="castle" and state.castling[rook] and state.board[king]==side.."K")
  state.board[transit]=side.."N"
  assert(not castle(state,king,destination),side.." castled through a piece")
  state.board[transit]=nil
 end
end
local function redBoard()
 local state=Four.initial()
 state.board={h1="RK",k1="RR",d1="RR"}
 return state
end
for _,square in ipairs({"h5","i5","j5"}) do
 local state=redBoard()
 state.board[square]="BR"
 assert(not castle(state,"h1","j1"),"castle through attack from "..square)
 state.eliminated.B=true
 assert(castle(state,"h1","j1"),"eliminated piece should not attack")
end
local state=redBoard()
local moved=Four.apply(state,{from="k1",to="k2"})
local returned=Four.apply(moved,{from="k2",to="k1"})
returned.turn="R"
assert(not castle(returned,"h1","j1") and castle(returned,"h1","f1"))
moved=Four.apply(state,{from="h1",to="h2"})
returned=Four.apply(moved,{from="h2",to="h1"})
returned.turn="R"
assert(not castle(returned,"h1","j1") and not castle(returned,"h1","f1"))
state.board.k2="BR"
local captured=Four.apply(state,{from="k2",to="k1"})
assert(not captured.castling.k1 and state.castling.k1)
`, "Four-player castling", true)();
console.log("Both castles for every color, blocking, attacked squares, lost rights and board updates passed.");
