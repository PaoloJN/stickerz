import { cutPath, type Alpha, type CutOpts } from "./cut";

/** long side of the sampled coverage, px */
const SIZE = 512;
const alphas = new Map<string, Alpha | null>();
const pending = new Map<string, Promise<Alpha | null>>();

/** Coverage of an art URL, once it's loaded; null while loading or if it can't be read. */
export const peekAlpha = (href: string): Alpha | null => alphas.get(href) ?? null;

/** Rasterises the art once per URL and keeps its coverage for cut lines. */
export function loadAlpha(href: string, aspect: number): Promise<Alpha | null> {
  if (alphas.has(href)) return Promise.resolve(alphas.get(href)!);
  let p = pending.get(href);
  if (!p) {
    p = new Promise<Alpha | null>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const w = Math.max(1, Math.round(aspect >= 1 ? SIZE : SIZE * aspect));
        const h = Math.max(1, Math.round(aspect >= 1 ? SIZE / aspect : SIZE));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, w, h);
        const px = ctx.getImageData(0, 0, w, h).data;
        const data = new Float32Array(w * h);
        for (let i = 0; i < w * h; i++) data[i] = px[i * 4 + 3] / 255;
        resolve({ w, h, data });
      };
      img.onerror = () => resolve(null);
      img.src = href;
    }).then((a) => {
      alphas.set(href, a);
      pending.delete(href);
      return a;
    });
    pending.set(href, p);
  }
  return p;
}

const cuts = new Map<string, string>();

/** Memoised `cutPath`; sizes are rounded to 0.1mm so undo/redo and re-renders hit the cache. */
export function getCut(href: string, a: Alpha, o: CutOpts): string {
  const r = (n: number) => Math.round(n * 10) / 10;
  const opts = { ...o, artW: r(o.artW), artH: r(o.artH), margin: r(o.margin), smooth: r(o.smooth) };
  const key = [href, opts.artW, opts.artH, opts.margin, opts.smooth, +opts.fillHoles, +opts.merge].join("|");
  let d = cuts.get(key);
  if (d === undefined) {
    d = cutPath(a, opts);
    if (cuts.size > 400) cuts.delete(cuts.keys().next().value!);
    cuts.set(key, d);
  }
  return d;
}
