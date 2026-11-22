import { readFile } from "node:fs/promises";
import { LuauState } from "../game/vendor/luau-web.js";

const read = path => readFile(new URL(path, import.meta.url), "utf8");
const [engine, cases] = await Promise.all([
  read("../game/rules/standard-chess.luau"),
  read("./standard-chess-cases.luau")
]);
const vm = await LuauState.createAsync();
try {
  await vm.loadstring(`local Chess = (function()\n${engine}\nend)()\n${cases}`, "chess rules", true)();
} finally {
  vm.destroy();
}
console.log("Chess rules passed.");
