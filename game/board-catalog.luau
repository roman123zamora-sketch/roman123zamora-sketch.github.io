-- Board theme library: shared by server (purchase validation) and client (rendering).
-- Themes progress from cheap color-only boards to premium boards that re-theme
-- the entire UI palette. Boards are flat color pairs: cheap boards pair one color
-- with white, mid boards mix two colors, premium boards use bold dark combos.
local ThemeLibrary={}

local function rgb(r,g,b) return Color3.fromRGB(r,g,b) end

-- Each theme: id, name, price (in captured pieces), board colors, square texture
-- (tex: gradient rotation/keypoints plus a square pattern config for surface
-- material), and optional UI palette overrides. "classic" is free and owned by default.
ThemeLibrary.themes={
	{id="classic",name="Classic",price=0,desc="The original emerald board.",
		board={light=rgb(233,240,229),dark=rgb(106,142,116),frame=rgb(17,29,22),stroke=rgb(60,102,76)}},
	{id="honeyFrost",name="Honey Frost",price=10,desc="Golden honey dusted with frost.",
		board={light=rgb(255,245,214),dark=rgb(154,91,18),frame=rgb(66,44,10),stroke=rgb(146,92,22),tex={rot=105,l={{0,rgb(255,248,222)},{1,rgb(250,240,206)}},d={{0,rgb(166,100,24)},{1,rgb(142,80,14)}},pat={type="water",nb=3,tilt=4,l={rgb(243,220,168),.76},l2={rgb(255,250,232),.85},d={rgb(180,116,38),.56},d2={rgb(108,60,10),.6}}}},
		ui={bg=rgb(32,28,14),top=rgb(46,40,20),panel=rgb(64,56,28),panel2=rgb(50,44,22),muted=rgb(214,196,148),blue=rgb(222,182,80),blueDark=rgb(146,116,48),teal=rgb(96,82,40),green=rgb(232,200,105),gold=rgb(248,222,140)}},
	{id="walnut",name="Walnut",price=15,desc="Warm timber tones.",
		board={light=rgb(237,220,196),dark=rgb(160,110,74),frame=rgb(48,33,22),stroke=rgb(110,76,50)},
		ui={bg=rgb(26,19,13),top=rgb(38,27,19),panel=rgb(54,38,26),panel2=rgb(42,30,21),muted=rgb(196,168,140),blue=rgb(196,140,86),blueDark=rgb(128,88,52),teal=rgb(84,58,38),green=rgb(210,160,100),gold=rgb(232,196,120)}},
	{id="lavenderMilk",name="Lavender Milk",price=20,desc="Soft lavender swirled into cream.",
		board={light=rgb(244,236,255),dark=rgb(105,65,165),frame=rgb(40,26,66),stroke=rgb(112,72,160),tex={rot=125,l={{0,rgb(246,239,255)},{1,rgb(240,231,251)}},d={{0,rgb(113,73,173)},{1,rgb(95,57,155)}},pat={type="nebula",sz=.64,szY=.56,ns=2,l={rgb(226,212,244),.76},l2={rgb(253,249,255),.85},d={rgb(126,88,186),.56},d2={rgb(80,48,136),.6}}}},
		ui={bg=rgb(26,20,34),top=rgb(38,29,49),panel=rgb(54,41,69),panel2=rgb(42,32,54),muted=rgb(204,186,222),blue=rgb(176,138,220),blueDark=rgb(110,82,152),teal=rgb(76,58,106),green=rgb(196,160,238),gold=rgb(228,204,150)}},
	{id="cherry",name="Cherry",price=35,desc="Bright ruby wood.",
		board={light=rgb(246,226,220),dark=rgb(190,96,90),frame=rgb(44,20,18),stroke=rgb(140,66,60)},
		ui={bg=rgb(28,14,13),top=rgb(42,21,19),panel=rgb(60,30,27),panel2=rgb(47,23,21),muted=rgb(210,160,152),blue=rgb(214,110,100),blueDark=rgb(140,62,55),teal=rgb(96,42,38),green=rgb(230,130,115),gold=rgb(240,190,120)}},
	{id="slate",name="Slate",price=45,desc="Quiet stone grays.",
		board={light=rgb(228,230,234),dark=rgb(120,126,138),frame=rgb(28,30,36),stroke=rgb(80,86,98)},
		ui={bg=rgb(20,22,26),top=rgb(29,32,38),panel=rgb(41,45,53),panel2=rgb(32,35,42),muted=rgb(172,178,190),blue=rgb(130,150,175),blueDark=rgb(70,88,110),teal=rgb(52,58,70),green=rgb(150,170,195),gold=rgb(205,212,224)}},
	{id="duskEmber",name="Dusk Ember",price=50,desc="The last ember against a dying sky.",
		board={light=rgb(249,198,154),dark=rgb(41,59,99),frame=rgb(20,28,48),stroke=rgb(90,110,165),tex={rot=65,l={{0,rgb(251,203,161)},{1,rgb(246,190,145)}},d={{0,rgb(48,66,106)},{1,rgb(36,52,90)}},pat={type="basalt",nm=3,nc=2,ember=.18,l={rgb(238,178,130),.76},l2={rgb(252,216,176),.85},d={rgb(60,82,132),.56},d2={rgb(226,124,66),.52}}}},
		ui={bg=rgb(18,22,36),top=rgb(27,32,50),panel=rgb(39,46,70),panel2=rgb(30,36,56),muted=rgb(180,180,208),blue=rgb(240,160,96),blueDark=rgb(160,96,52),teal=rgb(58,70,102),green=rgb(250,180,110),gold=rgb(255,200,120)}},
	{id="sandstorm",name="Sandstorm",price=60,desc="Golden desert dunes.",
		board={light=rgb(245,232,200),dark=rgb(200,164,96),frame=rgb(46,38,24),stroke=rgb(140,112,64),tex={rot=25,l={{0,rgb(247,235,205)},{1,rgb(242,228,194)}},d={{0,rgb(208,173,106)},{1,rgb(192,155,88)}},pat={type="strata",nl=4,tilt=3,ripple=3,l={rgb(236,216,172),.76},l2={rgb(252,242,218),.85},d={rgb(214,182,112),.56},d2={rgb(158,126,68),.6}}}},
		ui={bg=rgb(30,25,15),top=rgb(44,36,21),panel=rgb(62,51,29),panel2=rgb(48,40,24),muted=rgb(206,180,136),blue=rgb(206,170,96),blueDark=rgb(136,110,60),teal=rgb(92,76,44),green=rgb(220,190,115),gold=rgb(240,210,130)}},
	{id="emeraldCoast",name="Emerald",price=70,desc="Jungle green meets golden sand.",
		board={light=rgb(242,214,161),dark=rgb(23,107,74),frame=rgb(12,52,38),stroke=rgb(74,140,108),tex={rot=115,l={{0,rgb(244,217,166)},{1,rgb(239,210,155)}},d={{0,rgb(29,113,80)},{1,rgb(18,99,68)}},pat={type="water",nb=3,tilt=3,caustic=3,l={rgb(238,212,160),.76},l2={rgb(250,236,196),.85},d={rgb(38,140,100),.54},d2={rgb(16,80,56),.6}}}},
		ui={bg=rgb(16,26,20),top=rgb(23,37,29),panel=rgb(33,52,41),panel2=rgb(26,41,32),muted=rgb(170,200,180),blue=rgb(96,190,130),blueDark=rgb(46,116,70),teal=rgb(36,84,60),green=rgb(110,205,145),gold=rgb(216,192,110)}},
	{id="rosewood",name="Rosewood",price=75,desc="Soft rose-tinted wood.",
		board={light=rgb(248,228,232),dark=rgb(200,120,140),frame=rgb(46,24,32),stroke=rgb(150,80,100)},
		ui={bg=rgb(26,16,20),top=rgb(38,24,29),panel=rgb(54,34,41),panel2=rgb(42,26,32),muted=rgb(208,168,180),blue=rgb(220,130,160),blueDark=rgb(146,80,102),teal=rgb(88,52,64),green=rgb(235,150,180),gold=rgb(245,200,150)}},
	{id="berryDusk",name="Grape",price=90,desc="Wild berries at twilight.",
		board={light=rgb(245,196,213),dark=rgb(83,43,88),frame=rgb(34,18,36),stroke=rgb(130,72,130),tex={rot=125,l={{0,rgb(247,200,216)},{1,rgb(242,191,209)}},d={{0,rgb(91,49,96)},{1,rgb(75,39,80)}},pat={type="petal",nm=3,np=2,l={rgb(244,192,210),.78},l2={rgb(253,222,234),.86},d={rgb(112,62,116),.56},d2={rgb(66,34,70),.6}}}},
		ui={bg=rgb(30,18,30),top=rgb(44,26,43),panel=rgb(62,36,60),panel2=rgb(48,29,47),muted=rgb(212,170,204),blue=rgb(220,110,180),blueDark=rgb(148,66,122),teal=rgb(96,48,88),green=rgb(235,140,195),gold=rgb(240,200,150)}},
	{id="midnight",name="Midnight",price=90,desc="Deep nocturnal blues.",
		board={light=rgb(210,222,240),dark=rgb(60,72,120),frame=rgb(10,12,26),stroke=rgb(50,60,110)},
		ui={bg=rgb(10,12,26),top=rgb(15,18,34),panel=rgb(22,26,46),panel2=rgb(17,20,38),muted=rgb(160,172,200),blue=rgb(96,130,214),blueDark=rgb(48,74,140),teal=rgb(36,48,100),green=rgb(110,150,220),gold=rgb(150,170,230)}},
	{id="marble",name="Marble",price=110,desc="Polished stone elegance.",
		board={light=rgb(245,246,248),dark=rgb(168,172,182),frame=rgb(36,38,44),stroke=rgb(120,124,134)},
		ui={bg=rgb(24,25,29),top=rgb(35,37,43),panel=rgb(49,52,60),panel2=rgb(38,41,48),muted=rgb(178,182,192),blue=rgb(140,148,165),blueDark=rgb(78,84,98),teal=rgb(58,62,74),green=rgb(160,170,188),gold=rgb(212,216,226)}},
	{id="copperSage",name="Copper",price=120,desc="Aged copper resting on sage stone.",
		board={light=rgb(221,230,211),dark=rgb(126,77,54),frame=rgb(58,36,26),stroke=rgb(120,80,58),tex={rot=115,l={{0,rgb(224,233,215)},{1,rgb(217,226,206)}},d={{0,rgb(134,84,61)},{1,rgb(117,72,50)}},pat={type="metal",luster=.85,l={rgb(206,220,196),.78},l2={rgb(236,243,230),.86},d={rgb(160,106,72),.56},d2={rgb(120,138,104),.6}}}},
		ui={bg=rgb(28,24,18),top=rgb(40,35,26),panel=rgb(57,50,37),panel2=rgb(44,39,29),muted=rgb(206,192,164),blue=rgb(198,132,86),blueDark=rgb(130,84,52),teal=rgb(90,80,58),green=rgb(212,150,100),gold=rgb(232,198,130)}},
	{id="forest",name="Forest",price=135,desc="Deep woodland greens.",
		board={light=rgb(214,236,210),dark=rgb(52,110,70),frame=rgb(10,26,16),stroke=rgb(40,100,60)},
		ui={bg=rgb(9,20,13),top=rgb(13,30,19),panel=rgb(18,44,27),panel2=rgb(14,35,22),muted=rgb(150,190,162),blue=rgb(80,180,110),blueDark=rgb(38,104,62),teal=rgb(28,72,45),green=rgb(90,200,125),gold=rgb(210,190,100)}},
	{id="ice",name="Glacier",price=160,desc="Frozen arctic shine.",
		board={light=rgb(230,244,250),dark=rgb(150,196,224),frame=rgb(196,216,232),stroke=rgb(120,160,190)},
		ui={bg=rgb(18,26,34),top=rgb(26,38,50),panel=rgb(36,52,68),panel2=rgb(28,42,56),muted=rgb(160,190,214),blue=rgb(120,180,230),blueDark=rgb(58,110,170),teal=rgb(42,80,120),green=rgb(120,190,235),gold=rgb(200,224,248)}},
	{id="onyxFlame",name="Onyx Flame",price=180,desc="Fire trapped in black glass.",
		board={light=rgb(244,177,131),dark=rgb(36,35,43),frame=rgb(14,14,18),stroke=rgb(200,100,40),tex={rot=115,l={{0,rgb(246,181,137)},{1,rgb(241,171,124)}},d={{0,rgb(44,43,52)},{1,rgb(31,30,38)}},pat={type="lacquer",sheen=.85,hl=2,l={rgb(242,172,122),.76},l2={rgb(254,214,172),.85},d={rgb(58,56,70),.6},d2={rgb(230,118,54),.52}}}},
		ui={bg=rgb(14,12,12),top=rgb(21,18,17),panel=rgb(31,26,24),panel2=rgb(24,20,19),muted=rgb(200,170,150),blue=rgb(232,116,54),blueDark=rgb(150,68,28),teal=rgb(84,52,36),green=rgb(255,140,70),gold=rgb(255,180,100)}},
	{id="amethyst",name="Amethyst",price=190,desc="Royal purple crystal.",
		board={light=rgb(238,228,248),dark=rgb(130,100,180),frame=rgb(30,22,44),stroke=rgb(100,76,150)},
		ui={bg=rgb(20,15,29),top=rgb(29,22,42),panel=rgb(41,31,58),panel2=rgb(32,24,46),muted=rgb(186,172,208),blue=rgb(150,120,210),blueDark=rgb(84,64,130),teal=rgb(54,42,82),green=rgb(170,140,225),gold=rgb(220,190,250)}},
	{id="crimson",name="Crimson",price=230,desc="Bold blood-red lacquer.",
		board={light=rgb(246,222,220),dark=rgb(150,60,58),frame=rgb(36,14,14),stroke=rgb(120,48,46)},
		ui={bg=rgb(24,14,13),top=rgb(36,20,19),panel=rgb(50,27,25),panel2=rgb(39,21,20),muted=rgb(204,158,150),blue=rgb(200,96,90),blueDark=rgb(130,52,48),teal=rgb(96,38,36),green=rgb(210,110,100),gold=rgb(232,190,120)}},
	{id="royalGold",name="Gold",price=280,desc="Gilded royal court.",
		board={light=rgb(248,240,214),dark=rgb(196,158,74),frame=rgb(40,32,14),stroke=rgb(150,120,50)},
		ui={bg=rgb(24,20,10),top=rgb(35,29,15),panel=rgb(50,41,21),panel2=rgb(39,32,17),muted=rgb(206,186,140),blue=rgb(212,178,90),blueDark=rgb(140,114,56),teal=rgb(94,78,40),green=rgb(226,198,115),gold=rgb(250,224,150)}},
	{id="stormSteel",name="Steel",price=300,desc="Lightning over cold steel.",
		board={light=rgb(202,216,231),dark=rgb(57,70,84),frame=rgb(26,32,40),stroke=rgb(90,120,180),tex={rot=115,l={{0,rgb(206,219,234)},{1,rgb(197,211,227)}},d={{0,rgb(65,79,94)},{1,rgb(51,63,78)}},pat={type="metal",luster=.88,l={rgb(190,208,226),.76},l2={rgb(226,238,248),.85},d={rgb(132,160,210),.52},d2={rgb(42,54,68),.58}}}},
		ui={bg=rgb(16,18,24),top=rgb(23,26,35),panel=rgb(33,38,51),panel2=rgb(26,30,41),muted=rgb(172,184,204),blue=rgb(96,160,240),blueDark=rgb(48,96,168),teal=rgb(46,60,92),green=rgb(120,180,250),gold=rgb(180,200,235)}},
	{id="neonCity",name="Neon City",price=340,desc="Synthwave streets after dark.",
		board={light=rgb(88,96,136),dark=rgb(20,22,36),frame=rgb(10,10,18),stroke=rgb(90,80,200)},
		ui={bg=rgb(10,10,18),top=rgb(16,15,28),panel=rgb(24,22,40),panel2=rgb(18,17,32),muted=rgb(150,140,190),blue=rgb(90,220,255),blueDark=rgb(40,110,150),teal=rgb(50,40,110),green=rgb(90,220,255),gold=rgb(255,110,220)}},
	{id="aurora",name="Aurora",price=420,desc="Northern lights over the board.",
		board={light=rgb(224,246,238),dark=rgb(38,116,110),frame=rgb(14,30,32),stroke=rgb(60,140,130)},
		ui={bg=rgb(13,26,26),top=rgb(19,38,37),panel=rgb(27,50,48),panel2=rgb(20,40,39),muted=rgb(158,196,190),blue=rgb(80,210,196),blueDark=rgb(38,120,110),teal=rgb(30,82,78),green=rgb(96,220,205),gold=rgb(120,224,180)}},
	{id="royalPlum",name="Royal",price=450,desc="Royal purple trimmed in gold.",
		board={light=rgb(242,211,138),dark=rgb(85,48,111),frame=rgb(34,20,46),stroke=rgb(150,110,60),tex={rot=125,l={{0,rgb(244,214,143)},{1,rgb(239,206,132)}},d={{0,rgb(93,54,119)},{1,rgb(79,44,105)}},pat={type="veinm",ns=3,dr=.13,ang=9,branch=true,l={rgb(236,204,140),.78},l2={rgb(252,234,178),.86},d={rgb(112,68,142),.56},d2={rgb(196,156,84),.5}}}},
		ui={bg=rgb(24,16,34),top=rgb(35,24,49),panel=rgb(50,34,70),panel2=rgb(39,27,55),muted=rgb(196,178,222),blue=rgb(150,110,200),blueDark=rgb(88,60,130),teal=rgb(60,44,90),green=rgb(170,130,225),gold=rgb(225,190,110)}},
	{id="volcano",name="Volcano",price=520,desc="Cooled lava and ember glow.",
		board={light=rgb(150,120,106),dark=rgb(34,22,20),frame=rgb(18,10,9),stroke=rgb(190,80,30)},
		ui={bg=rgb(18,10,8),top=rgb(28,15,12),panel=rgb(40,21,16),panel2=rgb(31,16,13),muted=rgb(204,150,120),blue=rgb(240,120,50),blueDark=rgb(150,64,26),teal=rgb(90,40,26),green=rgb(255,140,60),gold=rgb(255,170,80)}},

	{id="voidRose",name="Void",price=650,desc="A rose blooming in the void.",
		board={light=rgb(242,179,211),dark=rgb(49,18,47),frame=rgb(22,9,21),stroke=rgb(180,60,130)},
		ui={bg=rgb(14,10,16),top=rgb(21,15,24),panel=rgb(31,22,35),panel2=rgb(24,17,27),muted=rgb(206,164,190),blue=rgb(220,80,160),blueDark=rgb(140,44,100),teal=rgb(72,40,66),green=rgb(240,110,180),gold=rgb(245,175,205)}},
	{id="sakura",name="Sakura",price=800,desc="Petals on spring water.",
		board={light=rgb(252,234,240),dark=rgb(214,150,176),frame=rgb(52,30,40),stroke=rgb(180,110,140)},
		ui={bg=rgb(28,20,24),top=rgb(41,29,35),panel=rgb(58,41,49),panel2=rgb(45,32,38),muted=rgb(216,176,190),blue=rgb(235,140,175),blueDark=rgb(160,80,110),teal=rgb(110,66,84),green=rgb(240,150,185),gold=rgb(250,210,170)}},
	{id="imperialSapphire",name="Saphire",price=900,desc="Deep sapphire sovereignty.",
		board={light=rgb(215,232,255),dark=rgb(19,43,99),frame=rgb(10,22,52),stroke=rgb(60,100,170),tex={rot=115,l={{0,rgb(218,235,255)},{1,rgb(211,229,251)}},d={{0,rgb(24,50,108)},{1,rgb(16,38,92)}},pat={type="crystal",nf=3,fs=.36,fsY=.42,fr=2,l={rgb(198,220,248),.78},l2={rgb(235,245,255),.86},d={rgb(52,88,164),.54},d2={rgb(16,36,88),.58}}}},
		ui={bg=rgb(10,16,30),top=rgb(15,24,44),panel=rgb(22,35,62),panel2=rgb(17,27,50),muted=rgb(168,190,224),blue=rgb(90,140,230),blueDark=rgb(42,80,160),teal=rgb(36,60,110),green=rgb(110,165,245),gold=rgb(190,215,255)}},
	{id="galaxy",name="Galaxy",price=1000,desc="Nebula clouds and starlight — the crown of the collection.",
		board={light=rgb(98,88,158),dark=rgb(28,22,54),frame=rgb(12,9,26),stroke=rgb(130,110,235)},
		ui={bg=rgb(11,9,24),top=rgb(17,14,36),panel=rgb(26,21,52),panel2=rgb(20,16,42),muted=rgb(168,158,214),blue=rgb(140,110,255),blueDark=rgb(70,54,150),teal=rgb(44,36,100),green=rgb(150,120,255),gold=rgb(190,170,255)}},
	{id="phoenixCrown",name="Pheonix",price=1200,desc="A crown reborn in flame and gold.",
		board={light=rgb(248,193,139),dark=rgb(110,31,34),frame=rgb(52,15,16),stroke=rgb(160,50,45),tex={rot=65,l={{0,rgb(250,197,145)},{1,rgb(245,188,132)}},d={{0,rgb(122,37,40)},{1,rgb(103,29,32)}},pat={type="basalt",nm=3,nc=3,ember=.3,l={rgb(246,180,120),.74},l2={rgb(255,222,176),.84},d={rgb(168,58,58),.52},d2={rgb(238,150,64),.48}}}},
		ui={bg=rgb(26,12,10),top=rgb(38,18,15),panel=rgb(54,26,22),panel2=rgb(42,20,17),muted=rgb(216,170,150),blue=rgb(240,150,80),blueDark=rgb(160,90,40),teal=rgb(100,48,36),green=rgb(255,175,100),gold=rgb(250,210,120)}},
	{id="sovereignAurora",name="Auoura",price=2400,desc="The northern lights, crowned in jade.",
		board={light=rgb(201,241,229),dark=rgb(20,88,79),frame=rgb(8,40,36),stroke=rgb(60,150,130),tex={rot=115,l={{0,rgb(204,243,232)},{1,rgb(197,238,225)}},d={{0,rgb(25,96,86)},{1,rgb(17,82,73)}},pat={type="ribbon",nr=3,rw=.18,l={rgb(182,228,212),.78},l2={rgb(230,250,242),.86},d={rgb(38,126,112),.54},d2={rgb(126,224,194),.5}}}},
		ui={bg=rgb(10,24,22),top=rgb(15,35,32),panel=rgb(22,50,46),panel2=rgb(17,39,36),muted=rgb(170,214,204),blue=rgb(90,210,180),blueDark=rgb(40,130,112),teal=rgb(30,80,72),green=rgb(110,230,200),gold=rgb(220,230,160)}},
}

-- Uniform surface material: every board now uses the Copper Sage "metal"
-- texture engine (same gradient rotation, brushed-metal pattern, luster),
-- recolored per theme from its own board light/dark colors so each palette
-- stays distinct. The copper theme keeps its hand-tuned original.
for _,theme in ipairs(ThemeLibrary.themes) do
	if theme.id~="copperSage" then
		local function sc(c,k) return Color3.new(math.clamp(c.R*k,0,1),math.clamp(c.G*k,0,1),math.clamp(c.B*k,0,1)) end
		local b=theme.board; local light,dark=b.light,b.dark
		b.tex={rot=115,
			l={{0,sc(light,1.015)},{1,sc(light,0.98)}},
			d={{0,sc(dark,1.07)},{1,sc(dark,0.93)}},
			pat={type="metal",luster=.85,
				l={sc(light,0.93),.78},
				l2={sc(light,1.065),.86},
				d={sc(dark,1.27),.56},
				d2={sc(light,0.55),.6}}}
	end
end

-- Ordered list (insertion order = shop display order, cheapest first).
local byId={}
for _,theme in ipairs(ThemeLibrary.themes) do byId[theme.id]=theme end

function ThemeLibrary.get(id) return byId[id] end
function ThemeLibrary.exists(id) return byId[id]~=nil end
function ThemeLibrary.price(id) local t=byId[id]; return t and t.price or nil end

-- Classic is the default board every player owns and equips.
ThemeLibrary.defaultTheme="classic"

return ThemeLibrary