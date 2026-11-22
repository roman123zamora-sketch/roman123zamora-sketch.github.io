-- Standard chess rules module. Board keys use fixed algebraic square names.
local Engine = {}
local files = "abcdefgh"
local function xy(s) return string.find(files, string.sub(s,1,1),1,true), tonumber(string.sub(s,2,2)) end
local function sq(x,y) if x and y and x>=1 and x<=8 and y>=1 and y<=8 then return string.sub(files,x,x)..tostring(y) end end
function Engine.initial()
 local b={}; for x=1,8 do b[sq(x,2)]="wP"; b[sq(x,7)]="bP" end
 local row={"R","N","B","Q","K","B","N","R"}; for x=1,8 do b[sq(x,1)]="w"..row[x]; b[sq(x,8)]="b"..row[x] end
 local state={board=b,turn="w",castling={wK=true,wQ=true,bK=true,bQ=true},halfmove=0,fullmove=1,history={},positions={}}
 state.positions[Engine.positionKey(state)]=1
 return state
end
local function attacked(board,target,by)
 local tx,ty=xy(target)
 local pawnY=ty+(by=="w" and -1 or 1)
 for _,dx in ipairs({-1,1}) do if board[sq(tx+dx,pawnY)]==by.."P" then return true end end
 for _,d in ipairs({{1,2},{2,1},{2,-1},{1,-2},{-1,-2},{-2,-1},{-2,1},{-1,2}}) do if board[sq(tx+d[1],ty+d[2])]==by.."N" then return true end end
 for _,d in ipairs({{1,0},{-1,0},{0,1},{0,-1},{1,1},{1,-1},{-1,1},{-1,-1}}) do
  local x,y=tx+d[1],ty+d[2]; local distance=1
  while sq(x,y) do local p=board[sq(x,y)]; if p then if string.sub(p,1,1)==by then local typ=string.sub(p,2,2); if typ=="Q" or (distance==1 and typ=="K") or (distance>=1 and ((d[1]==0 or d[2]==0) and typ=="R" or (d[1]~=0 and d[2]~=0 and typ=="B"))) then return true end end; break end; x+=d[1]; y+=d[2]; distance+=1 end
 end
 return false
end
function Engine.inCheck(state,color)
 local king; for s,p in pairs(state.board) do if p==color.."K" then king=s; break end end
 if not king then return true end
 return attacked(state.board,king,color=="w" and "b" or "w")
end
local function pseudo(state,from)
 local p=state.board[from]; if not p then return {} end
 local color,typ=string.sub(p,1,1),string.sub(p,2,2); local x,y=xy(from); local out={}
 local function add(to,promotion,special)
  if not to then return end
  local target=state.board[to]
  if target and (string.sub(target,1,1)==color or string.sub(target,2,2)=="K") then return end
  if promotion then
   for _,kind in ipairs({"Q","R","B","N"}) do table.insert(out,{from=from,to=to,promotion=kind}) end
  else
   table.insert(out,{from=from,to=to,special=special})
  end
 end
 if typ=="P" then
  local dir=color=="w" and 1 or -1; local ny=y+dir
  if sq(x,ny) and not state.board[sq(x,ny)] then add(sq(x,ny),ny==(color=="w" and 8 or 1) and "Q" or nil); if y==(color=="w" and 2 or 7) and not state.board[sq(x,y+2*dir)] then add(sq(x,y+2*dir),nil,"double") end end
  for _,dx in ipairs({-1,1}) do local to=sq(x+dx,ny); if to and state.board[to] and string.sub(state.board[to],1,1)~=color then add(to,ny==(color=="w" and 8 or 1) and "Q" or nil) elseif to and to==state.ep and state.board[sq(x+dx,y)]==(color=="w" and "bP" or "wP") then add(to,nil,"enpassant") end end
 elseif typ=="N" then for _,d in ipairs({{1,2},{2,1},{2,-1},{1,-2},{-1,-2},{-2,-1},{-2,1},{-1,2}}) do add(sq(x+d[1],y+d[2])) end
 else
  local dirs={}; if typ=="R" or typ=="Q" or typ=="K" then for _,d in ipairs({{1,0},{-1,0},{0,1},{0,-1}}) do table.insert(dirs,d) end end; if typ=="B" or typ=="Q" or typ=="K" then for _,d in ipairs({{1,1},{1,-1},{-1,1},{-1,-1}}) do table.insert(dirs,d) end end
  for _,d in ipairs(dirs) do local nx,ny=x+d[1],y+d[2]; while sq(nx,ny) do local to=sq(nx,ny); if state.board[to] then add(to); break else add(to) end; if typ=="K" then break end; nx+=d[1]; ny+=d[2] end end
  if typ=="K" and not Engine.inCheck(state,color) then local rank=color=="w" and 1 or 8
   for _,side in ipairs({"K","Q"}) do local rookFile=side=="K" and 8 or 1; if x==5 and y==rank and state.castling[color..side] and state.board[sq(rookFile,rank)]==color.."R" then local step=side=="K" and 1 or -1; local clear=true; for fx=x+step,rookFile-step,step do if state.board[sq(fx,rank)] then clear=false end end; local safe=true; for fx=x+step,x+2*step,step do if attacked(state.board,sq(fx,rank),color=="w" and "b" or "w") then safe=false end end; if clear and safe then add(sq(x+2*step,rank),nil,"castle"..side) end end end
  end
 end
 return out
end
local function applyPosition(state,m)
 local n=table.clone(state)
 n.board=table.clone(state.board)
 n.castling=table.clone(state.castling)
 local p=n.board[m.from]; if not p then return nil end; local color,typ=string.sub(p,1,1),string.sub(p,2,2); local captured=n.board[m.to]
 n.board[m.from]=nil; if m.special=="enpassant" then local tx,ty=xy(m.to); local cs=sq(tx,ty+(color=="w" and -1 or 1)); captured=n.board[cs]; n.board[cs]=nil end
 if m.special=="castleK" or m.special=="castleQ" then local tx,ty=xy(m.to); local rank=ty; local rookFrom=sq(m.special=="castleK" and 8 or 1,rank); local rookTo=sq(m.special=="castleK" and tx-1 or tx+1,rank); n.board[rookTo]=n.board[rookFrom]; n.board[rookFrom]=nil end
 n.board[m.to]=color..(m.promotion or typ); n.ep=nil
 if m.special=="double" then local tx,ty=xy(m.to); n.ep=sq(tx,ty+(color=="w" and -1 or 1)) end
 if typ=="K" then n.castling[color.."K"]=false; n.castling[color.."Q"]=false end
 if m.from=="a1" then n.castling.wQ=false elseif m.from=="h1" then n.castling.wK=false elseif m.from=="a8" then n.castling.bQ=false elseif m.from=="h8" then n.castling.bK=false end
 if m.to=="a1" then n.castling.wQ=false elseif m.to=="h1" then n.castling.wK=false elseif m.to=="a8" then n.castling.bQ=false elseif m.to=="h8" then n.castling.bK=false end
 n.halfmove=(typ=="P" or captured) and 0 or n.halfmove+1; if color=="b" then n.fullmove+=1 end; n.turn=color=="w" and "b" or "w"; n.lastMove={from=m.from,to=m.to}; return n,{from=m.from,to=m.to,color=color,promotion=m.promotion,special=m.special,captured=captured}
end
function Engine.legalMoves(state,from,color)
 local p=state.board[from]; if not p or string.sub(p,1,1)~=(color or state.turn) then return {} end
 local out={}; for _,m in ipairs(pseudo(state,from)) do local n=applyPosition(state,m); if n and not Engine.inCheck(n,string.sub(p,1,1)) then table.insert(out,m) end end; return out
end
function Engine.allLegal(state,color)
 local old=state.turn; state.turn=color or old; local out={}; for s,p in pairs(state.board) do if string.sub(p,1,1)==state.turn then for _,m in ipairs(Engine.legalMoves(state,s)) do table.insert(out,m) end end end; state.turn=old; return out
end
-- A repetition includes en passant only when the side to move can legally capture.
function Engine.positionKey(state)
 local parts={state.turn}
 for _,right in ipairs({"wK","wQ","bK","bQ"}) do
  table.insert(parts,state.castling[right] and right or "-")
 end
 local ep="-"
 if state.ep then
  local x,y=xy(state.ep)
  local rank=y+(state.turn=="w" and -1 or 1)
  for _,dx in ipairs({-1,1}) do
   local from=sq(x+dx,rank)
   if from and state.board[from]==state.turn.."P" then
    for _,move in ipairs(Engine.legalMoves(state,from)) do
     if move.special=="enpassant" then ep=state.ep end
    end
   end
  end
 end
 table.insert(parts,ep)
 for rank=1,8 do
  for file=1,8 do table.insert(parts,state.board[sq(file,rank)] or "-") end
 end
 return table.concat(parts,"/")
end

function Engine.searchApply(state,move)
 local nextState=applyPosition(state,move)
 return nextState
end

function Engine.apply(state,move)
 local nextState,entry=applyPosition(state,move)
 if not nextState then return nil end
 nextState.history=table.clone(state.history)
 table.insert(nextState.history,entry)
 nextState.positions=table.clone(state.positions)
 local key=Engine.positionKey(nextState)
 nextState.positions[key]=(nextState.positions[key] or 0)+1
 return nextState
end

function Engine.insufficientMaterial(state)
 local minors=0
 local bishopColor
 local onlySameColorBishops=true
 for square,piece in pairs(state.board) do
  local kind=string.sub(piece,2,2)
  if kind=="P" or kind=="R" or kind=="Q" then return false end
  if kind=="B" or kind=="N" then minors+=1 end
  if kind=="N" then onlySameColorBishops=false end
  if kind=="B" then
   local file,rank=xy(square)
   local color=(file+rank)%2
   if bishopColor~=nil and color~=bishopColor then onlySameColorBishops=false end
   bishopColor=color
  end
 end
 return minors<=1 or onlySameColorBishops
end

function Engine.claimReason(state,move)
 local position=move and applyPosition(state,move) or state
 local repetitions=(state.positions[Engine.positionKey(position)] or 0)+(move and 1 or 0)
 if repetitions>=3 then return "Threefold repetition" end
 if position.halfmove>=100 then return "50-move rule" end
end

local function canTryClaim(state)
 if state.halfmove>=99 then return true end
 for _,count in pairs(state.positions) do
  if count>=2 then return true end
 end
 return false
end

function Engine.mayClaimWithMove(state)
 if not canTryClaim(state) then return false end
 for _,move in ipairs(Engine.allLegal(state,state.turn)) do
  if Engine.claimReason(state,move) then return true end
 end
 return false
end

function Engine.status(state)
 local moves=Engine.allLegal(state,state.turn)
 local checked=Engine.inCheck(state,state.turn)
 if #moves==0 then return checked and "checkmate" or "stalemate" end
 if Engine.insufficientMaterial(state) then return "draw","Insufficient material" end
 if (state.positions[Engine.positionKey(state)] or 0)>=5 then return "draw","Fivefold repetition" end
 if state.halfmove>=150 then return "draw","75-move rule" end
 return checked and "check" or "playing"
end

function Engine.public(state)
 local status,reason=Engine.status(state)
 local active=status=="playing" or status=="check"
 local claim=active and Engine.claimReason(state) or nil
 return {board=state.board,turn=state.turn,lastMove=state.lastMove,history=state.history,
  status=status,drawReason=reason,claimReason=claim,
  mayClaimWithMove=active and not claim and Engine.mayClaimWithMove(state),halfmove=state.halfmove,fullmove=state.fullmove}
end
return Engine
