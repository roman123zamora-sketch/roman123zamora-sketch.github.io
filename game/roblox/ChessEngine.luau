-- Standard chess rules module. Board keys use fixed algebraic square names.
local Engine = {}
local files = "abcdefgh"
local function xy(s) return string.find(files, string.sub(s,1,1),1,true), tonumber(string.sub(s,2,2)) end
local function sq(x,y) if x and y and x>=1 and x<=8 and y>=1 and y<=8 then return string.sub(files,x,x)..tostring(y) end end
local function clone(t) local n={} for k,v in pairs(t) do n[k]=type(v)=="table" and clone(v) or v end return n end
function Engine.initial()
 local b={}; for x=1,8 do b[sq(x,2)]="wP"; b[sq(x,7)]="bP" end
 local row={"R","N","B","Q","K","B","N","R"}; for x=1,8 do b[sq(x,1)]="w"..row[x]; b[sq(x,8)]="b"..row[x] end
 return {board=b,turn="w",castling={wK=true,wQ=true,bK=true,bQ=true},ep=nil,halfmove=0,fullmove=1,lastMove=nil,history={}}
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
 local function add(to,promotion,special) if to and (not state.board[to] or string.sub(state.board[to],1,1)~=color) then table.insert(out,{from=from,to=to,promotion=promotion,special=special}) end end
 if typ=="P" then
  local dir=color=="w" and 1 or -1; local ny=y+dir
  if sq(x,ny) and not state.board[sq(x,ny)] then add(sq(x,ny),ny==(color=="w" and 8 or 1) and "Q" or nil); if y==(color=="w" and 2 or 7) and not state.board[sq(x,y+2*dir)] then add(sq(x,y+2*dir),nil,"double") end end
  for _,dx in ipairs({-1,1}) do local to=sq(x+dx,ny); if to and state.board[to] and string.sub(state.board[to],1,1)~=color then add(to,ny==(color=="w" and 8 or 1) and "Q" or nil) elseif to==state.ep then add(to,nil,"enpassant") end end
 elseif typ=="N" then for _,d in ipairs({{1,2},{2,1},{2,-1},{1,-2},{-1,-2},{-2,-1},{-2,1},{-1,2}}) do add(sq(x+d[1],y+d[2])) end
 else
  local dirs={}; if typ=="R" or typ=="Q" or typ=="K" then for _,d in ipairs({{1,0},{-1,0},{0,1},{0,-1}}) do table.insert(dirs,d) end end; if typ=="B" or typ=="Q" or typ=="K" then for _,d in ipairs({{1,1},{1,-1},{-1,1},{-1,-1}}) do table.insert(dirs,d) end end
  for _,d in ipairs(dirs) do local nx,ny=x+d[1],y+d[2]; while sq(nx,ny) do local to=sq(nx,ny); if state.board[to] then add(to); break else add(to) end; if typ=="K" then break end; nx+=d[1]; ny+=d[2] end end
  if typ=="K" and not Engine.inCheck(state,color) then local rank=color=="w" and 1 or 8
   for _,side in ipairs({"K","Q"}) do if state.castling[color..side] then local rookFile=side=="K" and 8 or 1; local step=side=="K" and 1 or -1; local clear=true; for fx=x+step,rookFile-step,step do if state.board[sq(fx,rank)] then clear=false end end; local safe=true; for fx=x+step,x+2*step,step do if attacked(state.board,sq(fx,rank),color=="w" and "b" or "w") then safe=false end end; if clear and safe then add(sq(x+2*step,rank),nil,"castle"..side) end end end
  end
 end
 return out
end
function Engine.apply(state,m)
 local n=clone(state); local p=n.board[m.from]; if not p then return nil end; local color,typ=string.sub(p,1,1),string.sub(p,2,2); local captured=n.board[m.to]
 n.board[m.from]=nil; if m.special=="enpassant" then local tx,ty=xy(m.to); local cs=sq(tx,ty+(color=="w" and -1 or 1)); captured=n.board[cs]; n.board[cs]=nil end
 if m.special=="castleK" or m.special=="castleQ" then local tx,ty=xy(m.to); local rank=ty; local rookFrom=sq(m.special=="castleK" and 8 or 1,rank); local rookTo=sq(m.special=="castleK" and tx-1 or tx+1,rank); n.board[rookTo]=n.board[rookFrom]; n.board[rookFrom]=nil end
 n.board[m.to]=color..(m.promotion or typ); n.ep=nil
 if m.special=="double" then local tx,ty=xy(m.to); n.ep=sq(tx,ty+(color=="w" and -1 or 1)) end
 if typ=="K" then n.castling[color.."K"]=false; n.castling[color.."Q"]=false end
 if m.from=="a1" then n.castling.wQ=false elseif m.from=="h1" then n.castling.wK=false elseif m.from=="a8" then n.castling.bQ=false elseif m.from=="h8" then n.castling.bK=false end
 if m.to=="a1" then n.castling.wQ=false elseif m.to=="h1" then n.castling.wK=false elseif m.to=="a8" then n.castling.bQ=false elseif m.to=="h8" then n.castling.bK=false end
 n.halfmove=(typ=="P" or captured) and 0 or n.halfmove+1; if color=="b" then n.fullmove+=1 end; n.turn=color=="w" and "b" or "w"; n.lastMove={from=m.from,to=m.to}; table.insert(n.history,{from=m.from,to=m.to,color=color,promotion=m.promotion,special=m.special,captured=captured}); return n
end
function Engine.legalMoves(state,from,color)
 local p=state.board[from]; if not p or string.sub(p,1,1)~=(color or state.turn) then return {} end
 local out={}; for _,m in ipairs(pseudo(state,from)) do local n=Engine.apply(state,m); if n and not Engine.inCheck(n,string.sub(p,1,1)) then table.insert(out,m) end end; return out
end
function Engine.allLegal(state,color)
 local old=state.turn; state.turn=color or old; local out={}; for s,p in pairs(state.board) do if string.sub(p,1,1)==state.turn then for _,m in ipairs(Engine.legalMoves(state,s)) do table.insert(out,m) end end end; state.turn=old; return out
end
function Engine.status(state)
 local moves=Engine.allLegal(state,state.turn); if #moves==0 then return Engine.inCheck(state,state.turn) and "checkmate" or "stalemate" end
 if Engine.inCheck(state,state.turn) then return "check" end; return "playing"
end
function Engine.public(state)
 return {board=state.board,turn=state.turn,lastMove=state.lastMove,history=state.history,status=Engine.status(state),halfmove=state.halfmove,fullmove=state.fullmove}
end
return Engine
