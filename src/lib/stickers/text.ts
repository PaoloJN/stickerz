// opentype.js is CommonJS; its exports land on the module default under rollup/SSR but on the
// namespace under vite-node, so fall back across both.
import * as opentypeNs from "opentype.js";
import type { Font } from "opentype.js";
const opentype = (opentypeNs as unknown as { default?: typeof opentypeNs }).default ?? opentypeNs;
const parse = opentype.parse;

/**
 * Text stickers. Text is set with opentype.js and turned into one vector path, so it behaves exactly like logo art:
 * cut lines, the tight border, recolouring and every export format work, and fonts never depend on what's installed.
 */

/** order is part of the share-link format: append only */
export const FONTS = [
  { id: "bold", name: "Bold", file: "ArchivoBlack-Regular.ttf" },
  { id: "serif", name: "Serif", file: "DMSerifDisplay-Regular.ttf" },
  { id: "mono", name: "Mono", file: "RubikMonoOne-Regular.ttf" },
  { id: "round", name: "Round", file: "LilitaOne-Regular.ttf" },
  { id: "script", name: "Script", file: "Pacifico-Regular.ttf" },
  { id: "tall", name: "Tall", file: "BebasNeue-Regular.ttf" },
] as const;
export type FontId = (typeof FONTS)[number]["id"];
export const FONT_IDS = FONTS.map((f) => f.id) as FontId[];
export const fontUrl = (id: FontId) => `/fonts/sticker/${FONTS.find((f) => f.id === id)!.file}`;
/** CSS family name for previews in the UI */
export const fontFamily = (id: FontId) => `ss-${id}`;

export const ALIGNS = ["left", "center", "right"] as const;
export type TextAlign = (typeof ALIGNS)[number];

export type TextSpec = {
  value: string;
  font: FontId;
  /** hex */
  color: string;
  align: TextAlign;
  /** letter spacing, % of the font size */
  spacing: number;
};

export const TEXT_LIMITS = { length: 120, lines: 4, spacing: [-10, 50] } as const;
export const DEFAULT_TEXT: TextSpec = { value: "hello world", font: "bold", color: "#121212", align: "center", spacing: 0 };

const HEX = /^#[0-9a-f]{6}$/i;

/** Clean untrusted input (share links, storage); null when there's nothing usable. */
export function sanitizeText(v: unknown): TextSpec | null {
  if (typeof v !== "object" || v === null) return null;
  const t = v as Record<string, unknown>;
  if (typeof t.value !== "string") return null;
  const value = t.value.replace(/\r/g, "").split("\n").slice(0, TEXT_LIMITS.lines).join("\n").slice(0, TEXT_LIMITS.length);
  if (!value.trim()) return null;
  const spacing = typeof t.spacing === "number" && Number.isFinite(t.spacing) ? t.spacing : 0;
  return {
    value,
    font: FONT_IDS.includes(t.font as FontId) ? (t.font as FontId) : DEFAULT_TEXT.font,
    color: typeof t.color === "string" && HEX.test(t.color) ? t.color.toLowerCase() : DEFAULT_TEXT.color,
    align: ALIGNS.includes(t.align as TextAlign) ? (t.align as TextAlign) : "center",
    spacing: Math.min(TEXT_LIMITS.spacing[1], Math.max(TEXT_LIMITS.spacing[0], Math.round(spacing))),
  };
}

/** The text as a standalone SVG document, cropped to the ink. Null if no glyph draws anything. */
export function textSvg(font: Font, t: TextSpec): string | null {
  const size = 100;
  const opts = { letterSpacing: t.spacing / 100 };
  const lineHeight = size * 1.12;
  let d = "";
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  t.value.split("\n").forEach((line, i) => {
    if (!line.trim()) return;
    const w = font.getAdvanceWidth(line, size, opts);
    const x = t.align === "center" ? -w / 2 : t.align === "right" ? -w : 0;
    let path;
    try {
      path = font.getPath(line, x, i * lineHeight, size, opts);
    } catch {
      return; // opentype.js doesn't support every OpenType feature; skip rather than break the canvas
    }
    const b = path.getBoundingBox();
    if (!(b.x2 > b.x1)) return;
    d += path.toPathData(2);
    x1 = Math.min(x1, b.x1);
    y1 = Math.min(y1, b.y1);
    x2 = Math.max(x2, b.x2);
    y2 = Math.max(y2, b.y2);
  });
  if (!d) return null;
  const pad = 1;
  const vb = [x1 - pad, y1 - pad, x2 - x1 + 2 * pad, y2 - y1 + 2 * pad].map((n) => Math.round(n * 100) / 100);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.join(" ")}" width="${vb[2]}" height="${vb[3]}"><path fill="${t.color}" d="${d}"/></svg>`;
}

const fonts = new Map<FontId, Promise<Font | null>>();
const loaded = new Map<FontId, Font>();

export function loadFont(id: FontId): Promise<Font | null> {
  let p = fonts.get(id);
  if (!p) {
    p = fetch(fontUrl(id))
      .then((r) => (r.ok ? r.arrayBuffer() : null))
      .then((buf) => (buf ? parse(buf) : null))
      .catch(() => null)
      .then((f) => {
        if (f) loaded.set(id, f);
        return f;
      });
    fonts.set(id, p);
  }
  return p;
}

const hrefs = new Map<string, string | null>();

/**
 * A URL for the text's SVG, or null while its font loads (`onLoad` fires once it's ready).
 * Blob URLs are cached per spec, so re-renders and undo hit the cache.
 */
export function textHref(t: TextSpec, onLoad: () => void): string | null {
  const font = loaded.get(t.font);
  if (!font) {
    loadFont(t.font).then((f) => f && onLoad());
    return null;
  }
  const key = JSON.stringify(t);
  if (!hrefs.has(key)) {
    const svg = textSvg(font, t);
    hrefs.set(key, svg ? URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" })) : null);
  }
  return hrefs.get(key)!;
}

let faces: Promise<unknown> | null = null;
/** Registers the sticker fonts with the page so pickers can preview them (canvas text doesn't need this). */
export function loadFontFaces() {
  if (typeof document === "undefined" || typeof FontFace === "undefined") return;
  faces ??= Promise.all(
    FONTS.map((f) =>
      new FontFace(fontFamily(f.id), `url(${fontUrl(f.id)})`)
        .load()
        .then((ff) => document.fonts.add(ff))
        .catch(() => {}),
    ),
  );
}
