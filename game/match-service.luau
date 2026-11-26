-- Server-owned matchmaking, chess state, bot games, Elo, league points, and player profiles.
local Players=game:GetService("Players")
local ReplicatedStorage=game:GetService("ReplicatedStorage")
local DataStoreService=game:GetService("DataStoreService")
local HttpService=game:GetService("HttpService")
local root=ReplicatedStorage:WaitForChild("ExaltedChess")
local Chess=require(root.Modules.ChessEngine)
local Four=require(root.Modules.FourPlayerEngine)
local Bot=require(root.Modules.BotEngine)
local Themes=require(root.Modules.ThemeLibrary)
local remotes=root:WaitForChild("Remotes")
local Action=remotes:WaitForChild("Action")
local Update=remotes:WaitForChild("Update")
-- GetDataStore throws (and kills this whole script) when Studio API access is disabled.
-- Guard it so the game is fully playable even without DataStore persistence.
local Profiles
local storeOk,store=pcall(function() return DataStoreService:GetDataStore("ExaltedChessProfile_v2") end)
if storeOk then Profiles=store else warn("[ExaltedChess] DataStore unavailable, profiles will not persist: "..tostring(store)) end
local matches,playerMatch,lastMatchId={},{},{}
local queue,queueFour,queueControls={},{},{}
local inviteRooms, playerRoom = {}, {}
local challengeOffers={}; local challengeGroups={}; local challengeInvite={}
local profileCache={}
local defaultProfile={chessElo=1000,fourElo=1000,leaguePoints=0,allTimeCaptures=0,history={},equippedBoard="classic"}
local POINTS={Soil={20,6,-5},Grass={18,5,-6},Copper={16,4,-7},Silver={14,3,-8},Gold={12,3,-9},Stone={10,2,-10},Sapphire={8,2,-11}}
local THRESHOLDS={{"Soil",0},{"Grass",300},{"Copper",600},{"Silver",900},{"Gold",1200},{"Stone",1500},{"Sapphire",1800}}
local function copy(t) local r={}; for k,v in pairs(t) do r[k]=type(v)=="table" and copy(v) or v end; return r end
local function league(points)
 local found="Soil"; for _,pair in ipairs(THRESHOLDS) do if points>=pair[2] then found=pair[1] end end; return found
end
local function send(p,kind,data) if p and p.Parent then if typeof(p)=="Instance" then Update:FireClient(p,kind,data) end end end
local function historyId(history)
 while true do
  local id=HttpService:GenerateGUID(false)
  local used=false
  for _,record in ipairs(history) do
   if type(record)=="table" and record.id==id then used=true; break end
  end
  if not used then return id end
 end
end
local function getProfile(p)
 local id=tostring(p.UserId); if profileCache[id] then return profileCache[id] end
 local profile=copy(defaultProfile); local ok,saved=false,nil
 if Profiles then ok,saved=pcall(function() return Profiles:GetAsync(id) end) end
 if ok and type(saved)=="table" then for k,v in pairs(saved) do profile[k]=v end end
 profile.botStars=nil; profile.leaguePoints=math.clamp(tonumber(profile.leaguePoints) or 0,0,2100)
 local needsCaptureReset=profile.captureStatsVersion~=1
 profile.allTimeCaptures=needsCaptureReset and 0 or math.max(0,math.floor(tonumber(profile.allTimeCaptures) or 0))
 profile.captureStatsVersion=1
 profile.pieceStorage=nil; profile.ownedBoards=nil
 profile.chessElo=tonumber(profile.chessElo) or 1000; profile.fourElo=tonumber(profile.fourElo) or 1000; profile.history=type(profile.history)=="table" and profile.history or {}
 for _,record in ipairs(profile.history) do
  if type(record)=="table" and not record.id then record.id=historyId(profile.history) end
 end
 if profile.equippedBoard~="" and not Themes.exists(profile.equippedBoard) then profile.equippedBoard=Themes.defaultTheme end
 profileCache[id]=profile
 if ok and (needsCaptureReset or (type(saved)=="table" and (saved.equippedBoard~=profile.equippedBoard or saved.pieceStorage~=nil or saved.ownedBoards~=nil))) then
  pcall(function() Profiles:SetAsync(id,profile) end)
 end
 return profile
end
local function saveProfile(p)
 local profile=profileCache[tostring(p.UserId)]; if profile and Profiles then pcall(function() Profiles:SetAsync(tostring(p.UserId),profile) end) end
end
local function profileView(p)
 local v=getProfile(p); return {ranked=v.ranked,chessElo=v.chessElo,fourElo=v.fourElo,leaguePoints=v.leaguePoints,league=league(v.leaguePoints),allTimeCaptures=v.allTimeCaptures,history=v.history or {},equippedBoard=v.equippedBoard}
end
local function fourMode(m) return m.mode=="fourBot" or m.mode=="fourOnline" end
local function engineFor(m) return fourMode(m) and Four or Chess end
local function sideName(side) return ({w="White",b="Black",R="Red",B="Blue",Y="Yellow",G="Green"})[side] or side end
local function matchPlayersPayload(m,p)
 local names,ratings={},{}
 for _,other in ipairs(m.players) do
  local color=m.sides[other.UserId]; names[color]=other.DisplayName or other.Name
  local prof=getProfile(other); ratings[color]=fourMode(m) and prof.fourElo or prof.chessElo
 end
 if m.mode=="bot" then names.b="Exalted Bot"; ratings.b=m.botRating end
 if m.mode=="fourBot" then
  for _,c in ipairs({"B","Y","G"}) do names[c]="Bot"; ratings[c]=m.botRatings[c] end
 end
 return names,ratings
end
local function publicState(m)
 local e=engineFor(m); local s=e.public(m.state)
 if fourMode(m) then
  s.status=(e.inCheck(m.state,m.state.turn) and "check" or "playing")
  -- All alive colors currently in check, so clients can play the check sound
  -- the instant a piece attacks a king, even when it is not that player's turn.
  local checked={}; for _,c in ipairs(Four.colors) do
   if not m.state.eliminated[c] and e.inCheck(m.state,c) then table.insert(checked,c) end
  end
  s.checkedColors=checked
 end
 return s
end
local function legalTarget(m,move)
 return {to=move.to,promotion=move.promotion,special=move.special,rookFrom=move.rookFrom,rookTo=move.rookTo,
  capture=m.state.board[move.to]~=nil or move.special=="enpassant"}
end
local function fourReplayStates(m)
 if not fourMode(m) then return nil end
 local states={}
 for _,state in ipairs(m.snapshots) do table.insert(states,{turn=state.turn,eliminated=state.eliminated}) end
 table.insert(states,{turn=m.state.turn,eliminated=m.state.eliminated})
 return states
end
local function pair(m,recipient,terminal)
 if not recipient then m.revision=(m.revision or 0)+1 end
 local state=publicState(m); local players,ratings=matchPlayersPayload(m)
 if m.mode=="bot" then
  state.analysis={castling=m.state.castling,ep=m.state.ep,positions=m.state.positions}
 end
 state.terminal=terminal or state.status=="checkmate" or state.status=="stalemate" or state.status=="draw"
 local fourStates=fourReplayStates(m)
 local legalBySource={}
 if not state.terminal then
  local e=engineFor(m)
  local humanTurn=false
  for _,p in ipairs(m.players) do if m.sides[p.UserId]==m.state.turn then humanTurn=true; break end end
  if humanTurn then
   for _,move in ipairs(e.allLegal(m.state)) do
    local targets=legalBySource[move.from] or {}
    table.insert(targets,legalTarget(m,move))
    legalBySource[move.from]=targets
   end
  end
 end
 for _,p in ipairs(recipient and {recipient} or m.players) do
  if not (m.resultsSent and m.resultsSent[p.UserId]) then send(p,"state",{matchId=m.id,revision=m.revision,mode=m.mode,variant=fourMode(m) and "four" or "chess",level=m.botRating,botRatings=m.botRatings,ratings=ratings,clocks=m.clocks,baseSeconds=m.rematchControl and m.rematchControl.baseSeconds,increment=m.increment,turnStarted=m.turnStarted,serverTime=workspace:GetServerTimeNow(),side=m.sides[p.UserId],fourStates=fourStates,legalBySource=m.sides[p.UserId]==m.state.turn and legalBySource or nil,players=players,state=state,opponent=m.mode=="bot" and "Exalted Bot" or "Opponent"}) end
 end
 return state
end
local function expected(a,b) return 1/(1+10^((b-a)/400)) end
local function rankedCategory(m)
 if m.mode~="online" then return nil end
 local base=m.rematchControl and m.rematchControl.baseSeconds or 180
 return base<180 and "bullet" or base<600 and "blitz" or "rapid"
end
local function updateOnlineRatings(m,winner,placements)
 if m.mode=="online" then
  local p1,p2=m.players[1],m.players[2]; if not p1 or not p2 then return end
  local r1=getProfile(p1); local r2=getProfile(p2); local a,b=r1.chessElo,r2.chessElo
  local s1=winner==nil and .5 or (m.sides[p1.UserId]==winner and 1 or 0)
  local category=rankedCategory(m)
  local function record(profile)
   profile.ranked=profile.ranked or {}
   local row=profile.ranked[category] or {rating=1000,wins=0,draws=0,losses=0}
   profile.ranked[category]=row
   return row
  end
  local first,second=record(r1),record(r2)
  local ar,br=first.rating,second.rating
  local results={{first,s1,ar,br},{second,1-s1,br,ar}}
  for _,entry in ipairs(results) do
   local row,score,rating,opponent=table.unpack(entry)
   row.rating=math.max(100,math.floor(rating+32*(score-expected(rating,opponent))+.5))
   local field=score==1 and "wins" or score==0 and "losses" or "draws"
   row[field]+=1
  end
  local k=32; r1.chessElo=math.max(100,math.floor(a+k*(s1-expected(a,b))+.5)); r2.chessElo=math.max(100,math.floor(b+k*((1-s1)-expected(b,a))+.5))
  for _,p in ipairs({p1,p2}) do
   local prof=getProfile(p); local tier=league(prof.leaguePoints); local reward=POINTS[tier][winner==nil and 2 or (m.sides[p.UserId]==winner and 1 or 3)]
   prof.leaguePoints=math.clamp(prof.leaguePoints+reward,0,2100); saveProfile(p); send(p,"profile",profileView(p))
  end
 elseif m.mode=="fourOnline" and placements then
  local scores={[1]=1,[2]=.67,[3]=.33,[4]=0}; local playerProfiles={}
  for _,p in ipairs(m.players) do playerProfiles[p]=getProfile(p) end
  for _,p in ipairs(m.players) do
   local prof=playerProfiles[p]; local side=m.sides[p.UserId]
   if not (m.abortedSides and m.abortedSides[side]) then
    local actual=scores[placements[side] or 4] or 0; local expectedScore=0
    for _,other in ipairs(m.players) do if other~=p then expectedScore+=expected(prof.fourElo,playerProfiles[other].fourElo)/3 end end
    prof.fourElo=math.max(100,math.floor(prof.fourElo+32*(actual-expectedScore)+.5)); saveProfile(p); send(p,"profile",profileView(p))
   end
  end
 end
end
-- Game history: store the last 20 finished matches per player so they can replay them move by move.
local function recordHistory(m,p,side,result,reason,place)
 if #(m.state.history or {})==0 then return end
 local prof=getProfile(p)
 local moves={}
 for _,mv in ipairs(m.state.history) do table.insert(moves,{c=mv.color,f=mv.from,t=mv.to,p=mv.promotion}) end
 local opp={}
 if m.mode=="bot" then opp={"Exalted Bot"}
 elseif m.mode=="fourBot" then opp={"Bots"}
 else for _,o in ipairs(m.players) do if o~=p then table.insert(opp,o.DisplayName or o.Name) end end end
 local fourStates=fourReplayStates(m)
 prof.history=prof.history or {}
 table.insert(prof.history,1,{id=historyId(prof.history),v=fourMode(m) and "four" or "chess",mode=m.mode,category=rankedCategory(m),result=result,reason=reason,ts=os.time(),side=side,place=place,opp=table.concat(opp,", "),moves=moves,fourStates=fourStates})
 while #prof.history>20 do table.remove(prof.history,#prof.history) end
 saveProfile(p); send(p,"profile",profileView(p))
end
local function fourReview(m)
 if not fourMode(m) then return nil end
 local frames={}
 local function add(state)
  local view=Four.public(state)
  view.history=nil
  view.checkedColors={}
  for _,color in ipairs(Four.colors) do
   if not state.eliminated[color] and Four.inCheck(state,color) then table.insert(view.checkedColors,color) end
  end
  table.insert(frames,view)
 end
 for _,state in ipairs(m.snapshots) do add(state) end
 add(m.state)
 return frames
end
local function finish(m,winner,reason,placements)
 if m.over then return end; m.over=true; m.botGeneration+=1
 local review=fourReview(m)
 local sideToMove=m.state.turn
 if m.clocks and m.clocks[sideToMove] then
  local elapsed=math.max(0,workspace:GetServerTimeNow()-m.turnStarted)
  m.clocks[sideToMove]=math.max(0,m.clocks[sideToMove]-elapsed)
 end
 updateOnlineRatings(m,winner,placements)
 for _,p in ipairs(m.players) do
  local side=m.sides[p.UserId]; local win=winner and side==winner
  local place=(fourMode(m) and placements) and placements[side] or nil
  local res=win and "win" or (winner or place==4) and "loss" or "draw"
  if m.noResult and m.noResult[p.UserId] then m.resultsSent[p.UserId]=true; playerMatch[p.UserId]=nil
  elseif not m.resultsSent[p.UserId] then
  send(p,"result",{matchId=m.id,result=res,reason=reason,placements=placements,clocks=m.clocks,review=review,final=true})
  if place then res=place==1 and "win" or (place==4 and "loss" or "placed") end
  recordHistory(m,p,side,res,reason,place)
  m.resultsSent[p.UserId]=true; playerMatch[p.UserId]=nil; lastMatchId[p.UserId]=m.id
  else send(p,"result",{matchId=m.id,result=res,reason=reason,placements=placements,clocks=m.clocks,review=review,final=true}) end
 end
end
local function clearQueue(p,q)
 for i=#q,1,-1 do if q[i]==p then table.remove(q,i) end end
end
local function timeControl(data)
 local input=type(data)=="table" and data or {}
 return {baseSeconds=math.clamp(tonumber(input.baseSeconds) or 180,60,900),
  increment=math.clamp(tonumber(input.increment) or 0,0,10)}
end
local function newMatch(players,mode,setting)
 local occupied={}
 for _,p in ipairs(players) do
  local existing=matches[playerMatch[p.UserId]]
  if occupied[p.UserId] or playerRoom[p.UserId] or (existing and not existing.over) then
   for _,member in ipairs(players) do send(member,"reject",{reason="A player is already in a match."}) end
   return
  end
  occupied[p.UserId]=true
 end
 for _,p in ipairs(players) do
  local priorId=lastMatchId[p.UserId]
  local prior=matches[priorId]
  if prior and (prior.mode=="bot" or prior.mode=="fourBot") then
   matches[priorId]=nil
   lastMatchId[p.UserId]=nil
  end
  clearQueue(p,queue); clearQueue(p,queueFour); queueControls[p.UserId]=nil
 end
 local id=HttpService:GenerateGUID(false); local sides={}
 if mode=="bot" then sides[players[1].UserId]="w"; setting=Bot.clampRating(setting)
 elseif mode=="fourBot" then sides[players[1].UserId]="R"
 else
  local colors=(mode=="fourOnline") and table.clone(Four.colors) or {"w","b"}
  for i=#colors,2,-1 do local j=math.random(i); colors[i],colors[j]=colors[j],colors[i] end
  for i,p in ipairs(players) do sides[p.UserId]=colors[i] end
 end
 local m={id=id,players=players,mode=mode,sides=sides,resultsSent={},state=(mode=="fourBot" or mode=="fourOnline") and Four.initial() or Chess.initial(),snapshots={},humanTurns={},over=false,botGeneration=0,botRating=setting,botRatings={},abortedSides={}}
 if mode=="online" or mode=="fourOnline" then
  local control=timeControl(setting)
  control.private=type(setting)=="table" and setting.private==true
  local base=control.baseSeconds
  m.clocks=mode=="fourOnline" and {R=base,B=base,Y=base,G=base} or {w=base,b=base}
  m.clockSide=m.state.turn
  m.increment=control.increment
  m.turnStarted=workspace:GetServerTimeNow()
  if not control.private then m.firstDeadline=m.turnStarted+20 end
  m.rematchControl=control
 end
 if mode=="fourBot" then local requested=setting or {}; for _,c in ipairs({"B","Y","G"}) do m.botRatings[c]=Bot.clampRating(requested[c]) end end
 matches[id]=m; for _,p in ipairs(players) do playerMatch[p.UserId]=id end; pair(m); return m
end
local function showInvite(room, recipient)
 for _,member in ipairs(room.players) do
  if not recipient or member==recipient then
   send(member,"inviteRoom",{code=room.code,variant=room.mode=="fourOnline" and "four" or "chess",
    count=#room.players,needed=room.needed,baseSeconds=room.control.baseSeconds,increment=room.control.increment,
    host=member==room.players[1]})
  end
 end
end

local function closeInvite(room, reason)
 inviteRooms[room.code]=nil
 for _,member in ipairs(room.players) do
  playerRoom[member.UserId]=nil
  if reason then send(member,"inviteClosed",{reason=reason}) end
 end
end

local function leaveInvite(player)
 local room=playerRoom[player.UserId]
 if not room then return end
 if room.players[1]==player then closeInvite(room,"The host closed the challenge."); return end
 for index,member in ipairs(room.players) do
  if member==player then table.remove(room.players,index); break end
 end
 playerRoom[player.UserId]=nil
 send(player,"inviteClosed",{})
 showInvite(room)
end

local function snapshot(m) table.insert(m.snapshots,fourMode(m) and copy(m.state) or m.state) end
local function normalizeFour(m)
 local state=m.state
 local previousTurn=state.turn
 -- A captured king eliminates its side.
 for _,c in ipairs(Four.colors) do
  if not state.eliminated[c] then
   local hasKing=false; for _,piece in pairs(state.board) do if piece==c.."K" then hasKing=true break end end
   if not hasKing then
    state.eliminated[c]=true; state.eliminationReason[c]="Checkmate"; table.insert(state.eliminationOrder,c)
    if state.turn==c then state.turn=Four.nextColor(c) end
   end
  end
 end
 for _=1,4 do
  local c=state.turn; if state.eliminated[c] then state.turn=Four.nextColor(c)
  elseif #Four.allLegal(state,c)>0 then break
  else
   state.eliminated[c]=true; state.eliminationReason[c]=Four.inCheck(state,c) and "Checkmate" or "Stalemate"; table.insert(state.eliminationOrder,c); state.turn=Four.nextColor(c)
  end
 end
 if m.clocks and (state.turn~=previousTurn or previousTurn~=m.clockSide) then
  m.turnStarted=workspace:GetServerTimeNow()
  m.clockSide=state.turn
  m.firstDeadline=nil
 end
 local alive={}; for _,c in ipairs(Four.colors) do if not state.eliminated[c] then table.insert(alive,c) end end
 if #alive<=1 then
  local places={}; local winner=alive[1]; if winner then places[winner]=1 end; for rank=2,4 do local c=state.eliminationOrder[#state.eliminationOrder-(rank-2)]; if c then places[c]=rank end end
  pair(m,nil,true)
  finish(m,winner,winner and "Last player standing" or "All players eliminated",places); return true
 end
 return false
end
local function publish(m)
 if fourMode(m) then
  if not normalizeFour(m) then pair(m) end
  return
 end
 local state=pair(m)
 local status,reason=state.status,state.drawReason
 if status=="checkmate" then finish(m,m.state.turn=="w" and "b" or "w","Checkmate")
 elseif status=="stalemate" then finish(m,nil,"Stalemate")
 elseif status=="draw" then finish(m,nil,reason) end
end
-- First-move tracking: has this side made any move yet (used for the 20s abort window).
local function hasMoved(m,side)
 for _,mv in ipairs(m.state.history) do if mv.color==side then return true end end
 return false
end
-- Clean abort of a 1v1 match: no rating change, no pieces, no winner. Match simply ends.
local function abortMatch(m,side)
 if m.over then return end
 m.over=true; m.botGeneration+=1
 local turn=m.state.turn
 m.clocks[turn]=math.max(0,m.clocks[turn]-math.max(0,workspace:GetServerTimeNow()-m.turnStarted))
 for _,p in ipairs(m.players) do
 if not m.resultsSent[p.UserId] then
 local mine=m.sides[p.UserId]==side
 send(p,"result",{matchId=m.id,result="aborted",reason=mine and "You aborted" or "Opponent aborted",clocks=m.clocks,final=true})
 m.resultsSent[p.UserId]=true; playerMatch[p.UserId]=nil; lastMatchId[p.UserId]=m.id
 end
 end
end
-- Abort in a four-player match: the player is removed and their pieces turn grey.
local function abortFour(m,side)
 if m.over or m.state.eliminated[side] then return end
 m.state.eliminated[side]=true; m.state.eliminationReason[side]="Aborted"; table.insert(m.state.eliminationOrder,side)
 m.abortedSides[side]=true;
 if m.state.turn==side then m.state.turn=Four.nextColor(side) end
 for _,p in ipairs(m.players) do
 if m.sides[p.UserId]==side and not m.resultsSent[p.UserId] then
 m.resultsSent[p.UserId]=true; playerMatch[p.UserId]=nil
 send(p,"result",{matchId=m.id,result="aborted",reason="You aborted"})
 end
 end
 normalizeFour(m); pair(m)
end
local function botTurnIsCurrent(m,generation,position)
 return not m.over and m.botGeneration==generation and m.state==position
end

local function searchBot(m,engine,generation,rating)
 local position=m.state
 local options={gameplay=true}
 if task.cooperativeSearch then
  options.checkpoint=function()
   task.wait(0)
   return botTurnIsCurrent(m,generation,position)
  end
 end
 local move,details=Bot.choose(engine,position,rating,options)
 if not botTurnIsCurrent(m,generation,position) then return nil,nil,false end
 return move,details,true
end

local BOT_THINK_SECONDS=1
local function runFourBots(m,generation)
 while not m.over and m.botGeneration==generation and m.state.turn~="R" do
  task.wait(BOT_THINK_SECONDS)
  if m.over or m.botGeneration~=generation then return end
  local color=m.state.turn
  local move,_,current=searchBot(m,Four,generation,m.botRatings[color])
  if not current then return end
  if move then
   snapshot(m)
   m.state=Four.apply(m.state,move)
  end
  publish(m)
 end
end

local function runChessBot(m,generation)
 task.wait(BOT_THINK_SECONDS)
 if m.over or m.botGeneration~=generation or m.state.turn~="b" then return end
 local move,details,current=searchBot(m,Chess,generation,m.botRating)
 if not current then return end
 if not move then publish(m); return end
 if details.score and details.score<=0 then
  local claim=Chess.claimReason(m.state) or Chess.claimReason(m.state,move)
  if claim then finish(m,nil,claim); return end
 end
 snapshot(m)
 m.state=Chess.apply(m.state,move)
 publish(m)
end
local function findMove(engine,state,data)
 if type(data)~="table" or type(data.from)~="string" or type(data.to)~="string" then return end
 local promotion=({Q="Q",R="R",B="B",N="N"})[data.promotion] or "Q"
 for _,move in ipairs(engine.legalMoves(state,data.from)) do
  if move.to==data.to then
   if engine==Four and move.promotion then move.promotion=promotion end
   if not move.promotion or move.promotion==promotion then return move end
  end
 end
end

local function matchesRequest(m,data)
 return not data or ((not data.matchId or data.matchId==m.id) and
  (data.revision==nil or data.revision==m.revision))
end

local function claimDraw(p,data)
 local m=matches[playerMatch[p.UserId]]
 if not m or m.over or fourMode(m) or m.sides[p.UserId]~=m.state.turn then
  send(p,"reject",{reason="A draw cannot be claimed right now."})
  return
 end
 if not matchesRequest(m,data) then send(p,"reject",{reason="The position changed. Try again."}); return end
 local hasMove=data and data.from
 local move=hasMove and findMove(Chess,m.state,data) or nil
 local reason
 if not hasMove or move then reason=Chess.claimReason(m.state,move) end
 if reason then finish(m,nil,reason)
 else send(p,"reject",{reason="A draw cannot be claimed for that position."}) end
end

local function requestMove(p,data)
 local id=playerMatch[p.UserId]; local m=id and matches[id]
 if not m or m.over or type(data)~="table" or not matchesRequest(m,data) then
  send(p,"reject",{reason="The position changed. Try again."})
  return
 end
 local side=m.sides[p.UserId]
 if side~=m.state.turn then send(p,"reject",{reason="It is not your turn."}); return end
 local engine=engineFor(m)
 local chosen=findMove(engine,m.state,data)
 if not chosen then send(p,"reject",{reason="Illegal move"}); return end
 local to=chosen.to
 if m.clocks and (m.mode=="online" or m.mode=="fourOnline") then
  local now=workspace:GetServerTimeNow(); local elapsed=math.max(0,now-m.turnStarted); local remaining=m.clocks[side]-elapsed
  if remaining<=0 then
   if m.mode=="fourOnline" then
    m.clocks[side]=0; m.state.eliminated[side]=true; m.state.eliminationReason[side]="Timeout"; table.insert(m.state.eliminationOrder,side); m.state.turn=Four.nextColor(side)
    m.resultsSent[p.UserId]=true; playerMatch[p.UserId]=nil; send(p,"result",{matchId=m.id,result="loss",reason="Timeout",review=fourReview(m)})
    normalizeFour(m); pair(m)
   else finish(m,side=="w" and "b" or "w","Timeout") end
   return
  end
  m.clocks[side]=remaining+m.increment; m.turnStarted=now; m.firstDeadline=nil
 end
 if m.mode=="bot" or m.mode=="fourBot" then table.insert(m.humanTurns,#m.snapshots+1) end
 local capturedTarget=m.state.board[to]~=nil or chosen.special=="enpassant"
 snapshot(m); m.botGeneration+=1; m.state=engine.apply(m.state,chosen)
 if m.clocks then m.clockSide=m.state.turn end
 if capturedTarget then
  local profile=getProfile(p)
  profile.allTimeCaptures+=1
  saveProfile(p); send(p,"profile",profileView(p))
 end
 if fourMode(m) and normalizeFour(m) then return end

 if not m.over and m.clocks and (m.mode=="online" or m.mode=="fourOnline") then
  local nextSide=m.state.turn
  if not (m.state.eliminated and m.state.eliminated[nextSide]) and not hasMoved(m,nextSide) and not m.rematchControl.private then m.firstDeadline=m.turnStarted+20 end
 end
 if fourMode(m) then pair(m) else publish(m) end
 if m.mode=="bot" and not m.over and m.state.turn=="b" then m.botGeneration+=1; task.spawn(runChessBot,m,m.botGeneration)
 elseif m.mode=="fourBot" and not m.over and m.state.turn~="R" then m.botGeneration+=1; task.spawn(runFourBots,m,m.botGeneration) end
end
local function undo(p)
 local id=playerMatch[p.UserId]; local m=id and matches[id]
 if not m or (m.mode~="bot" and m.mode~="fourBot") or m.over or #m.humanTurns==0 then return end
 m.botGeneration+=1
 local target=table.remove(m.humanTurns)
 m.state=copy(m.snapshots[target]); for i=#m.snapshots,target,-1 do m.snapshots[i]=nil end
 send(p,"undoState",{}); pair(m)
end
local function isQueued(p,q) for _,queued in ipairs(q) do if queued==p then return true end end; return false end
local function makeQueueMatch(p,q,mode,count)
 table.insert(q,p)
 local function excludes(first,second)
  local settings=queueControls[first.UserId]
  local previous=settings and settings.exclude
  return previous and previous.sides[second.UserId]~=nil
 end
 local group={p}
 local requested=queueControls[p.UserId]
 for _,other in ipairs(q) do
  local settings=queueControls[other.UserId]
  if other~=p and settings.baseSeconds==requested.baseSeconds and settings.increment==requested.increment then
   local compatible=true
   for _,member in ipairs(group) do
    if excludes(member,other) or excludes(other,member) then compatible=false; break end
   end
   if compatible then table.insert(group,other) end
   if #group==count then break end
  end
 end
 if #group==count then
  local oldest
  for _,other in ipairs(q) do
   if table.find(group,other) then oldest=other; break end
  end
  local control=queueControls[oldest.UserId]
  for _,member in ipairs(group) do clearQueue(member,q); queueControls[member.UserId]=nil end
  local ordered={}
  for _,member in ipairs(group) do
   if member~=p then table.insert(ordered,member) end
  end
  table.insert(ordered,p)
  newMatch(ordered,mode,control)
 else send(p,"queued",{players=#group,needed=count}) end
end
Action.OnServerEvent:Connect(function(p,kind,data)
 if playerRoom[p.UserId] and (kind=="bot" or kind=="fourBot" or kind=="queue" or kind=="queueFour"
  or kind=="challenge" or kind=="challengeRespond" or kind=="rematch" or kind=="rematchRespond") then
  send(p,"reject",{reason="Leave your challenge before starting another match."}); return
 end
 if kind=="rename" then p.DisplayName=data
 elseif kind=="profile" then send(p,"profile",profileView(p))
 elseif kind=="deleteHistoryMatch" then
  local profile=getProfile(p)
  local id=type(data)=="table" and data.id
  if type(id)=="string" then
   for index,record in ipairs(profile.history) do
    if record.id==id then
     table.remove(profile.history,index)
     saveProfile(p)
     break
    end
   end
  end
  send(p,"profile",profileView(p))
 elseif kind=="clearBotHistory" then
  local profile=getProfile(p)
  local history={}
  for _,record in ipairs(profile.history) do
   if record.mode~="bot" and record.mode~="fourBot" then table.insert(history,record) end
  end
  profile.history=history
  saveProfile(p); send(p,"profile",profileView(p))
 elseif kind=="resume" then
  send(p,"profile",profileView(p))
  local m=matches[playerMatch[p.UserId]]
  if m and not m.over then pair(m,p) end
  if playerRoom[p.UserId] then showInvite(playerRoom[p.UserId],p) end
 elseif kind=="equipBoard" then
  local id=type(data)=="table" and data.id or nil
  if type(id)~="string" or (id~="" and not Themes.exists(id)) then return end
  local prof=getProfile(p)
  prof.equippedBoard=id; saveProfile(p); send(p,"profile",profileView(p))
 elseif kind=="bot" or kind=="fourBot" then
  if playerMatch[p.UserId] then
   send(p,"reject",{reason="Leave the current match before starting another."})
   return
  end
  local settings
  if kind=="bot" then settings=Bot.clampRating(data and data.rating)
  else settings=data and data.ratings or {} end
  newMatch({p},kind,settings)
 elseif kind=="queue" then
  if playerMatch[p.UserId] or isQueued(p,queue) or isQueued(p,queueFour) then return end
  queueControls[p.UserId]=timeControl(data)
  if type(data)=="table" and data.newOpponent==true then queueControls[p.UserId].exclude=matches[lastMatchId[p.UserId]] end
  makeQueueMatch(p,queue,"online",2)
 elseif kind=="queueFour" then
  if playerMatch[p.UserId] or isQueued(p,queue) or isQueued(p,queueFour) then return end
  queueControls[p.UserId]=timeControl(data)
  if type(data)=="table" and data.newOpponent==true then queueControls[p.UserId].exclude=matches[lastMatchId[p.UserId]] end
  makeQueueMatch(p,queueFour,"fourOnline",4)
 elseif kind=="createInvite" or kind=="joinInvite" then
  if playerMatch[p.UserId] then send(p,"reject",{reason="Leave the current match before joining a challenge."}); return end
  if type(data)~="table" or type(data.code)~="string" or #data.code~=36 then
   send(p,"reject",{reason="This challenge link is invalid."}); return
  end
  local current=playerRoom[p.UserId]
  if current then
   if kind=="createInvite" or current.code==data.code then showInvite(current,p)
   else send(p,"reject",{reason="Leave your current challenge first."}) end
   return
  end
  local room
  if kind=="createInvite" then
   if inviteRooms[data.code] then return end
   room={code=data.code,mode=data.four and "fourOnline" or "online",needed=data.four and 4 or 2,players={},
    expires=workspace:GetServerTimeNow()+1800,control=timeControl(data)}
   room.control.private=true
   inviteRooms[data.code]=room
  else
   room=inviteRooms[data.code]
   if not room or room.expires<=workspace:GetServerTimeNow() then
    send(p,"reject",{reason="This challenge is full, closed, or expired."}); return
   end
  end
  clearQueue(p,queue); clearQueue(p,queueFour); queueControls[p.UserId]=nil
  table.insert(room.players,p); playerRoom[p.UserId]=room
  if #room.players==room.needed then
   closeInvite(room)
   newMatch(room.players,room.mode,room.control)
  else showInvite(room) end
 elseif kind=="leaveInvite" then
  leaveInvite(p)
 elseif kind=="challenge" then
  if playerMatch[p.UserId] or type(data)~="table" then return end
  local control=timeControl(data)
  if data.userId then
   local target=Players:GetPlayerByUserId(tonumber(data.userId) or 0) or _G.EXMocks and _G.EXMocks[tonumber(data.userId) or 0]
   if not target or target==p or playerRoom[target.UserId] or playerMatch[target.UserId] or challengeOffers[target.UserId] or challengeInvite[target.UserId] then send(p,"challengeDeclined",{}) return end
   challengeOffers[target.UserId]={from=p,control=control}
   send(target,"challengeOffer",{name=p.DisplayName or p.Name,mode="online"})
  elseif type(data.userIds)=="table" then
   local targets={}
   for _,id in ipairs(data.userIds) do
    local o=Players:GetPlayerByUserId(tonumber(id) or 0)
    if o and o~=p and not playerRoom[o.UserId] and not playerMatch[o.UserId] and not challengeOffers[o.UserId] and not challengeInvite[o.UserId] then table.insert(targets,o) end
   end
   if #targets==0 then send(p,"challengeDeclined",{}) return end
   local gid=HttpService:GenerateGUID(false)
   local group={owner=p,players={p},invited={},control=control}
   challengeGroups[gid]=group; challengeInvite[p.UserId]=gid
   for _,o in ipairs(targets) do group.invited[o.UserId]=true; challengeInvite[o.UserId]=gid; send(o,"challengeOffer",{name=p.DisplayName or p.Name,mode="fourOnline"}) end
   send(p,"challengeWait",{count=1,needed=4})
  end
 elseif kind=="challengeRespond" then
  local accept=data and data.accept
  local offer=challengeOffers[p.UserId]
  if offer then
   challengeOffers[p.UserId]=nil
   if accept and offer.from.Parent and not playerMatch[p.UserId] and not playerMatch[offer.from.UserId] then
    newMatch({offer.from,p},"online",offer.control)
   else send(offer.from,"challengeDeclined",{}) end
  else
   local gid=challengeInvite[p.UserId]; local group=gid and challengeGroups[gid]
   if group and group.invited[p.UserId] then
    challengeInvite[p.UserId]=nil; group.invited[p.UserId]=nil
    if accept and not playerMatch[p.UserId] and #group.players<4 then
     table.insert(group.players,p)
     if #group.players>=4 then
      challengeGroups[gid]=nil
      for _,o in ipairs(group.players) do challengeInvite[o.UserId]=nil end
      for uid in pairs(group.invited) do challengeInvite[uid]=nil end
      newMatch(group.players,"fourOnline",group.control)
     else
      for _,o in ipairs(group.players) do send(o,"challengeWait",{count=#group.players,needed=4}) end
     end
    end
   end
  end
 elseif kind=="reset" then
  local m=matches[playerMatch[p.UserId]]
  if m and not m.over and (m.mode=="bot" or m.mode=="fourBot") then
   m.over=true; m.botGeneration+=1
   matches[m.id]=nil
   newMatch({p},m.mode,m.mode=="bot" and m.botRating or m.botRatings)
  else
   send(p,"reject",{reason="This match cannot be reset."})
  end
 elseif kind=="claimDraw" then claimDraw(p,data)
 elseif kind=="move" then requestMove(p,data)
 elseif kind=="legal" then
  local id=playerMatch[p.UserId]; local m=id and matches[id]; local e=m and engineFor(m)
  if m and e and not m.over and type(data)=="table" and type(data.from)=="string" and matchesRequest(m,data) then
   local side=m.sides[p.UserId]
   local piece=side and m.state.board[data.from]
   if piece and string.sub(piece,1,1)==side and not (m.state.eliminated and m.state.eliminated[side]) then
    local targets={}
    for _,move in ipairs(e.legalMoves(m.state,data.from,side)) do
     local claimable=e==Chess and side==m.state.turn and Chess.claimReason(m.state,move)~=nil
     local target=legalTarget(m,move); target.claimable=claimable
     table.insert(targets,target)
    end
    send(p,"legal",{from=data.from,moves=targets,matchId=m.id,revision=m.revision,requestId=data.requestId})
   end
  end
 elseif kind=="undo" then undo(p)
 elseif kind=="resign" then
  local id=playerMatch[p.UserId]; local m=id and matches[id]
  if m then
   local side=m.sides[p.UserId]
   if (m.mode=="fourOnline" or m.mode=="fourBot") and m.state.eliminated and m.state.eliminated[side] then
    if not m.resultsSent[p.UserId] then m.resultsSent[p.UserId]=true; send(p,"result",{matchId=m.id,result="loss",reason=(m.state.eliminationReason and m.state.eliminationReason[side]) or "Eliminated",review=fourReview(m)}) end
    playerMatch[p.UserId]=nil
   elseif m.mode=="fourOnline" then
    if not m.over and not hasMoved(m,side) then abortFour(m,side)
    else
     m.state.eliminated[side]=true; m.state.eliminationReason[side]="Resignation"; table.insert(m.state.eliminationOrder,side); if m.state.turn==side then m.state.turn=Four.nextColor(side) end; m.resultsSent[p.UserId]=true; playerMatch[p.UserId]=nil; send(p,"result",{matchId=m.id,result="loss",reason="Resignation",review=fourReview(m)}); normalizeFour(m); pair(m)
    end
   elseif m.mode=="online" and not m.over and not hasMoved(m,side) then abortMatch(m,side)
   elseif m.mode=="fourBot" then
    finish(m,nil,"Resignation",{[side]=4})
   else finish(m,m.sides[p.UserId]=="w" and "b" or "w","Resignation") end
  end
 elseif kind=="abort" then
  local id=playerMatch[p.UserId]; local m=id and matches[id]
  if m and not m.over and (m.mode=="online" or m.mode=="fourOnline") then
   local side=m.sides[p.UserId]
   if not hasMoved(m,side) and not (m.state.eliminated and m.state.eliminated[side]) then
    if m.mode=="online" then abortMatch(m,side) else abortFour(m,side) end
   end
  end
 -- Leaving a match (via the Leave button) is not a resignation: the leaver gets no
 -- result popup, they simply return to the menu. Opponents still see the outcome.
 elseif kind=="leave" or kind=="pageLeave" then
  local id=playerMatch[p.UserId]; local m=id and matches[id]
  if not m or (kind=="pageLeave" and (not data or data.matchId~=m.id)) then return end
  local side=m.sides[p.UserId]
  m.noResult=m.noResult or {}; m.noResult[p.UserId]=true
  if m.mode=="online" then
   if m.over then playerMatch[p.UserId]=nil; return end
   m.resultsSent[p.UserId]=true; playerMatch[p.UserId]=nil
   local winner; for _,other in ipairs(m.players) do if other~=p then winner=m.sides[other.UserId] end end
   finish(m,winner,"Opponent left")
  elseif m.mode=="fourOnline" then
   if m.over or (m.state.eliminated and m.state.eliminated[side]) then m.resultsSent[p.UserId]=true; playerMatch[p.UserId]=nil; return end
   m.state.eliminated[side]=true; m.state.eliminationReason[side]="Left"; table.insert(m.state.eliminationOrder,side)
   if m.state.turn==side then m.state.turn=Four.nextColor(side) end
   m.resultsSent[p.UserId]=true; playerMatch[p.UserId]=nil
   normalizeFour(m); pair(m)
  else
   m.over=true; m.botGeneration+=1; playerMatch[p.UserId]=nil; matches[id]=nil
  end
 elseif kind=="cancelQueue" then
  clearQueue(p,queue); clearQueue(p,queueFour); queueControls[p.UserId]=nil
  local gid=challengeInvite[p.UserId]; local group=gid and challengeGroups[gid]
  if group then
   challengeInvite[p.UserId]=nil
   for i,o in ipairs(group.players) do if o==p then table.remove(group.players,i) break end end
   if group.owner==p then
    challengeGroups[gid]=nil
    for uid in pairs(group.invited) do challengeInvite[uid]=nil; local o=Players:GetPlayerByUserId(uid); if o then send(o,"challengeDeclined",{}) end end
    for _,o in ipairs(group.players) do if o~=p then challengeInvite[o.UserId]=nil; send(o,"challengeDeclined",{}) end end
   else
    for _,o in ipairs(group.players) do send(o,"challengeWait",{count=#group.players,needed=4}) end
   end
  end
  for tid,offer in pairs(challengeOffers) do if offer.from==p then challengeOffers[tid]=nil; local t=Players:GetPlayerByUserId(tid); if t then send(t,"challengeDeclined",{}) end end end
  challengeOffers[p.UserId]=nil
  send(p,"queueCancelled",{})
 elseif kind=="rematch" then
  local id=lastMatchId[p.UserId]; local m=id and matches[id]
  if not m or not m.over then return end
  if m.mode=="bot" then
   if not playerMatch[p.UserId] then newMatch({p},"bot",m.botRating) end
  elseif m.mode=="fourBot" then
   if not playerMatch[p.UserId] then newMatch({p},"fourBot",m.botRatings) end
  elseif m.mode=="online" then
   if playerMatch[p.UserId] then return end
   local opp; for _,other in ipairs(m.players) do if other~=p then opp=other end end
   if not (opp and opp.Parent and not playerMatch[opp.UserId]) then send(p,"rematchDeclined",{}); return end
   m.rematchOffers=m.rematchOffers or {}
   if m.rematchOffers[opp.UserId] then
    m.rematchOffers=nil; newMatch({opp,p},"online",m.rematchControl or {baseSeconds=180,increment=0})
   else
    m.rematchOffers[p.UserId]=true; send(opp,"rematchOffer",{name=p.DisplayName or p.Name})
   end
  elseif m.mode=="fourOnline" then
   if playerMatch[p.UserId] then return end
   local free={}; for _,other in ipairs(m.players) do if other.Parent and not playerMatch[other.UserId] then table.insert(free,other) end end
   if #free<2 then send(p,"rematchDeclined",{}); return end
   m.rematchOffers=m.rematchOffers or {}
   if m.rematchOffers[p.UserId] then return end
   m.rematchOffers[p.UserId]=true
   local all=true; for _,other in ipairs(free) do if not m.rematchOffers[other.UserId] then all=false break end end
   if all then
    m.rematchOffers=nil; newMatch(free,"fourOnline",m.rematchControl or {baseSeconds=180,increment=0})
   else
    for _,other in ipairs(free) do if other~=p then send(other,"rematchOffer",{name=p.DisplayName or p.Name}) end end
   end
  end
 elseif kind=="rematchRespond" then
  local id=lastMatchId[p.UserId]; local m=id and matches[id]
  if not m or not m.over or (m.mode~="online" and m.mode~="fourOnline") then return end
  if m.mode=="online" then
   local opp; for _,other in ipairs(m.players) do if other~=p then opp=other end end
   if data and data.accept then
    if not (opp and opp.Parent and not playerMatch[opp.UserId] and not playerMatch[p.UserId]) then return end
    if not (m.rematchOffers and m.rematchOffers[opp.UserId]) then return end
    m.rematchOffers=nil; newMatch({opp,p},"online",m.rematchControl or {baseSeconds=180,increment=0})
   else
    if opp then send(opp,"rematchDeclined",{}) end
   end
  else
   local free={}; for _,other in ipairs(m.players) do if other.Parent and not playerMatch[other.UserId] then table.insert(free,other) end end
   if data and data.accept then
    if not m.rematchOffers then return end
    m.rematchOffers[p.UserId]=true
    local all=#free>=2; for _,other in ipairs(free) do if not m.rematchOffers[other.UserId] then all=false break end end
    if all then
     m.rematchOffers=nil; newMatch(free,"fourOnline",m.rematchControl or {baseSeconds=180,increment=0})
    end
   else
    m.rematchOffers=nil
    for _,other in ipairs(free) do if other~=p then send(other,"rematchDeclined",{}) end end
   end
  end
 elseif kind=="rematchCancel" then
  local id=lastMatchId[p.UserId]; local m=id and matches[id]
  if m and m.over then
   m.rematchOffers=nil
   for _,other in ipairs(m.players) do
    if other~=p and other.Parent and not playerMatch[other.UserId] then send(other,"rematchDeclined",{}) end
   end
  end
 end
end)
Players.PlayerAdded:Connect(function(p) task.spawn(function() send(p,"profile",profileView(p)) end) end)
Players.PlayerRemoving:Connect(function(p)
 leaveInvite(p)
 clearQueue(p,queue); clearQueue(p,queueFour); queueControls[p.UserId]=nil
 for tid,offer in pairs(challengeOffers) do if offer.from==p then challengeOffers[tid]=nil; local t=Players:GetPlayerByUserId(tid); if t then send(t,"challengeDeclined",{}) end end end
 challengeOffers[p.UserId]=nil
 do
  local gid=challengeInvite[p.UserId]; local group=gid and challengeGroups[gid]
  if group then
   challengeInvite[p.UserId]=nil
   for i,o in ipairs(group.players) do if o==p then table.remove(group.players,i) break end end
   if group.owner==p or #group.players==0 then
    challengeGroups[gid]=nil
    for uid in pairs(group.invited) do challengeInvite[uid]=nil; local o=Players:GetPlayerByUserId(uid); if o then send(o,"challengeDeclined",{}) end end
    for _,o in ipairs(group.players) do challengeInvite[o.UserId]=nil; send(o,"challengeDeclined",{}) end
   else
    for _,o in ipairs(group.players) do send(o,"challengeWait",{count=#group.players,needed=4}) end
   end
  end
 end
 local id=playerMatch[p.UserId]; local m=id and matches[id]
 if m and not m.over and m.mode=="online" then
  local winner; for _,other in ipairs(m.players) do if other~=p then winner=m.sides[other.UserId] end end; finish(m,winner,"Opponent disconnected")
 elseif m and not m.over and m.mode=="fourOnline" then
  local side=m.sides[p.UserId]; m.state.eliminated[side]=true; m.state.eliminationReason[side]="Resignation"; table.insert(m.state.eliminationOrder,side); if m.state.turn==side then m.state.turn=Four.nextColor(side) end; playerMatch[p.UserId]=nil; m.resultsSent[p.UserId]=true; normalizeFour(m); pair(m)
 elseif m and (m.mode=="bot" or m.mode=="fourBot") then
  m.over=true; m.botGeneration+=1; playerMatch[p.UserId]=nil; matches[id]=nil
 end
 saveProfile(p); profileCache[tostring(p.UserId)]=nil
end)
-- Enforce timeouts and expire abandoned challenge links.
task.spawn(function()
 while true do
  task.wait(1)
  local now=workspace:GetServerTimeNow()
  for _,room in pairs(inviteRooms) do
   if now>=room.expires then closeInvite(room,"This challenge link expired.") end
  end
  for _,m in pairs(matches) do
   if not m.over and m.clocks and m.turnStarted then
    local side=m.state.turn
    if m.firstDeadline and now>=m.firstDeadline then
     if m.mode=="online" then abortMatch(m,side) else abortFour(m,side) end
     continue
    end
    if m.clocks[side] and math.max(0,now-m.turnStarted)>=m.clocks[side] then
     if m.mode=="online" then
      finish(m,side=="w" and "b" or "w","Timeout")
     elseif m.mode=="fourOnline" then
      m.clocks[side]=0; m.state.eliminated[side]=true; m.state.eliminationReason[side]="Timeout"; table.insert(m.state.eliminationOrder,side); m.state.turn=Four.nextColor(side)
      for _,p in ipairs(m.players) do
       if m.sides[p.UserId]==side and not m.resultsSent[p.UserId] then m.resultsSent[p.UserId]=true; playerMatch[p.UserId]=nil; send(p,"result",{matchId=m.id,result="loss",reason="Timeout",review=fourReview(m)}) end
      end
      normalizeFour(m); pair(m)
     end
    end
   end
  end
 end
end)
