import { LuauState } from "./vendor/luau-web.js";

const modules = {
  ChessEngine: "rules/standard-chess.luau",
  FourPlayerEngine: "rules/four-player-chess.luau",
  BotEngine: "engine/bot-search.luau",
  ThemeLibrary: "board-catalog.luau"
};

function literal(value) {
  if (value == null) return "nil";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "nil";
  if (typeof value === "boolean") return String(value);
  if (typeof value === "string") {
    const escaped = value.replace(/["\\\x00-\x1f\x7f]/g, character =>
      "\\" + String(character.charCodeAt(0)).padStart(3, "0"));
    return '"' + escaped + '"';
  }
  if (Array.isArray(value)) return "{" + value.map(literal).join(",") + "}";
  return "{" + Object.entries(value).map(([key, item]) => "[" + literal(key) + "]=" + literal(item)).join(",") + "}";
}

function plain(value) {
  if (Array.isArray(value)) return value.map(plain);
  if (value && typeof value.keys === "function") {
    const keys = value.keys();
    if (keys.length && keys.every((key, index) => key === index + 1)) {
      return keys.map(key => plain(value.get(key)));
    }
    return Object.fromEntries(keys.map(key => [key, plain(value.get(key))]));
  }
  return value;
}

export async function createRuntime(read, { cooperativeSearch = false } = {}) {
  const names = Object.keys(modules);
  const [adapter, service, ...sources] = await Promise.all([
    read("web-adapter.luau"),
    read("match-service.luau"),
    ...names.map(name => read(modules[name]))
  ]);
  const definitions = sources.map((source, index) => `
    modules.${names[index]} = (function()
      ${source}
    end)()
  `).join("\n");
  const shim = "local function color(r,g,b) return {R=r,G=g,B=b} end; local Color3 = { new=color, fromRGB = function(r,g,b) return color(r/255,g/255,b/255) end }\n";
  const source = shim + `local cooperativeSearch = ${cooperativeSearch}\nlocal modules = {}\n` + definitions +
    "\nwebDispatch = (function()\n" + adapter.replace("-- GAME_SERVICE", "\n" + service + "\n") + "\nend)()";
  const vm = await LuauState.createAsync();
  await vm.loadstring(source, "Exalted Chess", true)();
  const tick = vm.loadstring('return webDispatch("tick", ...)', "Match tick", true);

  let queue = Promise.resolve();
  return (...args) => {
    const call = queue.then(async () => {
      if (args[0] === "tick") {
        const [result] = await tick(args[1]);
        return plain(result);
      }
      const invoke = vm.loadstring("return webDispatch(" + args.map(literal).join(",") + ")", "Web action", true);
      const [result] = await invoke();
      return plain(result);
    });
    queue = call.catch(() => {});
    return call;
  };
}
