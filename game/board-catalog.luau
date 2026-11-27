-- Shared board skins. Stable IDs preserve equipped preferences.
local ThemeLibrary={}

local function rgb(r,g,b) return Color3.fromRGB(r,g,b) end

ThemeLibrary.themes={
  {id="classic",name="Classic",
    board={light=rgb(243,242,239),dark=rgb(119,119,117),frame=rgb(41,41,41),stroke=rgb(80,80,78)}},
}

local byId={}
for _,theme in ipairs(ThemeLibrary.themes) do byId[theme.id]=theme end

function ThemeLibrary.get(id) return byId[id] end
function ThemeLibrary.exists(id) return byId[id]~=nil end

-- Blue is the default board shown when no skin is equipped.
ThemeLibrary.defaultTheme="classic"

return ThemeLibrary
