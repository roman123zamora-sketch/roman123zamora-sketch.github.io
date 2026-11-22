import { renderMatch } from "../ui/match-view.js";

export default function fourPlayerChess(content) {
  return renderMatch(content, {
    title: "4-Player Chess",
    fourPlayer: true
  });
}
