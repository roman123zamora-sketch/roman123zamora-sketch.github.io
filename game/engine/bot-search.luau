-- Exalted Chess search. Rating preferences select effort, without random moves.
local Bot={}
local MATE=100000
local values={P=100,N=310,B=330,R=500,Q=900,K=20000}
local levels={400,600,800,1000,1200,1400,1600,1800,2000,2200,2400}
Bot.ratings=levels
Bot.limits={timeMs=220,depth=7,nodes=24000}
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
 local score=0
 local phase=0
 local kingEndgame=0
 local pw={}; local pb={}; local rw={}; local rb={}
 local bishopsW=0; local bishopsB=0
 local kw; local kb
 for s,p in pairs(state.board) do
  local color=string.sub(p,1,1); local kind=string.sub(p,2,2)
  local x=string.find(files,string.sub(s,1,1),1,true); local y=tonumber(string.sub(s,2,2))
  local t=pst[kind]
  local idx=(color=="w") and ((8-y)*8+x) or ((y-1)*8+x)
  local v=(values[kind] or 0)+(t and t[idx] or 0)
  if kind=="N" or kind=="B" then phase+=1
  elseif kind=="R" then phase+=2
  elseif kind=="Q" then phase+=4
  elseif kind=="K" then
   local center=24-7*(math.abs(x-4.5)+math.abs(y-4.5))
   kingEndgame+=(color=="w" and 1 or -1)*(center-t[idx])
  end
  score+=(color=="w") and v or -v
  if kind=="P" then table.insert((color=="w") and pw or pb,{x,y})
  elseif kind=="R" then table.insert((color=="w") and rw or rb,{x,y})
  elseif kind=="B" then if color=="w" then bishopsW+=1 else bishopsB+=1 end
  elseif kind=="K" then if color=="w" then kw={x,y} else kb={x,y} end end
 end
 local late=1-math.min(phase,24)/24
 score+=kingEndgame*late
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
  score+=math.min(shield,3)*10*(1-late)
 end
 if kb then
  local shield=0
  for _,pp in ipairs(pb) do if math.abs(pp[1]-kb[1])<=1 and math.abs(pp[2]-kb[2])<=1 then shield+=1 end end
  score-=math.min(shield,3)*10*(1-late)
 end
 return (state.turn=="w") and score or -score
end
local function orderMoves(state,moves,hint,search,ply)
 local killers=search.killers[ply]
 local scores={}
 for _,move in ipairs(moves) do
  local victim=state.board[move.to]
  local attacker=state.board[move.from]
  local value=0
  local id=move.from..":"..move.to..":"..(move.promotion or "")
  if id==hint then
   value=200000
  elseif victim or move.promotion or move.special=="enpassant" then
   local capture=victim and values[string.sub(victim,2,2)] or (move.special=="enpassant" and 100 or 0)
   value=30000+capture*8+(values[move.promotion] or 0)*4-values[string.sub(attacker,2,2)]
  elseif id==killers then
   value=20000
  else
   value=search.history[id] or 0
  end
  move.searchId=id
  scores[move]=value
 end
 table.sort(moves,function(a,b)
  if scores[a]~=scores[b] then return scores[a]>scores[b] end
  return a.searchId<b.searchId
 end)
end

local function admitNode(search)
 search.nodes+=1
 if search.nodes>search.maxNodes or search.clock()>=search.deadline then return false end
 if search.checkpoint and search.nodes%64==0 and search.clock()-search.lastYield>=.010 then
  if not search.checkpoint() then search.cancelled=true; return false end
  search.lastYield=search.clock()
  return search.lastYield<search.deadline
 end
 return true
end

local function repetitions(search,key)
 return (search.rootPositions[key] or 0)+(search.path[key] or 0)
end

local function standardVisit(engine,state,depth,alpha,beta,search,ply,qPly,key)
 if not admitNode(search) then return nil end
 local inCheck=engine.inCheck(state,state.turn)
 local count=repetitions(search,key)
 local moves
 if depth>0 or inCheck then
  moves=engine.allLegal(state)
 elseif engine.tacticalMoves then
  moves=engine.tacticalMoves(state)
  if #moves==0 and not engine.hasLegal(state) then return 0 end
 else
  moves=engine.allLegal(state)
  if #moves==0 then return 0 end
  local captures={}
  for _,move in ipairs(moves) do
   if state.board[move.to] or move.promotion or move.special=="enpassant" then table.insert(captures,move) end
  end
  moves=captures
 end
 if #moves==0 and (depth>0 or inCheck) then return inCheck and -MATE+ply or 0 end
 if count>=5 or state.halfmove>=150 or engine.insufficientMaterial(state) then return 0 end
 if depth<=0 and inCheck and qPly>=12 then return nil end

 local originalAlpha,originalBeta=alpha,beta
 local best=(count>=3 or state.halfmove>=100) and 0 or -math.huge
 if depth<=0 and not inCheck then
  best=math.max(best,evaluate(state))
  if qPly>=8 then return best end
 end
 if best>=beta then return best end
 alpha=math.max(alpha,best)

 -- Reversible history affects draw claims. Reuse scores only immediately
 -- after an irreversible move; elsewhere a cached move is only an ordering hint.
 local entry=depth>0 and search.table[key] or nil
 if entry and state.halfmove==0 and entry.depth>=depth and entry.score then
  if entry.flag=="exact" or (entry.flag=="lower" and entry.score>=beta)
   or (entry.flag=="upper" and entry.score<=alpha) then return entry.score end
 end
 orderMoves(state,moves,entry and entry.move,search,ply)

 local bestMove
 for _,move in ipairs(moves) do
  local child=engine.searchApply(state,move)
  local childKey=engine.positionKey(child)
  search.path[childKey]=(search.path[childKey] or 0)+1
  local reply=standardVisit(engine,child,depth-1,-beta,-alpha,search,ply+1,depth<=0 and qPly+1 or 0,childKey)
  local prospectiveClaim=repetitions(search,childKey)>=3 or child.halfmove>=100
  local children=search.path[childKey]-1
  search.path[childKey]=children>0 and children or nil
  if reply==nil then return nil end
  local score=-reply
  if prospectiveClaim then score=math.max(0,score) end
  if score>best then best,bestMove=score,move.searchId end
  if score>alpha then alpha=score end
  if alpha>=beta then
   if depth>0 and not state.board[move.to] and not move.promotion and move.special~="enpassant" then
    search.killers[ply]=move.searchId
    search.history[move.searchId]=math.min(19000,(search.history[move.searchId] or 0)+depth*depth)
   end
   break
  end
 end
 if depth>0 and bestMove and (entry or search.entries<4096) and (not entry or entry.depth<=depth) then
  if not entry then search.entries+=1 end
  local score
  if state.halfmove==0 and math.abs(best)<MATE-1000 then score=best end
  search.table[key]={depth=depth,move=bestMove,score=score,
   flag=best<=originalAlpha and "upper" or (best>=originalBeta and "lower" or "exact")}
 end
 return best
end

local function fourEvaluation(state,root)
 local totals={R=0,B=0,Y=0,G=0}
 for _,piece in pairs(state.board) do
  local color,kind=string.sub(piece,1,1),string.sub(piece,2,2)
  if not state.eliminated[color] and kind~="K" then totals[color]+=values[kind] end
 end
 local strongest,combined,rivals=0,0,0
 for color,total in pairs(totals) do
  if color~=root and not state.eliminated[color] then
   strongest=math.max(strongest,total)
   combined+=total
   rivals+=1
  end
 end
 if rivals==0 then return MATE end
 return totals[root]-(strongest+combined/rivals)/2
end

local function advanceFour(engine,state,move)
 local nextState=engine.searchApply(state,move)
 local victim=state.board[move.to]
 if victim and string.sub(victim,2,2)=="K" then
  nextState.eliminated=table.clone(state.eliminated)
  nextState.eliminated[string.sub(victim,1,1)]=true
 end
 return nextState
end

-- Other seats are allowed to choose the worst reply for our seat. This
-- conservative model keeps a single score perspective over four plies.
local function fourVisit(engine,state,depth,alpha,beta,search,ply)
 if not admitNode(search) then return nil end
 local moves
 for _=1,#engine.colors do
  if state.eliminated[search.root] then return -MATE+ply end
  local score=fourEvaluation(state,search.root)
  if score==MATE then return MATE-ply end
  moves=engine.allLegal(state)
  if #moves>0 then
   if depth<=0 then return score end
   break
  end
  state=table.clone(state)
  state.eliminated=table.clone(state.eliminated)
  state.eliminated[state.turn]=true
  state.turn=engine.nextColor(state.turn)
 end
 local maximize=state.turn==search.root
 local best=maximize and -math.huge or math.huge
 orderMoves(state,moves,nil,search,ply)
 for _,move in ipairs(moves) do
  local score=fourVisit(engine,advanceFour(engine,state,move),depth-1,alpha,beta,search,ply+1)
  if score==nil then return nil end
  if maximize then best=math.max(best,score); alpha=math.max(alpha,best)
  else best=math.min(best,score); beta=math.min(beta,best) end
  if alpha>=beta then break end
 end
 return best
end

function Bot.choose(engine,state,rating,options)
 options=options or {}
 local clock=options.clock or os.clock
 local effort=math.clamp(((tonumber(rating) or 1000)-400)/2000,0,1)
 local limits=Bot.limits
 local maxDepth=math.floor(math.clamp(options.depth or (2+effort*(limits.depth-2)),1,12))
 local search={deadline=clock()+(options.timeMs or limits.timeMs)/1000,clock=clock,
  checkpoint=options.checkpoint,lastYield=clock(),maxNodes=options.nodes or math.floor(3200+effort*(limits.nodes-3200)),
  nodes=0,entries=0,table={},history={},killers={},path={},root=state.turn,rootPositions=state.positions or {}}
 local moves=engine.allLegal(state)
 if #moves==0 then return nil end
 local standard=state.castling~=nil
 if standard and (engine.insufficientMaterial(state) or state.halfmove>=150
  or (search.rootPositions[engine.positionKey(state)] or 0)>=5) then return nil end
 if not standard then
  local alive=0
  for _,side in ipairs(engine.colors) do if not state.eliminated[side] then alive+=1 end end
  if alive<=1 then return nil end
 end

 orderMoves(state,moves,nil,search,0)
 local best=moves[1]
 local completed,completedScore=0,nil
 for depth=1,maxDepth do
  orderMoves(state,moves,best.searchId,search,0)
  local iterationBest
  local alpha=-MATE
  for _,move in ipairs(moves) do
   local score
   if standard then
    local child=engine.searchApply(state,move)
    local key=engine.positionKey(child)
    search.path[key]=1
    local reply=standardVisit(engine,child,depth-1,-MATE,-alpha,search,1,0,key)
    search.path[key]=nil
    if reply~=nil then score=-reply end
   else
    score=fourVisit(engine,advanceFour(engine,state,move),depth-1,alpha,MATE,search,1)
   end
   if score==nil then iterationBest=nil; break end
   if not iterationBest or score>alpha then alpha=score; iterationBest=move end
  end
  if not iterationBest then break end
  best=iterationBest
  completed,completedScore=depth,alpha
  if math.abs(alpha)>MATE-1000 then break end
 end
 if search.cancelled then return nil end
 -- The order key is private; preserve the move contract for all callers.
 return {from=best.from,to=best.to,promotion=best.promotion,special=best.special},
  {depth=completed,nodes=search.nodes,score=completedScore}
end
-- Position analysis is read-only and uses the same scoring as bot play.
Bot.evaluatePosition=evaluate

function Bot.analyze(engine,state)
 local sign=state.turn=="w" and 1 or -1
 local status=engine.status(state)
 if status=="checkmate" then
  return {kind="mate",side=sign==1 and "b" or "w",moves=0}
 end
 if status=="stalemate" or status=="draw" then return {kind="cp",value=0} end
 local _,details=Bot.choose(engine,state,1000,{timeMs=90,depth=3,nodes=5000})
 local score=details and details.score or evaluate(state)
 if math.abs(score)>MATE-1000 then
  return {kind="mate",side=score*sign>0 and "w" or "b",moves=math.ceil((MATE-math.abs(score))/2)}
 end
 return {kind="cp",value=score*sign}
end
return Bot
