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

return function(op, time, id, first, second)
 tick(time)
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
 elseif op == "replay" then
  local engine = first == "four" and modules.FourPlayerEngine or modules.ChessEngine
  local state = engine.initial()
  local positions = {state.board}
  for _, entry in ipairs(second) do
   for _, move in ipairs(engine.legalMoves(state, entry.f, entry.c)) do
    if move.to == entry.t then
     if move.promotion then move.promotion = entry.p or "Q" end
     state = engine.apply(state,move)
     table.insert(positions,state.board)
     break
    end
   end
  end
  return positions
 end
 local events = outgoing
 outgoing = {}
 return events
end
