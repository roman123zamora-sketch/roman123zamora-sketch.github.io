-- Exalted Chess four-player Free-for-All engine on the canonical 14x14 cross board.
local E={}
local files="abcdefghijklmn"
E.colors={"R","B","Y","G"}
local dirs={R={0,1},B={1,0},Y={0,-1},G={-1,0}}
local function xy(s)
 if type(s)~="string" then return nil,nil end
 local x=string.find(files,string.sub(s,1,1),1,true); local y=tonumber(string.sub(s,2))
 return x,y
end
local function sq(x,y)
 if not x or not y or x<1 or x>14 or y<1 or y>14 then return nil end
 if not (x>=4 and x<=11 or y>=4 and y<=11) then return nil end
 return string.sub(files,x,x)..tostring(y)
end
local function clone(t)
 local n={}; for k,v in pairs(t) do n[k]=type(v)=="table" and clone(v) or v end; return n
end
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
 return {board=b,turn="R",eliminated={},eliminationReason={},eliminationOrder={},history={},lastMove=nil,fullmove=1,scores={R=0,B=0,Y=0,G=0}}
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
 return out
end
function E.apply(state,m)
 local n=clone(state); local piece=n.board[m.from]; if not piece then return nil end; local color=string.sub(piece,1,1); local captured=n.board[m.to]
 local grey=captured and n.eliminated[string.sub(captured,1,1)] or false
 local entry={from=m.from,to=m.to,color=color,captured=captured,promotion=m.promotion}
 if grey then entry.grey=true end
 if captured and not grey then local v=E.values[string.sub(captured,2,2)]; if v then n.scores[color]=(n.scores[color] or 0)+v end end
 n.board[m.from]=nil; n.board[m.to]=color..(m.promotion or string.sub(piece,2,2)); n.turn=nextColor(color); n.lastMove={from=m.from,to=m.to,color=color}; table.insert(n.history,entry); if color=="G" then n.fullmove+=1 end
 return n
end
function E.legalMoves(state,from,color)
 local mover=color or state.turn
 local piece=state.board[from]; if not piece or state.eliminated[mover] or string.sub(piece,1,1)~=mover then return {} end
 local out={}; for _,m in ipairs(pseudo(state,from)) do local n=E.apply(state,m); if n and not E.inCheck(n,mover) then table.insert(out,m) end end; return out
end
function E.allLegal(state,color)
 local old=state.turn; state.turn=color or old; local out={}
 if not state.eliminated[state.turn] then for s,p in pairs(state.board) do if string.sub(p,1,1)==state.turn then for _,m in ipairs(E.legalMoves(state,s)) do table.insert(out,m) end end end end
 state.turn=old; return out
end
function E.public(state)
 return {board=state.board,turn=state.turn,eliminated=state.eliminated,eliminationReason=state.eliminationReason,eliminationOrder=state.eliminationOrder,history=state.history,lastMove=state.lastMove,fullmove=state.fullmove,scores=state.scores}
end
return E
