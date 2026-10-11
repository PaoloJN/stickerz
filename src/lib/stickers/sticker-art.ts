import { CANON, type CutEntry } from "./cuts-types";

/**
 * A finished sticker as one standalone SVG: the precomputed die-cut vinyl (white, with a baked soft shadow) behind the
 * logo itself. Pages that show many stickers (the /stickers sheet) use these as plain <img>s, so the browser rasterises
 * each once instead of re-running a stack of CSS drop-shadow filters on every scroll repaint.
 */

/** room around the vinyl for the baked shadow, mm at the canonical size */
export const ART_PAD = 5;

/** The art box a cut was traced in (CutEntry docs): CANON.artW on the long side. */
export function artBox(aspect: number): { w: number; h: number } {
  return aspect >= 1 ? { w: CANON.artW, h: CANON.artW / aspect } : { w: CANON.artW * aspect, h: CANON.artW };
}

/** Fraction of the sticker image's width taken by the logo itself (to size the <img> like the bare logo). */
export const artShare = (aspect: number) => {
  const { w } = artBox(aspect);
  return w / (w + 2 * (CANON.margin + ART_PAD));
};

const num = (s: string | undefined) => (s ? parseFloat(s) : NaN);

/**
 * Compose the sticker SVG. `logoSvg` is the logo file's source; `cut` is its precomputed outline (null → logo only,
 * e.g. art the cut build couldn't trace). Returns null when the logo source isn't a usable SVG.
 */
/** vinyl colours: white for normal art, near-black for light-coloured art drawn for dark backgrounds */
export const VINYL = { light: "#fff", dark: "#121212" } as const;

export function stickerSvg(logoSvg: string, cut: CutEntry | null, aspectHint = 1, vinylColor: string = VINYL.light): string | null {
  const open = logoSvg.match(/<svg\b[^>]*>/i);
  if (!open) return null;
  const tag = open[0];
  const attr = (name: string) => tag.match(new RegExp(`\\s${name}\\s*=\\s*["']([^"']*)["']`, "i"))?.[1];
  let vb = attr("viewBox")?.trim().split(/[\s,]+/).map(Number);
  if (!vb || vb.length !== 4 || !vb.every(Number.isFinite) || vb[2] <= 0 || vb[3] <= 0) {
    const w = num(attr("width")), h = num(attr("height"));
    if (!(w > 0 && h > 0)) return null;
    vb = [0, 0, w, h];
  }
  const aspect = cut?.aspect ?? (vb[2] / vb[3] || aspectHint);
  const { w, h } = artBox(aspect);
  const m = cut ? CANON.margin : 0;
  const half = { x: w / 2 + m + ART_PAD, y: h / 2 + m + ART_PAD };
  const r = (n: number) => Math.round(n * 100) / 100;

  // the logo as a nested <svg> placed in the art box; drop its own size/position so ours win
  const nestedOpen = tag
    .replace(/\s(width|height|x|y|viewBox|preserveAspectRatio)\s*=\s*["'][^"']*["']/gi, "")
    .replace(/^<svg/i, `<svg x="${r(-w / 2)}" y="${r(-h / 2)}" width="${r(w)}" height="${r(h)}" viewBox="${vb.join(" ")}" preserveAspectRatio="xMidYMid meet"`);
  const body = logoSvg.slice(logoSvg.indexOf(tag) + tag.length);
  // the logo's own closing tag; files may write it as "</svg\n>"
  const close = body.toLowerCase().lastIndexOf("</svg");
  if (close < 0) return null;
  const nested = `${nestedOpen}${body.slice(0, close)}</svg>`;

  const vinyl = cut
    ? `<filter id="ss-sticker-lift" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="0.6" stdDeviation="0.6" flood-color="#141e28" flood-opacity=".18"/><feDropShadow dx="0" dy="2" stdDeviation="2.2" flood-color="#141e28" flood-opacity=".12"/></filter><path d="${cut.d}" fill="${vinylColor}" filter="url(#ss-sticker-lift)"/>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="${r(-half.x)} ${r(-half.y)} ${r(half.x * 2)} ${r(half.y * 2)}" width="${r(half.x * 2)}" height="${r(half.y * 2)}">${vinyl}${nested}</svg>`;
}

/** The library file name of an art href ("/library/x.svg" or "library/x.svg"), or null for any other art. */
export const libraryFile = (href: string): string | null => href.match(/^\/?library\/([\w.-]+\.svg)$/)?.[1] ?? null;

/**
 * The finished sticker image for a library art href (served by /sticker-art), or null for art outside the library.
 * `dark` puts it on dark vinyl, for light-coloured art.
 */
export function stickerArtUrl(href: string, dark = false): string | null {
  const f = libraryFile(href);
  return f ? `/sticker-art/${dark ? "dark/" : ""}${f}` : null;
}
