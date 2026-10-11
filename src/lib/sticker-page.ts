/**
 * Pure helpers for the single sticker page (/stickers/[key]): versions, backing, true-scale sizes, the size hint,
 * "often stacked with" (co-occurrence across designs), the "in a stack" arrangement and the one-sticker print layout.
 * Client-safe: no logo registry import; the server load hands over the art URLs.
 */
import { DEFAULT_STYLE } from "$lib/stickers/style";
import type { Layout, Sticker } from "$lib/stickers/types";

export type Variant = "icon" | "wordmark";
export type Theme = "light" | "dark";
/** Die-cut white vinyl, or a white / black backing (circle for icons, pill for wordmarks) */
export type Back = "diecut" | "white" | "black";

/** One art choice: icon or wordmark, and which art (light = for light vinyl, dark = light-coloured art for dark vinyl). */
export type Version = { variant: Variant; theme: Theme; label: string; light: string; dark: string };

export const BACKS: { id: Back; label: string }[] = [
  { id: "diecut", label: "Die-cut" },
  { id: "white", label: "White" },
  { id: "black", label: "Black" },
];

/** sticker sizes on offer, mm (the icon's long side; wordmarks run WORDMARK_STRETCH× wider) */
export const SIZES = [45, 55, 65] as const;
export const DEFAULT_SIZE = 55;
export const WORDMARK_STRETCH = 1.9;
/** a backed wordmark is a pill this many times wider than tall */
const PILL = 3.4;

/** The laptop picker, in the design's order, with the size that sits best on each (mm). */
export const LAPTOPS: { id: string; label: string; recommended: number }[] = [
  { id: "air13", label: "Air 13″", recommended: 55 },
  { id: "air15", label: "Air 15″", recommended: 60 },
  { id: "pro14", label: "Pro 14″", recommended: 55 },
  { id: "pro16", label: "Pro 16″", recommended: 65 },
];

/**
 * Versions from a logo's real art: the icon, then the wordmark if the library has one; each in its light-vinyl art and,
 * when there is a separate dark-background file, a "light" version for dark vinyl.
 */
export function versionsFor(art: { icon: { light: string; dark?: string }; wordmark?: { light: string; dark?: string } }): Version[] {
  const out: Version[] = [];
  const add = (variant: Variant, a: { light: string; dark?: string }) => {
    // same words as the editor: Icon / Full logo, and the Dark theme for light-coloured art
    const name = variant === "icon" ? "Icon" : "Full logo";
    const dark = a.dark ?? a.light;
    out.push({ variant, theme: "light", label: name, light: a.light, dark });
    if (a.dark && a.dark !== a.light) out.push({ variant, theme: "dark", label: `${name} · Dark`, light: a.light, dark });
  };
  add("icon", art.icon);
  if (art.wordmark) add("wordmark", art.wordmark);
  return out;
}

/**
 * What actually gets printed. A white backing would swallow a light-coloured logo, so that combination becomes black
 * (as in the design); a black backing always takes the dark-vinyl art; die-cut follows the version.
 */
export function effectiveLook(version: Pick<Version, "theme">, back: Back): { back: Back; theme: Theme } {
  if (back === "white") return version.theme === "dark" ? { back: "black", theme: "dark" } : { back: "white", theme: "light" };
  if (back === "black") return { back: "black", theme: "dark" };
  return { back: "diecut", theme: version.theme };
}

export const artOf = (v: Version, theme: Theme): string => (theme === "dark" ? v.dark : v.light);

/**
 * Sticker footprint in mm. Die-cut: the art itself, its long side = `size` (wordmarks stretched); backed: a circle
 * `size` across, or a pill. `aspect` is the art's width / height (from its die-cut entry; 1 when unknown).
 */
export function stickerBox(variant: Variant, back: Back, size: number, aspect = 1): { w: number; h: number } {
  const a = aspect > 0 && Number.isFinite(aspect) ? aspect : 1;
  if (variant === "wordmark") {
    const w = size * WORDMARK_STRETCH;
    return { w, h: back === "diecut" ? w / a : w / PILL };
  }
  if (back !== "diecut") return { w: size, h: size };
  return a >= 1 ? { w: size, h: size / a } : { w: size * a, h: size };
}

/** "55 mm sits well on a MacBook Air 13″." / too small / big. Within 5 mm of the recommendation counts as a fit. */
export function sizeHint(size: number, recommended: number, deviceName: string): string {
  if (Math.abs(size - recommended) <= 5) return `${size} mm sits well on a ${deviceName}.`;
  if (size < recommended) return `A little small on a ${deviceName}. Try ${recommended} mm.`;
  return `Big on a ${deviceName}. Good if it’s the only sticker.`;
}

/** How often each other logo shares a design with `key`: most first, ties in first-seen order. */
export function coOccurrence(key: string, designs: string[][]): { key: string; n: number }[] {
  const counts = new Map<string, number>();
  for (const keys of designs) {
    const set = new Set(keys);
    if (!set.has(key)) continue;
    for (const k of set) if (k !== key) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  // Map keeps insertion order and sort is stable
  return [...counts].map(([k, n]) => ({ key: k, n })).sort((a, b) => b.n - a.n);
}

/**
 * "Often stacked with": logos that share designs with `key` (most first), topped up from its category (most used
 * first, ties in data order) until there are `n`. `n` on each entry is the shared-design count (0 for the top-ups).
 */
export function oftenStacked<L extends { key: string; category: string; uses: number }>(
  key: string,
  designs: string[][],
  all: L[],
  n = 8,
): { logo: L; n: number }[] {
  const by = new Map(all.map((l) => [l.key, l]));
  const self = by.get(key);
  const out: { logo: L; n: number }[] = [];
  for (const c of coOccurrence(key, designs)) {
    const logo = by.get(c.key);
    if (logo) out.push({ logo, n: c.n });
    if (out.length >= n) return out;
  }
  if (!self) return out;
  const taken = new Set([key, ...out.map((o) => o.logo.key)]);
  const fill = all.filter((l) => l.category === self.category && !taken.has(l.key)).sort((a, b) => b.uses - a.uses);
  for (const logo of fill) {
    if (out.length >= n) break;
    out.push({ logo, n: 0 });
  }
  return out;
}

/** "In a stack": where the companions sit, % of the lid (x, y) and degrees (from the design's SPOTS). */
export const STACK_SPOTS: [x: number, y: number, rot: number][] = [
  [30, 26, -8],
  [72, 22, 9],
  [18, 70, 7],
  [48, 74, -5],
  [80, 66, -10],
  [88, 40, 12],
];
/** the main sticker's centre (% of the lid) and tilt, alone or in a stack */
export const MAIN_SPOT = { alone: [50, 44, -3], stack: [54, 44, 4] } as const;
/** companion sizes in a stack, mm (seeded so SSR == client) */
export const companionSize = (i: number): number => 42 + ((i * 37 + 11) % 13);

/** A one-sticker layout for the editor ("Print just this"): centred on the chosen laptop, at the chosen size. */
export function printLayout(opts: {
  key: string;
  /** alternate design id (non-default only) */
  style?: string;
  variant: Variant;
  theme: Theme;
  back: Back;
  size: number;
  aspect?: number;
  model: string;
  color: string;
  device: { w: number; h: number };
}): Layout {
  const box = stickerBox(opts.variant, opts.back, opts.size, opts.aspect);
  const shaped = opts.back !== "diecut";
  const sticker: Sticker = {
    id: "print-1",
    logo: opts.key,
    ...(opts.style ? { style: opts.style } : {}),
    variant: opts.variant,
    theme: opts.theme,
    locked: false,
    ...DEFAULT_STYLE,
    // wordmarks on a backing become a pill: a rounded rectangle at full radius
    shape: shaped ? (opts.variant === "wordmark" ? "square" : "circle") : "diecut",
    radius: shaped && opts.variant === "wordmark" ? 50 : DEFAULT_STYLE.radius,
    x: Math.round((opts.device.w / 2) * 10) / 10,
    y: Math.round((opts.device.h / 2) * 10) / 10,
    w: Math.round(box.w * 10) / 10,
    rot: 0,
  };
  return { v: 1, laptop: { model: opts.model, color: opts.color }, stickers: [sticker] };
}
