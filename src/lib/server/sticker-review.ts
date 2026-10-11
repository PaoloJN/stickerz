import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import { buildCut, resolveBuild, resvgRasterizer, type Rasterize } from "$lib/stickers/cut-build";
import type { CutEntry } from "$lib/stickers/cuts-types";
import { LOGOS, type LogoArt } from "$lib/stickers/logos";
import { buildFor, HAND_OVERRIDES, mergeOverrides, type BuildSettings, type ReviewedFixes } from "$lib/stickers/overrides";
import { stickerSvg, VINYL } from "$lib/stickers/sticker-art";

/**
 * DEV ONLY. Backs the sticker review page (/dev/stickers): every library art file with its generated cut and
 * auto-flags, review state in src/lib/stickers/review.json, cut fixes in overrides.review.json, live previews, and
 * regenerating just the fixed files in cuts.json. Reads and writes the repo's source files, so the routes that use it
 * must 404 outside `dev`.
 */

const ROOT = process.cwd();
const P = {
  review: join(ROOT, "src/lib/stickers/review.json"),
  fixes: join(ROOT, "src/lib/stickers/overrides.review.json"),
  cuts: join(ROOT, "src/lib/stickers/cuts.json"),
  static: join(ROOT, "static"),
};

export type ReviewStatus = "ok" | "fix";
export type ReviewEntry = { status: ReviewStatus; note?: string; at: string };
export type Flag = "no-cut" | "pieces" | "extreme" | "faint";

export type ReviewItem = {
  file: string;
  href: string;
  key: string;
  title: string;
  /** brand style label, for the few with alternate designs */
  style?: string;
  variant: "icon" | "wordmark";
  /** dark-theme art: light-coloured, shown on dark vinyl */
  onDark: boolean;
  aspect: number | null;
  flags: Flag[];
  /** effective cut settings (defaults + logo fix + file fix) */
  build: Required<BuildSettings>;
  /** the logo or this file has a saved fix */
  fixed: boolean;
};

const readJson = <T>(path: string, fallback: T): T => {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    return fallback;
  }
};
const writeJson = (path: string, value: unknown, pretty = true) => writeFileSync(path, JSON.stringify(value, null, pretty ? 2 : 0) + (pretty ? "\n" : ""));

export const readReview = () => readJson<Record<string, ReviewEntry>>(P.review, {});
export const readFixes = () => readJson<ReviewedFixes>(P.fixes, {});
const readCuts = () => readJson<Record<string, CutEntry>>(P.cuts, {});
const fileOf = (href: string) => href.split("/").pop() ?? href;
const source = (href: string) => readFileSync(join(P.static, href.replace(/^\//, "")), "utf8");

/** relative luminance of #rgb / #rrggbb / white / black, or null */
function lum(c: string): number | null {
  const named: Record<string, string> = { white: "#ffffff", black: "#000000" };
  let h = (named[c.toLowerCase()] ?? c).replace("#", "");
  if (h.length === 3) h = [...h].map((x) => x + x).join("");
  if (!/^[0-9a-f]{6}$/i.test(h)) return null;
  const [r, g, b] = [0, 2, 4].map((i) => {
    const v = parseInt(h.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Every paint colour in an SVG's source is very close to the vinyl's colour, so the logo would barely show. */
function faint(svg: string, onDark: boolean): boolean {
  const colors = [...svg.matchAll(/(?:fill|stroke|stop-color|color)\s*[:=]\s*["']?\s*(#[0-9a-f]{3,6}\b|white|black)/gi)].map((m) => lum(m[1]));
  const known = colors.filter((l): l is number => l !== null);
  if (!known.length) return false;
  return onDark ? known.every((l) => l < 0.04) : known.every((l) => l > 0.8);
}

const pieces = (d: string) => (d.match(/M/g) ?? []).length;

/** Every art file a sticker can show, with flags. Dark-theme files only where the library has distinct dark art. */
export function listItems(): ReviewItem[] {
  const cuts = readCuts();
  const fixes = readFixes();
  // fixes read fresh from disk (the imported OVERRIDES is a snapshot from server start)
  const overrides = mergeOverrides(HAND_OVERRIDES, fixes);
  const items: ReviewItem[] = [];
  const seen = new Set<string>();
  for (const l of LOGOS) {
    const sets: (LogoArt & { label?: string })[] = l.styles ?? [l];
    for (const set of sets)
      for (const variant of ["icon", "wordmark"] as const) {
        const art = variant === "icon" ? set.icon : set.wordmark;
        if (!art) continue;
        const files: [string, boolean][] = [[art.light, false]];
        if (art.dark && art.dark !== art.light) files.push([art.dark, true]);
        for (const [href, onDark] of files) {
          const file = fileOf(href);
          if (seen.has(file) || !/^\/?library\//.test(href)) continue;
          seen.add(file);
          const cut = cuts[href] ?? cuts[href.replace(/^\//, "")] ?? null;
          const flags: Flag[] = [];
          if (!cut) flags.push("no-cut");
          else {
            if (pieces(cut.d) > 1) flags.push("pieces");
            // full logos are wide by nature; a very wide or tall *icon* is usually a wordmark filed as the icon
            if (variant === "icon" && (cut.aspect > 4 || cut.aspect < 0.25)) flags.push("extreme");
          }
          try {
            if (faint(source(href), onDark)) flags.push("faint");
          } catch {
            // unreadable file: no-cut already says something's wrong
          }
          items.push({
            file,
            href,
            key: l.key,
            title: l.title,
            ...(l.styles ? { style: (set as { label?: string }).label } : {}),
            variant,
            onDark,
            aspect: cut?.aspect ?? null,
            flags,
            build: resolveBuild(buildFor(l.key, file, overrides)),
            fixed: !!(fixes[l.key]?.build || fixes[l.key]?.files?.[file]),
          });
        }
      }
  }
  return items;
}

export function setReview(file: string, status: ReviewStatus | null, note?: string) {
  const review = readReview();
  if (status) review[file] = { status, ...(note ? { note } : {}), at: new Date().toISOString() };
  else delete review[file];
  writeJson(P.review, Object.fromEntries(Object.entries(review).sort(([a], [b]) => a.localeCompare(b))));
}

let raster: Rasterize | null = null;
/** Node's require with a name the bundler and Vercel's file tracer can't follow, so resvg never ships to production */
function devRequire(name: string): unknown {
  return createRequire(join(ROOT, "package.json"))(name);
}
/** resvg (native) is only loaded when the dev review page actually needs it */
function rasterizer(): Rasterize {
  raster ??= resvgRasterizer((devRequire(["@resvg", "resvg-js"].join("/")) as { Resvg: Parameters<typeof resvgRasterizer>[0] }).Resvg);
  return raster;
}

/** A sticker SVG for one art file with the given cut settings (live preview while tuning a fix). */
export async function previewSvg(href: string, settings: BuildSettings, onDark: boolean): Promise<string | null> {
  const svg = source(href);
  const cut = buildCut(svg, settings, rasterizer());
  return stickerSvg(svg, cut, 1, onDark ? VINYL.dark : VINYL.light);
}

/**
 * Save a cut fix (logo-wide, or for one file), regenerate the affected cut lines in cuts.json, and mark the files as
 * reviewed "ok". `settings` null removes the fix.
 */
export async function saveFix(key: string, file: string | null, settings: BuildSettings | null): Promise<string[]> {
  const fixes = readFixes();
  const entry = { ...fixes[key] };
  if (file) {
    const files = { ...entry.files };
    if (settings) files[file] = settings;
    else delete files[file];
    entry.files = Object.keys(files).length ? files : undefined;
  } else entry.build = settings ?? undefined;
  if (entry.build || entry.files) fixes[key] = JSON.parse(JSON.stringify(entry));
  else delete fixes[key];
  writeJson(P.fixes, fixes);

  // resolve from what we just wrote, not the OVERRIDES snapshot imported at server start
  const overrides = mergeOverrides(HAND_OVERRIDES, fixes);
  const settingsFor = (f: string): BuildSettings => buildFor(key, f, overrides);
  const logo = LOGOS.find((l) => l.key === key);
  const hrefs = logo ? [...new Set((logo.styles ?? [logo]).flatMap((s) => [s.icon, ...(s.wordmark ? [s.wordmark] : [])]).flatMap((t) => [t.light, ...(t.dark ? [t.dark] : [])]))] : [];
  const targets = hrefs.filter((h) => !file || fileOf(h) === file);
  const cuts = readCuts();
  const rasterize = rasterizer();
  for (const href of targets) {
    const cut = buildCut(source(href), settingsFor(fileOf(href)), rasterize);
    if (cut) cuts[href] = cut;
    else delete cuts[href];
  }
  writeJson(P.cuts, cuts, false);
  for (const href of targets) setReview(fileOf(href), "ok", "fixed");
  return targets.map(fileOf);
}
