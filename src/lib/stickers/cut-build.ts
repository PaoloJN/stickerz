import { cutPath, type Alpha } from "./cut";
import { CANON, type CutEntry } from "./cuts-types";
import { DEFAULT_STYLE, smoothMm } from "./style";
import type { BuildSettings, CutShape } from "./overrides";
import { normalizeSvg } from "./svg-normalize";

/**
 * Generating one precomputed cut line from an SVG file's source: shared by scripts/build-cuts.ts and the dev sticker
 * review page (live previews, regenerating one file after a fix). The rasteriser is passed in so this module never
 * imports the native resvg binding itself.
 */

export type Rasterize = (svg: string) => Alpha;

/** long side of the sampled coverage, px (same as alpha.ts) */
export const RASTER_SIZE = 512;

type ResvgLike = new (svg: string, opts?: object) => {
  width: number;
  height: number;
  render(): { width: number; height: number; pixels: Uint8Array | Buffer };
};

/** A Rasterize backed by @resvg/resvg-js: alpha coverage at RASTER_SIZE on the long side. */
export function resvgRasterizer(Resvg: ResvgLike): Rasterize {
  return (svg) => {
    const probe = new Resvg(svg);
    const tall = probe.height > probe.width;
    const { width: w, height: h, pixels: px } = new Resvg(svg, { fitTo: { mode: tall ? "height" : "width", value: RASTER_SIZE } }).render();
    const data = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) data[i] = px[i * 4 + 3] / 255;
    return { w, h, data };
  };
}

/** Every setting filled in with the build defaults. */
export function resolveBuild(b: BuildSettings = {}): Required<BuildSettings> {
  return {
    shape: b.shape ?? "trace",
    margin: b.margin ?? CANON.margin,
    smooth: b.smooth ?? DEFAULT_STYLE.smooth,
    fillHoles: b.fillHoles ?? true,
    merge: b.merge ?? true,
    stripMasks: b.stripMasks ?? false,
  };
}

const unmask = (svg: string) => svg.replace(/\s(mask|clip-path)="url\([^)]*\)"/g, "");
const blank = (a: Alpha) => a.w < 1 || a.h < 1 || !a.data.some((v) => v > 0);

/** The cut line for one SVG source, or null when it draws nothing or can't be read. */
export function buildCut(svg: string, settings: BuildSettings, rasterize: Rasterize): CutEntry | null {
  const b = resolveBuild(settings);
  svg = normalizeSvg(svg);
  let a: Alpha;
  try {
    a = rasterize(b.stripMasks ? unmask(svg) : svg);
    // resvg ignores `mask-type: alpha` (and some files clip with a mask id), which can hide the whole logo;
    // the unmasked art is a close enough silhouette for a cut line
    if (blank(a)) a = rasterize(unmask(svg));
  } catch {
    return null;
  }
  if (blank(a)) return null;
  const aspect = a.w / a.h;
  const artW = aspect >= 1 ? CANON.artW : CANON.artW * aspect;
  const artH = aspect >= 1 ? CANON.artW / aspect : CANON.artW;
  const d = b.shape === "trace" ? cutPath(a, { artW, artH, margin: b.margin, smooth: smoothMm(b.smooth, artW, artH), fillHoles: b.fillHoles, merge: b.merge }) : shapePath(a, b.shape, artW, b.margin);
  if (!d) return null;
  return { d: d.replace(/(\d+\.\d)\d+/g, "$1"), aspect: Math.round(aspect * 1000) / 1000 };
}

/** Painted extent of the alpha, px: [x0, y0, x1, y1] (exclusive), or null when nothing is painted. */
export function alphaBounds(a: Alpha, threshold = 0.5): [number, number, number, number] | null {
  let x0 = a.w, y0 = a.h, x1 = -1, y1 = -1;
  for (let y = 0; y < a.h; y++)
    for (let x = 0; x < a.w; x++)
      if (a.data[y * a.w + x] >= threshold) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  return x1 < 0 ? null : [x0, y0, x1 + 1, y1 + 1];
}

/**
 * A solid circle or rounded square around everything the logo paints, `margin` mm past its longer side, centred on
 * the painted area. Same coordinate space as a traced cut: mm, origin at the art box centre.
 */
export function shapePath(a: Alpha, shape: Exclude<CutShape, "trace">, artW: number, margin: number): string {
  const bb = alphaBounds(a);
  if (!bb) return "";
  const k = artW / a.w; // px → mm
  const cx = ((bb[0] + bb[2]) / 2 - a.w / 2) * k;
  const cy = ((bb[1] + bb[3]) / 2 - a.h / 2) * k;
  const w = (bb[2] - bb[0]) * k, h = (bb[3] - bb[1]) * k;
  const f = (n: number) => Math.round(n * 100) / 100;
  if (shape === "circle") {
    // a circle on the longer side would clip the corners of a wide or tall logo, so use the diagonal when the
    // painted area isn't close to square
    const long = Math.max(w, h), diag = Math.hypot(w, h);
    const r = (Math.min(w, h) / long > 0.85 ? long : diag) / 2 + margin;
    return `M${f(cx - r)} ${f(cy)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0Z`;
  }
  const side = Math.max(w, h) + 2 * margin;
  const rad = side * 0.18;
  const x = cx - side / 2, y = cy - side / 2;
  return `M${f(x + rad)} ${f(y)}h${f(side - 2 * rad)}a${f(rad)} ${f(rad)} 0 0 1 ${f(rad)} ${f(rad)}v${f(side - 2 * rad)}a${f(rad)} ${f(rad)} 0 0 1 ${f(-rad)} ${f(rad)}h${f(-(side - 2 * rad))}a${f(rad)} ${f(rad)} 0 0 1 ${f(-rad)} ${f(-rad)}v${f(-(side - 2 * rad))}a${f(rad)} ${f(rad)} 0 0 1 ${f(rad)} ${f(-rad)}Z`;
}
