// Categorical palette — fixed hue order, validated for CVD-safe adjacent
// separation on a line chart (see dataviz skill: node scripts/validate_palette.js).
// This app is light-mode only (no dark theme elsewhere), so only the light
// steps are used. Slots 3/4/5 (aqua/yellow/magenta) read under 3:1 contrast on
// the white chart surface — the "relief rule" applies, so every chart using
// them also ships a table view alongside the plot.
export const CATEGORICAL_COLORS = [
  "#2a78d6", // 1 blue
  "#eb6834", // 2 orange
  "#1baf7a", // 3 aqua
  "#eda100", // 4 yellow
  "#e87ba4", // 5 magenta
  "#008300", // 6 green
  "#4a3aa7", // 7 violet
  "#e34948", // 8 red
];

export const CHART_INK = {
  surface: "#fcfcfb",
  primary: "#0b0b0b",
  secondary: "#52514e",
  muted: "#898781",
  gridline: "#e1e0d9",
  baseline: "#c3c2b7",
};
