import type { iSVG, ThemeOptions } from "@/types/svg";
import { svgs } from "@/data/svgs";
import { OVERRIDES, type ArtFix } from "./overrides";
import { STYLE_GROUPS, TITLES } from "./styles";

export type Themed = { light: string; dark?: string };
/** light = art for light backgrounds (white sticker), dark = art for dark backgrounds */
export type LogoArt = { icon: Themed; wordmark?: Themed };
/** An alternate design of the same brand (see styles.ts); `id` is stored in designs and share links. */
export type LogoStyle = LogoArt & { id: string; label: string };

export type StickerLogo = LogoArt & {
  key: string;
  title: string;
  categories: string[];
  /** alternate designs, when the brand has more than one; styles[0] is the default and mirrors icon/wordmark */
  styles?: LogoStyle[];
};

export function logoKey(svg: { route: string | ThemeOptions }): string {
  const route = typeof svg.route === "string" ? svg.route : svg.route.light;
  const file = route.split("/").pop() ?? route;
  return file.replace(/\.svg$/i, "").replace(/[-_](light|dark)$/i, "");
}

const themed = (r: string | ThemeOptions) => (typeof r === "string" ? { light: r } : { light: r.light, dark: r.dark });

export function buildLogos(list: iSVG[]): StickerLogo[] {
  const seen = new Set<string>();
  const out: StickerLogo[] = [];
  for (const svg of list) {
    const key = logoKey(svg);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      key,
      title: svg.title,
      categories: Array.isArray(svg.category) ? svg.category : [svg.category],
      icon: themed(svg.route),
      ...(svg.wordmark ? { wordmark: themed(svg.wordmark) } : {}),
    });
  }
  return out;
}

/**
 * Fold brands listed more than once into one sticker with styles (STYLE_GROUPS), and give same-name brands distinct
 * titles (TITLES). The folded-away entries are dropped from the list; STYLE_ALIASES keeps their old keys working.
 */
export function applyStyles(list: StickerLogo[], groups = STYLE_GROUPS, titles = TITLES): StickerLogo[] {
  const byKey = new Map(list.map((l) => [l.key, l]));
  const folded = new Set<string>();
  const merged = new Map<string, StickerLogo>();
  for (const g of groups) {
    const main = byKey.get(g.key);
    const members = g.styles.map((st) => ({ st, logo: byKey.get(st.from) }));
    if (!main || members.some((m) => !m.logo)) continue;
    const styles = members.map(({ st, logo }) => ({ id: st.id, label: st.label, icon: logo!.icon, ...(logo!.wordmark ? { wordmark: logo!.wordmark } : {}) }));
    const categories = [...new Set(members.flatMap((m) => m.logo!.categories))];
    merged.set(g.key, { ...main, categories, styles });
    for (const m of members) if (m.st.from !== g.key) folded.add(m.st.from);
  }
  return list.filter((l) => !folded.has(l.key)).map((l) => {
    const m = merged.get(l.key) ?? l;
    return titles[l.key] ? { ...m, title: titles[l.key] } : m;
  });
}

/** Old keys of folded-away entries → the sticker and style they became, so old designs and links still open. */
export const STYLE_ALIASES: Record<string, { logo: string; style: string }> = Object.fromEntries(
  STYLE_GROUPS.flatMap((g) => g.styles.filter((st) => st.from !== g.key).map((st) => [st.from, { logo: g.key, style: st.id }])),
);

/** Swap in hand-fixed art from OVERRIDES (see overrides.ts); the library files stay untouched. */
export function withArtFix(logo: StickerLogo, fix: ArtFix | undefined): StickerLogo {
  if (!fix) return logo;
  const icon = { light: fix.icon ?? logo.icon.light, dark: fix.iconDark ?? logo.icon.dark };
  const wordmark = logo.wordmark && { light: fix.wordmark ?? logo.wordmark.light, dark: fix.wordmarkDark ?? logo.wordmark.dark };
  return { ...logo, icon, ...(wordmark ? { wordmark } : {}) };
}

export const LOGOS: StickerLogo[] = applyStyles(buildLogos(svgs)).map((l) => withArtFix(l, OVERRIDES[l.key]?.art));
export const LOGO_BY_KEY = new Map(LOGOS.map((l) => [l.key, l]));
export const isKnownLogo = (key: string) => LOGO_BY_KEY.has(key);

/** The art set for a style id; the logo's own (default) art for none or an unknown id. */
export function styleArt(logo: StickerLogo, style?: string): LogoArt {
  return (style && logo.styles?.find((s) => s.id === style)) || logo;
}

export function artFor(logo: StickerLogo, variant: "icon" | "wordmark", theme: "light" | "dark", style?: string): string {
  const set = styleArt(logo, style);
  const art = variant === "wordmark" && set.wordmark ? set.wordmark : set.icon;
  return theme === "dark" ? (art.dark ?? art.light) : art.light;
}

/** Every art file a logo can show (styles × icon/wordmark × light/dark), for build steps that pre-generate per file. */
export function logoArts(logo: StickerLogo): string[] {
  const sets: LogoArt[] = logo.styles ?? [logo];
  return [...new Set(sets.flatMap((a) => [a.icon, ...(a.wordmark ? [a.wordmark] : [])]).flatMap((t) => [t.light, ...(t.dark ? [t.dark] : [])]))];
}
