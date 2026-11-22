-- Bot strength is selected by an explicit Elo value (400-2400), not a vague difficulty label.
-- One engine, one search: iterative-deepening negamax with alpha-beta pruning, a
-- transposition table, MVV-LVA move ordering, and a quiescence search so capture
-- chains at the horizon are resolved before the position is evaluated. A shared
-- node budget bounds think time: when it runs out, the bot plays the best move
-- from the last fully completed depth instead of stalling the server.
local Bot={}
local MATE=100000
local values={P=100,N=310,B=330,R=500,Q=900,K=20000}
local levels={400,600,800,1000,1200,1400,1600,1800,2000,2200,2400}
Bot.ratings=levels
local profiles={
 [400]={depth=1,random=.70,blunder=.35,pool=8,nodes=200},
 [600]={depth=1,random=.45,blunder=.28,pool=7,nodes=300},
 [800]={depth=1,random=.25,blunder=.21,pool=6,nodes=400},
 [1000]={depth=2,random=.10,blunder=.15,pool=5,nodes=700},
 [1200]={depth=2,random=.04,blunder=.09,pool=4,nodes=900},
 [1400]={depth=3,random=0,blunder=.04,pool=3,nodes=1500},
 [1600]={depth=3,random=0,blunder=0,pool=2,nodes=700},
 [1800]={depth=4,random=0,blunder=0,pool=1,nodes=1000},
 [2000]={depth=4,random=0,blunder=0,pool=1,nodes=1500},
 [2200]={depth=5,random=0,blunder=0,pool=1,nodes=2500},
 [2400]={depth=6,random=0,blunder=0,pool=1,nodes=4000},
}
local files="abcdefgh"
-- Piece-square tables (midgame, centipawns) listed rank 8 down to rank 1. They
-- drive piece activity and king safety preferences: knights toward the center,
-- pawns advancing, rooks on files, kings sheltered behind pawns.
local pst={
P={0,0,0,0,0,0,0,0,50,50,50,50,50,50,50,50,10,10,20,30,30,20,10,10,5,5,10,25,25,10,5,5,0,0,0,20,20,0,0,0,5,-5,-10,0,0,-10,-5,5,5,10,10,-20,-20,10,10,5,0,0,0,0,0,0,0,0},
N={-50,-40,-30,-30,-30,-30,-40,-50,-40,-20,0,0,0,0,-20,-40,-30,0,10,15,15,10,0,-30,-30,5,15,20,20,15,5,-30,-30,0,15,20,20,15,0,-30,-30,5,10,15,15,10,5,-30,-40,-20,0,5,5,0,-20,-40,-50,-40,-30,-30,-30,-30,-40,-50},
B={-20,-10,-10,-10,-10,-10,-10,-20,-10,0,0,0,0,0,0,-10,-10,0,5,10,10,5,0,-10,-10,5,5,10,10,5,5,-10,-10,0,10,10,10,10,0,-10,-10,10,10,10,10,10,10,-10,-10,5,0,0,0,0,5,-10,-20,-10,-10,-10,-10,-10,-10,-20},
R={0,0,0,0,0,0,0,0,5,10,10,10,10,10,10,5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,0,0,0,5,5,0,0,0},
Q={-20,-10,-10,-5,-5,-10,-10,-20,-10,0,0,0,0,0,0,-10,-10,0,5,5,5,5,0,-10,-5,0,5,5,5,5,0,-5,0,0,5,5,5,5,0,-5,-10,5,5,5,5,5,0,-10,-10,0,5,0,0,0,0,-10,-20,-10,-10,-5,-5,-10,-10,-20},
K={-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-20,-30,-30,-40,-40,-30,-30,-20,-10,-20,-20,-20,-20,-20,-20,-10,20,20,0,0,0,0,20,20,20,30,10,0,0,10,30,20},
}
local passedW={0,0,10,20,35,60,100,0}
local passedB={0,100,60,35,20,10,0,0}
-- Material plus positional terms from the perspective of the side to move:
-- piece activity (PST), doubled/isolated/passed pawns, bishop pair, rooks on
-- open files, and a pawn shield around the king. Standard chess gets the full
-- evaluator; other variants (four-player) keep material-only scoring since the
-- tables assume an 8x8 two-sided board.
local function evaluate(state)
 if not state.castling then
  local total=0
  for _,p in pairs(state.board) do
   local v=values[string.sub(p,2,2)] or 0
   total+=(string.sub(p,1,1)==state.turn) and v or -v
  end
  return total
 end
 local score=0
 local pw={}; local pb={}; local rw={}; local rb={}
 local bishopsW=0; local bishopsB=0
 local kw; local kb
 for s,p in pairs(state.board) do
  local color=string.sub(p,1,1); local kind=string.sub(p,2,2)
  local x=string.find(files,string.sub(s,1,1),1,true); local y=tonumber(string.sub(s,2,2))
  local t=pst[kind]
  local idx=(color=="w") and ((8-y)*8+x) or ((y-1)*8+x)
  local v=(values[kind] or 0)+(t and t[idx] or 0)
  score+=(color=="w") and v or -v
  if kind=="P" then table.insert((color=="w") and pw or pb,{x,y})
  elseif kind=="R" then table.insert((color=="w") and rw or rb,{x,y})
  elseif kind=="B" then if color=="w" then bishopsW+=1 else bishopsB+=1 end
  elseif kind=="K" then if color=="w" then kw={x,y} else kb={x,y} end end
 end
 local fileW={}; local fileB={}
 for _,pp in ipairs(pw) do fileW[pp[1]]=(fileW[pp[1]] or 0)+1 end
 for _,pp in ipairs(pb) do fileB[pp[1]]=(fileB[pp[1]] or 0)+1 end
 for x=1,8 do
  local w=fileW[x] or 0; local b=fileB[x] or 0
  if w>1 then score-=12*(w-1) end
  if b>1 then score+=12*(b-1) end
  local wl=(x>1 and (fileW[x-1] or 0)) or 0; local wr=(x<8 and (fileW[x+1] or 0)) or 0
  if w>0 and wl==0 and wr==0 then score-=15 end
  local bl=(x>1 and (fileB[x-1] or 0)) or 0; local br=(x<8 and (fileB[x+1] or 0)) or 0
  if b>0 and bl==0 and br==0 then score+=15 end
 end
 if bishopsW>=2 then score+=30 end
 if bishopsB>=2 then score-=30 end
 for _,pp in ipairs(pw) do
  local x,y=pp[1],pp[2]; local passed=true
  for _,q in ipairs(pb) do if math.abs(q[1]-x)<=1 and q[2]>y then passed=false; break end end
  if passed then score+=passedW[y] end
 end
 for _,pp in ipairs(pb) do
  local x,y=pp[1],pp[2]; local passed=true
  for _,q in ipairs(pw) do if math.abs(q[1]-x)<=1 and q[2]<y then passed=false; break end end
  if passed then score-=passedB[y] end
 end
 for _,pp in ipairs(rw) do
  local x=pp[1]
  if (fileB[x] or 0)==0 then score+=((fileW[x] or 0)==0) and 15 or 7 end
 end
 for _,pp in ipairs(rb) do
  local x=pp[1]
  if (fileW[x] or 0)==0 then score-=((fileB[x] or 0)==0) and 15 or 7 end
 end
 if kw then
  local shield=0
  for _,pp in ipairs(pw) do if math.abs(pp[1]-kw[1])<=1 and math.abs(pp[2]-kw[2])<=1 then shield+=1 end end
  score+=math.min(shield,3)*10
 end
 if kb then
  local shield=0
  for _,pp in ipairs(pb) do if math.abs(pp[1]-kb[1])<=1 and math.abs(pp[2]-kb[2])<=1 then shield+=1 end end
  score-=math.min(shield,3)*10
 end
 return (state.turn=="w") and score or -score
end
-- Position keys for the transposition table. Standard chess walks the 64 squares
-- in a fixed order (fast, no sorting); other variants fall back to a sorted dump.
local function chessKey(state)
 local parts=table.create(65)
 local i=0
 for r=1,8 do for f=1,8 do i+=1; parts[i]=state.board[string.sub(files,f,f)..r] or "-" end end
 local c=state.castling
 local rights=c and ((c.wK and "K" or "-")..(c.wQ and "Q" or "-")..(c.bK and "k" or "-")..(c.bQ and "q" or "-")) or "----"
 parts[i+1]="|"..rights.."|"..(state.ep or "-").."|"..state.turn
 return table.concat(parts)
end
local function genericKey(state)
 local parts={}
 for s,p in pairs(state.board) do table.insert(parts,s.."="..p) end
 table.sort(parts)
 table.insert(parts,state.turn)
 return table.concat(parts,",")
end
-- MVV-LVA: winning captures and promotions first, cheap attackers preferred.
local function moveOrder(state,m)
 local v=0
 local victim=state.board[m.to]
 if victim then v=10*(values[string.sub(victim,2,2)] or 0) end
 if m.special=="enpassant" then v=10*values.P end
 if m.promotion then v+=(values[m.promotion] or 0) end
 local attacker=state.board[m.from]
 if attacker then v-=(values[string.sub(attacker,2,2)] or 0)/10 end
 return v
end
local function sameMove(a,b) return a.from==b.from and a.to==b.to and a.promotion==b.promotion and a.special==b.special end
local function orderMoves(state,moves,ttMove)
 table.sort(moves,function(a,b)
  if ttMove then
   if sameMove(a,ttMove) then return true end
   if sameMove(b,ttMove) then return false end
  end
  return moveOrder(state,a)>moveOrder(state,b)
 end)
end
-- Quiescence: only captures and promotions are searched past the horizon so the
-- evaluator never stops in the middle of a trade.
local function quiescence(engine,state,alpha,beta,budget,ply)
 local inCheck=engine.inCheck(state,state.turn)
 local stand=evaluate(state)
 if inCheck then
  -- A side in check may not stand pat: every evasion is searched so checks
  -- (forks, skewers, mating attacks) are resolved before the horizon score.
  if ply>=6 then return stand end
 else
  if stand>=beta or ply>=4 then return stand end
  if stand>alpha then alpha=stand end
 end
 if budget.nodes<=0 then return stand end
 budget.nodes-=1
 local moves=engine.allLegal(state,state.turn)
 if #moves==0 then
  -- Terminal positions are visible even at the quiescence horizon.
  if inCheck then return -(MATE-ply) end
  return 0
 end
 local caps
 if inCheck then
  caps=moves
 else
  caps={}
  for _,m in ipairs(moves) do
   if state.board[m.to] or m.special=="enpassant" or m.promotion then
    table.insert(caps,m)
   elseif ply==0 and budget.nodes>10 then
    -- Checks are forcing moves too: include quiet checks at the horizon so the
    -- search sees mating attacks before committing to a stand-pat score.
    budget.nodes-=1
    local child=(engine.searchApply or engine.apply)(state,m)
    if child and engine.inCheck(child,child.turn) then table.insert(caps,m) end
   end
  end
 end
 orderMoves(state,caps,nil)
 local best=inCheck and -math.huge or stand
 for _,m in ipairs(caps) do
  if budget.nodes<=0 then break end
  local v=-quiescence(engine,(engine.searchApply or engine.apply)(state,m),-beta,-alpha,budget,ply+1)
  if v>best then best=v end
  if v>alpha then alpha=v end
  if alpha>=beta then break end
 end
 if best==-math.huge then return stand end
 return best
end
local function normalized(rating)
 rating=tonumber(rating) or 1000
 local best=levels[1]; for _,v in ipairs(levels) do if math.abs(v-rating)<math.abs(best-rating) then best=v end end
 return best
end
-- Negamax with alpha-beta, transposition cutoffs, and mate scores that shrink
-- with ply so the bot prefers the fastest checkmate. TT flag: 0 exact, 1 lower
-- bound (fail high), 2 upper bound (fail low). Mate-range values are not stored
-- so mate distances cannot be corrupted across different paths.
local function negamax(engine,state,depth,alpha,beta,budget,ply,tt)
 if state.halfmove and state.halfmove>=100 then return 0 end
 if depth<=0 then return quiescence(engine,state,alpha,beta,budget,0) end
 if budget.nodes<=0 then return evaluate(state) end
 local key=tt.key(state)
 local entry=tt.map[key]
 local ttMove=entry and entry.move or nil
 if entry and entry.depth>=depth then
  if entry.flag==0 then return entry.value end
  if entry.flag==1 then if entry.value>alpha then alpha=entry.value end
  elseif entry.flag==2 then if entry.value<beta then beta=entry.value end end
  if alpha>=beta then return entry.value end
 end
 budget.nodes-=1
 local moves=engine.allLegal(state,state.turn)
 if #moves==0 then
  if engine.inCheck(state,state.turn) then return -(MATE-ply) end
  return 0
 end
 orderMoves(state,moves,ttMove)
 local originalAlpha=alpha
 local best=-math.huge; local bestMove=nil
 for _,m in ipairs(moves) do
  if budget.nodes<=0 then break end
  local v=-negamax(engine,(engine.searchApply or engine.apply)(state,m),depth-1,-beta,-alpha,budget,ply+1,tt)
  if v>best then best=v; bestMove=m end
  if v>alpha then alpha=v end
  if alpha>=beta then break end
 end
 if best==-math.huge then return evaluate(state) end
 if math.abs(best)<MATE-1000 then
  local flag=best<=originalAlpha and 2 or (best>=beta and 1 or 0)
  tt.map[key]={value=best,depth=depth,flag=flag,move=bestMove}
 end
 return best
end
function Bot.choose(engine,state,rating)
 rating=normalized(rating); local prof=profiles[rating] or profiles[1000]
 local moves=engine.allLegal(state,state.turn); if #moves==0 then return nil end
 if #moves==1 then return moves[1] end
 if prof.random>0 and math.random()<prof.random then return moves[math.random(1,#moves)] end
 local budget={nodes=prof.nodes or math.huge}
 local tt={map={},key=state.castling and chessKey or genericKey}
 -- Pool profiles need honest values for every root move to rank the candidate
 -- pool, so they search with a full window; pure-strength profiles prune at
 -- the root as well and simply take the best move.
 local fullWindow=prof.pool>1 or (prof.blunder or 0)>0
 local scored={}
 for _,m in ipairs(moves) do table.insert(scored,{move=m,value=moveOrder(state,m)}) end
 table.sort(scored,function(a,b) return a.value>b.value end)
 -- Iterative deepening: each pass reorders the root moves by the previous
 -- pass, and an iteration cut short by the budget is discarded entirely.
 for depth=1,prof.depth do
  if budget.nodes<=0 then break end
  local result={}; local alpha=-MATE; local complete=true
  for _,entry in ipairs(scored) do
   if budget.nodes<=0 then complete=false; break end
   budget.nodes-=1
   local child=(engine.searchApply or engine.apply)(state,entry.move)
   local v
   if fullWindow then
    v=-negamax(engine,child,depth-1,-MATE,MATE,budget,1,tt)
   else
    v=-negamax(engine,child,depth-1,-MATE,-alpha,budget,1,tt)
    if v>alpha then alpha=v end
   end
   table.insert(result,{move=entry.move,value=v})
  end
  if complete and #result==#scored then
   table.sort(result,function(a,b) return a.value>b.value end)
   scored=result
  end
 end
 -- Any bot that searches its way to an immediate mate takes it: even low-rated
 -- players reliably spot mate in one, so the pool never dilutes a found mate.
 if scored[1] and scored[1].value>=MATE-1000 then return scored[1].move end
 local candidateCount=math.min(math.max(prof.pool,1),#scored)
 local pool={}; for i=1,candidateCount do table.insert(pool,scored[i]) end
 -- Lower ratings occasionally select a move beyond the candidate pool to model blunders.
 if prof.blunder>0 and #scored>candidateCount and math.random()<prof.blunder then
  local floorIndex=math.min(#scored,candidateCount+math.random(1,math.min(4,#scored-candidateCount)))
  return scored[floorIndex].move
 end
 -- Weighted pick: a clearly best move (like a free queen) is taken far more
 -- often than near-equal alternatives, while quiet positions still vary.
 local floorValue=pool[#pool].value
 local weights={}; local total=0
 for i,e in ipairs(pool) do
  local w=1+math.max(0,(e.value-floorValue)/4)
  weights[i]=w; total+=w
 end
 local pick=math.random()*total
 for i,e in ipairs(pool) do
  pick-=weights[i]
  if pick<=0 then return e.move end
 end
 return pool[#pool].move
end
return Bot
