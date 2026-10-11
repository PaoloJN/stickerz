import type { Sticker, StickerStyle } from "./types";
import reviewed from "./overrides.review.json";

/**
 * Hand-tuned fixes for logos whose generated sticker doesn't look right. Keyed by logo key (the file name without
 * `.svg`/`-light`/`-dark`, e.g. "nvidia"). Most logos need nothing here.
 *
 * Workflow: open the editor in dev, add the logo, fix it with the normal controls, press "Copy as override" in the
 * style panel and paste the line below. Run `./node_modules/.bin/vite-node scripts/build-cuts.ts` after changing `build`
 * or `art` so the precomputed stickers (home, community, shared designs) match. `tests/stickers/overrides.test.ts`
 * checks every entry.
 */

/** Defaults when the logo is added to a design. Only defaults: anything the user changes still wins. */
export type PlaceDefaults = Partial<StickerStyle> & Partial<Pick<Sticker, "theme" | "variant" | "w" | "colors">>;

/** How the cut line is made: traced around the logo, or a plain shape hugging it (for logos full of holes and thin bits) */
export const CUT_SHAPES = ["trace", "circle", "square"] as const;
export type CutShape = (typeof CUT_SHAPES)[number];

/** Settings for the precomputed cut line (scripts/build-cuts.ts). */
export type BuildSettings = {
  /** "trace" (default) follows the logo's silhouette; "circle" / "square" put the whole logo on one solid shape */
  shape?: CutShape;
  /** vinyl past the logo, mm at the canonical 100 mm size (default 3) */
  margin?: number;
  /** 0 tight – 100 soft, like the editor's Smoothness (default: the editor default) */
  smooth?: number;
  fillHoles?: boolean;
  merge?: boolean;
  /** render without masks/clip-paths when they hide the logo */
  stripMasks?: boolean;
};

/**
 * Replacement art when the library SVG itself is broken (hairline strokes, invisible on dark, junk around the edges).
 * Paths are served from static/, e.g. "/stickers/fixed/github-dark.svg". The original library files stay untouched, so
 * re-importing a logo never overwrites a fix.
 */
export type ArtFix = { icon?: string; iconDark?: string; wordmark?: string; wordmarkDark?: string };

export type StickerOverride = {
  /** why this logo needs a fix, for whoever touches it next */
  note?: string;
  place?: PlaceDefaults;
  build?: BuildSettings;
  /** per art file (library file name, e.g. "github_dark.svg"), on top of `build`: a logo's files can need different fixes */
  files?: Record<string, BuildSettings>;
  art?: ArtFix;
};

export const HAND_OVERRIDES: Record<string, StickerOverride> = {
  // paste "Copy as override" lines here, e.g.
  // nvidia: { note: "wordmark reads better as one soft piece", place: { contour: "smooth", smooth: 70 } },
};

/**
 * Cut fixes saved by the dev sticker review page (/dev/stickers) live in overrides.review.json: { [logo]: { build?,
 * files? } }. They're merged over the hand-written entries above; edit them in the review page, not by hand.
 */
export type ReviewedFixes = Record<string, Pick<StickerOverride, "build" | "files">>;

export function mergeOverrides(hand: Record<string, StickerOverride>, fixes: ReviewedFixes): Record<string, StickerOverride> {
  const out: Record<string, StickerOverride> = { ...hand };
  for (const [key, f] of Object.entries(fixes)) {
    const h = out[key] ?? {};
    out[key] = { ...h, ...(f.build || h.build ? { build: { ...h.build, ...f.build } } : {}), ...(f.files || h.files ? { files: { ...h.files, ...f.files } } : {}) };
  }
  return out;
}

export const OVERRIDES: Record<string, StickerOverride> = mergeOverrides(HAND_OVERRIDES, reviewed as ReviewedFixes);

/** The cut settings for one of a logo's art files: logo-wide `build`, then that file's own fix. */
export function buildFor(key: string, file: string, overrides: Record<string, StickerOverride> = OVERRIDES): BuildSettings {
  const o = overrides[key];
  return { ...o?.build, ...o?.files?.[file] };
}

/**
 * Place defaults for a logo; empty for logos without an override (and for text/upload stickers). A reviewed cut fix
 * (smoothness, fill holes, one piece) also applies to new stickers in the editor, so they match the pre-generated look.
 */
export function placeFor(key: string): PlaceDefaults {
  const o = OVERRIDES[key];
  const b = o?.build ?? {};
  const cut: PlaceDefaults = {
    ...(b.smooth !== undefined ? { smooth: b.smooth } : {}),
    ...(b.fillHoles !== undefined ? { fillHoles: b.fillHoles } : {}),
    ...(b.merge !== undefined ? { merge: b.merge } : {}),
  };
  return { ...cut, ...o?.place };
}

/** Just the style part of a logo's place defaults, for "Reset style". */
export function placeStyleFor(key: string): Partial<StickerStyle> {
  const { theme: _t, variant: _v, w: _w, colors: _c, ...style } = placeFor(key);
  return style;
}

/** default sticker width when a logo is added (editor.addSticker) */
export const DEFAULT_W = 32;

const lit = (v: unknown): string =>
  typeof v === "string" ? JSON.stringify(v) : typeof v === "object" && v !== null
    ? `{ ${Object.entries(v).map(([k, x]) => `${/^[a-z_$][\w$]*$/i.test(k) ? k : JSON.stringify(k)}: ${lit(x)}`).join(", ")} }`
    : String(v);

/**
 * One OVERRIDES line capturing everything about this sticker that differs from a freshly added one, ready to paste
 * into overrides.ts. Null when nothing differs.
 */
export function overrideSnippet(sticker: Sticker, defaults: { style: StickerStyle; theme: "light" | "dark" }): string | null {
  const place: Record<string, unknown> = {};
  for (const k of Object.keys(defaults.style) as (keyof StickerStyle)[]) if (sticker[k] !== defaults.style[k]) place[k] = sticker[k];
  if (sticker.theme !== defaults.theme) place.theme = sticker.theme;
  if (sticker.variant !== "icon") place.variant = sticker.variant;
  if (Math.round(sticker.w) !== DEFAULT_W) place.w = Math.round(sticker.w);
  if (sticker.colors && Object.keys(sticker.colors).length) place.colors = sticker.colors;
  if (!Object.keys(place).length) return null;
  const key = /^[a-z_$][\w$]*$/i.test(sticker.logo) ? sticker.logo : JSON.stringify(sticker.logo);
  return `  ${key}: { place: ${lit(place)} },`;
}
