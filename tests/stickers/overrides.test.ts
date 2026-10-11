import { existsSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createEditor } from "../../src/lib/stickers/editor.svelte";
import { emptyLayout } from "../../src/lib/stickers/laptops";
import { LOGO_BY_KEY, withArtFix, type StickerLogo } from "../../src/lib/stickers/logos";
import { buildFor, DEFAULT_W, mergeOverrides, OVERRIDES, overrideSnippet } from "../../src/lib/stickers/overrides";
import { resolveBuild } from "../../src/lib/stickers/cut-build";
import { DEFAULT_STYLE, STYLE_KEYS } from "../../src/lib/stickers/style";
import type { Sticker } from "../../src/lib/stickers/types";

const PLACE_EXTRA = ["theme", "variant", "w", "colors"];

describe("OVERRIDES entries", () => {
  it("point at real logos, style fields and art files", () => {
    for (const [key, o] of Object.entries(OVERRIDES)) {
      expect(LOGO_BY_KEY.has(key), `"${key}" is not a logo key`).toBe(true);
      for (const k of Object.keys(o.place ?? {})) expect([...STYLE_KEYS, ...PLACE_EXTRA]).toContain(k);
      for (const f of Object.values(o.art ?? {})) expect(existsSync(join("static", f)), `missing art file static${f}`).toBe(true);
      const b = o.build ?? {};
      if (b.margin !== undefined) expect(b.margin).toBeGreaterThanOrEqual(0);
      if (b.smooth !== undefined) expect(b.smooth).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("art fixes", () => {
  const logo: StickerLogo = { key: "x", title: "X", categories: [], icon: { light: "/a.svg", dark: "/a-dark.svg" } };
  it("swaps only the files given", () => {
    expect(withArtFix(logo, { iconDark: "/fixed.svg" }).icon).toEqual({ light: "/a.svg", dark: "/fixed.svg" });
    expect(withArtFix(logo, undefined)).toBe(logo);
    expect(withArtFix(logo, { wordmark: "/w.svg" }).wordmark).toBeUndefined();
  });
});

describe("place defaults", () => {
  const key = [...LOGO_BY_KEY.keys()][0];
  afterEach(() => delete OVERRIDES[key]);

  it("apply when a logo is added, and the caller still wins", () => {
    OVERRIDES[key] = { place: { contour: "smooth", smooth: 80, w: 44 } };
    const e = createEditor(emptyLayout());
    const s = e.addSticker(key);
    expect(s).toMatchObject({ contour: "smooth", smooth: 80, w: 44 });
    expect(e.addSticker(key, undefined, { w: 20 }).w).toBe(20);
    e.update(s.id, { smooth: 10, contour: "tight" });
    e.resetStyle(s.id);
    expect(e.layout.stickers[0]).toMatchObject({ contour: "smooth", smooth: 80 });
  });
});

describe("copy as override", () => {
  const base = { id: "s", logo: "nvidia", variant: "icon", theme: "dark", locked: false, ...DEFAULT_STYLE, x: 0, y: 0, w: DEFAULT_W, rot: 0 } as Sticker;
  const defaults = { style: DEFAULT_STYLE, theme: "dark" as const };
  it("captures only what differs from a fresh sticker", () => {
    expect(overrideSnippet(base, defaults)).toBeNull();
    expect(overrideSnippet({ ...base, contour: "tight", smooth: 70, w: 40.4, variant: "wordmark" }, defaults)).toBe(
      `  nvidia: { place: { contour: "tight", smooth: 70, variant: "wordmark", w: 40 } },`,
    );
    expect(overrideSnippet({ ...base, logo: "amazon-q", colors: { "#ff0000": "#00ff00" } }, defaults)).toBe(
      `  "amazon-q": { place: { colors: { "#ff0000": "#00ff00" } } },`,
    );
  });
});

describe("reviewed cut fixes", () => {
  it("merge over hand-written ones, file fixes on top of the logo's", () => {
    const merged = mergeOverrides(
      { a: { note: "hand", place: { theme: "dark" }, build: { margin: 2, smooth: 10 } } },
      { a: { build: { smooth: 70 }, files: { "a_dark.svg": { stripMasks: true } } }, b: { build: { merge: false } } },
    );
    expect(merged.a).toMatchObject({ note: "hand", place: { theme: "dark" }, build: { margin: 2, smooth: 70 } });
    expect(buildFor("a", "a_dark.svg", merged)).toEqual({ margin: 2, smooth: 70, stripMasks: true });
    expect(buildFor("a", "a.svg", merged)).toEqual({ margin: 2, smooth: 70 });
    expect(buildFor("b", "b.svg", merged)).toEqual({ merge: false });
    expect(buildFor("none", "x.svg", merged)).toEqual({});
  });
  it("fill in build defaults", () => {
    expect(resolveBuild({ smooth: 80 })).toEqual({ shape: "trace", margin: 3, smooth: 80, fillHoles: true, merge: true, stripMasks: false });
  });
});
