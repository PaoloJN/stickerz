import type { StickerStyle } from "./types";

export const DEFAULT_STYLE: StickerStyle = {
  shape: "diecut",
  radius: 22,
  fill: "auto",
  logoColor: "original",
  pad: 58,
  border: true,
  borderColor: "device",
  borderWidth: 1.5,
  outline: false,
  outlineColor: "auto",
  outlineWidth: 0.5,
  contour: "smooth",
  smooth: 50,
  fillHoles: true,
  merge: true,
  finish: "matte",
  lift: 30,
};

export const STYLE_KEYS = Object.keys(DEFAULT_STYLE) as (keyof StickerStyle)[];

export const pickStyle = (s: StickerStyle): StickerStyle =>
  Object.fromEntries(STYLE_KEYS.map((k) => [k, s[k]])) as StickerStyle;

export const LIMITS = {
  radius: [0, 50],
  pad: [35, 90],
  borderWidth: [0.5, 6],
  outlineWidth: [0.25, 2],
  smooth: [0, 100],
  lift: [0, 100],
} as const;

export const TONE = { dark: "#121212", light: "#ffffff" } as const;
export const CLEAR_FILL = "rgba(255,255,255,0.07)";
export const HOLO_STOPS: [number, string][] = [
  [0, "#ffd1f3"],
  [0.3, "#c9f0ff"],
  [0.55, "#fff3b0"],
  [0.78, "#c6ffe0"],
  [1, "#ffc6e0"],
];
export const HOLO_CSS = `linear-gradient(135deg,${HOLO_STOPS.map(([o, c]) => `${c} ${o * 100}%`).join(",")})`;

/** [value, label] — value is a hex color or a keyword */
export const FILLS: [string, string][] = [
  ["auto", "Auto — follows Dark / Light"],
  ["#ffffff", "White"],
  ["#121212", "Black"],
  ["#efe7d4", "Cream"],
  ["#ff6a3d", "Orange"],
  ["#3b82f6", "Blue"],
  ["#22c55e", "Green"],
  ["clear", "Clear vinyl"],
];
export const LOGO_COLORS: [string, string][] = [
  ["original", "Original colors"],
  ["mono", "Mono — follows Dark / Light"],
  ["#ffffff", "White"],
  ["#121212", "Black"],
  ["#ff6a3d", "Orange"],
  ["#3b82f6", "Blue"],
  ["#22c55e", "Green"],
];
export const BORDER_COLORS: [string, string][] = [
  ["device", "Auto — contrasts the device"],
  ["#ffffff", "White"],
  ["#121212", "Black"],
  ["#efe7d4", "Cream"],
  ["#ff6a3d", "Orange"],
  ["#3b82f6", "Blue"],
  ["#22c55e", "Green"],
  ["holo", "Holographic"],
];

/** captions, including "auto" (follows the sticker's Dark / Light) from older layouts */
export const BORDER_LABELS: [string, string][] = [...BORDER_COLORS, ["auto", "Follows Dark / Light"]];

export const OUTLINE_COLORS: [string, string][] = [
  ["auto", "Auto — contrasts Dark / Light"],
  ...BORDER_COLORS.slice(1),
];

const HEX = /^#[0-9a-f]{6}$/i;
export const isHex = (v: unknown): v is string => typeof v === "string" && HEX.test(v);

type Tone = { theme: "light" | "dark" };
export const toneColor = (s: Tone) => TONE[s.theme];

/** backing color; null = holo gradient */
export function resolveFill(s: Tone & Pick<StickerStyle, "fill" | "finish">): string | null {
  if (s.finish === "holo") return null;
  if (s.fill === "auto") return toneColor(s);
  if (s.fill === "clear") return CLEAR_FILL;
  return s.fill;
}

/** tint color for the logo; null = original art */
export function resolveLogoColor(s: Tone & Pick<StickerStyle, "logoColor">): string | null {
  if (s.logoColor === "original") return null;
  if (s.logoColor === "mono") return s.theme === "dark" ? TONE.light : TONE.dark;
  return s.logoColor;
}

/** border color; null = holo gradient */
export function resolveBorder(s: Tone & Pick<StickerStyle, "borderColor" | "finish" | "shape">, deviceDark = true): string | null {
  if (s.borderColor === "holo") return null;
  const holoCut = s.finish === "holo" && s.shape === "diecut";
  // "device": light vinyl on dark lids, dark vinyl on light lids
  if (s.borderColor === "device") return holoCut ? null : deviceDark ? TONE.light : TONE.dark;
  if (s.borderColor === "auto") return holoCut ? null : toneColor(s);
  return s.borderColor;
}

/** outline color; null = holo gradient */
export function resolveOutline(s: Tone & Pick<StickerStyle, "outlineColor">): string | null {
  if (s.outlineColor === "holo") return null;
  if (s.outlineColor === "auto") return s.theme === "dark" ? TONE.light : TONE.dark;
  return s.outlineColor;
}

/** closing radius of the die-cut line, mm; `smooth` 100 = 15% of the logo's long side */
export const smoothMm = (smooth: number, artW: number, artH: number) => (smooth / 100) * 0.15 * Math.max(artW, artH);

/** how far border + outline reach past the sticker's box, mm */
export const edgeGrow = (s: Pick<StickerStyle, "border" | "borderWidth" | "outline" | "outlineWidth">) =>
  (s.border ? s.borderWidth : 0) + (s.outline ? s.outlineWidth : 0);
