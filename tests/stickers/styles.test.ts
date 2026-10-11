import { describe, expect, it } from "vitest";
import { applyStyles, artFor, LOGO_BY_KEY, LOGOS, logoArts, STYLE_ALIASES, type StickerLogo } from "../../src/lib/stickers/logos";
import { decodeLayout, encodeLayout, sanitizeLayout } from "../../src/lib/stickers/codec";
import { STYLE_GROUPS } from "../../src/lib/stickers/styles";
import { DEFAULT_STYLE } from "../../src/lib/stickers/style";
import type { Layout } from "../../src/lib/stickers/types";

const L = (key: string, extra: Partial<StickerLogo> = {}): StickerLogo => ({ key, title: key, categories: ["X"], icon: { light: `/${key}.svg` }, ...extra });

describe("applyStyles", () => {
  it("folds alternate designs into one sticker and renames same-name brands", () => {
    const out = applyStyles(
      [L("a"), L("a-gray", { categories: ["Y"] }), L("b")],
      [{ key: "a", styles: [{ id: "color", label: "Color", from: "a" }, { id: "gray", label: "Gray", from: "a-gray" }] }],
      { b: "B (the other one)" },
    );
    expect(out.map((l) => l.key)).toEqual(["a", "b"]);
    expect(out[0].styles?.map((s) => [s.id, s.icon.light])).toEqual([["color", "/a.svg"], ["gray", "/a-gray.svg"]]);
    expect(out[0].categories).toEqual(["X", "Y"]);
    expect(out[1].title).toBe("B (the other one)");
  });
  it("skips a group whose entries aren't all there", () => {
    expect(applyStyles([L("a")], [{ key: "a", styles: [{ id: "c", label: "C", from: "a" }, { id: "g", label: "G", from: "missing" }] }]).map((l) => l.styles)).toEqual([undefined]);
  });
});

describe("the real registry", () => {
  it("every curated group resolved, folded keys are gone, styles pick their art", () => {
    for (const g of STYLE_GROUPS) {
      const logo = LOGO_BY_KEY.get(g.key)!;
      expect(logo.styles?.map((s) => s.id), g.key).toEqual(g.styles.map((s) => s.id));
      for (const st of g.styles.slice(1)) {
        expect(LOGO_BY_KEY.has(st.from)).toBe(false);
        expect(artFor(logo, "icon", "light", st.id)).toContain(st.from);
      }
    }
    // no two stickers share a name any more (the three Arcs were the last ones)
    expect(new Set(LOGOS.map((l) => l.title)).size).toBe(LOGOS.length);
    expect(["arc", "arc_fintech", "arc_browser"].map((k) => LOGO_BY_KEY.get(k)?.title)).toEqual(["Arc.dev", "Arc (fintech)", "Arc Browser"]);
    expect(logoArts(LOGO_BY_KEY.get("jetbrains")!)).toEqual(["/library/jetbrains.svg", "/library/jetbrainsSolid.svg"]);
  });
});

describe("designs and share links", () => {
  const base = { variant: "icon" as const, theme: "light" as const, locked: false, ...DEFAULT_STYLE, x: 10, y: 10, w: 30, rot: 0 };
  it("keep the style, drop unknown or default ones", () => {
    const layout: Layout = { v: 1, laptop: { model: "air13", color: "silver" }, stickers: [{ id: "a", logo: "jetbrains", style: "solid", ...base }] };
    expect(decodeLayout(encodeLayout(layout))!.stickers[0].style).toBe("solid");
    const s = sanitizeLayout({ v: 1, laptop: {}, stickers: [{ logo: "jetbrains", style: "nope" }, { logo: "jetbrains", style: "default" }, { logo: "vercel", style: "solid" }] })!;
    expect(s.stickers.map((x) => x.style)).toEqual([undefined, undefined, undefined]);
  });
  it("open old designs that used a folded-away entry", () => {
    const [old] = Object.entries(STYLE_ALIASES);
    const s = sanitizeLayout({ v: 1, laptop: {}, stickers: [{ logo: old[0] }] })!;
    expect(s.stickers[0]).toMatchObject({ logo: old[1].logo, style: old[1].style });
  });
});
