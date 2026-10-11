import { HOLO_CSS } from "$lib/stickers/style";
import type { Finish, StickerShape } from "$lib/stickers/types";

/** Shared look for the style controls in the sticker and stack panels. */

export const SHAPE_UI: [StickerShape, string, string][] = [
  ["diecut", "Die-cut", "border-radius: 58% 42% 55% 45% / 45% 58% 42% 55%"],
  ["circle", "Circle", "border-radius: 50%"],
  ["square", "Rounded", "border-radius: 26%"],
  ["hex", "Hexagon", "clip-path: polygon(25% 6%,75% 6%,100% 50%,75% 94%,25% 94%,0 50%)"],
];
export const shapeName = (s: StickerShape) => SHAPE_UI.find(([id]) => id === s)?.[1] ?? s;

export const FINISH_UI: [Finish, string, string][] = [
  ["matte", "Matte", "#6b6b6b"],
  ["gloss", "Gloss", "linear-gradient(135deg,#777,#fff 50%,#777)"],
  ["holo", "Holographic", HOLO_CSS],
];

const SPLIT = "linear-gradient(135deg,#121212 50%,#fff 50%)";
export function swatchBg(c: string): string {
  if (c === "auto" || c === "mono" || c === "device") return SPLIT;
  if (c === "clear") return "repeating-conic-gradient(#3a3a3a 0 25%,#1a1a1a 0 50%) 0 0/8px 8px";
  if (c === "holo") return HOLO_CSS;
  if (c === "original") return "conic-gradient(#ff6a3d,#facc15,#22c55e,#3b82f6,#a855f7,#ff6a3d)";
  return c;
}
export const caption = (list: [string, string][], v: string) => list.find(([c]) => c === v)?.[1] ?? v;

export const cls = {
  section: "flex flex-col gap-3 border-t border-neutral-200 p-4 dark:border-neutral-800",
  title: "text-[12.5px] font-medium text-neutral-900 dark:text-neutral-100",
  caption: "truncate text-[11.5px] text-neutral-500",
  sub: "text-xs text-neutral-500 dark:text-neutral-400",
  pill: "rounded-[5px] bg-neutral-100 px-1.5 py-px font-mono text-[11.5px] text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  swatch:
    "aspect-square w-full max-w-[26px] cursor-pointer justify-self-center rounded-full ring-1 ring-black/15 ring-offset-2 ring-offset-white transition-shadow aria-pressed:ring-2 aria-pressed:ring-neutral-900 dark:ring-white/20 dark:ring-offset-neutral-900 dark:aria-pressed:ring-white",
  tile: "flex cursor-pointer items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-500 hover:border-neutral-400 aria-pressed:border-neutral-900 aria-pressed:bg-neutral-100 aria-pressed:text-neutral-950 dark:border-neutral-800 dark:bg-neutral-950/50 dark:text-neutral-400 dark:hover:border-neutral-600 dark:aria-pressed:border-neutral-300 dark:aria-pressed:bg-neutral-800 dark:aria-pressed:text-white",
  shapeIcon: "bg-neutral-400 group-aria-pressed:bg-neutral-900 dark:bg-neutral-600 dark:group-aria-pressed:bg-neutral-100",
};
