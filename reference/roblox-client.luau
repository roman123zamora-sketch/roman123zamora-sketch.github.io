-- Exalted Chess desktop-first, responsive match UI. Every visible control is wired to an action.
local Players=game:GetService("Players")
local ReplicatedStorage=game:GetService("ReplicatedStorage")
local SoundService=game:GetService("SoundService")
local player=Players.LocalPlayer
local gui=script.Parent
local function startupError(message)
 for _,child in ipairs(gui:GetChildren()) do if not child:IsA("BaseScript") then child:Destroy() end end
 local panel=Instance.new("Frame"); panel.AnchorPoint=Vector2.new(.5,.5); panel.Position=UDim2.fromScale(.5,.5); panel.Size=UDim2.new(.8,0,0,180); panel.BackgroundColor3=Color3.fromRGB(23,43,32); panel.BorderSizePixel=0; panel.Parent=gui
 local label=Instance.new("TextLabel"); label.Size=UDim2.new(1,-36,1,-36); label.Position=UDim2.new(0,18,0,18); label.BackgroundTransparency=1; label.Text=message; label.TextWrapped=true; label.TextColor3=Color3.fromRGB(245,239,224); label.Font=Enum.Font.Gotham; label.TextSize=18; label.Parent=panel
end
local root=ReplicatedStorage:WaitForChild("ExaltedChess",15)
if not root then startupError("Exalted Chess package missing from ReplicatedStorage. Insert the complete install model into Workspace and press Play."); return end
local remotes=root:WaitForChild("Remotes",10)
if not remotes then startupError("Exalted Chess Remotes folder is missing. Reinsert the complete install model."); return end
local Action=remotes:WaitForChild("Action",10); local Update=remotes:WaitForChild("Update",10)
if not Action or not Update then startupError("Exalted Chess Action/Update RemoteEvents are missing. Reinsert the complete install model."); return end
-- Volume boost for chess move, button click, button hover, and challenge sounds.
-- Applied once here at startup so the increase never stacks when screens re-render.
local BOOSTED_SOUNDS={["Move"]=true,["Button Click"]=true,["Button Hover"]=true,["Challenge"]=true}
local soundBank={}; local audio=root:FindFirstChild("Audio")
if audio then for _,s in ipairs(audio:GetChildren()) do if s:IsA("Sound") then local c=s:Clone(); if BOOSTED_SOUNDS[s.Name] then c.Volume=math.clamp(c.Volume*1.5,0,1) end; c.Parent=SoundService; soundBank[s.Name]=c end end end
-- Ambient background music: shuffled tracks from the workspace music folder.
-- A track may play twice in a row but never three times. Volume ducks ~25%
-- during matches so move and button sounds stay clearly audible.
local MUSIC_VOLUME=0.35
local musicSounds={}
do
 local musicFolder=game:GetService("ReplicatedStorage"):FindFirstChild("Gameplay Backround Music")
 if musicFolder then
  for _,s in ipairs(musicFolder:GetChildren()) do
   if s:IsA("Sound") then
    local c=s:Clone(); c.Volume=MUSIC_VOLUME; c.Looped=false; c.Parent=SoundService
    table.insert(musicSounds,c)
   end
  end
 end
end
local musicLast1; local musicLast2; local musicOn=true
local function pickMusic()
 if #musicSounds==0 or not musicOn then return end
 local pick
 if #musicSounds==1 then pick=musicSounds[1]
 else
  repeat pick=musicSounds[math.random(#musicSounds)] until not (pick==musicLast1 and pick==musicLast2)
 end
 musicLast2=musicLast1; musicLast1=pick
 pick:Play()
end
for _,c in ipairs(musicSounds) do c.Ended:Connect(function() pickMusic() end) end
local musicInMatch=nil
local function setMusicDuck(inMatch)
 if inMatch==musicInMatch then return end
 musicInMatch=inMatch
 for _,c in ipairs(musicSounds) do c.Volume=MUSIC_VOLUME*(inMatch and .75 or 1) end
end
local function toggleMusic()
 musicOn=not musicOn
 if musicOn then pickMusic() else for _,c in ipairs(musicSounds) do c:Stop() end end
end
local function sound(n) if soundBank[n] then soundBank[n]:Play() end end
local C={bg=Color3.fromRGB(13,23,18),top=Color3.fromRGB(19,33,26),panel=Color3.fromRGB(27,44,35),panel2=Color3.fromRGB(21,36,28),text=Color3.fromRGB(236,243,237),muted=Color3.fromRGB(164,190,175),blue=Color3.fromRGB(88,184,126),blueDark=Color3.fromRGB(42,108,73),teal=Color3.fromRGB(33,82,57),light=Color3.fromRGB(233,240,229),dark=Color3.fromRGB(106,142,116),gold=Color3.fromRGB(226,193,95),green=Color3.fromRGB(96,200,133),red=Color3.fromRGB(191,82,77)}
local Themes
do
 local modules=root:FindFirstChild("Modules")
 local themeLib=modules and modules:FindFirstChild("ThemeLibrary")
 if themeLib then Themes=require(themeLib) end
end
local BASE_C={}; for k,v in pairs(C) do BASE_C[k]=v end
-- Equipped board theme: B holds the board colors; applyTheme also re-skins the whole UI palette.
local B={light=C.light,dark=C.dark,frame=Color3.fromRGB(17,29,22),stroke=Color3.fromRGB(60,102,76),gradient=nil,tex=nil}
local currentThemeId="classic"
local function applyTheme(id)
 local theme=Themes and Themes.get(id)
 if not theme then theme={id="classic",board={light=BASE_C.light,dark=BASE_C.dark,frame=Color3.fromRGB(17,29,22),stroke=Color3.fromRGB(60,102,76)}} end
 for k,v in pairs(BASE_C) do C[k]=v end
 if theme.ui then for k,v in pairs(theme.ui) do C[k]=v end end
 B.light=theme.board.light; B.dark=theme.board.dark; B.frame=theme.board.frame; B.stroke=theme.board.stroke; B.gradient=theme.board.gradient; B.tex=theme.board.tex
 currentThemeId=theme.id
end
applyTheme("classic")
local pieceImages={w={K="12705276436",Q="12705266883",R="12705040502",B="108208024676682",N="12582721685",P="12705284280"},b={K="12705274158",Q="12705264073",R="12705043688",B="135654556788627",N="12593930998",P="12705282472"}}
local pieceColor={w=Color3.fromRGB(255,255,246),b=Color3.fromRGB(35,40,45),R=Color3.fromRGB(235,75,70),B=Color3.fromRGB(81,154,226),Y=Color3.fromRGB(245,204,81),G=Color3.fromRGB(88,190,125)}
local files="abcdefghijklmn"
local variant="chess"; local currentMatch=nil; local matchState=nil; local mySide=nil; local matchMode=nil; local selected=nil; local legal={}; local profile=nil; local searching=false; local searchText=""; local activeRating=1000; local lineup={B=800,Y=1000,G=1200}; local timeControl={label="3 | 0",baseSeconds=180,increment=0}; local matchClocks=nil; local turnStarted=nil; local clockLabels={}; local activeTab="play"; local confirmVariant=nil; local showChallenge=false; local challengeSel={}; local challengeOffer=nil; local botExpanded=false; local showShop=false; local resultText=nil; local marks={}; local premoves={}; local promoPicker=nil; local elimPrompt=nil; local elimPromptDone=nil; local promoOpenedAt=0; local resultData=nil; local resultDismissed=false; local rematchOffer=nil; local rematchPending=false; local rematchDeclined=false; local showProfile=false; local profileGame=nil; local replayIndex=0; local showBoards=false; local shopNotice=nil
local squareButtons={}
local boardCellPx=85 -- 1v1 square size in px; reference for scaling square textures in previews
-- Premove display is computed inside renderBoard: red trail across every square in each chain's path;
-- the piece renders (ghosted) at its final queued position.
-- Material values for the captured-piece display and material lead (+n).
-- Four-player adds kings at 20; grey pieces are worth 0 and never shown in lineups.
local materialValues={P=1,N=3,B=3,R=5,Q=9,K=20}
-- True when `to` is a straight-ahead square (one or two steps) for the pawn on `from`.
local function pawnForward(piece,from,to)
 local side=string.sub(piece,1,1)
 local vertical=side=="w" or side=="b" or side=="R" or side=="Y"
 local d=({w=1,b=-1,R=1,Y=-1,B=1,G=-1})[side]; if not d then return false end
 local fx=string.find(files,string.sub(from,1,1),1,true); local fy=tonumber(string.sub(from,2))
 local tx=string.find(files,string.sub(to,1,1),1,true); local ty=tonumber(string.sub(to,2))
 if not fx or not tx or not fy or not ty then return false end
 if vertical then return fx==tx and (ty-fy==d or ty-fy==2*d) end
 return fy==ty and (tx-fx==d or tx-fx==2*d)
end
local function instance(class,parent,props)
 local o=Instance.new(class); for k,v in pairs(props or {}) do o[k]=v end; o.Parent=parent; return o
end
local function corner(obj,r) instance("UICorner",obj,{CornerRadius=UDim.new(0,r or 8)}) end
-- Visual polish helpers: shade() makes lighter/darker tints of existing colors for depth.
local TweenService=game:GetService("TweenService")
local function shade(c,f) return Color3.new(math.clamp(c.R*f,0,1),math.clamp(c.G*f,0,1),math.clamp(c.B*f,0,1)) end
-- Shared raised-look gradient: a fixed top-light sheen over the button's own color.
local raisedGrad=ColorSequence.new(Color3.fromRGB(255,255,255),Color3.fromRGB(196,196,196))
-- Soft drop shadow that lifts panels and modals slightly off the background.
local function shadow(parent,pos,size,zIndex)
 local pad=24
 return instance("ImageLabel",parent,{Position=pos+UDim2.new(0,-pad,0,-pad),Size=size+UDim2.new(0,pad*2,0,pad*2),BackgroundTransparency=1,Image="rbxassetid://6014261993",ImageColor3=shade(C.bg,.4),ImageTransparency=.62,ScaleType=Enum.ScaleType.Slice,SliceCenter=Rect.new(49,49,450,450),ZIndex=zIndex or 1,BorderSizePixel=0})
end
local function label(parent,text,pos,size,opts)
 opts=opts or {}; local l=instance("TextLabel",parent,{Position=pos,Size=size,BackgroundTransparency=opts.bg and 0 or 1,BackgroundColor3=opts.bg or C.panel,Text=text,TextColor3=opts.color or C.text,Font=opts.font or Enum.Font.Gotham,TextSize=opts.textSize or 14,TextXAlignment=opts.align or Enum.TextXAlignment.Left,TextYAlignment=opts.valign or Enum.TextYAlignment.Center,TextWrapped=opts.wrap or false,TextTruncate=opts.truncate and Enum.TextTruncate.AtEnd or Enum.TextTruncate.None,BorderSizePixel=0})
 if opts.bold then l.Font=Enum.Font.GothamBold end; return l
end
-- Tactile feedback shared by every button: hover brightens, press sinks and darkens,
-- release eases back to normal. Covers mouse, touch, and gamepad selection. Chess
-- squares and piece dragging are deliberately left untouched.
local function tactile(b,base,quiet,pos)
 local hMult=quiet and 1.05 or 1.1
 local hovering=false; local pressing=false
 local function setState(mult,dy)
  TweenService:Create(b,TweenInfo.new(.09,Enum.EasingStyle.Quad,Enum.EasingDirection.Out),{BackgroundColor3=shade(base,mult)}):Play()
  if pos then b.Position=pos+UDim2.new(0,0,0,dy) end
 end
 local function refresh()
  if pressing then setState(.93,quiet and 0 or 1)
  elseif hovering then setState(hMult,0)
  else setState(1,0) end
 end
 b.MouseEnter:Connect(function() hovering=true; sound("Button Hover"); refresh() end)
 b.MouseLeave:Connect(function() hovering=false; pressing=false; refresh() end)
 b.MouseButton1Down:Connect(function() pressing=true; refresh() end)
 b.MouseButton1Up:Connect(function() pressing=false; refresh() end)
 b.SelectionGained:Connect(function() hovering=true; sound("Button Hover"); refresh() end)
 b.SelectionLost:Connect(function() hovering=false; pressing=false; refresh() end)
 b.InputBegan:Connect(function(io) if io.UserInputType==Enum.UserInputType.Gamepad1 and io.KeyCode==Enum.KeyCode.ButtonA then pressing=true; refresh() end end)
 b.InputEnded:Connect(function(io) if io.UserInputType==Enum.UserInputType.Gamepad1 and io.KeyCode==Enum.KeyCode.ButtonA then pressing=false; refresh() end end)
end
local function button(parent,text,pos,size,callback,opts)
 opts=opts or {}; local base=opts.color or C.teal; local quiet=opts.quiet
 local b=instance("TextButton",parent,{Name=opts.name or text:gsub("[^%w]",""),Position=pos,Size=size,BackgroundColor3=base,Text=text,TextColor3=opts.textColor or C.text,TextSize=opts.textSize or 14,Font=opts.bold and Enum.Font.GothamBold or Enum.Font.GothamSemibold,AutoButtonColor=false,BorderSizePixel=0,TextWrapped=true})
 corner(b,opts.radius or 8)
 instance("UIGradient",b,{Rotation=90,Color=quiet and ColorSequence.new(Color3.fromRGB(255,255,255),Color3.fromRGB(234,234,234)) or raisedGrad})
 instance("UIStroke",b,{Thickness=1,Color=shade(base,.55),Transparency=quiet and .55 or .35})
 tactile(b,base,quiet,pos)
 b.Activated:Connect(function() sound("Button Click") callback() end); return b
end
local function frame(parent,pos,size,color)
 local c=color or C.panel
 local f=instance("Frame",parent,{Position=pos,Size=size,BackgroundColor3=c,BorderSizePixel=0}); corner(f,10)
 instance("UIGradient",f,{Rotation=90,Color=ColorSequence.new(Color3.fromRGB(255,255,255),Color3.fromRGB(233,233,233))})
 instance("UIStroke",f,{Thickness=1,Color=shade(c,1.45),Transparency=.55})
 instance("Frame",f,{Position=UDim2.new(0,8,0,0),Size=UDim2.new(1,-16,0,1),BackgroundColor3=Color3.fromRGB(255,255,255),BackgroundTransparency=.7,BorderSizePixel=0})
 instance("Frame",f,{Position=UDim2.new(0,10,0,1),Size=UDim2.new(1,-20,0,1),BackgroundColor3=Color3.fromRGB(255,255,255),BackgroundTransparency=.78,BorderSizePixel=0})
 return f
end
local function initialChess()
 local board={}; local row={"R","N","B","Q","K","B","N","R"}; for x=1,8 do board[string.char(96+x).."2"]="wP"; board[string.char(96+x).."7"]="bP"; board[string.char(96+x).."1"]="w"..row[x]; board[string.char(96+x).."8"]="b"..row[x] end
 return {board=board,turn="w",history={},lastMove=nil,status="preview"}
end
local function initialFour()
 local board={}; local row={"R","N","B","Q","K","B","N","R"}; local mirror={"R","N","B","K","Q","B","N","R"}
 for i=1,8 do local x=i+3; board[files:sub(x,x).."1"]="R"..row[i]; board[files:sub(x,x).."2"]="RP"; board[files:sub(x,x).."14"]="Y"..mirror[i]; board[files:sub(x,x).."13"]="YP"; local y=i+3; board["a"..y]="B"..row[i]; board["b"..y]="BP"; board["n"..y]="G"..mirror[i]; board["m"..y]="GP" end
 return {board=board,turn="R",eliminated={},history={},status="preview"}
end
local function getViewport() local v=gui.AbsoluteSize; if v.X<320 or v.Y<300 then return Vector2.new(1200,720) end; return v end
local render
local UIS=game:GetService("UserInputService")
local dragging=nil; local dragLayer=nil
local function getDragLayer()
 if not dragLayer or not dragLayer.Parent then
  dragLayer=Instance.new("ScreenGui"); dragLayer.Name="ExaltedDragLayer"; dragLayer.DisplayOrder=50; dragLayer.Parent=player.PlayerGui
 end
 return dragLayer
end
local function squareAt(pos)
 for sq,btn in pairs(squareButtons) do
  local a=btn.AbsolutePosition; local s=btn.AbsoluteSize
  if pos.X>=a.X and pos.X<=a.X+s.X and pos.Y>=a.Y and pos.Y<=a.Y+s.Y then return sq end
 end
 return nil
end
local function isPromotionMove(piece,toSq)
 if type(piece)~="string" or string.sub(piece,2,2)~="P" or type(toSq)~="string" then return false end
 local color=string.sub(piece,1,1)
 local x=string.find(files,string.sub(toSq,1,1),1,true); local y=tonumber(string.sub(toSq,2))
 if not x or not y then return false end
 if variant=="four" then
  return (color=="R" and y==8) or (color=="Y" and y==7) or (color=="B" and x==8) or (color=="G" and x==7)
 end
 return (color=="w" and y==8) or (color=="b" and y==1)
end
local function startDrag(sq,piece,pos,isPremove)
 local side=string.sub(piece,1,1); local typ=string.sub(piece,2,2); local set=(side=="w" or side=="b") and side or "w"
 local tex=pieceImages[set] and pieceImages[set][typ]; if not tex then return end
 local cell=squareButtons[sq]; local size=cell and cell.AbsoluteSize or Vector2.new(60,60)
 local ghost=Instance.new("ImageLabel")
 ghost.Image="rbxassetid://"..tex; ghost.BackgroundTransparency=1; ghost.AnchorPoint=Vector2.new(.5,.5)
 ghost.Size=UDim2.new(0,size.X,0,size.Y); ghost.Position=UDim2.new(0,pos.X,0,pos.Y); ghost.ZIndex=10
 ghost.ScaleType=Enum.ScaleType.Fit
 if side~="w" and side~="b" then ghost.ImageColor3=pieceColor[side] or Color3.new(1,1,1) end
 ghost.Parent=getDragLayer()
 dragging={from=sq,ghost=ghost,startPos=pos,moved=false,premove=isPremove and true or false}
end
UIS.InputChanged:Connect(function(io)
 if dragging and (io.UserInputType==Enum.UserInputType.MouseMovement or io.UserInputType==Enum.UserInputType.Touch) then
  dragging.ghost.Position=UDim2.new(0,io.Position.X,0,io.Position.Y)
  if (io.Position-dragging.startPos).Magnitude>7 then dragging.moved=true end
 end
end)
local clickStart=nil
UIS.InputBegan:Connect(function(io)
 if io.UserInputType==Enum.UserInputType.MouseButton1 or io.UserInputType==Enum.UserInputType.Touch then clickStart=io.Position end
end)
UIS.InputEnded:Connect(function(io)
 if io.UserInputType~=Enum.UserInputType.MouseButton1 and io.UserInputType~=Enum.UserInputType.Touch then return end
 local wasClick=clickStart and (io.Position-clickStart).Magnitude<7 or false
 clickStart=nil
 if dragging then
  local d=dragging; dragging=nil
  if d.ghost then d.ghost:Destroy() end
  if not d.moved then
   if wasClick then
    if d.premove then
     local piece=matchState and matchState.board and matchState.board[d.from]
     if piece and string.sub(piece,1,1)==mySide then
      selected=d.from; legal={}; Action:FireServer("legal",{from=d.from}); render()
      return
     end
    end
    if next(premoves) or next(marks) then premoves={}; marks={}; render() end
   end
   return
  end
  local drop=squareAt(io.Position)
  if d.premove then
   local target=matchState and matchState.board and matchState.board[drop]
   if drop and drop~=d.from then
    local piece=matchState and matchState.board and matchState.board[d.from]
    if piece and string.sub(piece,1,1)==mySide then
     if isPromotionMove(piece,drop) then promoPicker={from=d.from,to=drop,premove=true}; promoOpenedAt=os.clock()
     else
      local pm={from=d.from,to=drop}
      if target and string.sub(target,1,1)==mySide then pm.selfCapture=true
      elseif string.sub(piece,2,2)=="P" and not pawnForward(piece,d.from,drop) then pm.captureOnly=true end
      table.insert(premoves,pm); sound("Move")
     end
     render()
    end
   end
  elseif drop and drop~=d.from and (legal[drop] or next(legal)==nil) then
   local piece=matchState and matchState.board and matchState.board[d.from]
   if type(legal[drop])=="string" or (piece and isPromotionMove(piece,drop)) then
    promoPicker={from=d.from,to=drop,premove=false}; promoOpenedAt=os.clock(); render()
   else
    Action:FireServer("move",{from=d.from,to=drop,promotion="Q"}); selected=nil; legal={}; marks={}; premoves={}; render()
   end
  else
   render()
  end
 else
  if wasClick and (next(premoves) or next(marks)) then premoves={}; marks={}; render() end
 end
end)
local function choosePromotion(letter)
 local pp=promoPicker; promoPicker=nil
 if pp then
  if pp.premove then table.insert(premoves,{from=pp.from,to=pp.to,promotion=letter}); sound("Move")
  else Action:FireServer("move",{from=pp.from,to=pp.to,promotion=letter}); selected=nil; legal={}; marks={}; premoves={} end
 end
 render()
end
local function chooseVariant(v)
 if matchState and matchMode then if v~=variant then confirmVariant=v; render() end; return end
 if searching and v~=variant then Action:FireServer("cancelQueue",{}) end
 variant=v; matchState=nil; selected=nil; legal={}; marks={}; premoves={}; searching=false; resultText=nil; render()
end
local function startBot()
 resultText=nil; searching=true; searchText="Starting bot match…"; render()
 local function fire()
  if variant=="four" then Action:FireServer("fourBot",{ratings=lineup}) else Action:FireServer("bot",{rating=activeRating}) end
 end
 fire()
 task.delay(5,function()
  if searching and searchText=="Starting bot match…" and not matchState then
   fire()
   task.delay(5,function()
    if searching and searchText=="Starting bot match…" and not matchState then
     searching=false; resultText="Could not start the bot match. Please try again."; render()
    end
   end)
  end
 end)
end
local function findMatch()
 resultText=nil; searching=true; searchText=variant=="four" and "Waiting for 3 players…" or "Searching for an opponent…"; render()
 Action:FireServer(variant=="four" and "queueFour" or "queue",{baseSeconds=timeControl.baseSeconds,increment=timeControl.increment})
end
local function ratingControl(parent,x,y,title,value,setValue)
 label(parent,title,UDim2.new(0,x,0,y),UDim2.new(1,-2*x,0,23),{color=C.muted,textSize=12,bold=true})
 local row=instance("Frame",parent,{Position=UDim2.new(0,x,0,y+24),Size=UDim2.new(1,-2*x,0,38),BackgroundTransparency=1})
 button(row,"−",UDim2.new(0,0,0,0),UDim2.new(0,42,1,0),function() setValue(math.max(400,value-200)) end,{color=C.blueDark,textSize=20,name="RatingDown"})
 label(row,tostring(value).." Elo",UDim2.new(0,48,0,0),UDim2.new(1,-96,1,0),{align=Enum.TextXAlignment.Center,bold=true,textSize=15})
 button(row,"+",UDim2.new(1,-42,0,0),UDim2.new(0,42,1,0),function() setValue(math.min(2400,value+200)) end,{color=C.blueDark,textSize=20,name="RatingUp"})
end
local function pointRange(points)
 local tier=profile and profile.league or "Soil"; local start=({Soil=0,Grass=300,Copper=600,Silver=900,Gold=1200,Stone=1500,Sapphire=1800})[tier] or 0; local nextAt=math.min(2100,start+300); return tier,points-start,nextAt-start
end
local function formatClock(seconds)
 seconds=math.max(0,seconds or 0); local mins=math.floor(seconds/60); local secs=math.floor(seconds%60)
 if seconds<10 then return string.format("%d:%04.1f",mins,seconds%60) end
 return string.format("%d:%02d",mins,secs)
end
local function chooseTime(label,seconds,increment)
 timeControl={label=label,baseSeconds=seconds,increment=increment}; render()
end
-- Shop/inventory card for a board theme: mini checkerboard preview, price, and action button.
-- Square surface material: layered detail elements (grain lines, mineral flecks,
-- veins, cracks, ember seams, nebula clouds) drawn on top of each square's base
-- gradient. Positions are seeded from the square name so detail stays stable across
-- re-renders yet varies from square to square. pat.l / pat.d hold {Color3, transparency}
-- for light and dark squares, tuned per theme so the material reads on both.
local function addSquarePattern(cell,tex,light,seed,lite,k)
 k=k or 1 -- pixel-size scale factor: 1 = 1v1 board (reference look)
 local pat=tex and tex.pat; if not pat then return end
 cell.ClipsDescendants=true
 local cfg=light and pat.l or pat.d; if not cfg then return end
 local alt=light and pat.l2 or pat.d2
 local col=cfg[1]; local tr=cfg[2] or .5
 local col2=alt and alt[1] or col; local tr2=alt and (alt[2] or tr) or tr
 local t=pat.type
 -- Primitive: gradient-shaded layer. Keyframe presets control how the
 -- layer dissolves so every mark reads as surface material, not graphics.
 local function place(x,y,sx,sy,ypix,rot,color,kp,gRot,rad,yOff)
  local f=instance("Frame",cell,{Position=UDim2.new(x,0,y,yOff or 0),Size=UDim2.new(sx,0,sy,ypix*k),Rotation=rot,BackgroundColor3=color,BorderSizePixel=0,ZIndex=1})
  instance("UIGradient",f,{Rotation=gRot or 0,Transparency=kp})
  if rad then corner(f,rad*k) end
  return f
 end
 local function endsK(a) return NumberSequence.new({NumberSequenceKeypoint.new(0,1),NumberSequenceKeypoint.new(.1,math.min(a+.28,.97)),NumberSequenceKeypoint.new(.32,a),NumberSequenceKeypoint.new(.68,a),NumberSequenceKeypoint.new(.9,math.min(a+.28,.97)),NumberSequenceKeypoint.new(1,1)}) end
 local function fadeK(a) return NumberSequence.new({NumberSequenceKeypoint.new(0,a),NumberSequenceKeypoint.new(.3,a+(1-a)*.18),NumberSequenceKeypoint.new(.55,a+(1-a)*.42),NumberSequenceKeypoint.new(.8,a+(1-a)*.74),NumberSequenceKeypoint.new(1,1)}) end
 local function riseK(a) return NumberSequence.new({NumberSequenceKeypoint.new(0,1),NumberSequenceKeypoint.new(.45,math.min(a+.2,.96)),NumberSequenceKeypoint.new(1,a)}) end
 local function softK(a) return NumberSequence.new({NumberSequenceKeypoint.new(0,1),NumberSequenceKeypoint.new(.22,math.min(a+.22,.96)),NumberSequenceKeypoint.new(.5,a),NumberSequenceKeypoint.new(.78,math.min(a+.22,.96)),NumberSequenceKeypoint.new(1,1)}) end
 local function patch(x,y,sx,sy,rot,c,a,gRot,rad) return place(x,y,sx,sy,0,rot,c,fadeK(a),gRot,rad) end
 local function soft(x,y,sx,sy,rot,c,a,gRot,rad) return place(x,y,sx,sy,0,rot,c,softK(a),gRot,rad) end
 local function band(x,y,sx,ypix,rot,c,a)
  -- Width-faded stroke: the gradient fades across the band's thickness, so
  -- both long sides dissolve softly — no hard pixel edges anywhere. Segment
  -- ends are hidden by overlap and clipped at the cell border.
  place(x,y,sx,0,ypix+2,rot,c,softK(math.min(a+.34,.96)),90,1,-1)
  return place(x,y,sx,0,ypix,rot,c,softK(a),90,math.max(ypix/2,.5))
 end
 local function wash(c,a,gRot) place(0,0,1,1,0,0,c,fadeK(a),gRot) end
 -- Combed micro-detail: parallel hairlines on a loose lattice, aligned to the
 -- material's flow direction — structured fine grain, never random speckle.
 local function stria(cnt,ang,c,a)
  for i=1,cnt do
   local yo=((seed*7+i*26)%84)+4
   band(.02+((seed*11+i*13)%10)/100,yo/100,.78+((seed+i)%3)*.06,1,ang+((i%2==0) and 2 or -2),c,a+((i-1)%2)*.04)
  end
 end
 -- Connected flow chain: a run of overlapping end-faded segments that
 -- meanders across the entire square — one continuous material line that
 -- reads as flowing structure, never a scatter of separate marks.
 local function flow(y0,wpx,tilt,c,a,drift)
  local y=y0; local dir=((seed%2==0) and 1 or -1)
  local x=-.08; local k=0
  local stepBase=lite and .5 or .34
  local ang=tilt
  while x<1.06 do
   local seg=stepBase+((seed*13+k*7)%3)*.06
   -- The angle eases slowly instead of kinking every segment, so the whole
   -- chain reads as one smooth continuous stroke.
   if k%3==0 then ang=tilt+(((seed*5+k)%3)-1)*.7 end
   band(x,math.clamp(y,5,85)/100,seg,wpx,ang,c,a)
   x+=seg*.66; y+=dir*drift; k+=1
   if y<6 then y=12-y; dir=1 elseif y>84 then y=168-y; dir=-1 end
  end
 end
 -- ENGINE: wood — flowing grain bands; optional cathedral figure arcs,
 -- micro striations, and a polish luster wash.
 if t=="wood" then
  local tilt=pat.tilt or 3
  -- Layer 1: two-angle tonal underlay — the square is never a flat fill.
  wash(col2,math.min(tr2+.42,.95),(seed%2==0) and 20 or 200)
  wash(col,math.min(tr+.46,.95),(seed%2==0) and 110 or 290)
  -- Layer 2: broad grain figures — long soft diagonal-faded patches, the
  -- same vocabulary as the cloud and glow boards. No thin strokes.
  for i=1,(lite and 2 or 3) do
   local c=(i%2==1) and col or col2
   local a=math.min(((i%2==1) and tr or tr2)+.18,.9)
   soft(.04+((seed*13+i*29)%26)/100,.1+((seed*7+i*37)%52)/100,.62+((seed+i)%2)*.1,.24+((seed+i)%3)*.03,(i%2==0) and tilt or -tilt,c,a,(seed%2==0) and 25 or 155,16)
  end
  -- Layer 3: one wide whisper tone between the figures (full board only).
  if not lite then
   soft(.08+((seed*29)%36)/100,.18+((seed*31)%40)/100,.74,.34,((seed%2==0) and tilt or -tilt),col2,math.min(tr2+.42,.93),(seed%2==0) and 30 or 150,20)
  end
  -- Cathedral figure: a single soft arc riding the grain (full board only).
  if pat.fig and not lite then
   soft(.14+((seed*17)%34)/100,.16+((seed*23)%40)/100,pat.fig,pat.fig*.5,(seed%2==0) and 6 or -6,col2,math.min(tr2+.2,.92),(seed%2==0) and 25 or 155,16)
  end
  if pat.luster then wash(col2,pat.luster,(seed%2==0) and 115 or 245) end
 -- ENGINE: strata — layered sediment bands with waviness; optional ripple
 -- cross-beds for wind-blown sandstone.
 elseif t=="strata" then
  local nl=pat.nl or 4; local tilt=pat.tilt or 2
  -- Layer 1: two-angle tonal underlay — bed-wide lighting variation.
  wash(col2,math.min(tr2+.4,.95),(seed%2==0) and 10 or 190)
  wash(col,math.min(tr+.44,.95),(seed%2==0) and 100 or 280)
  -- Layer 2: sediment beds — full-width soft patches fading across their
  -- own thickness; the ends clip outside the cell so no edge ever shows.
  for i=1,(lite and 3 or nl) do
   local c=(i%2==1) and col or col2; local a=(i%2==1) and tr or tr2
   local by=.06+((seed*13+i*37)%74)/100
   soft(-.03,by,1.06,.16+((seed+i)%3)*.04,(i%2==0) and tilt or -tilt,c,a,90,14)
  end
  -- Cross-bedding ripples: gentle diagonal currents within a bed.
  if pat.ripple then
   for i=1,pat.ripple do
    local py=((seed*43+i*29)%58)+12
    soft(.1+((seed*23+i*17)%30)/100,py/100,.5,.16,(seed%2==0) and 9+i*2 or -(8+i*2),(i%2==1) and col2 or col,math.min(tr2+.24,.92),90,10)
   end
  end
 -- ENGINE: veinm — marble: cloudy underlay carrying a drifting vein chain
 -- with optional branch offshoots.
 elseif t=="veinm" then
  -- Layer 1: broad tonal wash — mineral color drift across the stone.
  wash(col,math.min(tr+.4,.94),(seed%2==0) and 25 or 205)
  -- Layer 2: cloudy underlays at two depths for a fuller body.
  soft(.05+((seed*13)%12)/100,.06+((seed*7)%14)/100,pat.usz or .68,pat.uszY or .72,0,col2,math.min(tr2+.28,.92),(seed%2==0) and 30 or 150,16)
  soft(.32+((seed*29)%22)/100,.3+((seed*31)%20)/100,.36,.4,(seed%2==0) and -5 or 4,col,math.min(tr+.3,.92),(seed%2==0) and 150 or 30,12)
  local px=.16+((seed*17)%24)/100; local py=.18+((seed*23)%22)/100
  local segs=pat.ns or 3; local dr=pat.dr or .13; local ang=pat.ang or 9
  for i=1,segs do
   local c=(i%2==1) and col or col2; local a=(i%2==1) and tr or tr2+.08
   band(px,py,.2+((seed+i*7)%3)*.05,1,(seed%2==0) and (12+i*ang) or -(10+i*ang),c,a)
   if pat.branch and i<segs then
    band(px+.06,py+dr*.5,.12,1,(seed%2==0) and -(18+i*ang) or (16+i*ang),c,math.min(a+.18,.93))
   end
   px=px+(pat.sx or .15); py=py+((seed%2==0) and dr or -dr)
  end
  -- Layer 3: fine secondary veinlets — hairline mineral threads.
  for i=1,2 do
   local vy=((seed*41+i*59)%68)+10
   band(.06+((seed*23+i*17)%22)/100,vy/100,.3+((seed+i)%2)*.08,1,(seed%2==0) and 7+i*5 or -(6+i*5),col2,math.min(tr2+.34,.93))
  end
 -- ENGINE: water — calm layered currents with optional light caustic arcs.
 elseif t=="water" then
  local nb=pat.nb or 3; local tilt=pat.tilt or 3
  -- Layer 1: broad depth wash — gentle light falloff across the water.
  wash(col2,math.min(tr2+.34,.94),(seed%2==0) and 15 or 195)
  -- Layer 2: calm layered currents — full-width soft patches fading
  -- across their thickness; the ends clip outside the cell.
  for i=1,(lite and 2 or nb) do
   local c=(i%2==1) and col or col2; local a=(i%2==1) and tr or tr2
   local by=.08+((seed*13+i*29)%70)/100
   soft(-.03,by,1.06,.2+((seed+i)%2)*.05,(seed%2==0) and tilt or -tilt,c,a+((i-1)%2)*.04,90,14)
  end
  -- Layer 3: soft refracted caustic drifts.
  if pat.caustic then
   for i=1,pat.caustic do
    local py=((seed*37+i*61)%60)+12
    soft(.12+((seed*23+i*17)%28)/100,py/100,.46,.14,(seed%2==0) and 6+i*3 or -(5+i*3),col2,math.min(tr2+.3,.94),(seed%2==0) and 30 or 150,10)
   end
  end
 -- ENGINE: ice — deep interior zones, fine refracted fissures, optional
 -- vertical light shaft.
 elseif t=="ice" then
  -- Layer 1: broad glacial wash — cold light falloff through the ice.
  wash(col2,math.min(tr2+.32,.94),(seed%2==0) and 30 or 210)
  -- Layer 2: deep interior zones at two depths.
  soft(.08+((seed*13)%14)/100,.1+((seed*7)%16)/100,.55,.6,(seed%2==0) and 5 or -4,col2,math.min(tr2+.24,.9),(seed%2==0) and 35 or 145,18)
  soft(.3+((seed*29)%20)/100,.34+((seed*31)%18)/100,.4,.44,(seed%2==0) and -6 or 5,col,math.min(tr+.2,.9),(seed%2==0) and 145 or 35,14)
  -- Layer 3: fine refracted fissures.
  for i=1,(pat.fiss or 3) do
   local px=((seed*37+i*53)%54)+6; local py=((seed*41+i*29)%58)+6
   band(px/100,py/100,.24+((seed+i)%3)*.06,1,(seed%2==0) and 8+i*10 or -(7+i*9),(i%2==1) and col or col2,math.min(tr2+.28,.94))
  end
  if pat.shaft then place(.3+((seed*17)%20)/100,0,.1,1,0,0,col2,riseK(math.min(tr2+.18,.9)),90) end
 -- ENGINE: crystal — angular facets with internal color zoning and a
 -- bright edge highlight along one side.
 elseif t=="crystal" then
  -- Layer 1: broad inner luminescence — glow rising through the stone.
  wash(col2,math.min(tr2+.3,.94),(seed%2==0) and 40 or 220)
  -- Layer 2: soft color zoning beneath the facets.
  soft(.1+((seed*13)%16)/100,.12+((seed*7)%18)/100,.5,.54,(seed%2==0) and 6 or -5,col,math.min(tr+.24,.92),(seed%2==0) and 40 or 220,14)
  -- Layer 3: angular facets with edge highlights.
  for i=1,(pat.nf or 3) do
   local px=((seed*31+i*61)%40)+4; local py=((seed*43+i*17)%36)+6
   local c=(i%2==1) and col or col2; local a=(i%2==1) and tr or tr2
   place(px/100,py/100,pat.fs or .34,pat.fsY or .4,0,(seed%2==0) and 18+i*14 or -(16+i*12),c,fadeK(a),(seed%2==0) and 45 or 225,pat.fr or 2)
   band(px/100+.02,py/100+.06,.14,1,(seed%2==0) and 14+i*14 or -(12+i*12),col2,math.min(a+.22,.93))
  end
 -- ENGINE: facet — broad, softly shaded low-poly facets: a few large
 -- angular patches with gradient-faded borders and a gentle sheen,
 -- giving smooth faceted depth without hard lines or busy detail.
 elseif t=="facet" then
  -- Layer 1: broad tonal wash — gentle light falloff across the surface.
  wash(col2,math.min(tr2+.32,.94),(seed%2==0) and 25 or 205)
  -- Layer 2: broad facets — large angular patches fading softly at their
  -- borders, each with a deeper echo beneath for smooth blending.
  for i=1,(lite and 2 or (pat.nf or 3)) do
   local px=((seed*31+i*61)%36)+6
   local py=((seed*43+i*17)%34)+8
   local c=(i%2==1) and col or col2
   local a=(i%2==1) and tr or tr2
   local rot=(seed%2==0) and 12+i*16 or -(10+i*14)
   local fs=pat.fs or .5; local fsY=pat.fsY or .46
   place(px/100-.03,py/100-.02,fs*.72,fsY*.72,0,rot+4,c,softK(math.min(a+.26,.94)),(seed%2==0) and 45 or 225,pat.fr or 3)
   place(px/100,py/100,fs,fsY,0,rot,c,fadeK(a),(seed%2==0) and 45 or 225,pat.fr or 3)
  end
  -- Layer 3: one broad diagonal sheen sweep across the facets.
  if pat.sheen then wash(col2,pat.sheen,(seed%2==0) and 115 or 295) end
 -- ENGINE: moss — organic mottling with optional dappled canopy light.
 elseif t=="moss" then
  -- Layer 1: broad organic wash — gentle growth-tone variation.
  wash(col2,math.min(tr2+.34,.94),(seed%2==0) and 20 or 200)
  -- Layer 2: organic mottling patches.
  for i=1,(pat.nm or 4) do
   local px=((seed*37+i*53)%44)+4; local py=((seed*29+i*47)%40)+6
   local c=(i%2==1) and col or col2; local a=(i%2==1) and tr or tr2
   soft(px/100,py/100,pat.ms or .34,pat.msY or .3,((seed+i)%2==0) and 5 or -4,c,a,(seed%2==0) and 30 or 150,12)
  end
  if pat.dapple then
   for i=1,pat.dapple do
    local px=((seed*53+i*31)%56)+8; local py=((seed*17+i*59)%52)+8
    soft(px/100,py/100,.2,.18,0,col2,math.min(tr2+.3,.93),(seed%2==0) and 60 or 120,10)
   end
  end
  -- Layer 3: broad canopy light — one wide soft glow over the growth.
  if not lite then
   soft(.1+((seed*19)%30)/100,.08+((seed*23)%26)/100,.7,.5,0,col2,math.min(tr2+.4,.94),(seed%2==0) and 30 or 150,18)
  end
 -- ENGINE: lacquer — deep glossy finish: soft depth patch, diagonal
 -- reflection wash, thin highlight lines.
 elseif t=="lacquer" then
  -- Layer 1: broad tonal wash — deep finish color breathing under the gloss.
  wash(col,math.min(tr+.36,.94),(seed%2==0) and 25 or 205)
  -- Layer 2: soft depth patch plus diagonal gloss sweep.
  soft(.06+((seed*13)%12)/100,.1+((seed*7)%14)/100,.6,.62,(seed%2==0) and 4 or -4,col2,math.min(tr2+.26,.9),(seed%2==0) and 30 or 150,16)
  wash(col2,pat.sheen or .86,(seed%2==0) and 115 or 295)
  -- Layer 3: thin highlight lines catching the light.
  for i=1,(pat.hl or 2) do
   local py=((seed*29+i*41)%74)+8
   band(.06+((seed*11+i*13)%8)/100,py/100,.62+((seed+i)%2)*.06,1,(seed%2==0) and 4 or -3,col2,math.min(tr2+.32,.94))
  end
 -- ENGINE: metal — warm brushed tone with broad anisotropic sheen
 -- sweeps and an optional diagonal luster wash.
 elseif t=="metal" then
  -- Layer 1: broad tonal wash — warm metal tone across the surface.
  wash(col2,math.min(tr2+.36,.94),(seed%2==0) and 10 or 190)
  -- Layer 2: anisotropic sheen sweeps — full-width soft bands fading
  -- across their thickness, like light traveling over brushed metal.
  soft(-.02,.14+((seed*23)%26)/100,1.04,.3,(seed%2==0) and 2 or -2,col,tr,90,16)
  soft(-.02,.5+((seed*29)%22)/100,1.04,.24,(seed%2==0) and -3 or 3,col2,math.min(tr2+.14,.92),90,16)
  if pat.luster then wash(col2,pat.luster,(seed%2==0) and 65 or 245) end
 -- ENGINE: neon — circuit traces: continuous edge-to-edge routed runs
 -- that turn 90 degrees, with glowing nodes at the joints.
 elseif t=="neon" then
  -- Layer 1: broad ambient wash — city glow behind the circuits.
  wash(col2,math.min(tr2+.3,.94),(seed%2==0) and 35 or 215)
  -- Layer 2: connected circuit traces spanning the square, turning 90
  -- degrees like routed PCB lines — one continuous path, never loose marks.
  for i=1,(lite and 1 or (pat.nc or 2)) do
   local c=(i%2==1) and col or col2; local a=(i%2==1) and tr or tr2
   local y0=(((seed*37+i*53)%50)+8)/100
   local y1=(((seed*41+i*29)%50)+8)/100
   local xm=(30+((seed*23+i*17)%40))/100
   local vl=math.abs(y1-y0)+.02
   -- horizontal in → vertical jog → horizontal out: one continuous path.
   band(-.02,y0,xm+.02,1,0,c,a)
   band(xm-vl/2,(y0+y1)/2,vl,1,90,c,a)
   band(xm,y1,1.04-xm,1,0,c,a)
   -- glowing nodes at the two joints.
   place(xm-.025,y0-.025,.05,.05,0,0,c,fadeK(math.max(a-.18,.22)),0,3)
   place(xm-.025,y1-.025,.05,.05,0,0,c,fadeK(math.max(a-.18,.22)),0,3)
  end
  -- Layer 3: faint parallel data-bus hairlines behind the traces.
  if not lite then
   for i=1,2 do
    local yy=(((seed*29+i*41)%70)+10)/100
    band(-.02,yy,1.04,1,0,col2,math.min(tr2+.38,.94))
   end
  end
 -- ENGINE: ribbon — aurora curtains: tall soft ribbons with vertical
 -- light falloff.
 elseif t=="ribbon" then
  local rw=pat.rw or .16
  -- Layer 1: broad sky wash — night-glow backdrop for the curtains.
  wash(col2,math.min(tr2+.32,.94),(seed%2==0) and 20 or 200)
  -- Layer 2: aurora curtains — wide soft patches fading across their
  -- width, so both sides dissolve into the night sky.
  for i=1,(pat.nr or 3) do
   local px=((seed*31+i*61)%40)+6
   local c=(i%2==1) and col or col2; local a=(i%2==1) and tr or tr2
   local rot=(seed%2==0) and 6+i*5 or -(5+i*4)
   local y=.04+((seed*13+i*7)%10)/100
   soft((px-rw*.5)/100,y,rw*1.6,.82,rot,c,math.min(a+.26,.94),90,14)
   soft(px/100,y,rw,.8,rot,c,a,90,10)
  end
  -- Layer 3: soft echo glows — faint trailing shimmer.
  for i=1,(lite and 1 or 2) do
   local px=((seed*17+i*43)%56)+10
   soft(px/100,.1+((seed*7+i*13)%14)/100,rw*.7,.6,(seed%2==0) and 8+i*4 or -(7+i*4),col2,math.min(tr2+.34,.94),90,10)
  end
 -- ENGINE: basalt — mottled volcanic stone with a connected crack chain
 -- and an ember glow at the heart.
 elseif t=="basalt" then
  -- Layer 1: broad heat wash — warm haze across the volcanic stone.
  wash(col2,math.min(tr2+.3,.94),(seed%2==0) and 15 or 195)
  -- Layer 2: mottled stone patches.
  for i=1,(pat.nm or 3) do
   local px=((seed*37+i*53)%44)+4; local py=((seed*29+i*47)%40)+6
   local c=(i%2==1) and col or col2; local a=(i%2==1) and tr or tr2
   soft(px/100,py/100,.4,.36,((seed+i)%2==0) and 5 or -4,c,a,(seed%2==0) and 40 or 140,12)
  end
  -- Layer 3: ember seams — soft glowing fissures through the stone.
  for i=1,(lite and 1 or (pat.nc or 2)) do
   local sx=.12+((seed*17+i*31)%36)/100
   local sy=.2+((seed*23+i*29)%38)/100
   soft(sx,sy,.5+((seed+i)%2)*.1,.2,(seed%2==0) and 10+i*14 or -(8+i*12),col,math.min(tr+.12,.9),90,12)
  end
  if pat.ember then
   patch(.3+((seed*53)%30)/100,.34+((seed*31)%26)/100,pat.ember,pat.ember*.7,0,col2,math.max(tr2-.14,.25),(seed%2==0) and 20 or 200,8)
  end
 -- ENGINE: petal — soft blossom mottling with petal shapes and a delicate
 -- crease line through each.
 elseif t=="petal" then
  -- Layer 1: broad blush wash — soft petal-tone drift.
  wash(col2,math.min(tr2+.34,.94),(seed%2==0) and 25 or 205)
  -- Layer 2: soft blossom mottling.
  for i=1,(pat.nm or 3) do
   local px=((seed*37+i*53)%46)+4; local py=((seed*29+i*47)%42)+6
   local c=(i%2==1) and col or col2; local a=(i%2==1) and tr or tr2
   soft(px/100,py/100,.36,.3,((seed+i)%2==0) and 6 or -5,c,a,(seed%2==0) and 30 or 150,12)
  end
  for i=1,(pat.np or 2) do
   local px=((seed*53+i*31)%52)+10; local py=((seed*17+i*59)%48)+10
   local c=(i%2==1) and col2 or col
   soft(px/100,py/100,.16,.12,(seed%2==0) and 14 or -12,c,math.min(tr2+.14,.9),(seed%2==0) and 40 or 140,7)
   band(px/100+.02,py/100+.05,.1,1,(seed%2==0) and 12 or -10,col,math.min(tr+.2,.93))
  end
 -- ENGINE: nebula — broad soft clouds in two tones with drifting
 -- stardust streaks.
 elseif t=="nebula" then
  -- Layer 1: broad deep-space wash beneath the clouds.
  wash(col2,math.min(tr2+.28,.94),(seed%2==0) and 30 or 210)
  -- Layer 2: broad soft clouds in two tones.
  soft(.06+((seed*13)%14)/100,.08+((seed*7)%16)/100,pat.sz or .6,pat.szY or .5,(seed%2==0) and 6 or -5,col2,math.min(tr2+.2,.9),(seed%2==0) and 35 or 145,18)
  soft(.3+((seed*29)%22)/100,.32+((seed*31)%20)/100,.42,.38,(seed%2==0) and -5 or 6,col,math.min(tr+.22,.92),(seed%2==0) and 145 or 35,14)
  for i=1,(pat.ns or 2) do
   local py=((seed*37+i*61)%60)+12
   band(.1+((seed*23+i*17)%26)/100,py/100,.4+((seed+i)%2)*.06,1,(seed%2==0) and 6+i*5 or -(5+i*4),col2,math.min(tr2+.3,.93))
  end
 end
 -- BORDER FOCUS / READABILITY: calm the square's center back toward the flat
 -- base color so pieces sit on a clean surface, then frame the tile with soft
 -- inset rails — texture reads as border definition, never center noise.
 local base=cell.BackgroundColor3
 local cp=instance("Frame",cell,{AnchorPoint=Vector2.new(.5,.5),Position=UDim2.new(.5,0,.5,0),Size=UDim2.new(.96,0,.96,0),BackgroundColor3=base,BorderSizePixel=0,ZIndex=1}); corner(cp,12*k)
 instance("UIGradient",cp,{Rotation=(seed%2==0) and 45 or 225,Transparency=NumberSequence.new({NumberSequenceKeypoint.new(0,.6),NumberSequenceKeypoint.new(.5,.32),NumberSequenceKeypoint.new(1,.6)})})
 local fa=math.max(tr-.18,.32); local ins=.015; local th=.05
 place(ins,ins,1-2*ins,th,0,0,col,softK(fa),90,1)
 place(ins,1-ins-th,1-2*ins,th,0,0,col,softK(fa),90,1)
 place(ins,ins+th,th,1-2*ins-2*th,0,0,col,softK(fa),0,1)
 place(1-ins-th,ins+th,th,1-2*ins-2*th,0,0,col,softK(fa),0,1)
end
local function themeCard(parent,layoutOrder,theme,owned,equipped,mode)
 local card=frame(parent,UDim2.new(0,0,0,0),UDim2.new(0,202,0,182),C.panel)
 card.LayoutOrder=layoutOrder
 instance("UIStroke",card,{Thickness=1,Color=shade(C.panel,.6),Transparency=.45})
 if equipped then instance("UIStroke",card,{Thickness=2,Color=C.gold,Transparency=.1}) end
 label(card,theme.name,UDim2.new(0,10,0,8),UDim2.new(1,-20,0,20),{bold=true,textSize=15,color=equipped and C.gold or C.text})
 local prev=instance("Frame",card,{AnchorPoint=Vector2.new(.5,0),Position=UDim2.new(.5,0,0,34),Size=UDim2.new(0,104,0,104),BackgroundTransparency=1})
 instance("UIGridLayout",prev,{CellSize=UDim2.new(.25,0,.25,0),CellPadding=UDim2.new(0,0,0,0),SortOrder=Enum.SortOrder.LayoutOrder})
 local g=theme.board.gradient; local tx=theme.board.tex
 for i=1,16 do
  local row=math.ceil(i/4); local col=(i-1)%4+1
  local isLight=(row+col)%2==0
  local cell=instance("Frame",prev,{LayoutOrder=i,BackgroundColor3=isLight and theme.board.light or theme.board.dark,BorderSizePixel=0})
  if tx then
   local pts={}; for _,p in ipairs(isLight and tx.l or tx.d) do table.insert(pts,ColorSequenceKeypoint.new(p[1],p[2])) end
   instance("UIGradient",cell,{Rotation=tx.rot,Color=ColorSequence.new(pts)})
   addSquarePattern(cell,tx,isLight,i,true,26/boardCellPx)
  elseif g then instance("UIGradient",cell,{Rotation=g.rotation,Color=ColorSequence.new(g.colors[1],g.colors[2])}) end
 end
 if equipped then
  label(card,"Equipped",UDim2.new(0,10,0,146),UDim2.new(1,-20,0,28),{bold=true,textSize=14,color=C.gold,align=Enum.TextXAlignment.Center})
 elseif owned then
  button(card,"Equip",UDim2.new(0,10,0,146),UDim2.new(1,-20,0,28),function() Action:FireServer("equipBoard",{id=theme.id}) end,{color=C.blueDark,textSize=14,bold=true,name="Equip_"..theme.id})
 else
  local bal=profile and profile.pieceStorage or 0
  local afford=bal>=(theme.price or 0)
  label(card,theme.price==0 and "Free" or tostring(theme.price).." pieces",UDim2.new(0,10,0,124),UDim2.new(1,-20,0,16),{textSize=12,bold=true,color=afford and C.green or C.muted,align=Enum.TextXAlignment.Center})
  button(card,afford and "Buy" or "Locked",UDim2.new(0,10,0,146),UDim2.new(1,-20,0,28),function()
   if afford then Action:FireServer("buyBoard",{id=theme.id}) else shopNotice={text="Not enough stored pieces — capture more to earn them!",ts=os.clock()}; render() end
  end,{color=afford and C.blueDark or C.panel2,textSize=14,bold=true,name="Buy_"..theme.id})
 end
 return card
end
local function renderBoard(parent,boardSize,viewState,isFour,viewOnly)
 local boardFrame=instance("Frame",parent,{AnchorPoint=Vector2.new(.5,.5),Position=UDim2.fromScale(.5,.5),Size=UDim2.new(0,boardSize,0,boardSize),BackgroundColor3=B.frame,BorderSizePixel=0,ClipsDescendants=true}); corner(boardFrame,13)
 instance("UIStroke",boardFrame,{Thickness=4,Color=B.stroke,Transparency=.05})
 local count=isFour and 14 or 8; boardCellPx=boardSize/8; local grid=instance("Frame",boardFrame,{Position=UDim2.new(0,5,0,5),Size=UDim2.new(1,-10,1,-10),BackgroundTransparency=1})
 instance("UIGridLayout",grid,{CellSize=UDim2.new(1/count,0,1/count,0),CellPadding=UDim2.new(0,0,0,0),SortOrder=Enum.SortOrder.LayoutOrder})
 squareButtons={}
 local premovePath={}; local premoveGhost={}; local premoveHide={}
 if not viewOnly and #premoves>0 and viewState.board and mySide then
  local sim={}; for k,v in pairs(viewState.board) do sim[k]=v end
  local chainStart={}
  for _,pm in ipairs(premoves) do
   local piece=sim[pm.from]
   if piece and string.sub(piece,1,1)==mySide then
    local start=chainStart[pm.from] or pm.from
    chainStart[pm.to]=start
    premovePath[pm.from]=true; premovePath[pm.to]=true; premoveHide[start]=true
    premoveGhost[pm.to]=mySide..(pm.promotion or string.sub(piece,2,2))
    sim[pm.from]=nil; sim[pm.to]=piece
   end
  end
 end
 -- Board always renders from White's perspective (a1 bottom-left) in 1v1.
 for ri=1,count do
  local rank=isFour and (15-ri) or (9-ri)
  for fi=1,count do
   local playable=true
   if isFour then playable=(fi>=4 and fi<=11) or (rank>=4 and rank<=11) end
   local file=fi
   local sq=files:sub(file,file)..tostring(rank)
   if playable then
    local light=((file+rank)%2==0); local cell=instance("TextButton",grid,{Name=sq,LayoutOrder=(ri-1)*count+fi,BackgroundColor3=light and B.light or B.dark,BorderSizePixel=0,Text="",AutoButtonColor=false})
    squareButtons[sq]=cell
    if B.tex then
     local pts={}; for _,p in ipairs(light and B.tex.l or B.tex.d) do table.insert(pts,ColorSequenceKeypoint.new(p[1],p[2])) end
     instance("UIGradient",cell,{Rotation=B.tex.rot,Color=ColorSequence.new(pts)})
     local h=0; for c in sq:gmatch("%a%d") do h=(h*33+string.byte(c))%97 end
     addSquarePattern(cell,B.tex,light,h,nil,8/count)
     if B.tex.stars then
      for s=1,2+(h%2) do
       local px=((h*37+s*61)%72)+10; local py=((h*53+s*83)%72)+10
       local sz=2+(s%2)
       local halo=instance("Frame",cell,{Position=UDim2.new(px/100,-2,py/100,-2),Size=UDim2.new(0,sz+4,0,sz+4),BackgroundColor3=Color3.fromRGB(190,200,255),BackgroundTransparency=light and .9 or .82,BorderSizePixel=0,ZIndex=1}); corner(halo,(sz+4)/2)
       local star=instance("Frame",cell,{Position=UDim2.new(px/100,0,py/100,0),Size=UDim2.new(0,sz,0,sz),BackgroundColor3=Color3.fromRGB(246,248,255),BackgroundTransparency=light and .45 or .18,BorderSizePixel=0,ZIndex=1}); corner(star,2)
      end
     end
    elseif B.gradient then instance("UIGradient",cell,{Rotation=B.gradient.rotation,Color=ColorSequence.new(B.gradient.colors[1],B.gradient.colors[2])}) end
    local piece=viewState.board and viewState.board[sq]; if piece and not premoveHide[sq] then local side=string.sub(piece,1,1); local typ=string.sub(piece,2,2); local set=(side=="w" or side=="b") and side or "w"; local tex=pieceImages[set] and pieceImages[set][typ]; if tex then local img=instance("ImageLabel",cell,{BackgroundTransparency=1,Image="rbxassetid://"..tex,Size=UDim2.new(1,-4,1,-4),Position=UDim2.new(0,2,0,2),ScaleType=Enum.ScaleType.Fit,ZIndex=2}); if isFour and viewState.eliminated and viewState.eliminated[side] then img.ImageColor3=Color3.fromRGB(130,130,130)
elseif side~="w" and side~="b" then img.ImageColor3=pieceColor[side] or Color3.new(1,1,1) end end end
    if premoveGhost[sq] then local g=premoveGhost[sq]; local gside=string.sub(g,1,1); local gtyp=string.sub(g,2,2); local gset=(gside=="w" or gside=="b") and gside or "w"; local gtex=pieceImages[gset] and pieceImages[gset][gtyp]; if gtex then local gimg=instance("ImageLabel",cell,{BackgroundTransparency=1,Image="rbxassetid://"..gtex,Size=UDim2.new(1,-4,1,-4),Position=UDim2.new(0,2,0,2),ScaleType=Enum.ScaleType.Fit,ZIndex=2,ImageTransparency=.35}); if gside~="w" and gside~="b" then gimg.ImageColor3=pieceColor[gside] or Color3.new(1,1,1) end end end
    local last=viewState.lastMove; if last and (last.from==sq or last.to==sq) then instance("Frame",cell,{Size=UDim2.fromScale(1,1),BackgroundColor3=Color3.fromRGB(216,183,97),BackgroundTransparency=.42,BorderSizePixel=0,ZIndex=1}) end
    if selected==sq then instance("Frame",cell,{Size=UDim2.fromScale(1,1),BackgroundColor3=Color3.fromRGB(235,157,71),BackgroundTransparency=.28,BorderSizePixel=0,ZIndex=1}); instance("UIStroke",cell,{Thickness=2,Color=Color3.fromRGB(235,157,71),Transparency=.05}) end
    if legal[sq] then
     cell.Text="·"; cell.TextColor3=C.green; cell.Font=Enum.Font.GothamBold; cell.TextScaled=true
     instance("Frame",cell,{Size=UDim2.fromScale(1,1),BackgroundColor3=C.green,BackgroundTransparency=.85,BorderSizePixel=0,ZIndex=1})
     if piece then instance("UIStroke",cell,{Thickness=3,Color=C.green,Transparency=.1}) end
    end
    local checkSq=false
    if isFour then
     if piece and string.sub(piece,2,2)=="K" and viewState.checkedColors then
      local pside=string.sub(piece,1,1)
      for _,cc in ipairs(viewState.checkedColors) do if cc==pside then checkSq=true break end end
     end
     if not checkSq and viewState.status=="check" and piece and string.sub(piece,1,2)==viewState.turn.."K" then checkSq=true end
    elseif viewState.status=="check" and piece and string.sub(piece,1,2)==viewState.turn.."K" then checkSq=true end
    if checkSq then cell.BackgroundColor3=Color3.fromRGB(178,62,58); instance("UIStroke",cell,{Thickness=2,Color=Color3.fromRGB(255,120,110),Transparency=.1}) end
    if marks[sq] then cell.BackgroundColor3=Color3.fromRGB(214,52,46); instance("Frame",cell,{Size=UDim2.fromScale(1,1),BackgroundColor3=C.red,BackgroundTransparency=.45,BorderSizePixel=0,ZIndex=1}); instance("UIStroke",cell,{Thickness=2,Color=Color3.fromRGB(255,110,100),Transparency=.1}) end
    if premovePath[sq] then instance("Frame",cell,{Size=UDim2.fromScale(1,1),BackgroundColor3=Color3.fromRGB(191,82,77),BackgroundTransparency=.55,BorderSizePixel=0,ZIndex=3}); instance("UIStroke",cell,{Thickness=2,Color=C.red,Transparency=.1}) end
    if isFour and (rank==14 or rank==1 or fi==1 or fi==14) then local coord=label(cell,sq,UDim2.new(0,2,0,0),UDim2.new(1,-4,0,10),{color=light and B.dark or B.light,textSize=8,align=Enum.TextXAlignment.Left}); coord.ZIndex=4 end
    if not isFour then
     local coordColor=light and B.dark or B.light
     if rank==1 then local coord=label(cell,files:sub(file,file),UDim2.new(1,-14,1,-11),UDim2.new(0,12,0,10),{color=coordColor,textSize=9,align=Enum.TextXAlignment.Right}); coord.ZIndex=4 end
     if file==1 then local coord=label(cell,tostring(rank),UDim2.new(0,2,0,1),UDim2.new(0,10,0,10),{color=coordColor,textSize=9}); coord.ZIndex=4 end
    end
    if not viewOnly then cell.InputBegan:Connect(function(io)
     if io.UserInputType==Enum.UserInputType.MouseButton2 then
      if marks[sq] then marks[sq]=nil else marks[sq]=true end
      render()
      return
     end
     if io.UserInputType~=Enum.UserInputType.MouseButton1 and io.UserInputType~=Enum.UserInputType.Touch then return end
     if not matchState or not mySide then return end
     if viewState.turn~=mySide then
      if piece and string.sub(piece,1,1)==mySide and (not isFour or not (viewState.eliminated and viewState.eliminated[mySide])) then
       startDrag(sq,piece,io.Position,true)
      end
      return
     end
     if piece and string.sub(piece,1,1)==mySide and (not isFour or not (viewState.eliminated and viewState.eliminated[mySide])) then
      selected=sq; legal={}; Action:FireServer("legal",{from=sq}); render(); startDrag(sq,piece,io.Position)
     elseif selected and legal[sq] then
      local piece=matchState and matchState.board and matchState.board[selected]
      if type(legal[sq])=="string" or (piece and isPromotionMove(piece,sq)) then
       promoPicker={from=selected,to=sq,premove=false}; promoOpenedAt=os.clock(); render()
      else
       Action:FireServer("move",{from=selected,to=sq,promotion="Q"}); selected=nil; legal={}; marks={}; premoves={}; render()
      end
     else
      selected=nil; legal={}; render()
     end
    end) end
   else
    instance("Frame",grid,{Name="empty",LayoutOrder=(ri-1)*count+fi,BackgroundTransparency=1})
   end
  end
 end
end
local function bottomStatusText()
 if searching then return searchText end
 if resultText and (resultData or not matchState) then return resultText end
 if not matchState then return variant=="four" and "Four-Player Free-for-All · 160 squares" or "Standard chess · 8×8 board" end
 if matchState.status=="check" then return "Check · "..tostring(matchState.turn).." to move" end
 if variant=="four" and matchState.eliminated and matchState.eliminated[mySide] then return "Spectating · "..tostring(matchState.turn).." to move" end
 return matchState.turn==mySide and "Your move" or ("Waiting for "..tostring(matchState.turn).." to move")
end
render=function()
 clockLabels={}
 setMusicDuck(matchState~=nil)
 for _,child in ipairs(gui:GetChildren()) do if not child:IsA("BaseScript") then child:Destroy() end end
 local viewport=getViewport(); local width,height=viewport.X,viewport.Y
 local bg=instance("Frame",gui,{Size=UDim2.fromScale(1,1),BackgroundColor3=C.bg,BorderSizePixel=0})
 instance("UIGradient",bg,{Rotation=90,Color=ColorSequence.new(Color3.fromRGB(255,255,255),Color3.fromRGB(223,223,223))})
 -- Subtle dot-grid texture across the open background so empty areas read as finished.
 local dots=instance("Frame",bg,{Size=UDim2.fromScale(1,1),BackgroundTransparency=1,BorderSizePixel=0})
 local dotStep=64
 local rowIndex=0
 for gy=78,height,dotStep do
  rowIndex+=1
  local xOff=(rowIndex%2==0) and dotStep/2 or 0
  local colIndex=0
  for gx=dotStep+xOff,width,dotStep do
   colIndex+=1
   local bright=(colIndex+rowIndex)%2==0
   local d=instance("Frame",dots,{Position=UDim2.new(0,gx-2,0,gy-2),Size=UDim2.new(0,4,0,4),BackgroundColor3=bright and shade(C.teal,1.5) or C.teal,BackgroundTransparency=bright and .28 or .48,BorderSizePixel=0})
   corner(d,2)
  end
 end
 -- Soft vignette on the screen edges for depth.
 local function edge(pos,size,rotation,strength)
  local e=instance("Frame",bg,{Position=pos,Size=size,BackgroundColor3=shade(C.bg,.35),BackgroundTransparency=1,BorderSizePixel=0})
  instance("UIGradient",e,{Rotation=rotation,Transparency=NumberSequence.new({NumberSequenceKeypoint.new(0,strength),NumberSequenceKeypoint.new(1,1)})})
 end
 edge(UDim2.new(0,0,0,54),UDim2.new(1,0,0,110),90,.6)
 edge(UDim2.new(0,0,0,54),UDim2.new(0,80,1,-54),0,.55)
 edge(UDim2.new(1,-80,0,54),UDim2.new(0,80,1,-54),180,.55)
 edge(UDim2.new(0,0,1,-110),UDim2.new(1,0,0,110),270,.6)
 local header=instance("Frame",bg,{Size=UDim2.new(1,0,0,54),BackgroundColor3=C.top,BorderSizePixel=0})
 instance("UIGradient",header,{Rotation=90,Color=ColorSequence.new(Color3.fromRGB(255,255,255),Color3.fromRGB(224,224,224))})
 instance("Frame",header,{Position=UDim2.new(0,0,1,-4),Size=UDim2.new(1,0,0,1),BackgroundColor3=C.gold,BackgroundTransparency=.78,BorderSizePixel=0})
 instance("Frame",header,{Position=UDim2.new(0,0,1,-3),Size=UDim2.new(1,0,0,1),BackgroundColor3=C.blue,BackgroundTransparency=.7,BorderSizePixel=0})
 instance("Frame",header,{Position=UDim2.new(0,0,1,-2),Size=UDim2.new(1,0,0,2),BackgroundColor3=shade(C.bg,.5),BorderSizePixel=0})
 instance("ImageLabel",header,{Position=UDim2.new(0,16,0,12),Size=UDim2.new(0,30,0,30),BackgroundTransparency=1,Image="rbxassetid://"..pieceImages.w.K,ScaleType=Enum.ScaleType.Fit})
 label(header,"Exalted Chess",UDim2.new(0,52,0,0),UDim2.new(0,180,1,0),{bold=true,textSize=23})
 local tabs=instance("Frame",header,{AnchorPoint=Vector2.new(.5,0),Position=UDim2.new(.5,0,0,7),Size=UDim2.new(0,736,0,40),BackgroundTransparency=1})
 local gameActive=not showShop and not showProfile and not showBoards
 local function tabUnderline(tab)
  instance("Frame",tab,{Position=UDim2.new(.2,0,1,-3),Size=UDim2.new(.6,0,0,3),BackgroundColor3=C.gold,BorderSizePixel=0})
 end
 local chessTab=button(tabs,"Chess",UDim2.new(0,0,0,0),UDim2.new(0,144,1,0),function() showShop=false; showProfile=false; showBoards=false; chooseVariant("chess") end,{color=gameActive and variant=="chess" and C.blue or C.panel2,bold=true,name="ChessTab"}); if gameActive and variant=="chess" then tabUnderline(chessTab) else instance("UIStroke",chessTab,{Thickness=1,Color=C.muted,Transparency=.45}) end
 local fourTab=button(tabs,"4-Player Chess",UDim2.new(0,148,0,0),UDim2.new(0,144,1,0),function() showShop=false; showProfile=false; showBoards=false; chooseVariant("four") end,{color=gameActive and variant=="four" and C.blue or C.panel2,bold=true,name="FourPlayerTab"}); if gameActive and variant=="four" then tabUnderline(fourTab) else instance("UIStroke",fourTab,{Thickness=1,Color=C.muted,Transparency=.45}) end
 local shopTab=button(tabs,"Shop",UDim2.new(0,296,0,0),UDim2.new(0,144,1,0),function() showShop=true; showProfile=false; showBoards=false; render() end,{color=showShop and C.blue or C.panel2,bold=true,name="ShopTab"}); if showShop then tabUnderline(shopTab) else instance("UIStroke",shopTab,{Thickness=1,Color=C.muted,Transparency=.45}) end
 local boardsTab=button(tabs,"Boards",UDim2.new(0,444,0,0),UDim2.new(0,144,1,0),function() showBoards=true; showShop=false; showProfile=false; render() end,{color=showBoards and C.blue or C.panel2,bold=true,name="BoardsTab"}); if showBoards then tabUnderline(boardsTab) else instance("UIStroke",boardsTab,{Thickness=1,Color=C.muted,Transparency=.45}) end
 local profileTab=button(tabs,"Profile",UDim2.new(0,592,0,0),UDim2.new(0,144,1,0),function() showProfile=true; showShop=false; showBoards=false; profileGame=nil; replayIndex=0; render() end,{color=showProfile and C.blue or C.panel2,bold=true,name="ProfileTab"}); if showProfile then tabUnderline(profileTab) else instance("UIStroke",profileTab,{Thickness=1,Color=C.muted,Transparency=.45}) end
 local musicBtn=button(header,musicOn and "🔊" or "🔇",UDim2.new(1,-50,0,9),UDim2.new(0,36,0,36),function() sound("Button Click"); toggleMusic(); render() end,{name="MusicToggle",color=C.panel2,textSize=18}); musicBtn.AnchorPoint=Vector2.new(1,0); corner(musicBtn,8)
 if not showShop and not showProfile and not showBoards then
 local contentY=64; local leftW=math.clamp(math.floor(width*.235),240,330); local rightW=math.clamp(math.floor(width*.215),225,315); local panelH=math.max(330,height-contentY-15)
 local leftX=.02*width; local gap=.02*width; local rightX=width-rightW-.02*width; local centerX=leftX+leftW+gap; local centerW=math.max(1,rightX-gap-centerX)
 shadow(bg,UDim2.new(0,leftX,0,contentY),UDim2.new(0,leftW,0,panelH))
 local left=instance("ScrollingFrame",bg,{Position=UDim2.new(0,leftX,0,contentY),Size=UDim2.new(0,leftW,0,panelH),BackgroundColor3=C.panel,BorderSizePixel=0,ScrollBarThickness=4,ScrollingDirection=Enum.ScrollingDirection.Y,CanvasSize=UDim2.new(0,0,0,720)})
 corner(left,10)
 instance("UIGradient",left,{Rotation=90,Color=ColorSequence.new(Color3.fromRGB(255,255,255),Color3.fromRGB(233,233,233))})
 instance("UIStroke",left,{Thickness=1,Color=shade(C.panel,1.45),Transparency=.55})
 local center=instance("Frame",bg,{AnchorPoint=Vector2.new(.5,.5),Position=UDim2.new(0,centerX+centerW/2,0,contentY+panelH/2),Size=UDim2.new(0,centerW,0,panelH),BackgroundTransparency=1})
 shadow(bg,UDim2.new(0,rightX,0,contentY),UDim2.new(0,rightW,0,panelH))
 local right=frame(bg,UDim2.new(0,rightX,0,contentY),UDim2.new(0,rightW,0,panelH),C.panel)


 local botY
 label(left,variant=="four" and "FOUR-PLAYER FREE-FOR-ALL" or "STANDARD CHESS",UDim2.new(0,16,0,12),UDim2.new(1,-32,0,24),{color=C.muted,bold=true,textSize=12})
 if matchState and not resultData then
  local status=frame(left,UDim2.new(0,14,0,44),UDim2.new(1,-28,0,112),C.panel2)
  label(status,variant=="four" and "Four-Player match in progress" or "Chess match in progress",UDim2.new(0,12,0,10),UDim2.new(1,-24,0,34),{bold=true,align=Enum.TextXAlignment.Center,wrap=true,textSize=15})
  local sideText="You are playing as "..tostring(({w="White",b="Black",R="Red",B="Blue",Y="Yellow",G="Green"})[mySide] or mySide)
  if variant=="four" and matchState.eliminated and matchState.eliminated[mySide] then sideText=sideText.." · Eliminated — spectating" end
  label(status,sideText,UDim2.new(0,12,0,48),UDim2.new(1,-24,0,28),{color=C.muted,align=Enum.TextXAlignment.Center,textSize=13,wrap=true})
  button(left,"Leave match",UDim2.new(0,14,0,164),UDim2.new(1,-28,0,42),function() confirmVariant=variant; render() end,{color=C.red,name="LeaveMatch"})
 elseif searching then
  local status=frame(left,UDim2.new(0,14,0,44),UDim2.new(1,-28,0,112),C.panel2); label(status,searchText,UDim2.new(0,12,0,10),UDim2.new(1,-24,0,62),{bold=true,align=Enum.TextXAlignment.Center,wrap=true,textSize=15})
  button(status,"Cancel search",UDim2.new(.12,0,1,-38),UDim2.new(.76,0,0,30),function() Action:FireServer("cancelQueue",{}); searching=false; resultText="Search cancelled."; render() end,{color=C.red,name="CancelSearch"})
 else
  label(left,"TIME CONTROL",UDim2.new(0,16,0,38),UDim2.new(1,-32,0,16),{color=C.muted,textSize=12,bold=true})
  local timeSections={{"Bullet",{{"1 | 0",60,0},{"1 | 1",60,1},{"2 | 1",120,1}}},{"Blitz",{{"3 | 0",180,0},{"3 | 2",180,2},{"5 | 0",300,0}}},{"Rapid",{{"10 | 0",600,0},{"10 | 5",600,5},{"15 | 10",900,10}}}}
  for si,section in ipairs(timeSections) do
   local ry=58+(si-1)*36
   label(left,string.upper(section[1]),UDim2.new(0,14,0,ry),UDim2.new(0,44,0,30),{color=C.muted,textSize=11,bold=true,align=Enum.TextXAlignment.Center})
   local row=instance("Frame",left,{Position=UDim2.new(0,60,0,ry),Size=UDim2.new(1,-74,0,30),BackgroundTransparency=1})
   local w=(leftW-74)/3
   for oi,opt in ipairs(section[2]) do
    button(row,opt[1],UDim2.new(0,(oi-1)*w,0,0),UDim2.new(0,w-3,1,0),function() chooseTime(opt[1],opt[2],opt[3]) end,{color=timeControl.label==opt[1] and C.blue or C.panel2,textSize=11,name="Time"..si.."_"..oi,radius=5,quiet=true})
   end
  end
  button(left,"Challenge",UDim2.new(0,14,0,170),UDim2.new(1,-28,0,42),function() showChallenge=true; challengeSel={}; render() end,{color=C.panel2,name=variant=="four" and "ChallengeFour" or "ChallengeOnline",quiet=true})
  local y=222
  if variant=="four" and botExpanded then
   ratingControl(left,16,y,"BLUE BOT RATING",lineup.B,function(v) lineup.B=v; render() end)
   ratingControl(left,16,y+62,"YELLOW BOT RATING",lineup.Y,function(v) lineup.Y=v; render() end)
   ratingControl(left,16,y+124,"GREEN BOT RATING",lineup.G,function(v) lineup.G=v; render() end)
   y+=192
  elseif variant=="chess" and botExpanded then
   ratingControl(left,16,y,"BOT OPPONENT RATING",activeRating,function(v) activeRating=v; render() end)
   y+=68
  end
  button(left,botExpanded and "Start Match" or "Play Bots",UDim2.new(0,14,0,y),UDim2.new(1,-28,0,44),function() if botExpanded then startBot() else botExpanded=true; render() end end,{color=C.blue,bold=true,name="PlayBots"})
  botY=y+54
 end
 local dividerY=matchState and not resultData and 226 or (botY or 280)
 left.CanvasSize=UDim2.new(0,0,0,dividerY+180)
 instance("Frame",left,{Position=UDim2.new(0,14,0,dividerY),Size=UDim2.new(1,-28,0,1),BackgroundColor3=shade(C.teal,1.4),BorderSizePixel=0})
 local p=profile
 label(left,"Your ratings",UDim2.new(0,18,0,dividerY+10),UDim2.new(1,-36,0,23),{bold=true,textSize=15})
 label(left,"Chess Elo",UDim2.new(0,18,0,dividerY+33),UDim2.new(.55,0,0,20),{color=C.muted,textSize=13})
 label(left,p and tostring(p.chessElo) or "Loading…",UDim2.new(.62,0,0,dividerY+33),UDim2.new(.32,-12,0,20),{align=Enum.TextXAlignment.Right,bold=true,textSize=14})
 label(left,"4-Player Elo",UDim2.new(0,18,0,dividerY+53),UDim2.new(.55,0,0,20),{color=C.muted,textSize=13})
 label(left,p and tostring(p.fourElo) or "Loading…",UDim2.new(.62,0,0,dividerY+53),UDim2.new(.32,-12,0,20),{align=Enum.TextXAlignment.Right,bold=true,textSize=14})
 label(left,"Stored pieces",UDim2.new(0,18,0,dividerY+73),UDim2.new(.55,0,0,20),{color=C.muted,textSize=13})
 label(left,p and tostring(p.pieceStorage or 0) or "Loading…",UDim2.new(.62,0,0,dividerY+73),UDim2.new(.32,-12,0,20),{align=Enum.TextXAlignment.Right,bold=true,textSize=14,color=C.gold})
 local points=p and p.leaguePoints or 0; local tier,current,span=pointRange(points)
 label(left,tier.." League",UDim2.new(0,18,0,dividerY+96),UDim2.new(1,-36,0,20),{bold=true,textSize=13,color=C.gold})
 label(left,tostring(current).." / "..tostring(span).." points",UDim2.new(0,18,0,dividerY+116),UDim2.new(1,-36,0,18),{color=C.muted,textSize=12})
 local bar=instance("Frame",left,{Position=UDim2.new(0,18,0,dividerY+135),Size=UDim2.new(1,-36,0,9),BackgroundColor3=C.teal,BorderSizePixel=0}); corner(bar,5)
 local progress=instance("Frame",bar,{Size=UDim2.new(span>0 and math.clamp(current/span,0,1) or 0,0,1,0),BackgroundColor3=C.blue,BorderSizePixel=0}); corner(progress,5)
 local starLine
 if variant=="four" then
  local sB=p and p.botStars[tostring(lineup.B)] or 0; local sY=p and p.botStars[tostring(lineup.Y)] or 0; local sG=p and p.botStars[tostring(lineup.G)] or 0
  starLine=string.format("Best stars by Elo: B %d · Y %d · G %d",sB,sY,sG)
 else local best=p and p.botStars[tostring(activeRating)] or 0; starLine=string.format("Best vs %d Elo: %d / 3 stars",activeRating,best) end
 label(left,starLine,UDim2.new(0,18,0,dividerY+153),UDim2.new(1,-36,0,22),{color=C.muted,textSize=12,wrap=true})

 local boardState=matchState or (variant=="four" and initialFour() or initialChess()); local boardSize=math.max(240,math.floor(math.min(height-143,width*.48,680,centerW-20)))
 local boardHolder=instance("Frame",center,{AnchorPoint=Vector2.new(.5,.5),Position=UDim2.fromScale(.5,.49),Size=UDim2.new(0,boardSize+10,0,boardSize+10),BackgroundTransparency=1})
 renderBoard(boardHolder,boardSize,boardState,variant=="four")
 label(center,bottomStatusText(),UDim2.new(.08,0,1,-28),UDim2.new(.84,0,0,22),{color=matchState and matchState.status=="check" and C.red or C.muted,align=Enum.TextXAlignment.Center,bold=matchState~=nil,textSize=13})

 label(right,"MATCH",UDim2.new(0,14,0,12),UDim2.new(1,-28,0,22),{color=C.muted,bold=true,textSize=12})
 if matchState then
  local colors=variant=="four" and {"R","B","Y","G"} or {"b","w"}
  local y=40; local cardH=88
  local capTotals={}
  for _,c in ipairs(colors) do
   local caps={}; local val=0
   for _,mv in ipairs(matchState.history) do
    if mv.color==c and mv.captured then table.insert(caps,mv.captured); val+=(materialValues[string.sub(mv.captured,2,2)] or 0) end
   end
   capTotals[c]={caps=caps,val=val}
  end
  for _,c in ipairs(colors) do
   local card=frame(right,UDim2.new(0,10,0,y),UDim2.new(1,-20,0,cardH),C.panel2)
   local alive=not (matchState.eliminated and matchState.eliminated[c]); local active=matchState.turn==c
   instance("UIStroke",card,{Thickness=active and 2 or 1,Color=active and C.blue or shade(C.panel2,.6),Transparency=active and .15 or .45})
   label(card,(active and "●  " or "   ")..(matchState.players and matchState.players[c] or (c==mySide and player.DisplayName or (variant=="four" and (c.." player") or (c=="w" and "White" or "Black")))),UDim2.new(0,10,0,4),UDim2.new(1,-18,0,24),{bold=active,textSize=13,color=alive and (pieceColor[c] or C.text) or C.muted,truncate=true})
   local eloValue=matchState.ratings and matchState.ratings[c]; local eloLabel=eloValue and (tostring(eloValue).." Elo") or ""
   label(card,alive and (active and "To move" or eloLabel) or (matchState.eliminationReason and matchState.eliminationReason[c] or "Eliminated"),UDim2.new(0,10,0,29),UDim2.new(1,-78,0,18),{color=C.muted,textSize=12})
   if matchClocks and matchClocks[c] then clockLabels[c]=label(card,"3:00",UDim2.new(1,-68,0,26),UDim2.new(0,58,0,26),{align=Enum.TextXAlignment.Right,bold=true,textSize=16}) end
   local caps=capTotals[c].caps
   local bestOther=0
   for _,o in ipairs(colors) do if o~=c and capTotals[o].val>bestOther then bestOther=capTotals[o].val end end
   local lead=capTotals[c].val-bestOther
   local capLabel="Captured: "..#caps
   if lead>0 then capLabel=capLabel.."  ·  +"..lead end
   label(card,capLabel,UDim2.new(0,10,0,48),UDim2.new(1,-20,0,16),{color=lead>0 and C.gold or C.muted,textSize=12,bold=lead>0})
   local maxIcons=math.floor((rightW-44)/22)
   for i=1,math.min(#caps,maxIcons) do
    local pc=caps[i]; local side=string.sub(pc,1,1); local typ=string.sub(pc,2,2); local set=(side=="w" or side=="b") and side or "w"
    local tex=pieceImages[set] and pieceImages[set][typ]
    if tex then
     local img=instance("ImageLabel",card,{Position=UDim2.new(0,10+(i-1)*22,0,66),Size=UDim2.new(0,20,0,20),BackgroundTransparency=1,Image="rbxassetid://"..tex,ScaleType=Enum.ScaleType.Fit})
     if matchState.eliminated and matchState.eliminated[side] then img.ImageColor3=Color3.fromRGB(130,130,130)
     elseif side~="w" and side~="b" then img.ImageColor3=pieceColor[side] or Color3.new(1,1,1) end
    end
   end
   y+=cardH+6
  end
  label(right,"MOVE HISTORY",UDim2.new(0,14,0,y+2),UDim2.new(1,-28,0,22),{color=C.muted,bold=true,textSize=12})
  local historyTop=y+27; local historyHeight=math.max(85,panelH-historyTop-82)
  local hist=instance("ScrollingFrame",right,{Position=UDim2.new(0,10,0,historyTop),Size=UDim2.new(1,-20,0,historyHeight),BackgroundColor3=C.panel2,BorderSizePixel=0,CanvasSize=UDim2.new(0,0,0,math.ceil(#matchState.history/2)*24),ScrollBarThickness=4})
  local rowText={}; for i,m in ipairs(matchState.history) do local moveNo=math.ceil(i/(variant=="four" and 1 or 2)); table.insert(rowText,string.format("%d. %s  %s–%s%s",moveNo,m.color or "",m.from,m.to,m.captured and " ×" or "")) end
  label(hist,table.concat(rowText,"\n"),UDim2.new(0,7,0,4),UDim2.new(1,-14,0,math.max(34,#rowText*22)),{color=C.text,textSize=12,font=Enum.Font.Code,valign=Enum.TextYAlignment.Top,wrap=true})
  if matchMode=="bot" or matchMode=="fourBot" then button(right,"Undo",UDim2.new(0,10,1,-44),UDim2.new(.46,-5,0,34),function() Action:FireServer("undo",{}) end,{color=C.blueDark,name="Undo"}) end
  local myMoved=false; for _,mv in ipairs(matchState.history or {}) do if mv.color==mySide then myMoved=true break end end
  local canAbort=(matchMode=="online" or matchMode=="fourOnline") and not myMoved and not resultData and not (matchState.eliminated and matchState.eliminated[mySide])
  if canAbort then button(right,"Abort",UDim2.new(.52,0,1,-44),UDim2.new(.48,-10,0,34),function() Action:FireServer("abort",{}) end,{color=C.red,name="AbortBtn"})
  else button(right,"Resign",UDim2.new(.52,0,1,-44),UDim2.new(.48,-10,0,34),function() Action:FireServer("resign",{}) end,{color=C.red,name="Resign"}) end
 else
  local empty=frame(right,UDim2.new(0,10,0,40),UDim2.new(1,-20,0,252),C.panel2)
  local icon=instance("ImageLabel",empty,{AnchorPoint=Vector2.new(.5,0),Position=UDim2.new(.5,0,0,16),Size=UDim2.new(0,50,0,50),BackgroundTransparency=1,Image="rbxassetid://"..pieceImages.w.K,ImageTransparency=.55,ScaleType=Enum.ScaleType.Fit})
  label(empty,variant=="four" and "Four armies · Red, Blue, Yellow, Green" or "White vs Black",UDim2.new(0,14,0,74),UDim2.new(1,-28,0,40),{bold=true,wrap=true,textSize=14,align=Enum.TextXAlignment.Center})
  label(empty,"Select a mode above, then start a bot game or find players. Ratings and league points appear here after your profile loads.",UDim2.new(0,14,0,118),UDim2.new(1,-28,0,84),{color=C.muted,wrap=true,valign=Enum.TextYAlignment.Top,textSize=13,align=Enum.TextXAlignment.Center})
  label(empty,"League points change only after ranked 1v1 matches.",UDim2.new(0,14,0,204),UDim2.new(1,-28,0,40),{color=C.gold,wrap=true,valign=Enum.TextYAlignment.Top,textSize=12,align=Enum.TextXAlignment.Center})
 end
 else
  local contentY=64; local panelH=math.max(330,height-contentY-15)
  local mainX=.02*width; local mainW=width-mainX*2
  shadow(bg,UDim2.new(0,mainX,0,contentY),UDim2.new(0,mainW,0,panelH))
 local main=frame(bg,UDim2.new(0,mainX,0,contentY),UDim2.new(0,mainW,0,panelH),C.panel)
  if showShop then
   label(main,"BOARD SHOP",UDim2.new(0,24,0,18),UDim2.new(0,300,0,26),{color=C.muted,bold=true,textSize=13})
   label(main,(profile and tostring(profile.pieceStorage or 0) or "…").." stored pieces",UDim2.new(1,-24,0,18),UDim2.new(0,240,0,26),{color=C.gold,bold=true,textSize=15,align=Enum.TextXAlignment.Right})
   if shopNotice and os.clock()-shopNotice.ts<4 then label(main,shopNotice.text,UDim2.new(0,24,0,44),UDim2.new(1,-48,0,18),{color=C.red,textSize=13,bold=true}) end
   local themes=Themes and Themes.themes or {}
   local cellsPerRow=math.max(1,math.floor((mainW-48)/212))
   local list=instance("ScrollingFrame",main,{Position=UDim2.new(0,24,0,68),Size=UDim2.new(1,-48,1,-88),BackgroundColor3=C.panel2,BorderSizePixel=0,ScrollBarThickness=6,CanvasSize=UDim2.new(0,0,0,math.ceil(#themes/cellsPerRow)*192+16)})
   corner(list,8)
   instance("UIGridLayout",list,{CellSize=UDim2.new(0,202,0,182),CellPadding=UDim2.new(0,10,0,10),SortOrder=Enum.SortOrder.LayoutOrder})
   for i,theme in ipairs(themes) do
    local owned=profile and table.find(profile.ownedBoards or {},theme.id)~=nil
    themeCard(list,i,theme,owned,profile and profile.equippedBoard==theme.id,"shop")
   end
  elseif showBoards then
   label(main,"MY BOARDS",UDim2.new(0,24,0,18),UDim2.new(1,-48,0,26),{color=C.muted,bold=true,textSize=13})
   label(main,"Equip a board to change how the whole game looks.",UDim2.new(0,24,0,44),UDim2.new(1,-48,0,18),{color=C.muted,textSize=13})
   local ownedIds={}
   if profile and Themes then for _,id in ipairs(profile.ownedBoards or {}) do if Themes.get(id) then table.insert(ownedIds,id) end end end
   table.sort(ownedIds,function(a,b) return (Themes.get(a).price or 0)<(Themes.get(b).price or 0) end)
   local cellsPerRow=math.max(1,math.floor((mainW-48)/212))
   local list=instance("ScrollingFrame",main,{Position=UDim2.new(0,24,0,68),Size=UDim2.new(1,-48,1,-88),BackgroundColor3=C.panel2,BorderSizePixel=0,ScrollBarThickness=6,CanvasSize=UDim2.new(0,0,0,math.ceil(math.max(1,#ownedIds)/cellsPerRow)*192+16)})
   corner(list,8)
   instance("UIGridLayout",list,{CellSize=UDim2.new(0,202,0,182),CellPadding=UDim2.new(0,10,0,10),SortOrder=Enum.SortOrder.LayoutOrder})
   for i,id in ipairs(ownedIds) do
    themeCard(list,i,Themes.get(id),true,profile and profile.equippedBoard==id,"inventory")
   end
  else
   local hist=profile and profile.history or {}
   local rec=profileGame and hist[profileGame] or nil
   if not rec then
    label(main,"PROFILE",UDim2.new(0,24,0,18),UDim2.new(1,-48,0,26),{color=C.muted,bold=true,textSize=13})
    local stats=profile or {}
    local starTotal=0; if stats.botStars then for _,v in pairs(stats.botStars) do starTotal+=tonumber(v) or 0 end end
    local statDefs={{"Chess Elo",tostring(stats.chessElo or 1000)},{"4-Player Elo",tostring(stats.fourElo or 1000)},{"League",tostring(stats.league or "Soil").." · "..tostring(stats.leaguePoints or 0)},{"Piece Storage",tostring(stats.pieceStorage or 0)},{"Bot Stars",tostring(starTotal)}}
    local statRow=instance("Frame",main,{Position=UDim2.new(0,24,0,52),Size=UDim2.new(1,-48,0,72),BackgroundTransparency=1})
    for i,def in ipairs(statDefs) do
     local stat=frame(statRow,UDim2.new((i-1)/#statDefs,6,0,0),UDim2.new(1/#statDefs,-12,1,0),C.panel2)
     instance("UIStroke",stat,{Thickness=1,Color=shade(C.panel2,.6),Transparency=.45})
     label(stat,def[1],UDim2.new(0,10,0,8),UDim2.new(1,-20,0,16),{color=C.muted,textSize=12,bold=true})
     label(stat,def[2],UDim2.new(0,10,0,28),UDim2.new(1,-20,0,30),{bold=true,textSize=18,color=C.gold})
    end
    label(main,"GAME HISTORY",UDim2.new(0,24,0,140),UDim2.new(1,-48,0,22),{color=C.muted,bold=true,textSize=12})
    local list=instance("ScrollingFrame",main,{Position=UDim2.new(0,24,0,166),Size=UDim2.new(1,-48,1,-186),BackgroundColor3=C.panel2,BorderSizePixel=0,CanvasSize=UDim2.new(0,0,0,math.max(1,#hist)*46),ScrollBarThickness=6})
    if #hist==0 then
     local emptyWrap=frame(list,UDim2.new(0,6,0,4),UDim2.new(1,-12,0,140),C.panel)
     local hkIcon=instance("ImageLabel",emptyWrap,{AnchorPoint=Vector2.new(.5,0),Position=UDim2.new(.5,0,0,14),Size=UDim2.new(0,44,0,44),BackgroundTransparency=1,Image="rbxassetid://"..pieceImages.b.K,ImageTransparency=.55,ScaleType=Enum.ScaleType.Fit})
     label(emptyWrap,"No games recorded yet",UDim2.new(0,12,0,64),UDim2.new(1,-24,0,24),{bold=true,align=Enum.TextXAlignment.Center,textSize=16})
     label(emptyWrap,"Finish a match to build your history — wins, losses, and replays will appear here.",UDim2.new(0,16,0,92),UDim2.new(1,-32,0,40),{color=C.muted,align=Enum.TextXAlignment.Center,textSize=13,wrap=true})
    end
    for i,h in ipairs(hist) do
     local rw=frame(list,UDim2.new(0,6,0,(i-1)*46+4),UDim2.new(1,-12,0,42),C.panel)
     instance("UIStroke",rw,{Thickness=1,Color=shade(C.panel,.6),Transparency=.45})
     local dt=os.time()-(h.ts or os.time()); local when="just now"
     if dt>=86400 then when=math.floor(dt/86400).."d ago" elseif dt>=3600 then when=math.floor(dt/3600).."h ago" elseif dt>=60 then when=math.floor(dt/60).."m ago" end
     local placeNames={[1]="1st",[2]="2nd",[3]="3rd",[4]="4th"}
     local res=h.place and (placeNames[h.place] or tostring(h.place)) or (h.result=="win" and "Win" or h.result=="loss" and "Loss" or "Draw")
     local resColor=h.place and (h.place==1 and C.green or h.place==4 and C.red or C.gold) or (h.result=="win" and C.green or h.result=="loss" and C.red or C.gold)
     local modeLabel=h.mode=="bot" and "Bot" or h.mode=="fourBot" and "4P Bots" or "Online"
     label(rw,(h.v=="four" and "4-Player" or "Chess").." · "..modeLabel.." · vs "..(h.opp~="" and h.opp or "—"),UDim2.new(0,12,0,4),UDim2.new(1,-210,0,16),{textSize=13,bold=true,truncate=true})
     label(rw,res.." · "..tostring(h.reason or "").." · "..when,UDim2.new(0,12,0,21),UDim2.new(1,-210,0,15),{textSize=12,color=resColor,truncate=true})
     local watch=button(rw,"Watch",UDim2.new(1,-100,0,7),UDim2.new(0,92,0,28),function() profileGame=i; replayIndex=0; render() end,{textSize=13,color=C.blueDark,name="WatchGame"..i})
    end
   else
    local moves=rec.moves or {}
    local base=rec.v=="four" and initialFour() or initialChess()
    local board={}; for k,v in pairs(base.board) do board[k]=v end
    local lastMove=nil
    for i=1,math.min(replayIndex,#moves) do
     local mv=moves[i]; local piece=board[mv.f]
     if piece then board[mv.f]=nil; board[mv.t]=mv.p and (string.sub(piece,1,1)..mv.p) or piece; lastMove={from=mv.f,to=mv.t} end
    end
    local viewState={board=board,turn=base.turn,history=moves,lastMove=replayIndex>0 and lastMove or nil,status="preview",eliminated=rec.v=="four" and {} or nil}
    local back=button(main,"← History",UDim2.new(0,20,0,16),UDim2.new(0,110,0,32),function() profileGame=nil; render() end,{textSize=12,color=C.panel2,name="BackToHistory"})
    label(main,(rec.v=="four" and "4-Player" or "Chess").." · "..tostring(#moves).." moves · "..tostring(rec.reason or ""),UDim2.new(0,140,0,18),UDim2.new(1,-160,0,28),{color=C.muted,align=Enum.TextXAlignment.Center,textSize=14,bold=true,truncate=true})
    local boardSize=math.max(240,math.floor(math.min(panelH-210,mainW-120,640)))
    local boardHolder=instance("Frame",main,{AnchorPoint=Vector2.new(.5,.5),Position=UDim2.fromScale(.5,.47),Size=UDim2.new(0,boardSize+10,0,boardSize+10),BackgroundTransparency=1})
    renderBoard(boardHolder,boardSize,viewState,rec.v=="four",true)
    label(main,"Move "..tostring(replayIndex).." / "..tostring(#moves),UDim2.new(0,24,1,-96),UDim2.new(1,-48,0,24),{align=Enum.TextXAlignment.Center,bold=true,textSize=18})
    local prev=button(main,"◀  Prev",UDim2.new(.5,-182,1,-62),UDim2.new(0,172,0,40),function() replayIndex=math.max(0,replayIndex-1); render() end,{name="ReplayPrev"})
    local next=button(main,"Next  ▶",UDim2.new(.5,10,1,-62),UDim2.new(0,172,0,40),function() replayIndex=math.min(#moves,replayIndex+1); render() end,{name="ReplayNext"})
   end
  end
 end
 if showChallenge then
  local overlay=instance("Frame",bg,{Size=UDim2.fromScale(1,1),BackgroundColor3=Color3.new(0,0,0),BackgroundTransparency=.35,ZIndex=30})
  local isFour=variant=="four"
  shadow(overlay,UDim2.new(.5,-190,.5,-185),UDim2.new(0,380,0,370),31)
  local modal=frame(overlay,UDim2.new(.5,-190,.5,-185),UDim2.new(0,380,0,370),C.panel); modal.ZIndex=31
  label(modal,isFour and "Challenge players" or "Challenge a player",UDim2.new(0,18,0,16),UDim2.new(1,-36,0,32),{bold=true,textSize=20})
  label(modal,isFour and "Select 4 or more players to challenge" or "Select 1 player to challenge",UDim2.new(0,18,0,48),UDim2.new(1,-36,0,20),{color=C.muted,textSize=13})
  local others={}; for _,o in ipairs(Players:GetPlayers()) do if o~=player then table.insert(others,o) end end
  local count=0; for _ in pairs(challengeSel) do count+=1 end
  local valid=not isFour and count==1 or isFour and count>=4
  local pl=instance("ScrollingFrame",modal,{Position=UDim2.new(0,16,0,74),Size=UDim2.new(1,-32,0,190),BackgroundColor3=C.panel2,BorderSizePixel=0,CanvasSize=UDim2.new(0,0,0,math.max(1,#others)*38),ScrollBarThickness=4}); pl.ZIndex=32
  for i,o in ipairs(others) do
   local sel=challengeSel[o.UserId] and true or false
   local row=button(pl,(sel and "✓  " or "")..o.DisplayName,UDim2.new(0,8,0,(i-1)*38),UDim2.new(1,-16,0,34),function()
    if challengeSel[o.UserId] then challengeSel[o.UserId]=nil
    elseif isFour then challengeSel[o.UserId]=true
    else challengeSel={}; challengeSel[o.UserId]=true end
    render()
   end,{color=sel and C.blue or C.panel2,textSize=13,name="Pick"..tostring(o.UserId)}); row.ZIndex=33
  end
  if #others==0 then label(pl,"No other players are in this server.",UDim2.new(0,10,0,6),UDim2.new(1,-20,0,30),{color=C.muted,textSize=13}).ZIndex=33 end
  local cb=button(modal,"Challenge",UDim2.new(0,18,1,-56),UDim2.new(.5,-26,0,40),function()
   if not valid then return end
   showChallenge=false
   local ids={}; for id in pairs(challengeSel) do table.insert(ids,id) end
   if isFour then
    searching=true; searchText="Waiting for players (1/4)…"
    Action:FireServer("challenge",{userIds=ids,baseSeconds=timeControl.baseSeconds,increment=timeControl.increment})
   else
    local target; for _,o in ipairs(others) do if challengeSel[o.UserId] then target=o end end
    searching=true; searchText="Waiting for "..(target and target.DisplayName or "player").." to accept…"
    Action:FireServer("challenge",{userId=ids[1],baseSeconds=timeControl.baseSeconds,increment=timeControl.increment})
   end
   render()
  end,{color=valid and C.blue or shade(C.panel2,.75),textColor=valid and C.text or C.muted,bold=true,name="SendChallenge"}); cb.ZIndex=33
  local closeB=button(modal,"Close",UDim2.new(.5,8,1,-56),UDim2.new(.5,-26,0,40),function() showChallenge=false; render() end,{color=C.panel2,name="CloseChallenge"}); closeB.ZIndex=33
 end
 if challengeOffer then
  shadow(bg,UDim2.new(.5,-190,0,60),UDim2.new(0,380,0,40),25)
  local bar=frame(bg,UDim2.new(.5,-190,0,60),UDim2.new(0,380,0,40),C.panel); bar.ZIndex=25; bar.Active=true
  instance("UIStroke",bar,{Thickness=1,Color=C.green,Transparency=.4})
  label(bar,challengeOffer.name..(challengeOffer.mode=="fourOnline" and " challenges you to a 4-player match" or " challenges you to a match"),UDim2.new(0,12,0,0),UDim2.new(1,-190,1,0),{textSize=12,truncate=true,bold=true}).ZIndex=26
  local acc=button(bar,"Accept",UDim2.new(1,-178,0,5),UDim2.new(0,84,0,30),function() Action:FireServer("challengeRespond",{accept=true}); challengeOffer=nil; render() end,{textSize=12,name="AcceptChallenge"}); acc.ZIndex=26
  local dec=button(bar,"Decline",UDim2.new(1,-90,0,5),UDim2.new(0,80,0,30),function() Action:FireServer("challengeRespond",{accept=false}); challengeOffer=nil; render() end,{textSize=12,color=C.red,name="DeclineChallenge"}); dec.ZIndex=26
 end
 if promoPicker then
  local pp=promoPicker
  local overlay=instance("TextButton",bg,{Size=UDim2.fromScale(1,1),BackgroundColor3=Color3.new(0,0,0),BackgroundTransparency=.45,Text="",AutoButtonColor=false,ZIndex=45,BorderSizePixel=0})
  shadow(bg,UDim2.new(.5,-210,.5,-130),UDim2.new(0,420,0,260),46)
  local modal=frame(bg,UDim2.new(.5,-210,.5,-130),UDim2.new(0,420,0,260),C.panel); modal.ZIndex=46; modal.Active=true
  instance("UIStroke",modal,{Thickness=2,Color=C.gold,Transparency=.25})
  label(modal,"Promote your pawn",UDim2.new(0,18,0,14),UDim2.new(1,-36,0,30),{bold=true,textSize=20,align=Enum.TextXAlignment.Center}).ZIndex=47
  local set=(mySide=="w" or mySide=="b") and mySide or "w"
  for i,def in ipairs({{"Q","Queen"},{"R","Rook"},{"B","Bishop"},{"N","Knight"}}) do
   local promoPos=UDim2.new(0,26+(i-1)*98,0,58)
   local b=instance("TextButton",modal,{Position=promoPos,Size=UDim2.new(0,88,0,150),BackgroundColor3=C.panel2,Text="",AutoButtonColor=false,BorderSizePixel=0,ZIndex=47}); corner(b,10)
   instance("UIStroke",b,{Thickness=1,Color=shade(C.panel2,.6),Transparency=.4})
   tactile(b,C.panel2,true,promoPos)
   local img=instance("ImageLabel",b,{Position=UDim2.new(0,10,0,10),Size=UDim2.new(1,-20,0,88),BackgroundTransparency=1,Image="rbxassetid://"..(pieceImages[set] and pieceImages[set][def[1]] or ""),ScaleType=Enum.ScaleType.Fit,ZIndex=48})
   if mySide~="w" and mySide~="b" then img.ImageColor3=pieceColor[mySide] or Color3.new(1,1,1) end
   label(b,def[2],UDim2.new(0,4,1,-38),UDim2.new(1,-8,0,26),{align=Enum.TextXAlignment.Center,bold=true,textSize=13}).ZIndex=48
   local letter=def[1]; local pFrom,pTo,pPre=pp.from,pp.to,pp.premove and true or false
   b.Activated:Connect(function()
    sound("Button Click")
    promoPicker=nil
    if pPre then table.insert(premoves,{from=pFrom,to=pTo,promotion=letter}); sound("Move")
    else Action:FireServer("move",{from=pFrom,to=pTo,promotion=letter}); selected=nil; legal={}; marks={}; premoves={} end
    render()
   end)
  end
  label(modal,"Click outside to cancel the move",UDim2.new(0,18,1,-34),UDim2.new(1,-36,0,22),{color=C.muted,align=Enum.TextXAlignment.Center,textSize=12}).ZIndex=47
  overlay.Activated:Connect(function()
   if os.clock()-promoOpenedAt<.3 then return end
   local mp=UIS:GetMouseLocation(); local a=modal.AbsolutePosition; local s=modal.AbsoluteSize
   if mp.X>=a.X-12 and mp.X<=a.X+s.X+12 and mp.Y>=a.Y-12 and mp.Y<=a.Y+s.Y+12 then return end
   promoPicker=nil; render()
  end)
 end
 if resultData and matchState and not resultDismissed then
  local overlay=instance("TextButton",bg,{Size=UDim2.fromScale(1,1),BackgroundColor3=Color3.new(0,0,0),BackgroundTransparency=.35,Text="",AutoButtonColor=false,ZIndex=49,BorderSizePixel=0})
  local won=resultData.result=="win"; local draw=resultData.result=="draw"; local aborted=resultData.result=="aborted"
  local title=won and "Victory!" or draw and "Stalemate" or aborted and "Match Aborted" or "You Lost"
  local col=won and C.green or draw and C.gold or aborted and C.muted or C.red
  shadow(bg,UDim2.new(.5,-190,.5,-120),UDim2.new(0,380,0,240),50)
  local modal=frame(bg,UDim2.new(.5,-190,.5,-120),UDim2.new(0,380,0,240),C.panel); modal.ZIndex=50; modal.Active=true
  instance("UIStroke",modal,{Thickness=2,Color=col,Transparency=.2})
  label(modal,title,UDim2.new(0,18,0,22),UDim2.new(1,-36,0,46),{bold=true,textSize=30,align=Enum.TextXAlignment.Center,color=col}).ZIndex=51
  local sub=tostring(resultData.reason or "")
  if resultData.stars and resultData.stars>0 then sub=sub.."   "..string.rep("★",resultData.stars)..string.rep("☆",3-resultData.stars); if resultData.improved then sub=sub.."  New best" end end
  label(modal,sub,UDim2.new(0,18,0,78),UDim2.new(1,-36,0,22),{color=C.muted,align=Enum.TextXAlignment.Center,textSize=14}).ZIndex=51
  local canRematch=matchMode=="bot" or matchMode=="fourBot" or matchMode=="online" or matchMode=="fourOnline"
  if canRematch then
   if rematchPending then
    local cxl=button(modal,"Cancel",UDim2.new(0,18,1,-104),UDim2.new(.5,-26,0,36),function() rematchPending=false; Action:FireServer("rematchCancel",{}); render() end,{color=C.panel2,textColor=C.text,name="CancelRematch"}); cxl.ZIndex=51
   else
    local rem=button(modal,"Rematch",UDim2.new(0,18,1,-104),UDim2.new(.5,-26,0,36),function() rematchPending=(matchMode=="online" or matchMode=="fourOnline"); Action:FireServer("rematch",{}); render() end,{name="RematchBtn"}); rem.ZIndex=51
   end
   local nb=button(modal,"New Match",UDim2.new(.5,8,1,-104),UDim2.new(.5,-26,0,36),function() matchState=nil; matchMode=nil; resultData=nil; resultText=nil; rematchOffer=nil; selected=nil; legal={}; render() end,{color=C.panel2,textColor=C.text,name="NewMatchBtn"}); nb.ZIndex=51
  else
   local nb=button(modal,"New Match",UDim2.new(0,18,1,-104),UDim2.new(1,-36,0,36),function() matchState=nil; matchMode=nil; resultData=nil; resultText=nil; rematchOffer=nil; selected=nil; legal={}; render() end,{name="NewMatchBtn2"}); nb.ZIndex=51
  end
  label(modal,"Click outside to view the board",UDim2.new(0,18,1,-54),UDim2.new(1,-36,0,20),{color=C.muted,align=Enum.TextXAlignment.Center,textSize=12}).ZIndex=51
  overlay.Activated:Connect(function()
   local mp=UIS:GetMouseLocation(); local a=modal.AbsolutePosition; local s=modal.AbsoluteSize
   if mp.X>=a.X-12 and mp.X<=a.X+s.X+12 and mp.Y>=a.Y-12 and mp.Y<=a.Y+s.Y+12 then return end
   resultDismissed=true; render()
  end)
 end
 if resultData and matchState and resultDismissed then
  shadow(bg,UDim2.new(.5,-215,0,60),UDim2.new(0,430,0,40),25)
  local bar=frame(bg,UDim2.new(.5,-215,0,60),UDim2.new(0,430,0,40),C.panel); bar.ZIndex=25; bar.Active=true
  instance("UIStroke",bar,{Thickness=1,Color=C.gold,Transparency=.4})
  local barText=(rematchPending and "Waiting for opponent… · " or rematchDeclined and "Rematch declined · " or "")..(resultText or "Match over")
  label(bar,barText,UDim2.new(0,12,0,0),UDim2.new(1,-190,1,0),{textSize=12,truncate=true}).ZIndex=26
  if (matchMode=="bot" or matchMode=="fourBot" or matchMode=="online" or matchMode=="fourOnline") then
   if rematchPending then
    local cxl=button(bar,"Cancel",UDim2.new(1,-178,0,5),UDim2.new(0,84,0,30),function() rematchPending=false; Action:FireServer("rematchCancel",{}); render() end,{textSize=12,color=C.panel2,textColor=C.text,name="CancelRematchBar"}); cxl.ZIndex=26
   else
    local rem=button(bar,"Rematch",UDim2.new(1,-178,0,5),UDim2.new(0,84,0,30),function() rematchPending=(matchMode=="online" or matchMode=="fourOnline"); Action:FireServer("rematch",{}); render() end,{textSize=12,name="RematchBar"}); rem.ZIndex=26
   end
  end
  local nb=button(bar,"New Match",UDim2.new(1,-90,0,5),UDim2.new(0,80,0,30),function() matchState=nil; matchMode=nil; resultData=nil; resultText=nil; rematchOffer=nil; selected=nil; legal={}; render() end,{textSize=12,color=C.panel2,textColor=C.text,name="NewMatchBar"}); nb.ZIndex=26
 end
 if rematchOffer then
  shadow(bg,UDim2.new(.5,-190,0,60),UDim2.new(0,380,0,40),25)
  local bar=frame(bg,UDim2.new(.5,-190,0,60),UDim2.new(0,380,0,40),C.panel); bar.ZIndex=25; bar.Active=true
  instance("UIStroke",bar,{Thickness=1,Color=C.green,Transparency=.4})
  label(bar,rematchOffer.name.." wants to rematch",UDim2.new(0,12,0,0),UDim2.new(1,-190,1,0),{textSize=12,truncate=true,bold=true}).ZIndex=26
  local acc=button(bar,"Accept",UDim2.new(1,-178,0,5),UDim2.new(0,84,0,30),function() Action:FireServer("rematchRespond",{accept=true}); rematchOffer=nil; render() end,{textSize=12,name="AcceptRematch"}); acc.ZIndex=26
  local dec=button(bar,"Decline",UDim2.new(1,-90,0,5),UDim2.new(0,80,0,30),function() Action:FireServer("rematchRespond",{accept=false}); rematchOffer=nil; render() end,{textSize=12,color=C.red,name="DeclineRematch"}); dec.ZIndex=26
 end
 if elimPrompt and matchState and matchState.eliminated and matchState.eliminated[mySide] then
  local overlay=instance("Frame",bg,{Size=UDim2.fromScale(1,1),BackgroundColor3=Color3.new(0,0,0),BackgroundTransparency=.35,ZIndex=40})
  shadow(overlay,UDim2.new(.5,-190,.5,-115),UDim2.new(0,380,0,230),41)
  local modal=frame(overlay,UDim2.new(.5,-190,.5,-115),UDim2.new(0,380,0,230),C.panel); modal.ZIndex=41
  instance("UIStroke",modal,{Thickness=2,Color=C.gold,Transparency=.25})
  local headline=elimPrompt=="Checkmate" and "You have been checkmated!" or elimPrompt=="Stalemate" and "You have no legal moves." or "You have been eliminated."
  label(modal,headline,UDim2.new(0,18,0,18),UDim2.new(1,-36,0,30),{bold=true,align=Enum.TextXAlignment.Center,textSize=19}).ZIndex=42
  label(modal,"Your pieces stay on the board but can no longer move. Stay to watch the rest of the match, or leave to start a new game.",UDim2.new(0,24,0,52),UDim2.new(1,-48,0,58),{color=C.muted,wrap=true,align=Enum.TextXAlignment.Center,valign=Enum.TextYAlignment.Top,textSize=13}).ZIndex=42
  local spec=button(modal,"Spectate match",UDim2.new(0,18,1,-58),UDim2.new(.43,-7,0,40),function() elimPrompt=nil; render() end,{color=C.blueDark,textColor=C.text,bold=true,name="SpectateMatch"}); spec.ZIndex=42
  local leave=button(modal,"Leave match",UDim2.new(.53,0,1,-58),UDim2.new(.47,-18,0,40),function() Action:FireServer("leave",{}); elimPrompt=nil; matchState=nil; matchMode=nil; matchClocks=nil; selected=nil; legal={}; marks={}; premoves={}; render() end,{color=C.red,name="LeaveEliminated"}); leave.ZIndex=42
 end
 if confirmVariant then
  local overlay=instance("Frame",bg,{Size=UDim2.fromScale(1,1),BackgroundColor3=Color3.new(0,0,0),BackgroundTransparency=.35,ZIndex=40})
  shadow(overlay,UDim2.new(.5,-190,.5,-94),UDim2.new(0,380,0,188),41)
  local modal=frame(overlay,UDim2.new(.5,-190,.5,-94),UDim2.new(0,380,0,188),C.panel); modal.ZIndex=41
  instance("UIStroke",modal,{Thickness=2,Color=C.green,Transparency=.25})
  local title=label(modal,confirmVariant==variant and "Leave this match and start a new game?" or "Leave this match and switch boards?",UDim2.new(0,18,0,20),UDim2.new(1,-36,0,66),{bold=true,wrap=true,align=Enum.TextXAlignment.Center,textSize=18}); title.ZIndex=42
  local stay=button(modal,"Stay",UDim2.new(0,18,1,-58),UDim2.new(.43,-7,0,40),function() confirmVariant=nil; render() end,{color=C.panel2,textColor=C.text,bold=true,name="StayInMatch"}); stay.ZIndex=42; instance("UIStroke",stay,{Thickness=1,Color=C.muted,Transparency=.3})
  local leave=button(modal,confirmVariant==variant and "Leave match" or "Leave and switch",UDim2.new(.53,0,1,-58),UDim2.new(.47,-18,0,40),function() Action:FireServer("leave",{}); variant=confirmVariant; confirmVariant=nil; matchState=nil; matchMode=nil; matchClocks=nil; selected=nil; legal={}; marks={}; premoves={}; render() end,{color=C.red,name="ConfirmSwitch"}); leave.ZIndex=42; instance("UIStroke",leave,{Thickness=1,Color=C.text,Transparency=.6})
 end
end
Update.OnClientEvent:Connect(function(kind,data)
 if kind=="profile" then
  if Themes and data and data.equippedBoard and data.equippedBoard~=currentThemeId then applyTheme(data.equippedBoard) end
  profile=data; render()
 elseif kind=="boardPurchase" then
  if data and data.ok==false then shopNotice={text=tostring(data.reason or "Purchase failed"),ts=os.clock()}; render() end
 elseif kind=="state" then
  if currentMatch==data.matchId and matchState and data.state and #data.state.history>#matchState.history then
   local last=data.state.history[#data.state.history]; sound(last and last.captured and "Capture" or "Move")
   local checkNow=false
   if data.variant=="four" then
    local prev={}; if matchState.checkedColors then for _,c in ipairs(matchState.checkedColors) do prev[c]=true end end
    if data.state.checkedColors then for _,c in ipairs(data.state.checkedColors) do if not prev[c] then checkNow=true break end end end
   elseif data.state.status=="check" then checkNow=true end
   if checkNow then sound("Check") end
  end
  local keep=nil
  if selected and data.state and data.state.board and data.state.board[selected] and data.side and string.sub(data.state.board[selected],1,1)==data.side then keep=selected end
  if currentMatch and data.matchId~=currentMatch then marks={}; premoves={}; promoPicker=nil; resultData=nil; resultDismissed=false; rematchOffer=nil; rematchPending=false; rematchDeclined=false; resultText=nil end
  matchState=data.state; matchMode=data.mode; variant=data.variant or "chess"; currentMatch=data.matchId; mySide=data.side; matchClocks=data.clocks; turnStarted=data.turnStarted; selected=keep; legal={}; searching=false
  if data.variant=="four" and data.state and data.state.eliminated and data.state.eliminated[data.side] and elimPromptDone~=data.matchId then
   elimPrompt=(data.state.eliminationReason and data.state.eliminationReason[data.side]) or "Eliminated"; elimPromptDone=data.matchId
  end
  render()
  if keep then Action:FireServer("legal",{from=keep}) end
  if dragging and dragging.premove then
   local b=data.state and data.state.board
   if data.state.turn==data.side and b and b[dragging.from] and string.sub(b[dragging.from],1,1)==data.side then
    dragging.premove=false; selected=dragging.from; legal={}; Action:FireServer("legal",{from=dragging.from}); render()
   elseif not (b and b[dragging.from]) then
    if dragging.ghost then dragging.ghost:Destroy() end; dragging=nil
   end
  end
  if #premoves>0 and data.state.turn==data.side and not dragging then
   local pm=premoves[1]
   local b=data.state.board
   local piece=b and b[pm.from]
   local target=b and b[pm.to]
   local ok=piece and string.sub(piece,1,1)==data.side
   if ok and target and string.sub(target,1,1)==data.side then ok=false end
   if ok and pm.captureOnly then ok=target~=nil and string.sub(target,1,1)~=data.side end
   if ok then
    table.remove(premoves,1)
    Action:FireServer("move",{from=pm.from,to=pm.to,promotion=pm.promotion or "Q"})
   else
    premoves={}
   end
   render()
  end
 elseif kind=="legal" then legal={}; for _,m in ipairs(data.moves) do legal[m.to]=m.promotion or true end; render()
 elseif kind=="reject" then selected=nil; legal={}; premoves={}; render()
 elseif kind=="queued" then searching=true; searchText=variant=="four" and ("Waiting for players ("..tostring(data.players).."/4)…") or "Searching for an opponent…"; render()
 elseif kind=="queueCancelled" then searching=false; searchText="Search cancelled."; resultText=searchText; render()
 elseif kind=="challengeOffer" then challengeOffer={name=tostring(data and data.name or "Player"),mode=data and data.mode or "online"}; render()
 elseif kind=="challengeDeclined" then challengeOffer=nil; searching=false; resultText="Challenge declined."; render()
 elseif kind=="challengeWait" then searching=true; searchText="Waiting for players ("..tostring(data and data.count or 1).."/4)…"; render()
 elseif kind=="result" then
  if currentMatch and data.matchId and currentMatch~=data.matchId then return end
  local aborted=data.result=="aborted"; if not aborted then sound(data.result=="win" and "Win" or data.result=="draw" and "Stalemate" or "Loss") end; searching=false; matchClocks=nil; premoves={}; marks={}; promoPicker=nil; local message=aborted and "Match aborted" or data.result=="win" and "You won" or data.result=="draw" and "Draw" or "You lost"; resultText=message.." · "..tostring(data.reason); if data.stars and data.stars>0 then resultText=resultText.." · "..string.rep("★",data.stars)..string.rep("☆",3-data.stars); if data.improved then resultText=resultText.." · New best" end end; if data.final then resultData=data; resultDismissed=false; rematchPending=false; rematchDeclined=false else matchState=nil end; render()
 elseif kind=="fart" then sound("Fart")
 elseif kind=="rematchOffer" then rematchOffer={name=tostring(data and data.name or "Opponent")}; render()
 elseif kind=="rematchDeclined" then rematchPending=false; rematchDeclined=true; rematchOffer=nil; render()
 elseif kind=="undoState" then selected=nil; legal={}; premoves={}; render() end
end)
Action:FireServer("profile",{})
render()
pickMusic()
gui:GetPropertyChangedSignal("AbsoluteSize"):Connect(function() task.defer(render) end)
task.spawn(function()
 while gui.Parent do
  task.wait(.2)
  if matchClocks and (matchMode=="online" or matchMode=="fourOnline") and matchState then
   local now=workspace:GetServerTimeNow()
   local elapsed=turnStarted and math.max(0,now-turnStarted) or 0
   for side,clockLabel in pairs(clockLabels) do
    local value=matchClocks[side] or 0
    if side==matchState.turn then
     local moved=false; for _,mv in ipairs(matchState.history or {}) do if mv.color==side then moved=true break end end
     if not moved and turnStarted and turnStarted>now then value=turnStarted-now else value-=elapsed end
    end
    if clockLabel and clockLabel.Parent then clockLabel.Text=formatClock(value) end
   end
  end
 end
end)
