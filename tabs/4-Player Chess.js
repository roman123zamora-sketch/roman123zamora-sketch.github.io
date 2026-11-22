import { renderMatch } from "../Match Layout.js";

export default function fourPlayerChess(content) {
  renderMatch(content, {
    title: "4-Player Chess",
    players: ["Red", "Blue", "Yellow", "Green"],
    fourPlayer: true
  });
}
