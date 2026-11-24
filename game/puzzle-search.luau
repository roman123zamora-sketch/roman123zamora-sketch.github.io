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
 if (state.positions[state.proofKey or engine.positionKey(state)] or 0)>=3 or state.halfmove>=100 then return true end
 return engine.mayClaimWithMove(state)
end

local function forcing(before,move,givesCheck)
 return before.board[move.to]~=nil or move.special=="enpassant" or
  move.promotion~=nil or givesCheck(move)
end

local function tactics(engine,state,moves,stop)
 local mates={}
 local givesCheck=engine.checkingMoveTester(state)
 for _,move in ipairs(moves) do
  stop()
  if givesCheck(move) and not engine.hasLegal(engine.searchApply(state,move)) then
   table.insert(mates,move)
  end
 end
 return mates
end

-- Exhaustively try all replies. The defender uses the longest legal defense.
-- At a player branch, every equally short mate is counted.
local function mateInTwo(engine,state,root,stop)
 local child=engine.apply(state,root,false)
 local replies=engine.allLegal(child)
 if #replies==0 or claimable(engine,child) then return nil end
 local chosen
 local unique=true
 table.sort(replies,function(a,b) return moveID(a)<moveID(b) end)
 for _,reply in ipairs(replies) do
  stop()
  local nextState=engine.apply(child,reply,false)
  if engine.insufficientMaterial(nextState) or nextState.halfmove>=150
   or (nextState.positions[nextState.proofKey or engine.positionKey(nextState)] or 0)>=5 then return nil end
  local mates=tactics(engine,nextState,engine.allLegal(nextState),stop)
  if #mates==0 then return nil end
  if #mates>1 then unique=false end
  if not chosen then chosen={root,reply,mates[1]} end
 end
 return chosen,unique
end

-- Maximum target lengths count solver moves, not individual plies.
local mateTargets={1,2,2,3,3,4,4,5,5,6,7,8,9,10}
local materialTargets={2,2,2,2,3,3,3,4,4,5,5,6,7,8}
local mateRatings={200,625,1275,1650,1925,2225,2425,2625,2800,2900}
local materialRatings={200,575,1190,1540,1850,2200,2550,2800}
local function ratingBand(rating)
 return math.clamp(math.floor((rating-400)/200)+1,1,14)
end

-- Find a mate within the remaining solver moves. Every legal reply must lose.
-- At solver nodes, finding a second solution marks the proof ambiguous.
local function mateProof(engine,state,remaining,attacking,stop,unique,hint,replies)
 stop()
 local legal=engine.allLegal(state)
 if #legal==0 then
  if not attacking and engine.inCheck(state,state.turn) then return {},true end
  return nil
 end
 if engine.insufficientMaterial(state) or state.halfmove>=150 or
    (state.positions[state.proofKey or engine.positionKey(state)] or 0)>=5 or
    (not attacking and claimable(engine,state)) then return nil end
 if attacking and remaining==1 then
  local mates=tactics(engine,state,legal,stop)
  if #mates==0 then return nil end
  return {mates[1]},#mates==1
 end
 local preferred={}
 local quiet={}
 local givesCheck=attacking and engine.checkingMoveTester(state)
 for _,move in ipairs(legal) do
  stop()
  local group=(not attacking or givesCheck(move)) and preferred or quiet
  table.insert(group,move)
 end
 for _,candidate in ipairs(quiet) do table.insert(preferred,candidate) end
 if not attacking and #preferred>1 then
  table.sort(preferred,function(a,b)
   local left=state.board[a.to]
   local right=state.board[b.to]
   local value=(left and values[kind(left)] or 0)-(right and values[kind(right)] or 0)
   return value>0 or (value==0 and moveID(a)<moveID(b))
  end)
 end
 if hint then
  for index,move in ipairs(preferred) do
   if moveID(move)==hint then
    table.remove(preferred,index)
    table.insert(preferred,1,move)
    break
   end
  end
 end
 local longest,unambiguous
 for _,candidate in ipairs(preferred) do
  local child=engine.apply(state,candidate,false)
  local line,single=mateProof(engine,child,remaining-(attacking and 1 or 0),not attacking,stop,unique,replies and replies[moveID(candidate)])
  if attacking then
   if line then
    if longest then return longest,false end
    longest={candidate}
    for _,move in ipairs(line) do table.insert(longest,move) end
    unambiguous=single
    if not unique then return longest,unambiguous end
   end
  else
   if not line then return nil end
   if not longest or #line>#longest or (#line==#longest and single and not unambiguous) then
    longest={candidate}
    for _,move in ipairs(line) do table.insert(longest,move) end
    unambiguous=single
   end
  end
 end
 return longest,unambiguous
end

local function checkmate(engine,state,moves,rating,stop,bot,deadline)
 local mates=tactics(engine,state,moves,stop)
 if #mates==1 then return {mates[1]}, nil, 400 end
 if #mates~=0 or rating<600 then return nil end
 local proven
 local quiet={}
 local givesCheck=engine.checkingMoveTester(state)
 -- Establish at least one forcing candidate before comparing quiet alternatives.
 for _,move in ipairs(moves) do
  if forcing(state,move,givesCheck) then
   local line,unique=mateInTwo(engine,state,move,stop)
   if line then
    if proven or not unique then return nil end
    proven=line
   end
  else
   table.insert(quiet,move)
  end
 end
 if not proven and rating>=800 and rating<1250 then
  for _,move in ipairs(quiet) do
   local line,unique=mateInTwo(engine,state,move,stop)
   if line then
    if proven or not unique then return nil end
    proven=line
   end
  end
  if proven then return proven end
 end
 if not proven then
  if rating<1000 then return nil end
  -- Use the engine to locate promising deeper candidates before paying to prove them.
  local _,details=bot.choose(engine,state,2400,{
   depth=12,nodes=4500,timeMs=math.min(85,math.max(0,(deadline-os.clock())*1000))
  })
  local score=details and details.score
  if not score or score<350 then return nil end
  local maximum=mateTargets[ratingBand(rating)]
  local distance=score>=99000 and math.ceil((100000-score)/2) or maximum
  if distance<3 or distance>maximum then return nil end
  for horizon=3,distance do
   local solution,unique=mateProof(engine,state,horizon,true,stop,true)
   if solution then
    if unique and (rating>=1250 or forcing(state,solution[1],givesCheck)) then return solution end
    return nil
   end
  end
  return nil
 end
 for _,move in ipairs(quiet) do
  if mateInTwo(engine,state,move,stop) then
   return nil
  end
 end
 return proven
end

local function balance(state,owner)
 local own,opposing=0,0
 for _,piece in pairs(state.board) do
  local value=values[kind(piece)] or 0
  if color(piece)==owner then own+=value else opposing+=value end
 end
 return own-opposing,opposing
end

local function plausibleStructure(state)
 local files={}
 local counts={}
 for square,piece in pairs(state.board) do
  local role=kind(piece)
  local count=(counts[piece] or 0)+1
  counts[piece]=count
  if role=="P" then
   local file=color(piece)..string.sub(square,1,1)
   files[file]=(files[file] or 0)+1
   if count>8 or files[file]>3 then return false end
  elseif (role=="Q" and count>2) or (role~="Q" and count>3) then
   return false
  end
 end
 return true
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
 local depth=defending and 3 or (#moves<=14 and 2 or 1)
 local remaining=(deadline-os.clock())*1000
 local move,details=bot.choose(engine,state,2400,{
  depth=depth,nodes=defending and 1800 or 1100,timeMs=math.min(35,remaining)
 })
 -- A move-ordering fallback is not a completed search. Extend the budget
 -- when necessary to finish a full root iteration rather than abandon the game.
 if details and details.depth>0 then return move end
 remaining=(deadline-os.clock())*1000
 if not details or remaining<15 then return nil end
 move,details=bot.choose(engine,state,2400,{
  depth=depth,nodes=6500,timeMs=math.min(120,remaining)
 })
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
   local child=engine.apply(state,move,false)
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

-- Beginner material puzzles require an immediate meaningful capture.
local function hasMaterialCapture(state,moves)
 for _,move in ipairs(moves) do
  if potential(state,move)>=300 then return true end
 end
 return false
end

local function prepend(move,line)
 local result={move}
 for _,nextMove in ipairs(line) do table.insert(result,nextMove) end
 return result
end

-- Search captures and promotions on the entire board. Include the defender's
-- quiet checks so a counterattack can force the solver away from a recapture.
-- When checked, every legal evasion is searched and standing pat is forbidden.
local function exchange(engine,state,owner,depth,stop,alpha,beta,score,checks)
 stop()
 local maximize=state.turn==owner
 local checked=engine.inCheck(state,state.turn)
 local moves
 local legalCount
 local hasQuiet
 if not checked and (not maximize or checks) then
  local legal=engine.allLegal(state)
  local givesCheck=engine.checkingMoveTester(state)
  moves={}
  legalCount=#legal
  hasQuiet=false
  for _,move in ipairs(legal) do
   local tactical=state.board[move.to]~=nil or move.special=="enpassant" or move.promotion~=nil
   if not tactical then hasQuiet=true end
   if tactical or givesCheck(move) then table.insert(moves,move) end
  end
 else
  moves=checked and engine.allLegal(state) or engine.tacticalMoves(state)
 end
 if #moves==0 and (checked or legalCount==0 or (legalCount==nil and not engine.hasLegal(state))) then
  return checked and not maximize and math.huge or -math.huge,{}
 end
 if engine.insufficientMaterial(state) or (state.turn~=owner and claimable(engine,state)) then return -math.huge,{} end
 score=score or balance(state,owner)
 local best=score
 local line={}
 if checked or (#moves>0 and (hasQuiet==false or (hasQuiet==nil and not engine.hasQuiet(state)))) then
  best=maximize and -math.huge or math.huge
 end
 if #moves==0 then return best,line end
 if depth==0 then error("Unsettled exchange",0) end
 if maximize then alpha=math.max(alpha,best) else beta=math.min(beta,best) end
 if alpha>=beta then return best,line end
 table.sort(moves,function(a,b) return potential(state,a)>potential(state,b) end)
 for _,move in ipairs(moves) do
  local gain=potential(state,move)
  local nextScore=score+(maximize and gain or -gain)
  local value,tail=exchange(engine,engine.apply(state,move,false),owner,depth-1,stop,alpha,beta,nextScore,checks and (not maximize or gain>0 or checked))
  if (maximize and value>best) or (not maximize and value<best) then
   best,line=value,prepend(move,tail)
  end
  if maximize then alpha=math.max(alpha,best) else beta=math.min(beta,best) end
  if alpha>=beta then break end
 end
 return best,line
end

local function defense(engine,state,move,owner,stop,cutoff,checks,hint)
 local child=engine.apply(state,move,false)
 if claimable(engine,child) then return -math.huge,{} end
 local replies=engine.allLegal(child)
 if #replies==0 then return engine.inCheck(child,child.turn) and math.huge or -math.huge,{} end
 local best=math.huge
 local line={}
 table.sort(replies,function(a,b)
  if hint then
   if moveID(a)==hint then return moveID(b)~=hint end
   if moveID(b)==hint then return false end
  end
  local delta=potential(child,a)-potential(child,b)
  return delta>0 or (delta==0 and moveID(a)<moveID(b))
 end)
 for _,reply in ipairs(replies) do
  stop()
  local value,tail=exchange(engine,engine.apply(child,reply,false),owner,14,stop,-math.huge,best,nil,checks)
  if value<best then best,line=value,prepend(reply,tail) end
  if best<cutoff then return best,line end
 end
 return best,line
end

local function uniqueContinuation(engine,state,line,owner,goal,stop,checks)
 local step=state
 for index,move in ipairs(line) do
  if index>1 and step.turn==owner then
   local score=defense(engine,step,move,owner,stop,goal,checks)
   if score<goal then return false end
   for _,other in ipairs(engine.allLegal(step)) do
    if moveID(move)~=moveID(other) then
     local alternate=defense(engine,step,other,owner,stop,goal-100,checks)
     if alternate>=goal-100 then return false end
    end
   end
  end
  step=engine.apply(step,move,false)
 end
 return balance(step,owner)>=goal
end

local function material(engine,state,moves,rating,stop,hint,replies)
 local owner=state.turn
 local initial=balance(state,owner)
 table.sort(moves,function(a,b)
  local delta=potential(state,a)-potential(state,b)
  return delta>0 or (delta==0 and moveID(a)<moveID(b))
 end)
 if rating<400 and potential(state,moves[1])<300 then return nil end
 local choice,score,tail
 local tested={}
 local qualifying=math.max(100,initial+(rating>=800 and 175 or 300))
 for _,move in ipairs(moves) do
  if hint and moveID(move)~=hint then continue end
  local capture=potential(state,move)>=300
  if not capture and rating<400 then break end
  local setup=false
  if not capture then
   stop()
   local child=engine.searchApply(state,move)
   setup=engine.inCheck(child,child.turn)
   if not setup then
    -- A quiet fork or pin can create a threat that survives the opponent's reply.
    child.turn=owner
    child.ep=nil
    for _,threat in ipairs(engine.tacticalMoves(child)) do
     if potential(child,threat)>=300 then setup=true; break end
    end
   end
  end
  if not capture and not setup and not hint then continue end
  local value,line=defense(engine,state,move,owner,stop,qualifying,hint~=nil,replies and replies[moveID(move)])
  tested[move]=value
  if value>=qualifying and (not score or value>score) then choice,score,tail=move,value,line end
 end
 if not choice or score==math.huge then return nil end
 local threshold=score-100
 for _,move in ipairs(moves) do
  if move~=choice then
   local value=tested[move]
   -- Below the qualifying cutoff, a stopped search gives an upper bound.
   -- Reuse it only when it already rules this alternative out.
   if value==nil or (value<qualifying and value>=threshold) then
    value=defense(engine,state,move,owner,stop,threshold,hint~=nil,replies and replies[moveID(move)])
   end
   if value>=threshold then return nil end
  end
 end
 local line=prepend(choice,tail)
 if #line>2 and rating<400 then return nil end
 if not uniqueContinuation(engine,state,line,owner,score,stop,hint~=nil) then return nil end
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
  difficulty=difficulty,targetRating=options.rating,gain=gain,intermediateChecks=options.category=="material" and options.firstMove~=nil or nil,materialProof=options.category=="material" and 2 or nil,origin=origin,steps=steps,line=line}
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
    local nextState=engine.apply(position,best,false)
    local tail
    if category=="checkmate" then
     local remaining=math.floor((#line-index+1)/2)
     local single
     tail,single=mateProof(engine,nextState,remaining,true,stop,true)
     if not tail or not single or #tail~=#line-index then return nil end
    else
     local score
     score,tail=exchange(engine,nextState,owner,14,stop,-math.huge,math.huge)
     if score~=goal then return nil end
    end
    for later=#line,index+1,-1 do line[later]=nil end
    line[index]=best
    for _,reply in ipairs(tail) do table.insert(line,reply) end
    move=best
   end
  end
  position=engine.apply(position,move,false)
  index+=1
 end
 if changed and category=="material" and not uniqueContinuation(engine,state,line,owner,goal,stop) then return nil end
 return line
end

function Puzzle.validate(engine,bot,state,moves,category,rating,deadline,offline,knownMate,hint,replies)
 local lead,opposing=balance(state,state.turn)
 if not hasResistance(lead,opposing) or not plausibleStructure(state) then return nil end

 local verify=category=="checkmate" and checkmate or material
 local seconds,nodes=.34,2500
 if rating>=1000 then seconds,nodes=.65,9500 end
 if offline then seconds,nodes=4,180000 end
 if replies then
  seconds,nodes=12,650000
  if knownMate and knownMate>=4 then seconds,nodes=27,2000000 end
 end
 local stop=limit(math.min(deadline,os.clock()+seconds),nodes)
 local ok,line,gain,difficulty
 if knownMate and category=="checkmate" then
  ok,line=pcall(function()
   local first=1
   if knownMate>=4 and not mateProof(engine,state,knownMate-1,true,stop,false,hint,replies) then
    first=knownMate
   end
   for horizon=first,knownMate do
    local proof,single=mateProof(engine,state,horizon,true,stop,true,hint,replies)
    if proof then return single and proof or nil end
   end
  end)
 elseif offline and hint and category=="material" then
  ok,line,gain=pcall(material,engine,state,moves,rating,stop,hint,replies)
 else
  ok,line,gain,difficulty=pcall(verify,engine,state,moves,rating,stop,bot,deadline)
 end
 if not ok or not line then return nil end
 if isAlreadyWon(engine,bot,state,moves,line[1],category,lead,deadline) then return nil end
 local replyStop=limit(math.min(deadline,os.clock()+.34),2500)
 local verified,finalLine=true,line
 if not offline then
  verified,finalLine=pcall(verifyBlackReplies,engine,bot,state,line,category,gain,deadline,replyStop)
 end
 if not verified or not finalLine then return nil end
 local choices=math.ceil(#finalLine/2)
 local position=state
 local pressure=0
 local competing=0
 local defenses=0
 local quietFirst=false
 local forcingReply=false
 local sacrifice=false
 local afterSolver
 for index,move in ipairs(finalLine) do
  if index%2==1 then
   local options=engine.allLegal(position)
   local forcingCount=0
   local givesCheck=engine.checkingMoveTester(position)
   for _,alternative in ipairs(options) do
    if forcing(position,alternative,givesCheck) then forcingCount+=1 end
   end
   if forcingCount>=3 then pressure+=1 end
   if index==1 then
    competing=math.max(0,forcingCount-1)
    quietFirst=not forcing(position,move,givesCheck)
   end
  else
   if index==2 then forcingReply=forcing(position,move,engine.checkingMoveTester(position)) end
   local replies=#engine.allLegal(position)
   if replies>=3 then pressure+=1 end
   defenses+=math.min(5,math.max(0,replies-1))
  end
  position=engine.apply(position,move,false)
  if index%2==1 then afterSolver=position end
  if index==2 then sacrifice=balance(position,state.turn)<=lead-175 end
 end
 local base
 local closeAlternatives=0
 if category=="material" then
  local settled=balance(position,state.turn)
  -- Check both the resolved exchange and the board shown after the last
  -- solver move. A gain that still leaves the solver behind is insufficient.
  if settled<math.max(100,lead+gain) or balance(afterSolver,state.turn)<100 then return nil end
  if choices>materialTargets[ratingBand(rating)] then return nil end
  local quiet=potential(state,finalLine[1])==0
  if rating<400 then
   local child=engine.apply(state,finalLine[1],false)
   if kind(state.board[finalLine[1].to] or "  ")=="K" or
      potential(state,finalLine[1])<300 or finalLine[1].promotion or
      (finalLine[2] and finalLine[2].to==finalLine[1].to) then return nil end
   for _,reply in ipairs(engine.tacticalMoves(child)) do
    if reply.to==finalLine[1].to then return nil end
   end
  end
  if choices==1 then
   for _,move in ipairs(moves) do
    if moveID(move)~=moveID(finalLine[1]) and potential(state,move)>=300 then
     closeAlternatives+=1
    end
   end
  end
  base=materialRatings[math.min(choices,#materialRatings)]+(quiet and 100 or 0)
 else
  base=mateRatings[choices]
 end
 -- Estimate how much a solver must compare and calculate after the proof.
 local bonus=math.min(180,competing*25)+math.min(250,defenses*30)
 if quietFirst then bonus+=150 end
 if choices>=3 and sacrifice then bonus+=100 end
 if category=="checkmate" and choices==1 then
  -- Crowded forcing positions can hide mate even when it takes one move.
  bonus=math.min(310,competing*32)
 end
 if category=="material" and choices==1 then
  bonus=math.min(180,closeAlternatives*65)+(forcingReply and 110 or 0)
 end
 if choices>=3 and pressure==0 then bonus-=120 end
 difficulty=math.clamp(5*math.floor((base+bonus+2.5)/5),200,3000)
 return finalLine,gain,difficulty
end

function Puzzle.generate(engine,bot,options)
 local rating=math.clamp(options.rating,200,3000)
 local deadline=os.clock()+math.clamp(options.timeMs or (rating>=1000 and 4500 or 2400),100,options.offline and 30000 or 6000)/1000
 local random=randomSource(options.seed)
 local seen={}
 for _,id in ipairs(options.recent or {}) do seen[id]=true end
 while os.clock()<deadline do
  local state=engine.initial()
  local minimum=options.category=="checkmate" and 16 or 12
  for ply=0,84 do
   if os.clock()>=deadline then break end
   local moves=engine.allLegal(state)
   if #moves==0 or engine.insufficientMaterial(state) or state.halfmove>=100 then break end
   if ply>=minimum and (options.category~="material" or rating>=400 or hasMaterialCapture(state,moves))
     and not claimable(engine,state) then
    local id=fingerprint(engine,state)
    if not seen[id] then
     local line,gain,difficulty=Puzzle.validate(engine,bot,state,moves,options.category,rating,deadline,options.offline)
     if line and math.abs(difficulty-rating)<=200 then
      return serialize(engine,state,line,options,id,gain,difficulty)
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
 return {retry=true}
end

-- Offline game imports replay SAN against the normal legal move generator.
local function gameMove(engine,state,notation)
 local token=string.gsub(notation,"[+#!?]+$","")
 local castle=token=="O-O" and "castleK" or token=="O-O-O-O" and "castleQ"
 local promotion=string.match(token,"=([QRBN])$")
 if promotion then token=string.sub(token,1,-3) end
 local destination=string.match(token,"([a-h][1-8])$")
 local prefix=destination and string.sub(token,1,-3) or ""
 local role=string.match(prefix,"^([KQRBN])") or "P"
 if role~="P" then prefix=string.sub(prefix,2) end
 local capture=string.find(prefix,"x",1,true)~=nil
 local origin=string.gsub(prefix,"x","")
 local selected
 for _,move in ipairs(engine.allLegal(state)) do
  if (castle and move.special==castle) or (not castle and move.to==destination and move.promotion==promotion
     and kind(state.board[move.from])==role and string.find(move.from,origin,1,true)
     and capture==(state.board[move.to]~=nil or move.special=="enpassant")) then
   if selected then return nil end
   selected=move
  end
 end
 return selected
end

function Puzzle.fromGame(engine,bot,options)
 local state=engine.initial()
 local positions={}
 for _,notation in ipairs(options.moves) do
  local move=gameMove(engine,state,notation)
  if not move then return {retry=true} end
  table.insert(positions,state)
  state=engine.apply(state,move)
 end
 if options.exactPosition then
  local moves=engine.allLegal(state)
  if #moves==0 or claimable(engine,state) then return {} end
  local line,gain,difficulty=Puzzle.validate(engine,bot,state,moves,options.category,
   options.rating,os.clock()+29,true,options.knownMate,options.firstMove,options.replyHints)
  if not line then return {} end
  return {serialize(engine,state,line,options,fingerprint(engine,state),gain,difficulty)}
 end
 local results={}
 local deadline=os.clock()+8
 local excluded={}
 for _,id in ipairs(options.recent or {}) do excluded[id]=true end
 local order={}
 if options.forcingFinal then
  for offset=4,12,2 do
   if #positions-offset>=17 then table.insert(order,#positions-offset) end
  end
 else
  for index=#positions,math.max(17,#positions-18),-1 do table.insert(order,index) end
 end
 for _,index in ipairs(order) do
  if os.clock()>=deadline then break end
  state=positions[index]
  local id=fingerprint(engine,state)
  if not excluded[id] and not claimable(engine,state) then
   local moves=engine.allLegal(state)
   local rating=options.rating
   if #moves>0 then
    local line,gain,difficulty=Puzzle.validate(engine,bot,state,moves,options.category,rating,deadline,true)
    if line and math.abs(difficulty-rating)<=200 then
     table.insert(results,serialize(engine,state,line,options,id,gain,difficulty))
    end
   end
  end
 end
 return results
end

return Puzzle
