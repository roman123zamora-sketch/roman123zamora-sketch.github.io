-- On-demand positions and bounded tactical proofs for the practice board.
local Puzzle = {}
local values = { P=100, N=310, B=330, R=500, Q=900 }

local function color(piece)
 return string.sub(piece,1,1)
end

local function kind(piece)
 return string.sub(piece,2,2)
end

local function moveID(move)
 return move.from..move.to..(move.promotion or "")
end

local function fingerprint(engine,state)
 local hash=1783
 local key=engine.positionKey(state)
 for index=1,#key do hash=(hash*131+string.byte(key,index))%2147483647 end
 return tostring(hash)
end

local function limit(deadline,nodes)
 return function()
  nodes-=1
  if nodes<0 or os.clock()>deadline then error("Puzzle search budget",0) end
 end
end

local function claimable(engine,state)
 if (state.positions[engine.positionKey(state)] or 0)>=3 or state.halfmove>=100 then return true end
 return engine.mayClaimWithMove(state)
end

local function forcing(engine,before,move,after)
 return before.board[move.to]~=nil or move.special=="enpassant" or
  move.promotion~=nil or engine.inCheck(after,after.turn)
end

local function tactics(engine,state,moves,stop)
 local mates={}
 for _,move in ipairs(moves) do
  stop()
  local child=engine.searchApply(state,move)
  if engine.inCheck(child,child.turn) and not engine.hasLegal(child) then
   table.insert(mates,move)
  end
 end
 return mates
end

-- Exhaustively try all replies. The defender uses the longest legal defense.
-- At a player branch, every equally short mate is counted.
local function mateInTwo(engine,state,root,stop)
 local child=engine.apply(state,root)
 local replies=engine.allLegal(child)
 if #replies==0 or claimable(engine,child) then return nil end
 local chosen
 local unique=true
 table.sort(replies,function(a,b) return moveID(a)<moveID(b) end)
 for _,reply in ipairs(replies) do
  stop()
  local nextState=engine.apply(child,reply)
  if engine.insufficientMaterial(nextState) or nextState.halfmove>=150
   or (nextState.positions[engine.positionKey(nextState)] or 0)>=5 then return nil end
  local mates=tactics(engine,nextState,engine.allLegal(nextState),stop)
  if #mates==0 then return nil end
  if #mates>1 then unique=false end
  if not chosen then chosen={root,reply,mates[1]} end
 end
 return chosen,unique
end

local function checkmate(engine,state,moves,rating,stop)
 local mates=tactics(engine,state,moves,stop)
 if #mates==1 then return {mates[1]}, nil, 400 end
 if #mates~=0 or rating<600 then return nil end
 local proven
 local quiet={}
 -- Establish at least one forcing candidate before comparing quiet alternatives.
 for _,move in ipairs(moves) do
  if forcing(engine,state,move,engine.searchApply(state,move)) then
   local line,unique=mateInTwo(engine,state,move,stop)
   if line then
    if proven or not unique then return nil end
    proven=line
   end
  else
   table.insert(quiet,move)
  end
 end
 if not proven then return nil end
 for _,move in ipairs(quiet) do
  if mateInTwo(engine,state,move,stop) then
   return nil
  end
 end
 return proven,nil, math.min(1250,950+math.floor(#moves/8)*50)
end

local function balance(state,owner)
 local own,opposing=0,0
 for _,piece in pairs(state.board) do
  local value=values[kind(piece)] or 0
  if color(piece)==owner then own+=value else opposing+=value end
 end
 return own-opposing,opposing
end

local function hasResistance(lead,opposing)
 -- Compare against the solving side before any gain from the solution.
 return opposing>=300 and lead<1100 and (opposing>=650 or lead<500)
end

local function probe(bot,engine,state,deadline)
 if os.clock()>=deadline then return nil end
 local _,details=bot.choose(engine,state,1000,{
  depth=3,timeMs=math.min(50,math.max(0,(deadline-os.clock())*1000)),nodes=3500
 })
 if details and details.score~=nil then return details.score end
 local status=engine.status(state)
 if status=="checkmate" then return -100000 end
 if status=="stalemate" or status=="draw" then return 0 end
end

function Puzzle.bestBlackMove(engine,bot,state,moves,deadline,defending)
 if #moves==1 then return moves[1] end
 if #moves==0 or os.clock()>=deadline then return nil end
 local move,details=bot.choose(engine,state,2400,{
  depth=defending and 3 or (#moves<=14 and 2 or 1),nodes=defending and 1800 or 1100,timeMs=math.min(35,math.max(0,(deadline-os.clock())*1000))
 })
 -- A move-ordering fallback is not a completed search.
 if details and details.depth>0 then return move end
end

local function isAlreadyWon(engine,bot,state,moves,solution,category,lead,deadline)
 local positionScore=probe(bot,engine,state,deadline)
 if positionScore==nil then return true end
 -- In a material puzzle, a forced mate makes the material objective secondary.
 if category=="material" and math.abs(positionScore)>99000 then return true end

 local baseline=bot.evaluatePosition(state)
 if lead<500 and baseline<500 and (category=="checkmate" or positionScore<700) then return false end

 -- A high primary score can come entirely from the intended tactic. Check
 -- other promising moves against defensive replies before calling it trivial.
 local alternatives={}
 for _,move in ipairs(moves) do
  if moveID(move)~=moveID(solution) then
   local child=engine.apply(state,move)
   table.insert(alternatives,{state=child,estimate=-bot.evaluatePosition(child),id=moveID(move)})
  end
 end
 table.sort(alternatives,function(a,b)
  return a.estimate>b.estimate or (a.estimate==b.estimate and a.id<b.id)
 end)
 local wins=0
 for index=1,math.min(#alternatives,4) do
  local score=probe(bot,engine,alternatives[index].state,deadline)
  if score==nil then return true end
  if -score>=650 then
   wins+=1
   if wins>=2 or baseline>=800 then return true end
  end
 end
 return false
end

local function potential(state,move)
 local target=state.board[move.to]
 return (target and values[kind(target)] or (move.special=="enpassant" and 100 or 0))
  +(move.promotion and values[move.promotion]-100 or 0)
end

local function prepend(move,line)
 local result={move}
 for _,nextMove in ipairs(line) do table.insert(result,nextMove) end
 return result
end

-- Exact capture/promotion exchanges. In check, every legal evasion is searched
-- and standing pat is forbidden. Stop represents declining another trade.
local function exchange(engine,state,owner,depth,stop,alpha,beta)
 stop()
 local checked=engine.inCheck(state,state.turn)
 local moves=checked and engine.allLegal(state) or engine.tacticalMoves(state)
 if #moves==0 and (checked or not engine.hasLegal(state)) then error("Terminal exchange",0) end
 if engine.insufficientMaterial(state) or (state.turn~=owner and claimable(engine,state)) then error("Draw exchange",0) end
 local maximize=state.turn==owner
 local score=balance(state,owner)
 local best=score
 local line={}
 if checked or (#moves>0 and not engine.hasQuiet(state)) then best=maximize and -math.huge or math.huge end
 if #moves==0 then return best,line end
 if depth==0 then error("Unsettled exchange",0) end
 if maximize then alpha=math.max(alpha,best) else beta=math.min(beta,best) end
 if alpha>=beta then return best,line end
 table.sort(moves,function(a,b) return potential(state,a)>potential(state,b) end)
 for _,move in ipairs(moves) do
  local value,tail=exchange(engine,engine.apply(state,move),owner,depth-1,stop,alpha,beta)
  if (maximize and value>best) or (not maximize and value<best) then
   best,line=value,prepend(move,tail)
  end
  if maximize then alpha=math.max(alpha,best) else beta=math.min(beta,best) end
  if alpha>=beta then break end
 end
 return best,line
end

local function defense(engine,state,move,owner,stop,cutoff)
 local child=engine.apply(state,move)
 if claimable(engine,child) then error("Draw defense",0) end
 local replies=engine.allLegal(child)
 if #replies==0 then error("Terminal defense",0) end
 local best=math.huge
 local line={}
 table.sort(replies,function(a,b)
  local delta=potential(child,a)-potential(child,b)
  return delta>0 or (delta==0 and moveID(a)<moveID(b))
 end)
 for _,reply in ipairs(replies) do
  stop()
  local value,tail=exchange(engine,engine.apply(child,reply),owner,6,stop,-math.huge,best)
  if value<best then best,line=value,prepend(reply,tail) end
  if best<cutoff then return best,line end
 end
 return best,line
end

local function uniqueContinuation(engine,state,line,owner,goal,stop)
 local step=state
 for index,move in ipairs(line) do
  if index>1 and step.turn==owner then
   local score=defense(engine,step,move,owner,stop,goal)
   if score<goal then return false end
   for _,other in ipairs(engine.allLegal(step)) do
    if moveID(move)~=moveID(other) then
     local alternate=defense(engine,step,other,owner,stop,goal-100)
     if alternate>=goal-100 then return false end
    end
   end
  end
  step=engine.apply(step,move)
 end
 return balance(step,owner)>=goal
end

local function material(engine,state,moves,rating,stop)
 local owner=state.turn
 local initial=balance(state,owner)
 table.sort(moves,function(a,b)
  local delta=potential(state,a)-potential(state,b)
  return delta>0 or (delta==0 and moveID(a)<moveID(b))
 end)
 if potential(state,moves[1])<300 then return nil end
 local choice,score,tail
 local tested={}
 local qualifying=initial+300
 for _,move in ipairs(moves) do
  if potential(state,move)<300 then break end
  local value,line=defense(engine,state,move,owner,stop,qualifying)
  tested[move]=value
  if value>=qualifying and (not score or value>score) then choice,score,tail=move,value,line end
 end
 if not choice then return nil end
 local threshold=score-100
 for _,move in ipairs(moves) do
  if move~=choice then
   local value=tested[move]
   -- Below the qualifying cutoff, a stopped search gives an upper bound.
   -- Reuse it only when it already rules this alternative out.
   if value==nil or (value<qualifying and value>=threshold) then
    value=defense(engine,state,move,owner,stop,threshold)
   end
   if value>=threshold then return nil end
  end
 end
 local line=prepend(choice,tail)
 if #line>2 and rating<600 then return nil end
 if not uniqueContinuation(engine,state,line,owner,score,stop) then return nil end
 return line,score-initial
end

local function randomSource(seed)
 return function()
  seed=(seed*48271)%2147483647
  return seed/2147483647
 end
end

local function sensibleMove(engine,bot,state,moves,random,ply)
 local best,bestValue
 table.sort(moves,function(a,b) return moveID(a)<moveID(b) end)
 for _,move in ipairs(moves) do
  local child=engine.searchApply(state,move)
  local value=-bot.evaluatePosition(child)
  -- In early development, penalize leaving a large immediate capture.
  if ply<18 then
   local exposure=0
   for _,response in ipairs(engine.tacticalMoves(child)) do
    exposure=math.max(exposure,potential(child,response))
   end
   value-=exposure*.75
  end
  value+=random()*(ply<12 and 65 or 280)
  if not bestValue or value>bestValue then best,bestValue=move,value end
 end
 return best
end

local function serialize(engine,state,line,options,id,gain,difficulty)
 local steps={}
 local current=state
 for index=1,#line,2 do
  local move=line[index]
  local moves=engine.allLegal(current)
  current=engine.apply(current,move)
  local response=line[index+1]
  local afterMove
  if response then
   afterMove=engine.public(current)
   afterMove.history=nil
   current=engine.apply(current,response)
  end
  local position=engine.public(current)
  position.history=nil
  table.insert(steps,{move=move,response=response,afterMove=afterMove,position=position,legal=moves})
 end
 local origin=engine.public(state)
 origin.castling=state.castling
 origin.ep=state.ep
 return {id=id,category=options.category,seed=options.seed,side=state.turn,
  difficulty=difficulty,gain=gain,origin=origin,steps=steps,line=line}
end

local function verifyBlackReplies(engine,bot,state,line,category,gain,deadline,stop)
 if state.turn~="w" or #line<2 then return line end
 local owner=state.turn
 local goal=balance(state,owner)+(gain or 0)
 local position=state
 local changed=false
 local index=1
 while index<=#line do
  stop()
  local move=line[index]
  if position.turn=="b" then
   local best=Puzzle.bestBlackMove(engine,bot,position,engine.allLegal(position),deadline,true)
   if not best then return nil end
   if moveID(best)~=moveID(move) then
    changed=true
    local nextState=engine.apply(position,best)
    local tail
    if category=="checkmate" then
     local mates=tactics(engine,nextState,engine.allLegal(nextState),stop)
     if #mates~=1 then return nil end
     tail=mates
    else
     local score
     score,tail=exchange(engine,nextState,owner,6,stop,-math.huge,math.huge)
     if score~=goal then return nil end
    end
    for later=#line,index+1,-1 do line[later]=nil end
    line[index]=best
    for _,reply in ipairs(tail) do table.insert(line,reply) end
    move=best
   end
  end
  position=engine.apply(position,move)
  index+=1
 end
 if changed and category=="material" and not uniqueContinuation(engine,state,line,owner,goal,stop) then return nil end
 return line
end

function Puzzle.validate(engine,bot,state,moves,category,rating,deadline)
 local lead,opposing=balance(state,state.turn)
 if not hasResistance(lead,opposing) then return nil end

 local verify=category=="checkmate" and checkmate or material
 local stop=limit(math.min(deadline,os.clock()+.34),2500)
 local ok,line,gain,difficulty=pcall(verify,engine,state,moves,rating,stop)
 if not ok or not line then return nil end
 if isAlreadyWon(engine,bot,state,moves,line[1],category,lead,deadline) then return nil end
 local replyStop=limit(math.min(deadline,os.clock()+.34),2500)
 local verified,finalLine=pcall(verifyBlackReplies,engine,bot,state,line,category,gain,deadline,replyStop)
 if not verified or not finalLine then return nil end
 if category=="material" then
  if #finalLine>2 and rating<600 then return nil end
  local tempting=0
  for _,move in ipairs(moves) do if potential(state,move)>=200 then tempting+=1 end end
  difficulty=#finalLine<=2 and 400 or math.min(1400,650+math.floor((#finalLine-1)/2)*150+math.min(4,tempting-1)*50)
 end
 return finalLine,gain,difficulty
end

function Puzzle.generate(engine,bot,options)
 local rating=options.rating
 local deadline=os.clock()+math.clamp(options.timeMs or 2400,100,4500)/1000
 local random=randomSource(options.seed)
 local seen={}
 for _,id in ipairs(options.recent or {}) do seen[id]=true end
 local fallback
 while os.clock()<deadline do
  local state=engine.initial()
  local minimum=options.category=="checkmate" and 16 or 12
  for ply=0,84 do
   if os.clock()>=deadline then break end
   local moves=engine.allLegal(state)
   if #moves==0 or engine.insufficientMaterial(state) or state.halfmove>=100 then break end
   if ply>=minimum and not claimable(engine,state) then
    local id=fingerprint(engine,state)
    if not seen[id] then
     local line,gain,difficulty=Puzzle.validate(engine,bot,state,moves,options.category,rating,deadline)
     if line then
      local candidate=serialize(engine,state,line,options,id,gain,difficulty)
      if math.abs(difficulty-rating)<=200 then return candidate end
      if not fallback or math.abs(difficulty-rating)<math.abs(fallback.difficulty-rating) then fallback=candidate end
     end
    end
   end
   local move
   if state.turn=="b" then
    move=Puzzle.bestBlackMove(engine,bot,state,moves,deadline)
   else
    move=sensibleMove(engine,bot,state,moves,random,ply)
   end
   if not move then break end
   state=engine.apply(state,move)
  end
 end
 return fallback or {retry=true}
end

return Puzzle
