import { readFile } from "node:fs/promises";
import { LuauState } from "../game/vendor/index.js";

const read = path => readFile(new URL(path, import.meta.url), "utf8");
const [engine, cases] = await Promise.all([
  read("../game/roblox/ChessEngine.luau"),
  read("./chess-rules.luau")
]);
const vm = await LuauState.createAsync();
try {
  await vm.loadstring(`local Chess = (function()\n${engine}\nend)()\n${cases}`, "chess rules", true)();
} finally {
  vm.destroy();
}
console.log("Chess rules passed.");
