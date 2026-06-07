import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", {
  weights: ["300", "400", "500", "600", "700", "800", "900"],
});

export const FONT = fontFamily;

/** Brand palette — mirrors the DevTrack app (index.html tailwind config). */
export const C = {
  bg: "#050505",
  surface: "#121212",
  surfaceHi: "#1A1A1A",
  border: "#262626",
  primary: "#D1F45F", // lime
  secondary: "#FF9F45", // orange
  text: "#F5F5F5",
  textDim: "#8A8A8A",
  blue: "#3B82F6",
  amber: "#F59E0B",
  rose: "#F43F5E",
} as const;

/** Apple-ish easing curves. */
export const EASE = {
  // Standard decel — content arriving
  out: [0.16, 1, 0.3, 1] as const,
  // Smooth in-out for camera moves
  inOut: [0.65, 0, 0.35, 1] as const,
  // Gentle
  soft: [0.32, 0.72, 0, 1] as const,
};
