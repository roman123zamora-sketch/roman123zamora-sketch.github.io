import { renderMatch } from "../Match Layout.js";

export default function fourPlayerChess(content) {
  return renderMatch(content, {
    title: "4-Player Chess",
    fourPlayer: true
  });
}
