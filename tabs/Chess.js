import { renderMatch } from "../Match Layout.js";

export default function chess(content) {
  renderMatch(content, {
    title: "Standard Chess",
    players: ["White", "Black"],
    fourPlayer: false
  });
}
