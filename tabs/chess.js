import { renderMatch } from "../ui/match-view.js";

export default function chess(content) {
  return renderMatch(content, {
    title: "Standard Chess",
    fourPlayer: false
  });
}
