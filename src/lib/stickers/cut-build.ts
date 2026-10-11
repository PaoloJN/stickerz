import { cutPath, type Alpha } from "./cut";
import { CANON, type CutEntry } from "./cuts-types";
import { DEFAULT_STYLE, smoothMm } from "./style";
import type { BuildSettings } from "./overrides";

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
  const d = cutPath(a, { artW, artH, margin: b.margin, smooth: smoothMm(b.smooth, artW, artH), fillHoles: b.fillHoles, merge: b.merge });
  if (!d) return null;
  return { d: d.replace(/(\d+\.\d)\d+/g, "$1"), aspect: Math.round(aspect * 1000) / 1000 };
}
