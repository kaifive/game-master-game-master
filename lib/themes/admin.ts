import type { TokenSet } from "./model";

const fonts = {
  radius: "6px",
  "font-display": "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  "font-body": "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
};

const teams = {
  "team-1": "#d92d3a",
  "team-2": "#2f5bea",
  "team-3": "#c48f22",
  "team-4": "#1f8f5f",
  "team-5": "#8a3fbf",
  "team-6": "#0f8796",
  "team-7": "#d0641c",
  "team-8": "#56626b",
};

/**
 * The admin layer's fixed theme (ADR-021): cool slate neutrals and one
 * indigo accent, the same for every event.
 */
export const ADMIN_THEME: { light: TokenSet; dark: TokenSet } = {
  light: {
    bg: "#f4f5f8",
    surface: "#ffffff",
    "surface-raised": "#ffffff",
    border: "#d8dce3",
    text: "#161a22",
    "text-muted": "#535b69",
    "text-on-accent": "#ffffff",
    accent: "#3446d8",
    "accent-hover": "#2a39b3",
    success: "#1d7a4f",
    warning: "#9a6200",
    danger: "#c4203a",
    "tile-correct": "#1d7a4f",
    "tile-correct-ink": "#ffffff",
    "tile-present": "#c48f22",
    "tile-present-ink": "#1d1300",
    "tile-absent": "#d8dce3",
    "tile-absent-ink": "#535b69",
    "tile-empty": "#f4f5f8",
    buzzer: "#c4203a",
    "buzzer-ink": "#ffffff",
    "buzzer-locked": "#d8dce3",
    ...teams,
    ...fonts,
  },
  dark: {
    bg: "#0f1116",
    surface: "#171a21",
    "surface-raised": "#1e222b",
    border: "#2b303b",
    text: "#eceef3",
    "text-muted": "#a3a9b6",
    "text-on-accent": "#ffffff",
    accent: "#4a5ae6",
    "accent-hover": "#5f6dff",
    success: "#3fbf86",
    warning: "#e5a93a",
    danger: "#ff6b81",
    "tile-correct": "#2f9e6a",
    "tile-correct-ink": "#ffffff",
    "tile-present": "#e5b553",
    "tile-present-ink": "#1d1300",
    "tile-absent": "#2b303b",
    "tile-absent-ink": "#a3a9b6",
    "tile-empty": "#0f1116",
    buzzer: "#d92d3a",
    "buzzer-ink": "#ffffff",
    "buzzer-locked": "#2b303b",
    ...teams,
    ...fonts,
  },
};
