import { renderMatch } from "../Match Layout.js";

export default function chess(content) {
  return renderMatch(content, {
    title: "Standard Chess",
    fourPlayer: false
  });
}
