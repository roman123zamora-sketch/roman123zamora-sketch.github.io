-- Shared board skins. Stable IDs preserve equipped preferences.
local ThemeLibrary={}

local function rgb(r,g,b) return Color3.fromRGB(r,g,b) end

ThemeLibrary.themes={
	{id="classic",name="Blue",
		board={light=rgb(236,246,255),dark=rgb(127,165,204),frame=rgb(50,78,112),stroke=rgb(73,107,144)}},
	{id="forest",name="Nature",
		board={light=rgb(218,225,198),dark=rgb(78,113,89),frame=rgb(19,45,31),stroke=rgb(75,113,78)},
		ui={bg=rgb(9,20,13),top=rgb(13,30,19),panel=rgb(18,44,27),panel2=rgb(14,35,22),muted=rgb(150,190,162),blue=rgb(80,180,110),blueDark=rgb(38,104,62),teal=rgb(28,72,45),green=rgb(90,200,125),gold=rgb(210,190,100)}},
	{id="slate",name="Metal",
		board={light=rgb(218,226,233),dark=rgb(104,120,136),frame=rgb(39,47,57),stroke=rgb(68,79,92)},
		ui={bg=rgb(20,22,26),top=rgb(29,32,38),panel=rgb(41,45,53),panel2=rgb(32,35,42),muted=rgb(172,178,190),blue=rgb(130,150,175),blueDark=rgb(70,88,110),teal=rgb(52,58,70),green=rgb(150,170,195),gold=rgb(205,212,224)}},
	{id="volcanic",edition=true,name="Volcanic",
		board={light=rgb(205,190,176),dark=rgb(98,85,82),frame=rgb(43,35,35),stroke=rgb(117,77,57)},
		ui={bg=rgb(23,20,24),top=rgb(35,29,32),panel=rgb(38,31,34),panel2=rgb(32,28,30),muted=rgb(208,196,191),blue=rgb(255,154,99),blueDark=rgb(104,70,54),teal=rgb(109,72,55),green=rgb(255,174,130),gold=rgb(232,184,144)}},
	{id="ocean-reef",edition=true,name="Ocean Reef",
		board={light=rgb(212,233,223),dark=rgb(82,131,136),frame=rgb(20,47,66),stroke=rgb(59,106,117)},
		ui={bg=rgb(13,26,37),top=rgb(20,37,52),panel=rgb(21,41,58),panel2=rgb(18,35,49),muted=rgb(213,224,222),blue=rgb(131,217,212),blueDark=rgb(52,96,108),teal=rgb(54,100,111),green=rgb(156,225,221),gold=rgb(232,184,144)}},
	{id="haunted",edition=true,name="Haunted",
		board={light=rgb(204,197,183),dark=rgb(99,100,114),frame=rgb(37,36,48),stroke=rgb(102,88,77)},
		ui={bg=rgb(21,21,30),top=rgb(31,30,40),panel=rgb(34,32,44),panel2=rgb(28,28,38),muted=rgb(208,201,196),blue=rgb(223,186,131),blueDark=rgb(91,80,72),teal=rgb(95,82,74),green=rgb(229,200,156),gold=rgb(232,184,144)}},
	{id="ancient-ruins",edition=true,name="Ancient Ruins",
		board={light=rgb(223,210,170),dark=rgb(129,121,103),frame=rgb(54,46,38),stroke=rgb(115,96,71)},
		ui={bg=rgb(28,25,25),top=rgb(42,36,34),panel=rgb(47,40,36),panel2=rgb(38,34,32),muted=rgb(220,209,187),blue=rgb(229,189,133),blueDark=rgb(105,87,66),teal=rgb(108,90,67),green=rgb(234,202,157),gold=rgb(232,184,144)}},
	{id="steampunk",edition=true,name="Steampunk",
		board={light=rgb(223,196,149),dark=rgb(135,105,83),frame=rgb(57,48,42),stroke=rgb(122,99,69)},
		ui={bg=rgb(30,26,27),top=rgb(44,38,36),panel=rgb(49,41,39),panel2=rgb(40,35,35),muted=rgb(220,200,174),blue=rgb(243,193,118),blueDark=rgb(111,90,64),teal=rgb(115,93,66),green=rgb(245,205,145),gold=rgb(232,184,144)}},
	{id="neon-circuit",edition=true,name="Neon Circuit",
		board={light=rgb(180,203,203),dark=rgb(70,93,116),frame=rgb(21,39,55),stroke=rgb(50,110,112)},
		ui={bg=rgb(14,22,33),top=rgb(21,32,45),panel=rgb(21,34,49),panel2=rgb(19,30,42),muted=rgb(192,205,209),blue=rgb(105,241,217),blueDark=rgb(45,98,102),teal=rgb(47,102,105),green=rgb(135,244,225),gold=rgb(232,184,144)}},
	{id="stained-glass",edition=true,name="Stained Glass",
		board={light=rgb(221,210,212),dark=rgb(114,109,150),frame=rgb(41,37,65),stroke=rgb(108,82,112)},
		ui={bg=rgb(23,21,37),top=rgb(33,31,51),panel=rgb(37,33,57),panel2=rgb(31,29,48),muted=rgb(219,209,214),blue=rgb(233,166,200),blueDark=rgb(97,74,104),teal=rgb(101,77,107),green=rgb(237,184,211),gold=rgb(232,184,144)}},
	{id="origami",edition=true,name="Origami",
		board={light=rgb(239,225,195),dark=rgb(131,122,158),frame=rgb(57,47,73),stroke=rgb(116,97,101)},
		ui={bg=rgb(30,26,41),top=rgb(44,37,56),panel=rgb(49,41,63),panel2=rgb(40,35,53),muted=rgb(230,219,203),blue=rgb(227,190,153),blueDark=rgb(106,88,96),teal=rgb(110,91,98),green=rgb(233,203,173),gold=rgb(232,184,144)}},
	{id="candy",edition=true,name="Candy",
		board={light=rgb(245,223,202),dark=rgb(151,112,123),frame=rgb(66,36,55),stroke=rgb(132,82,102)},
		ui={bg=rgb(34,21,33),top=rgb(49,30,45),panel=rgb(56,32,49),panel2=rgb(46,28,42),muted=rgb(234,218,208),blue=rgb(255,167,190),blueDark=rgb(121,74,94),teal=rgb(125,77,97),green=rgb(255,185,203),gold=rgb(232,184,144)}},
	{id="cosmic",edition=true,name="Cosmic",
		board={light=rgb(203,213,232),dark=rgb(93,105,144),frame=rgb(33,31,64),stroke=rgb(86,85,131)},
		ui={bg=rgb(19,19,37),top=rgb(28,27,50),panel=rgb(31,28,56),panel2=rgb(26,25,48),muted=rgb(207,211,227),blue=rgb(185,185,255),blueDark=rgb(77,76,119),teal=rgb(80,79,123),green=rgb(199,199,255),gold=rgb(232,184,144)}},
	{id="toy",edition=true,name="Toy",
		board={light=rgb(239,219,180),dark=rgb(138,128,94),frame=rgb(57,46,39),stroke=rgb(122,96,69)},
		ui={bg=rgb(30,25,26),top=rgb(44,36,34),panel=rgb(49,40,37),panel2=rgb(40,34,33),muted=rgb(230,215,194),blue=rgb(244,189,126),blueDark=rgb(111,87,64),teal=rgb(115,90,66),green=rgb(246,202,152),gold=rgb(232,184,144)}},
	{id="fossil",edition=true,name="Fossil",
		board={light=rgb(223,206,177),dark=rgb(118,112,102),frame=rgb(48,41,34),stroke=rgb(107,93,73)},
		ui={bg=rgb(26,23,23),top=rgb(38,33,31),panel=rgb(42,36,33),panel2=rgb(35,31,30),muted=rgb(220,207,192),blue=rgb(217,189,146),blueDark=rgb(97,84,66),teal=rgb(100,87,69),green=rgb(225,202,168),gold=rgb(232,184,144)}},
}

local byId={}
for _,theme in ipairs(ThemeLibrary.themes) do byId[theme.id]=theme end

function ThemeLibrary.get(id) return byId[id] end
function ThemeLibrary.exists(id) return byId[id]~=nil end

-- Blue is the default board shown when no skin is equipped.
ThemeLibrary.defaultTheme="classic"

return ThemeLibrary
