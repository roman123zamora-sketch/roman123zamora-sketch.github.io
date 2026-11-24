-- Exalted Chess four-player Free-for-All engine on the canonical 14x14 cross board.
local E={}
local files="abcdefghijklmn"
E.colors={"R","B","Y","G"}
local dirs={R={0,1},B={1,0},Y={0,-1},G={-1,0}}
local squares,coordinates={},{}
for file=1,14 do
 squares[file]={}
 for rank=1,14 do
  if (file>=4 and file<=11) or (rank>=4 and rank<=11) then
   local square=string.sub(files,file,file)..rank
   squares[file][rank]=square
   coordinates[square]={file,rank}
  end
 end
end
local function xy(square)
 local point=coordinates[square]
 if point then return point[1],point[2] end
 return nil,nil
end
local function sq(file,rank)
 local column=squares[file]
 return column and column[rank]
end
-- Each pair follows the back rank from its low coordinate to its high coordinate.
local castleHomes={
 R={king="h1",rooks={"d1","k1"}}, B={king="a8",rooks={"a4","a11"}},
 Y={king="g14",rooks={"d14","k14"}}, G={king="n7",rooks={"n4","n11"}},
}
local function nextColor(color)
 for i,c in ipairs(E.colors) do if c==color then return E.colors[i%4+1] end end
 return "R"
end
E.nextColor=nextColor
-- Match score values for four-player chess: bishops and knights 3, rooks 5, queens 9, kings 20.
-- Grey pieces (owned by an eliminated side) are worth 0 when captured.
E.values={P=1,N=3,B=3,R=5,Q=9,K=20}
function E.initial()
 local b={}; local standard={"R","N","B","Q","K","B","N","R"}; local mirrored={"R","N","B","K","Q","B","N","R"}
 for i=1,8 do
  local x=i+3; b[sq(x,1)]="R"..standard[i]; b[sq(x,2)]="RP"
  b[sq(x,14)]="Y"..mirrored[i]; b[sq(x,13)]="YP"
  local y=i+3; b[sq(1,y)]="B"..standard[i]; b[sq(2,y)]="BP"
  b[sq(14,y)]="G"..mirrored[i]; b[sq(13,y)]="GP"
 end
 return {board=b,castling={d1=true,k1=true,a4=true,a11=true,d14=true,k14=true,n4=true,n11=true},turn="R",eliminated={},eliminationReason={},eliminationOrder={},history={},lastMove=nil,fullmove=1,scores={R=0,B=0,Y=0,G=0}}
end
local function isAttacked(board,target,by)
 local tx,ty=xy(target); if not tx then return false end
 for from,p in pairs(board) do
  if string.sub(p,1,1)==by then
   local _,typ=string.sub(p,1,1),string.sub(p,2,2); local x,y=xy(from)
   if typ=="P" then
    local d=dirs[by]
    if by=="R" or by=="Y" then
     if tx==x-1 or tx==x+1 then if ty==y+d[2] then return true end end
    else
     if ty==y-1 or ty==y+1 then if tx==x+d[1] then return true end end
    end
   elseif typ=="N" then
    local dx,dy=math.abs(tx-x),math.abs(ty-y); if dx*dy==2 then return true end
   else
    local dx,dy=tx-x,ty-y; local adx,ady=math.abs(dx),math.abs(dy)
    local straight=dx==0 or dy==0; local diagonal=adx==ady
    local allowed=(typ=="K" and math.max(adx,ady)==1) or (typ=="Q" and (straight or diagonal)) or (typ=="R" and straight) or (typ=="B" and diagonal)
    if allowed then
     local stepx=dx==0 and 0 or dx/adx; local stepy=dy==0 and 0 or dy/ady; local cx,cy=x+stepx,y+stepy; local clear=true
     while cx~=tx or cy~=ty do local s=sq(cx,cy); if not s or board[s] then clear=false; break end; cx+=stepx; cy+=stepy end
     if clear then return true end
    end
   end
  end
 end
 return false
end
function E.inCheck(state,color)
 local king; for s,p in pairs(state.board) do if p==color.."K" then king=s; break end end
 if not king then return true end
 for _,other in ipairs(E.colors) do if other~=color and not state.eliminated[other] and isAttacked(state.board,king,other) then return true end end
 return false
end
local function addCastles(state, from, color, moves)
 local home=castleHomes[color]
 if from~=home.king or not state.castling then return end
 if not state.castling[home.rooks[1]] and not state.castling[home.rooks[2]] then return end
 if E.inCheck(state,color) then return end
 local x,y=xy(from)
 for _,rookFrom in ipairs(home.rooks) do
  if not state.castling[rookFrom] or state.board[rookFrom]~=color.."R" then continue end
  local rx,ry=xy(rookFrom)
  local dx=math.sign(rx-x)
  local dy=math.sign(ry-y)
  local clear=true
  local cx,cy=x+dx,y+dy
  while cx~=rx or cy~=ry do
   if state.board[sq(cx,cy)] then clear=false; break end
   cx+=dx; cy+=dy
  end
  if not clear then continue end
  local transit=sq(x+dx,y+dy)
  local probe=table.clone(state)
  probe.board=table.clone(state.board)
  probe.board[from]=nil
  probe.board[transit]=color.."K"
  if not E.inCheck(probe,color) then
   table.insert(moves,{from=from,to=sq(x+2*dx,y+2*dy),special="castle",rookFrom=rookFrom,rookTo=transit})
  end
 end
end

local function pseudo(state,from)
 local p=state.board[from]; if not p then return {} end
 local color,typ=string.sub(p,1,1),string.sub(p,2,2); local x,y=xy(from); local out={}
 local function add(to,promotion)
  if to and (not state.board[to] or string.sub(state.board[to],1,1)~=color) then table.insert(out,{from=from,to=to,promotion=promotion}) end
 end
 if typ=="P" then
  local d=dirs[color]; local dx,dy=d[1],d[2]; local nx,ny=x+dx,y+dy; local forward=sq(nx,ny)
  if forward and not state.board[forward] then
   local edge=(color=="R" and ny==8) or (color=="Y" and ny==7) or (color=="B" and nx==8) or (color=="G" and nx==7)
   add(forward,edge and "Q" or nil)
   local starts=(color=="R" and y==2) or (color=="Y" and y==13) or (color=="B" and x==2) or (color=="G" and x==13)
   local second=sq(x+2*dx,y+2*dy); if starts and second and not state.board[second] then add(second,nil) end
  end
  local caps={}
  if color=="R" or color=="Y" then caps={{x-1,y+dy},{x+1,y+dy}} else caps={{x+dx,y-1},{x+dx,y+1}} end
  for _,v in ipairs(caps) do local to=sq(v[1],v[2]); if to and state.board[to] and string.sub(state.board[to],1,1)~=color then
   local edge=(color=="R" and v[2]==8) or (color=="Y" and v[2]==7) or (color=="B" and v[1]==8) or (color=="G" and v[1]==7)
   add(to,edge and "Q" or nil)
  end end
 elseif typ=="N" then
  for _,d in ipairs({{1,2},{2,1},{2,-1},{1,-2},{-1,-2},{-2,-1},{-2,1},{-1,2}}) do add(sq(x+d[1],y+d[2])) end
 else
  local dirs8={{1,0},{-1,0},{0,1},{0,-1},{1,1},{1,-1},{-1,1},{-1,-1}}
  for _,d in ipairs(dirs8) do
   local straight=d[1]==0 or d[2]==0; local diagonal=not straight
   local can=(typ=="Q") or (typ=="R" and straight) or (typ=="B" and diagonal) or (typ=="K")
   if can then local nx,ny=x+d[1],y+d[2]; local distance=1
    while sq(nx,ny) do local to=sq(nx,ny); if state.board[to] then add(to); break else add(to) end; if typ=="K" then break end; nx+=d[1]; ny+=d[2]; distance+=1 end
   end
  end
 end
 if typ=="K" then addCastles(state,from,color,out) end
 return out
end
-- Search and king-safety probes need no history, score, or result allocations.
function E.searchApply(state,move)
 local piece=state.board[move.from]
 if not piece then return nil end
 local child=table.clone(state)
 child.board=table.clone(state.board)
 local color=string.sub(piece,1,1)
 child.board[move.from]=nil
 child.board[move.to]=color..(move.promotion or string.sub(piece,2,2))
 if move.special=="castle" then
  child.board[move.rookFrom]=nil
  child.board[move.rookTo]=color.."R"
 end
 local rights=state.castling
 if rights then
  local home=castleHomes[color]
  local kingMoved=move.from==home.king and piece==color.."K"
  if rights[move.from] or rights[move.to] or (kingMoved and (rights[home.rooks[1]] or rights[home.rooks[2]])) then
   child.castling=table.clone(rights)
   child.castling[move.from]=nil
   child.castling[move.to]=nil
   if kingMoved then
    for _,rookHome in ipairs(home.rooks) do child.castling[rookHome]=nil end
   end
  end
 end
 child.turn=nextColor(color)
 return child
end

function E.apply(state,move)
 local nextState=E.searchApply(state,move)
 if not nextState then return nil end
 local color=string.sub(state.board[move.from],1,1)
 local captured=state.board[move.to]
 local grey=captured and state.eliminated[string.sub(captured,1,1)]
 local entry={from=move.from,to=move.to,color=color,captured=captured,promotion=move.promotion,special=move.special}
 if grey then entry.grey=true end
 nextState.history=table.clone(state.history)
 table.insert(nextState.history,entry)
 nextState.scores=table.clone(state.scores)
 if captured and not grey then
  local value=E.values[string.sub(captured,2,2)] or 0
  nextState.scores[color]=(nextState.scores[color] or 0)+value
 end
 nextState.eliminated=table.clone(state.eliminated)
 nextState.eliminationReason=table.clone(state.eliminationReason or {})
 nextState.eliminationOrder=table.clone(state.eliminationOrder or {})
 nextState.lastMove={from=move.from,to=move.to,color=color,special=move.special}
 if color=="G" then nextState.fullmove+=1 end
 return nextState
end
function E.legalMoves(state,from,color)
 local mover=color or state.turn
 local piece=state.board[from]; if not piece or state.eliminated[mover] or string.sub(piece,1,1)~=mover then return {} end
 local out={}; for _,m in ipairs(pseudo(state,from)) do local n=E.searchApply(state,m); if n and not E.inCheck(n,mover) then table.insert(out,m) end end; return out
end
function E.allLegal(state,color)
 local mover=color or state.turn
 local out={}
 if state.eliminated[mover] then return out end
 for square,piece in pairs(state.board) do
  if string.sub(piece,1,1)==mover then
   for _,move in ipairs(E.legalMoves(state,square,mover)) do table.insert(out,move) end
  end
 end
 return out
end
function E.public(state)
 return {board=state.board,castling=state.castling,turn=state.turn,eliminated=state.eliminated,eliminationReason=state.eliminationReason,eliminationOrder=state.eliminationOrder,history=state.history,lastMove=state.lastMove,fullmove=state.fullmove,scores=state.scores}
end
return E
