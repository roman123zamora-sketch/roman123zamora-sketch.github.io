-- Shared board skins. Stable IDs preserve ownership and equipped preferences.
local ThemeLibrary={}

local function rgb(r,g,b) return Color3.fromRGB(r,g,b) end

ThemeLibrary.themes={
	{id="classic",name="Blue",price=0,
		board={light=rgb(236,246,255),dark=rgb(127,165,204),frame=rgb(50,78,112),stroke=rgb(73,107,144)}},
	{id="forest",name="Green",price=135,
		board={light=rgb(232,229,215),dark=rgb(125,139,112),frame=rgb(10,26,16),stroke=rgb(40,100,60)},
		ui={bg=rgb(9,20,13),top=rgb(13,30,19),panel=rgb(18,44,27),panel2=rgb(14,35,22),muted=rgb(150,190,162),blue=rgb(80,180,110),blueDark=rgb(38,104,62),teal=rgb(28,72,45),green=rgb(90,200,125),gold=rgb(210,190,100)}},
	{id="walnut",name="Brown",price=15,
		board={light=rgb(233,218,194),dark=rgb(151,119,92),frame=rgb(48,33,22),stroke=rgb(110,76,50)},
		ui={bg=rgb(26,19,13),top=rgb(38,27,19),panel=rgb(54,38,26),panel2=rgb(42,30,21),muted=rgb(196,168,140),blue=rgb(196,140,86),blueDark=rgb(128,88,52),teal=rgb(84,58,38),green=rgb(210,160,100),gold=rgb(232,196,120)}},
	{id="slate",name="Gray",price=45,
		board={light=rgb(228,227,223),dark=rgb(119,120,115),frame=rgb(28,30,36),stroke=rgb(80,86,98)},
		ui={bg=rgb(20,22,26),top=rgb(29,32,38),panel=rgb(41,45,53),panel2=rgb(32,35,42),muted=rgb(172,178,190),blue=rgb(130,150,175),blueDark=rgb(70,88,110),teal=rgb(52,58,70),green=rgb(150,170,195),gold=rgb(205,212,224)}},
	{id="duskEmber",name="Orange",price=50,
		board={light=rgb(236,220,209),dark=rgb(164,117,101),frame=rgb(20,28,48),stroke=rgb(90,110,165)},
		ui={bg=rgb(18,22,36),top=rgb(27,32,50),panel=rgb(39,46,70),panel2=rgb(30,36,56),muted=rgb(180,180,208),blue=rgb(240,160,96),blueDark=rgb(160,96,52),teal=rgb(58,70,102),green=rgb(250,180,110),gold=rgb(255,200,120)}},
	{id="lavenderMilk",name="Purple",price=20,
		board={light=rgb(232,224,233),dark=rgb(139,116,141),frame=rgb(40,26,66),stroke=rgb(112,72,160)},
		ui={bg=rgb(26,20,34),top=rgb(38,29,49),panel=rgb(54,41,69),panel2=rgb(42,32,54),muted=rgb(204,186,222),blue=rgb(176,138,220),blueDark=rgb(110,82,152),teal=rgb(76,58,106),green=rgb(196,160,238),gold=rgb(228,204,150)}},
	{id="sandstorm",name="Olive",price=60,
		board={light=rgb(234,228,201),dark=rgb(137,132,84),frame=rgb(46,38,24),stroke=rgb(140,112,64)},
		ui={bg=rgb(30,25,15),top=rgb(44,36,21),panel=rgb(62,51,29),panel2=rgb(48,40,24),muted=rgb(206,180,136),blue=rgb(206,170,96),blueDark=rgb(136,110,60),teal=rgb(92,76,44),green=rgb(220,190,115),gold=rgb(240,210,130)}},
	{id="rosewood",name="Pink",price=75,
		board={light=rgb(239,223,226),dark=rgb(156,115,125),frame=rgb(46,24,32),stroke=rgb(150,80,100)},
		ui={bg=rgb(26,16,20),top=rgb(38,24,29),panel=rgb(54,34,41),panel2=rgb(42,26,32),muted=rgb(208,168,180),blue=rgb(220,130,160),blueDark=rgb(146,80,102),teal=rgb(88,52,64),green=rgb(235,150,180),gold=rgb(245,200,150)}},
}

local byId={}
for _,theme in ipairs(ThemeLibrary.themes) do byId[theme.id]=theme end

function ThemeLibrary.get(id) return byId[id] end
function ThemeLibrary.exists(id) return byId[id]~=nil end
function ThemeLibrary.price(id) local t=byId[id]; return t and t.price or nil end

-- Blue is the default board every player owns and equips.
ThemeLibrary.defaultTheme="classic"

return ThemeLibrary
