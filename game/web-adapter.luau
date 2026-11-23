-- Browser and web server implementations of the Roblox services GameService uses.
local now = 0
local pending = {}
local outgoing = {}
local users = {}
local profiles = {}
local services = {}
local serial = 0

local function signal()
 local event = {}
 function event:Connect(handler) self.handler = handler end
 return event
end

local action = {OnServerEvent = signal()}
local update = {}
function update:FireClient(player, kind, data)
 table.insert(outgoing, {user = player.UserId, kind = kind, data = data})
end

local players = {PlayerAdded = signal(), PlayerRemoving = signal()}
function players:GetPlayerByUserId(id) return users[id] end

local root = {Modules = modules}
root.Action = action
root.Update = update
-- Remotes are addressed through two levels in the Roblox model.
local remotes = {}
function remotes:WaitForChild(name) return root[name] end
function root:WaitForChild() return remotes end

services.Players = players
services.ReplicatedStorage = {WaitForChild = function() return root end}
services.HttpService = {GenerateGUID = function()
 serial += 1
 return tostring(serial)
end}
services.DataStoreService = {GetDataStore = function()
 return {
  GetAsync = function(_, id) return profiles[id] end,
  SetAsync = function(_, id, profile)
   profiles[id] = profile
   table.insert(outgoing, {user = tonumber(id), kind = "save", data = profile})
  end
 }
end}

local game = {GetService = function(_, name) return services[name] end}
local workspace = {GetServerTimeNow = function() return now end}
local function require(module) return module end
local nativeTypeof = typeof
local function typeof(value)
 if type(value) == "table" and value.Parent == players then return "Instance" end
 return nativeTypeof(value)
end

local function resume(thread, ...)
 local ok, wait = coroutine.resume(thread, ...)
 if not ok then error(wait) end
 if coroutine.status(thread) ~= "dead" then
  table.insert(pending, {thread = thread, due = now + wait})
 end
end

local task = {
 cooperativeSearch = cooperativeSearch,
 spawn = function(handler, ...) resume(coroutine.create(handler), ...) end,
 wait = function(seconds) coroutine.yield(seconds) end
}

local function tick(time)
 now = time
 local waiting = pending
 pending = {}
 for _, item in ipairs(waiting) do
  if item.due <= now then resume(item.thread)
  else table.insert(pending, item) end
 end
end

-- GAME_SERVICE

local function cssColor(color)
 return string.format("#%02x%02x%02x", math.round(color.R*255), math.round(color.G*255), math.round(color.B*255))
end

local boardCatalog={}
for _,theme in ipairs(modules.ThemeLibrary.themes) do
 local entry={id=theme.id,name=theme.name,price=theme.price}
 for _,key in ipairs({"light","dark","frame","stroke"}) do
  entry[key]=cssColor(theme.board[key])
 end
 if theme.ui then
  entry.ui={}
  for key,color in pairs(theme.ui) do entry.ui[key]=cssColor(color) end
 end
 table.insert(boardCatalog,entry)
end

return function(op, time, id, first, second)
 if op == "catalog" then return boardCatalog end
 if op == "puzzle" then return modules.PuzzleSearch.generate(modules.ChessEngine,modules.BotEngine,first) end
 if op == "analysis" then return modules.BotEngine.analyze(modules.ChessEngine,first) end
 if op == "bestMove" then
  local state=first.state
  local engine=first.variant=="four" and modules.FourPlayerEngine or modules.ChessEngine
  if state.analysis then
   state.castling=state.analysis.castling
   state.ep=state.analysis.ep
   state.positions=state.analysis.positions
  end
  local move=modules.BotEngine.choose(engine,state,1200,{timeMs=220,depth=5,nodes=18000})
  return {move=move}
 end
 if op == "courseLesson" then
  local engine=modules.ChessEngine
  local state=engine.initial()
  if first.board then
   state={board=first.board,turn=first.turn or "w",castling=first.castling or {},
    ep=first.ep,halfmove=0,fullmove=1,history={},positions={}}
   state.positions[engine.positionKey(state)]=1
   if next(state.board) and engine.inCheck(state,state.turn=="w" and "b" or "w") then
    error("The side waiting to move is in check in this lesson position.")
   end
  end
  local function describe(move)
   local view=engine.public(state)
   local legal=engine.allLegal(state)
   if view.status=="draw" then legal={} end
   local attacks={}
   for _,square in ipairs(first.attackFrom or {}) do
    attacks[square]=engine.attacksFrom(state,square)
   end
   local checked={}
   if engine.inCheck(state,state.turn) then table.insert(checked,state.turn) end
   return {state=view,legal=legal,attacks=attacks,checked=checked,move=move}
  end
  local frames={describe()}
  for _,intent in ipairs(first.line or {}) do
   local chosen
   for _,move in ipairs(frames[#frames].legal) do
    if move.from==intent.from and move.to==intent.to and move.promotion==intent.promotion then
     chosen=move; break
    end
   end
   if not chosen then error("Invalid course move: "..intent.from.."-"..intent.to) end
   state=engine.apply(state,chosen)
   table.insert(frames,describe(chosen))
  end
  local promotions={}
  if first.promotion then
   local original=state
   for _,move in ipairs(frames[#frames].legal) do
    if move.from==first.promotion.from and move.to==first.promotion.to and move.promotion then
     state=engine.apply(original,move)
     promotions[move.promotion]=describe(move)
    end
   end
  end
  return {frames=frames,promotions=promotions}
 end
 -- Invalidate a bot turn before resuming due search coroutines.
 if op=="action" and (first=="reset" or first=="undo" or first=="leave" or first=="resign") then
  now=time
 else
  tick(time)
 end
 if op == "join" then
  local player = {UserId = id, Name = "WebPlayer" .. tostring(id), DisplayName = first, Parent = players}
  profiles[tostring(id)] = second
  users[id] = player
  players.PlayerAdded.handler(player)
 elseif op == "leave" and users[id] then
  players.PlayerRemoving.handler(users[id])
  users[id].Parent = nil
  users[id] = nil
  profiles[tostring(id)] = nil
 elseif op == "action" and users[id] then
  action.OnServerEvent.handler(users[id], first, second)
 elseif op == "replay" or op == "review" then
  local reviewing=op=="review"
  local variant,moves=first,second
  local fourStates
  if reviewing then variant,moves,fourStates=first.variant,first.moves,first.fourStates end
  local engine=variant=="four" and modules.FourPlayerEngine or modules.ChessEngine
  local state=engine.initial()
  local function snapshot(ply)
   local recorded=fourStates and fourStates[ply]
   if recorded then state.turn=recorded.turn; state.eliminated=recorded.eliminated end
   if not reviewing then return state.board end
   local view=engine.public(state)
   view.history=nil
   if variant=="chess" then
    view.analysis={castling=state.castling,ep=state.ep,positions=state.positions}
   else
    view.checkedColors={}
    for _,color in ipairs(engine.colors) do
     if not state.eliminated[color] and engine.inCheck(state,color) then table.insert(view.checkedColors,color) end
    end
   end
   return view
  end
  local positions={snapshot(1)}
  for index,entry in ipairs(moves) do
   if reviewing and (variant=="chess" or fourStates) and state.turn~=entry.c then error("Match history is out of turn.") end
   local found=false
   for _,move in ipairs(engine.legalMoves(state,entry.f,entry.c)) do
    if move.to==entry.t then
     if move.promotion then move.promotion=entry.p or "Q" end
     state=engine.apply(state,move)
     table.insert(positions,snapshot(index+1))
     found=true
     break
    end
   end
   if reviewing and not found then error("Match history could not be replayed.") end
  end
  return positions
 end
 local events = outgoing
 outgoing = {}
 return events
end
