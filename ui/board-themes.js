import { session } from "../game/session.js";

const blue = {
  id: "classic", name: "Blue",
  light: "#ecf6ff", dark: "#7fa5cc", frame: "#324e70", stroke: "#496b90"
};

export function getThemes() {
  return session.catalog?.map(theme => theme.id === blue.id ? blue : theme) ?? [blue];
}

export function getTheme() {
  return getThemes().find(theme => theme.id === session.profile.equippedBoard) ?? blue;
}

const tokens = {
  navy: "bg", header: "top", surface: "panel", recess: "panel2",
  stroke: "teal", muted: "muted", ice: "blue", focus: "green",
  accent: "blueDark", "active-border": "blue", "hover-border": "green",
  "control-border": "blue", "turn-border": "green", "dialog-border": "blue",
  "input-accent": "blue"
};

function interfaceColors({ ui, light }) {
  const colors = Object.fromEntries(Object.entries(tokens).map(([token, key]) => [token, ui[key]]));
  const blend = (first, second, share) => `color-mix(in srgb, ${first} ${share}%, ${second})`;
  return {
    ...colors,
    text: blend(light, "#ffffff", 18),
    "disabled-text": ui.muted,
    glow: blend(ui.bg, ui.blue, 78),
    "panel-gloss": blend(ui.panel, ui.blue, 92),
    "board-frame-gloss": blend(ui.panel, ui.blue, 85),
    button: blend(ui.panel, ui.blueDark, 84),
    "button-hover": blend(ui.panel, ui.blueDark, 65),
    "button-pressed": blend(ui.panel, ui.blueDark, 52),
    "accent-hover": blend(ui.blueDark, ui.panel, 82),
    "accent-disabled": blend(ui.panel, ui.blueDark, 70),
    badge: blend(ui.panel, ui.blueDark, 60),
    "turn-surface": blend(ui.panel2, ui.blueDark, 68),
    "collection-equipped": blend(ui.panel, ui.blueDark, 60),
    "press-ring": blend(ui.blue, "transparent", 42),
    selected: ui.blueDark,
    legal: blend(ui.blueDark, "#081426", 55),
    "last-move": blend(ui.blue, "transparent", 50),
    "square-focus": blend(ui.blueDark, "#081426", 48),
    "square-hover": blend(ui.blueDark, "transparent", 65),
    "dialog-backdrop": blend(ui.bg, "transparent", 79)
  };
}

let appliedTheme;

export function applyEquippedTheme() {
  const theme = getTheme();
  if (theme === appliedTheme) return;
  const root = document.documentElement;
  root.toggleAttribute("data-metal", theme.id === "slate");
  root.toggleAttribute("data-nature", theme.id === "forest");
  if (appliedTheme?.ui) {
    for (const name of Object.keys(interfaceColors(appliedTheme))) root.style.removeProperty("--" + name);
  }
  if (theme.ui) {
    for (const [name, value] of Object.entries(interfaceColors(theme))) {
      root.style.setProperty("--" + name, value);
    }
  }
  appliedTheme = theme;
}
