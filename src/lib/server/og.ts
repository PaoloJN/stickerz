/**
 * The social card for one design: a 1200×630 PNG with the lid (stickers on their die-cut vinyl) on the right and the
 * design's name on the left. Everything is composed as one SVG string, so it can be unit-tested, and only the final
 * step touches the native rasteriser (resvg), loaded on demand.
 *
 * Text is set with opentype.js and emitted as paths, so the rasteriser needs no font files at all.
 */
import * as opentypeNs from "opentype.js";
import type { Font } from "opentype.js";
import { getDevice, getFinish } from "$lib/stickers/devices";
import { artFor, LOGO_BY_KEY } from "$lib/stickers/logos";
import { CANON, type CutEntry } from "$lib/stickers/cuts-types";
import { resolveFill } from "$lib/stickers/style";
import type { Layout } from "$lib/stickers/types";
import { siteConfig } from "@/config/site";
import { normalizeSvg } from "$lib/stickers/svg-normalize";

// opentype.js is CommonJS; its exports land on the module default under rollup/SSR but on the namespace under vite-node
const opentype = (opentypeNs as unknown as { default?: typeof opentypeNs }).default ?? opentypeNs;

export const OG = { w: 1200, h: 630 } as const;
export type OgFonts = { bold: Font; regular: Font };

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Path data from opentype's commands. Written by hand because `Path.toPathData()` in opentype.js 2.0 emits NaN
 * coordinates for some glyph runs (its command list is fine; only its serialiser is not).
 */
export function pathData(p: { commands: { type: string; x?: number; y?: number; x1?: number; y1?: number; x2?: number; y2?: number }[] }): string {
  let d = "";
  for (const c of p.commands) {
    if (c.type === "M" || c.type === "L") d += `${c.type}${r2(c.x!)} ${r2(c.y!)}`;
    else if (c.type === "Q") d += `Q${r2(c.x1!)} ${r2(c.y1!)} ${r2(c.x!)} ${r2(c.y!)}`;
    else if (c.type === "C") d += `C${r2(c.x1!)} ${r2(c.y1!)} ${r2(c.x2!)} ${r2(c.y2!)} ${r2(c.x!)} ${r2(c.y!)}`;
    else if (c.type === "Z") d += "Z";
  }
  return d;
}

/** `text` as a path, baseline at (x, y). */
export function textPath(font: Font, text: string, x: number, y: number, size: number, fill: string, extra = ""): string {
  const d = pathData(font.getPath(text, x, y, size));
  return d ? `<path d="${d}" fill="${fill}"${extra}/>` : "";
}

/** Greedy word wrap to `maxW` px; past `maxLines` the last line is cut with an ellipsis. */
export function wrapText(font: Font, text: string, size: number, maxW: number, maxLines: number): string[] {
  const width = (s: string) => font.getAdvanceWidth(s, size);
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (width(next) <= maxW || !line) line = next;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  // a single word wider than the box gets cut too
  const clip = (s: string) => {
    if (width(s) <= maxW) return s;
    let out = s;
    while (out.length > 1 && width(out + "…") > maxW) out = out.slice(0, -1);
    return out + "…";
  };
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = clip(kept[maxLines - 1] + "…");
    return kept.map(clip);
  }
  return lines.map(clip);
}

export type OgInput = {
  layout: Layout;
  name: string;
  /** die-cut paths by art href */
  cuts: Record<string, CutEntry>;
  /** art href → data: URI (or any href the rasteriser can load) */
  art: Record<string, string>;
  fonts: OgFonts;
  /** the small wordmark icon as a data: URI */
  icon?: string;
};

/** The whole card as an SVG string. Pure: no I/O. */
export function designOgSvg({ layout, name, cuts, art, fonts, icon }: OgInput): string {
  const device = getDevice(layout.laptop.model);
  const finish = getFinish(device, layout.laptop.color);
  const BG = "#111214";

  // --- lid, scaled from mm into a box on the right, slightly tilted like a photo
  const box = { x: 560, y: 60, w: 600, h: 510 };
  const k = Math.min(box.w / device.w, box.h / device.h);
  const lidW = device.w * k, lidH = device.h * k;
  const lx = box.x + (box.w - lidW) / 2, ly = box.y + (box.h - lidH) / 2;
  const stickers = layout.stickers
    .map((s) => {
      const logo = LOGO_BY_KEY.get(s.logo);
      if (!logo) return "";
      const href = artFor(logo, s.variant, s.theme, s.style);
      const src = art[href];
      if (!src) return "";
      const cut = cuts[href] ?? null;
      const aspect = cut?.aspect ?? 1;
      const w = s.w, h = w / aspect;
      const scale = aspect >= 1 ? w / CANON.artW : h / CANON.artW;
      const pad = w * 0.06;
      const fill = resolveFill(s) ?? "#fff";
      const vinyl = cut
        ? `<path d="${cut.d}" transform="scale(${r2(scale)})" fill="${fill}"/>`
        : `<rect x="${r2(-w / 2 - pad)}" y="${r2(-h / 2 - pad)}" width="${r2(w + 2 * pad)}" height="${r2(h + 2 * pad)}" rx="${r2(w * 0.12)}" fill="${fill}"/>`;
      return `<g transform="translate(${r2(s.x)} ${r2(s.y)}) rotate(${r2(s.rot)})" filter="url(#lift)">${vinyl}<image href="${src}" x="${r2(-w / 2)}" y="${r2(-h / 2)}" width="${r2(w)}" height="${r2(h)}" preserveAspectRatio="xMidYMid meet"/></g>`;
    })
    .join("");
  const lid = `<g transform="translate(${r2(lx + lidW / 2)} ${r2(ly + lidH / 2)}) rotate(-4) translate(${r2(-lidW / 2)} ${r2(-lidH / 2)})" filter="url(#lidShadow)">
<svg x="0" y="0" width="${r2(lidW)}" height="${r2(lidH)}" viewBox="0 0 ${device.w} ${device.h}">
<rect width="${device.w}" height="${device.h}" rx="${device.radius}" fill="${finish.base}"/>
<rect width="${device.w}" height="${device.h}" rx="${device.radius}" fill="url(#sheen)"/>
${stickers}
<rect x="0.2" y="0.2" width="${r2(device.w - 0.4)}" height="${r2(device.h - 0.4)}" rx="${device.radius}" fill="none" stroke="#000" stroke-opacity="${finish.dark ? 0.4 : 0.12}" stroke-width="0.4"/>
</svg></g>`;

  // --- left column: name, meta, wordmark
  const col = { x: 64, w: 440 };
  const count = layout.stickers.length;
  const lines = wrapText(fonts.bold, name || "My design", 56, col.w, 3);
  const nameTop = 250 - ((lines.length - 1) * 64) / 2;
  const nameSvg = lines.map((l, i) => textPath(fonts.bold, l, col.x, nameTop + i * 64, 56, "#fff", ' letter-spacing="-1"')).join("");
  const meta = `${count} sticker${count === 1 ? "" : "s"} · ${device.name} · ${finish.name}`;
  const metaSvg = textPath(fonts.regular, wrapText(fonts.regular, meta, 22, 480, 1)[0] ?? "", col.x, nameTop + (lines.length - 1) * 64 + 50, 22, "#8b8d93");
  const brandSvg = `${icon ? `<image href="${icon}" x="${col.x}" y="518" width="36" height="36"/>` : ""}${textPath(fonts.bold, siteConfig.name, col.x + (icon ? 48 : 0), 545, 26, "#fff")}${textPath(fonts.regular, siteConfig.tagline, col.x + (icon ? 48 : 0), 572, 17, "#8b8d93")}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${OG.w}" height="${OG.h}" viewBox="0 0 ${OG.w} ${OG.h}">
<title>${esc(name)}</title>
<defs>
<linearGradient id="sheen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="${finish.dark ? 0.08 : 0.3}"/><stop offset="0.55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="${finish.dark ? 0.22 : 0.08}"/></linearGradient>
<filter id="lift" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="0.6" stdDeviation="0.5" flood-color="#000" flood-opacity=".25"/><feDropShadow dx="0" dy="1.6" stdDeviation="1.4" flood-color="#000" flood-opacity=".18"/></filter>
<filter id="lidShadow" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#000" flood-opacity=".55"/></filter>
<pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#fff" fill-opacity=".08"/></pattern>
</defs>
<rect width="${OG.w}" height="${OG.h}" fill="${BG}"/>
<rect width="${OG.w}" height="${OG.h}" fill="url(#dots)"/>
${nameSvg}${metaSvg}${brandSvg}
${lid}
</svg>`;
}

// ---------------------------------------------------------------- I/O: fonts, art, rasteriser (cached per instance)

let fontsP: Promise<OgFonts> | null = null;
export function loadOgFonts(fetchFn: typeof fetch): Promise<OgFonts> {
  fontsP ??= Promise.all(
    ["/fonts/Geist-Bold.ttf", "/fonts/Geist-Regular.ttf"].map(async (u) => {
      const res = await fetchFn(u);
      if (!res.ok) throw new Error(`font ${u}: ${res.status}`);
      return opentype.parse(await res.arrayBuffer());
    }),
  ).then(([bold, regular]) => ({ bold, regular }));
  fontsP.catch(() => (fontsP = null));
  return fontsP;
}

const artCache = new Map<string, Promise<string | null>>();
/** An SVG from static/ as a data: URI (cached per instance); null when it can't be fetched. */
export function loadArt(href: string, fetchFn: typeof fetch): Promise<string | null> {
  let p = artCache.get(href);
  if (!p) {
    p = fetchFn(href.startsWith("/") ? href : `/${href}`)
      .then(async (res) => {
        if (!res.ok) return null;
        const type = (res.headers.get("content-type") ?? "image/svg+xml").split(";")[0];
        const bytes = type === "image/svg+xml" ? Buffer.from(normalizeSvg(await res.text())) : Buffer.from(await res.arrayBuffer());
        return `data:${type};base64,${bytes.toString("base64")}`;
      })
      .catch(() => null);
    artCache.set(href, p);
    p.then((v) => v == null && artCache.delete(href));
  }
  return p;
}

/** Every art href a layout shows, deduped. */
export function artHrefs(layout: Layout): string[] {
  const out = new Set<string>();
  for (const s of layout.stickers) {
    const logo = LOGO_BY_KEY.get(s.logo);
    if (logo) out.add(artFor(logo, s.variant, s.theme, s.style));
  }
  return [...out];
}

/** SVG → PNG bytes. resvg is native and only needed here, so it is imported on first use. */
export async function rasterize(svg: string): Promise<Uint8Array> {
  const { Resvg } = await import("@resvg/resvg-js");
  return new Resvg(svg, { fitTo: { mode: "width", value: OG.w } }).render().asPng();
}

/** The finished card for a design. */
export async function designOgPng(input: { layout: Layout; name: string; cuts: Record<string, CutEntry> }, fetchFn: typeof fetch): Promise<Uint8Array> {
  const hrefs = artHrefs(input.layout);
  const [fonts, icon, ...arts] = await Promise.all([loadOgFonts(fetchFn), loadArt("/icon.svg", fetchFn), ...hrefs.map((h) => loadArt(h, fetchFn))]);
  const art: Record<string, string> = {};
  hrefs.forEach((h, i) => {
    const a = arts[i];
    if (a) art[h] = a;
  });
  return rasterize(designOgSvg({ ...input, art, fonts, icon: icon ?? undefined }));
}
