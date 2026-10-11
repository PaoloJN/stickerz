/**
 * Logos as inline SVG, so a sticker can recolour them and grow an exact vector silhouette ("Tight" border).
 *
 * Each art URL is parsed once in the browser: unsafe bits are stripped, ids are made unique per sticker, and every
 * element's computed paint is baked into plain attributes (so `<style>` blocks, classes and `currentColor` all
 * resolve, and nothing leaks into the page). The result is two string templates:
 *
 * - `art`: the logo with every colour replaced by a palette slot `__C{i}__`
 * - `silhouette`: every painted element filled and stroked with `__CUT__`, stroke width `__SW:{own}:{1/scale}__`, so
 *   adding the same width everywhere grows the whole logo evenly (round joins = an exact offset)
 *
 * Templates use plain attributes rather than CSS variables so SVG/PDF exports stay portable.
 */

export type InlineArt = {
  viewBox: [number, number, number, number];
  art: string;
  silhouette: string;
  /** distinct colours in order of appearance, lowercase hex; slot i ↔ `__C{i}__` */
  palette: string[];
};

import { normalizeSvg } from "./svg-normalize";

const SVG_NS = "http://www.w3.org/2000/svg";
const MAX_COLORS = 24;
const PAINTED = new Set(["path", "rect", "circle", "ellipse", "line", "polyline", "polygon", "text"]);
const DROP = new Set(["script", "foreignObject", "iframe", "style", "metadata", "title", "desc"]);
/** presentation properties baked from computed style */
const BAKE = ["fill-rule", "clip-rule", "stroke-linecap", "stroke-linejoin", "stroke-miterlimit", "stroke-dasharray", "stroke-dashoffset", "paint-order", "vector-effect"];
const TEXT_BAKE = ["font-family", "font-size", "font-weight", "font-style", "letter-spacing", "text-anchor", "dominant-baseline"];

const cache = new Map<string, InlineArt | null>();
const pending = new Map<string, Promise<InlineArt | null>>();
let parses = 0;

export const peekInline = (href: string): InlineArt | null => cache.get(href) ?? null;

export function loadInline(href: string): Promise<InlineArt | null> {
  if (cache.has(href)) return Promise.resolve(cache.get(href)!);
  let p = pending.get(href);
  if (!p) {
    p = fetch(href)
      .then((r) => (r.ok ? r.text() : null))
      .then((text) => (text ? parse(text) : null))
      .catch(() => null)
      .then((a) => {
        cache.set(href, a);
        pending.delete(href);
        return a;
      });
    pending.set(href, p);
  }
  return p;
}

function toHex(c: string): string | null {
  const m = c.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+%?))?\s*\)$/);
  if (!m) return null;
  return "#" + [m[1], m[2], m[3]].map((v) => Math.round(Number(v)).toString(16).padStart(2, "0")).join("");
}
const transparent = (c: string) => /^rgba\(.*[,\s/]\s*0\s*\)$/.test(c) || c === "transparent";
const urlRef = (c: string) => c.match(/url\(\s*["']?(#[^"')]+)["']?\s*\)/)?.[1];
const scaleOf = (m: DOMMatrix | null) => (m ? Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) : 1);

function parse(text: string): InlineArt | null {
  if (typeof document === "undefined") return null;
  const doc = new DOMParser().parseFromString(normalizeSvg(text), "image/svg+xml");
  const src = doc.documentElement;
  if (src.nodeName !== "svg" || doc.querySelector("parsererror")) return null;

  // unique temporary ids while the logo sits in the page; swapped for the `__ID__` token on the way out
  const tmp = `ssinl${++parses}x`;
  const ids = new Map<string, string>();
  src.querySelectorAll("[id]").forEach((el, i) => {
    ids.set(el.id, `${tmp}${i}`);
    el.id = `${tmp}${i}`;
  });
  const retarget = (v: string) => v.replace(/url\(\s*["']?#([^"')]+)["']?\s*\)/g, (m, id) => (ids.has(id) ? `url(#${ids.get(id)})` : m));

  for (const el of [...src.querySelectorAll("*")]) {
    if (DROP.has(el.localName) && el.localName !== "style") {
      el.remove();
      continue;
    }
    for (const a of [...el.attributes]) {
      const name = a.name.toLowerCase();
      if (name.startsWith("on")) el.removeAttribute(a.name);
      else if (name === "href" || name === "xlink:href") {
        const v = a.value.trim();
        if (v.startsWith("#")) el.setAttribute(a.name, ids.has(v.slice(1)) ? `#${ids.get(v.slice(1))}` : v);
        else if (!(el.localName === "image" && /^data:image\/(png|jpe?g|gif|webp);/i.test(v))) el.removeAttribute(a.name);
      } else if (a.value.includes("url(")) el.setAttribute(a.name, retarget(a.value));
    }
  }
  src.querySelectorAll("style").forEach((s) => (s.textContent = retarget(s.textContent ?? "")));

  const vb = src.getAttribute("viewBox")?.trim().split(/[\s,]+/).map(Number);
  const w = parseFloat(src.getAttribute("width") ?? "");
  const h = parseFloat(src.getAttribute("height") ?? "");
  const viewBox: [number, number, number, number] | null =
    vb?.length === 4 && vb.every(Number.isFinite) && vb[2] > 0 && vb[3] > 0 ? (vb as [number, number, number, number]) : w > 0 && h > 0 ? [0, 0, w, h] : null;
  if (!viewBox) return null;

  // attach off-screen so computed styles and transforms resolve
  const host = document.createElementNS(SVG_NS, "svg");
  host.setAttribute("style", "position:fixed;left:-9999px;top:0;width:100px;height:100px;visibility:hidden;pointer-events:none");
  const root = document.importNode(src, true) as unknown as SVGSVGElement;
  root.setAttribute("viewBox", viewBox.join(" "));
  root.setAttribute("width", "100");
  root.setAttribute("height", "100");
  host.append(root);
  document.body.append(host);
  try {
    const probe = document.createElementNS(SVG_NS, "g");
    root.append(probe);
    const base = scaleOf(probe.getCTM()) || 1;
    probe.remove();

    const palette: string[] = [];
    const paint = (c: string): string => {
      if (c === "none" || transparent(c)) return "none";
      const ref = urlRef(c);
      if (ref) return `url(${ref})`;
      const hex = toHex(c);
      if (!hex) return c;
      let i = palette.indexOf(hex);
      if (i < 0) {
        if (palette.length >= MAX_COLORS) return hex;
        i = palette.push(hex) - 1;
      }
      return `__C${i}__`;
    };

    type Shape = { el: Element; fill: boolean; stroke: boolean; sw: number; inv: number };
    const shapes: Shape[] = [];
    const all = [...root.querySelectorAll("*")];
    // CSS-only properties with no attribute form survive as a minimal style attribute
    const keepStyle = new Map<Element, string>();
    for (const el of all) {
      const cs = getComputedStyle(el);
      const geometryOnly = !!el.parentElement?.closest("clipPath, mask");
      if (cs.opacity !== "1") el.setAttribute("opacity", cs.opacity);
      if (cs.display === "none") el.setAttribute("display", "none");
      // the style attribute goes away below, so what it carried must land in attributes first
      if (el.localName === "mask") el.setAttribute("mask-type", cs.maskType || "luminance");
      if (cs.mixBlendMode && cs.mixBlendMode !== "normal") keepStyle.set(el, `mix-blend-mode:${cs.mixBlendMode}`);
      if (/transform/.test(el.getAttribute("style") ?? "") && cs.transform && cs.transform !== "none") el.setAttribute("transform", cs.transform);
      if (el.localName === "stop") {
        el.setAttribute("stop-color", paint(cs.stopColor));
        el.setAttribute("stop-opacity", cs.stopOpacity);
      }
      if (!PAINTED.has(el.localName) && el.localName !== "tspan") continue;
      const fill = paint(cs.fill);
      const stroke = paint(cs.stroke);
      const sw = parseFloat(cs.strokeWidth) || 0;
      el.setAttribute("fill", fill);
      el.setAttribute("stroke", stroke);
      el.setAttribute("stroke-width", String(sw));
      el.setAttribute("fill-opacity", cs.fillOpacity);
      el.setAttribute("stroke-opacity", cs.strokeOpacity);
      for (const p of BAKE) el.setAttribute(p, cs.getPropertyValue(p));
      if (el.localName === "text" || el.localName === "tspan") for (const p of TEXT_BAKE) el.setAttribute(p, cs.getPropertyValue(p));
      if (!geometryOnly && PAINTED.has(el.localName)) {
        const k = scaleOf((el as SVGGraphicsElement).getCTM?.() ?? null) / base || 1;
        shapes.push({ el, fill: fill !== "none", stroke: stroke !== "none" && sw > 0, sw, inv: 1 / k });
      }
    }
    for (const el of all) {
      el.removeAttribute("class");
      el.removeAttribute("style");
      const keep = keepStyle.get(el);
      if (keep) el.setAttribute("style", keep);
    }
    root.querySelectorAll("style").forEach((s) => s.remove());

    const serialize = () => {
      const xs = new XMLSerializer();
      return [...root.childNodes]
        .map((n) => xs.serializeToString(n))
        .join("")
        .replace(/ xmlns(:\w+)?="[^"]*"/g, "")
        .replaceAll(tmp, "__ID__-");
    };
    const art = serialize();

    for (const s of shapes) {
      s.el.setAttribute("fill", s.fill ? "__CUT__" : "none");
      s.el.setAttribute("stroke", "__CUT__");
      s.el.setAttribute("stroke-width", `__SW:${s.stroke ? s.sw : 0}:${s.inv}__`);
      s.el.setAttribute("stroke-linejoin", "round");
      s.el.setAttribute("stroke-linecap", "round");
      for (const a of ["stroke-dasharray", "fill-opacity", "stroke-opacity"]) s.el.removeAttribute(a);
    }
    for (const el of root.querySelectorAll("*")) {
      for (const a of ["clip-path", "mask", "filter", "opacity"]) el.removeAttribute(a);
    }
    root.querySelectorAll("image").forEach((n) => n.remove());
    const silhouette = serialize();

    return { viewBox, art, silhouette, palette };
  } finally {
    host.remove();
  }
}

/** The logo markup for one sticker. `color` maps each palette slot to the paint to use. */
export function renderArt(a: InlineArt, id: string, color: (orig: string) => string): string {
  return a.art.replaceAll("__ID__", id).replace(/__C(\d+)__/g, (_, i) => color(a.palette[+i]));
}

/** The logo's silhouette in one paint, every edge pushed out by `grow / 2` (viewBox units). */
export function renderSilhouette(a: InlineArt, id: string, paint: string, grow: number): string {
  return a.silhouette
    .replaceAll("__ID__", id)
    .replaceAll("__CUT__", paint)
    .replace(/__C\d+__/g, paint)
    .replace(/__SW:([-\d.e]+):([-\d.e]+)__/g, (_, sw, inv) => String(Math.round((+sw + grow * +inv) * 1000) / 1000));
}

/** viewBox units per mm when the art is fit (meet) into an artW × artH box */
export const unitsPerMm = (a: InlineArt, artW: number, artH: number) => Math.max(a.viewBox[2] / artW, a.viewBox[3] / artH);
