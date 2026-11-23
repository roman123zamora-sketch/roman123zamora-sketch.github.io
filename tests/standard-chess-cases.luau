local function position(board, options)
 local result={board=board,turn="w",castling={},halfmove=0,fullmove=1,history={},positions={}}
 for key,value in pairs(options or {}) do result[key]=value end
 result.positions[Chess.positionKey(result)]=1
 return result
end

local function legal(state,from,to,promotion)
 for _,move in ipairs(Chess.legalMoves(state,from)) do
  if move.to==to and move.promotion==promotion then return move end
 end
end

local function play(state,from,to,promotion)
 return Chess.apply(state,assert(legal(state,from,to,promotion),from.."-"..to))
end

local function perft(state,depth)
 if depth==0 then return 1 end
 local nodes=0
 for _,move in ipairs(Chess.allLegal(state)) do
  nodes+=perft(Chess.searchApply(state,move),depth-1)
 end
 return nodes
end
local start=Chess.initial()
assert(perft(start,1)==20 and perft(start,2)==400 and perft(start,3)==8902)
assert(start.board.e1=="wK" and start.board.d1=="wQ" and start.board.e8=="bK")
assert(not legal(start,"a2","h3"))

local castle=position({e1="wK",h1="wR",e8="bK"},{castling={wK=true}})
assert(play(castle,"e1","g1").board.f1=="wR")
castle.board.f8="bR"
assert(not legal(castle,"e1","g1"))
castle.board.f8=nil; castle.board.h1=nil
assert(not legal(castle,"e1","g1"))
local queenSide=position({e1="wK",a1="wR",b1="wN",e8="bK"},{castling={wQ=true}})
assert(not legal(queenSide,"e1","c1"))

local ep=position({e1="wK",e8="bR",a8="bK",e5="wP",d5="bP"},{ep="d6"})
assert(not legal(ep,"e5","d6"))
local key=Chess.positionKey(ep)
ep.ep=nil
assert(key==Chess.positionKey(ep))
ep.board.e8=nil; ep.ep="d6"
local capture=play(ep,"e5","d6")
assert(capture.board.d6=="wP" and not capture.board.d5)
key=Chess.positionKey(ep)
ep.ep=nil
assert(key~=Chess.positionKey(ep))

local promotion=position({h1="wK",h8="bK",a7="wP"})
for _,piece in ipairs({"Q","R","B","N"}) do
 assert(play(promotion,"a7","a8",piece).board.a8=="w"..piece)
end

local mate=position({h8="bK",g7="wQ",f6="wK"},{turn="b",halfmove=150})
assert(Chess.status(mate)=="checkmate")
assert(Chess.status(position({h8="bK",f7="wQ",f6="wK"},{turn="b"}))=="stalemate")
assert(Chess.status(position({a1="wK",h8="bK",c1="wB"}))=="draw")
assert(Chess.insufficientMaterial(position({a1="wK",h8="bK",c1="wB",f8="bB"})))
assert(not Chess.insufficientMaterial(position({a1="wK",h8="bK",c1="wB",c8="bB"})))
assert(not Chess.insufficientMaterial(position({a1="wK",h8="bK",c1="wN",d1="wN"})))

local counter=position({a1="wK",h8="bK",c1="wR"},{halfmove=99})
assert(not Chess.claimReason(counter))
assert(Chess.claimReason(counter,legal(counter,"c1","c2"))=="50-move rule")
counter.halfmove=100
assert(Chess.claimReason(counter)=="50-move rule" and Chess.status(counter)=="playing")
counter.halfmove=150
local status,reason=Chess.status(counter)
assert(status=="draw" and reason=="75-move rule")

local state=start
for cycle=1,4 do
 state=play(state,"g1","f3")
 state=play(state,"g8","f6")
 state=play(state,"f3","g1")
 if cycle==2 then
  assert(Chess.mayClaimWithMove(state))
  assert(Chess.claimReason(state,legal(state,"f6","g8"))=="Threefold repetition")
 end
 state=play(state,"f6","g8")
 if cycle==2 then assert(Chess.claimReason(state)=="Threefold repetition" and Chess.status(state)=="playing") end
end
status,reason=Chess.status(state)
assert(status=="draw" and reason=="Fivefold repetition")
assert(Chess.initial().positions[Chess.positionKey(start)]==1)

-- Kiwipete exercises open lines, castling and tactical king-safety checks.
local kiwiBoard={
 a8="bR",e8="bK",h8="bR",
 a7="bP",c7="bP",d7="bP",e7="bQ",f7="bP",g7="bB",
 a6="bB",b6="bN",e6="bP",f6="bN",g6="bP",
 d5="wP",e5="wN",b4="bP",e4="wP",c3="wN",f3="wQ",h3="bP",
 a2="wP",b2="wP",c2="wP",d2="wB",e2="wB",f2="wP",g2="wP",h2="wP",
 a1="wR",e1="wK",h1="wR"
}
local kiwi=position(kiwiBoard,{castling={wK=true,wQ=true,bK=true,bQ=true}})
assert(perft(kiwi,1)==48 and perft(kiwi,2)==2039 and perft(kiwi,3)==97862)
