/**
 * Pure helpers for the /stickers page: sticker tilt, search filter, category sections with one-row previews,
 * sorting by use, the dialog's "often stacked with" list, and the picks stored in localStorage.
 */

export type PageLogo = {
  key: string;
  title: string;
  /** first category only */
  category: string;
  /** icon art for light backgrounds (what sits on white vinyl) */
  href: string;
  hrefDark: string;
  /** wordmark art, when the library has one (light / dark-background versions) */
  wordmark?: string;
  wordmarkDark?: string;
  /** alternate designs of the brand (first = default), each with its own art; only for the few that have them */
  styles?: PageStyle[];
  /** public community designs that use this sticker (0 when unknown: no database, or nobody yet) */
  uses: number;
};

export type Category = { name: string; count: number };
export type Sort = "category" | "az" | "used";
export type Sheet = {
  title: string;
  /** set for category sheets: the category name, used for the "→ <category> stickers" link and expand state */
  category: string | null;
  items: PageLogo[];
};

/** Sheet grid: `repeat(auto-fill, minmax(CELL_MIN px, 1fr))` with CELL_GAP px gaps and CELL_PAD px padding. */
export const CELL_MIN = 146;
export const CELL_GAP = 4;
export const SHEET_PAD = 8;
/** what one row holds at the 1120 px column before anything is measured (SSR) */
export const DEFAULT_COLS = 6;

/** localStorage key for the picks, shared by /stickers and /stickers/[key] */
export const PICKS_KEY = "ss:logos-picks";

export function hashKey(s: string): number {
  let h = 7;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

/** Per-logo tilt in whole degrees, −6..6, stable across renders (SSR == client). */
export const hashRot = (key: string): number => (hashKey(key) % 13) - 6;

/** Case-insensitive substring match on title or category, optionally limited to one category ("All" = no limit). */
export function filterLogos(list: PageLogo[], q: string, cat: string): PageLogo[] {
  const needle = q.trim().toLowerCase();
  return list.filter(
    (l) =>
      (cat === "All" || l.category === cat) &&
      (!needle || l.title.toLowerCase().includes(needle) || l.category.toLowerCase().includes(needle)),
  );
}

/** Categories as they appear in the data, sorted by count (desc); ties keep data order. */
export function categoryList(list: PageLogo[]): Category[] {
  const counts = new Map<string, number>();
  for (const l of list) counts.set(l.category, (counts.get(l.category) ?? 0) + 1);
  return [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
}

const byTitle = (a: PageLogo, b: PageLogo) => a.title.localeCompare(b.title);
/** most used first; ties A–Z */
export const byUse = (a: PageLogo, b: PageLogo) => b.uses - a.uses || byTitle(a, b);

/**
 * Category sort: one sheet per non-empty category (in `cats` order), most used first inside each, ties keep data
 * order. A–Z / Most used: a single sheet.
 */
export function sections(list: PageLogo[], cats: Category[], sort: Sort): Sheet[] {
  if (!list.length) return [];
  if (sort === "az") return [{ title: "All stickers, A–Z", category: null, items: [...list].sort(byTitle) }];
  if (sort === "used") return [{ title: "Most used in designs", category: null, items: [...list].sort(byUse) }];
  const by = new Map<string, PageLogo[]>();
  for (const l of list) by.set(l.category, [...(by.get(l.category) ?? []), l]);
  // Array.sort is stable, so equal use keeps data order
  return cats.filter((c) => by.has(c.name)).map((c) => ({ title: c.name, category: c.name, items: by.get(c.name)!.sort((a, b) => b.uses - a.uses) }));
}

/** Every sticker in the order the sheets show them (what ←/→ in the dialog steps through). */
export const sheetOrder = (sheets: Sheet[]): PageLogo[] => sheets.flatMap((s) => s.items);

/**
 * How many columns `repeat(auto-fill, minmax(min, 1fr))` makes in a grid whose content box is `inner` px wide:
 * n tracks fit when n·min + (n−1)·gap ≤ inner. Never less than 1.
 */
export function rowCapacity(inner: number, min = CELL_MIN, gap = CELL_GAP): number {
  if (!Number.isFinite(inner) || inner <= 0) return 1;
  return Math.max(1, Math.floor((inner + gap) / (min + gap)));
}

export type Preview = {
  shown: PageLogo[];
  /** stickers behind the "+N more" tile (empty when expanded or when everything fits) */
  hidden: PageLogo[];
  /** render the more / fewer tile */
  hasMore: boolean;
  /** the tile reads "+N more" (collapsed) or "Show fewer" (expanded) */
  expanded: boolean;
};

/**
 * One-row preview of a sheet: when `capped` and the sheet holds more than a row of `cols`, show `cols − 1`
 * stickers and use the last slot for the "+N more" tile; expanded shows everything plus a "Show fewer" tile.
 */
export function preview(items: PageLogo[], cols: number, capped: boolean, expanded: boolean): Preview {
  const room = Math.max(1, Math.floor(cols));
  if (!capped || items.length <= room) return { shown: items, hidden: [], hasMore: false, expanded: false };
  if (expanded) return { shown: items, hidden: [], hasMore: true, expanded: true };
  const keep = Math.max(1, room - 1);
  return { shown: items.slice(0, keep), hidden: items.slice(keep), hasMore: true, expanded: false };
}

/** 1234 → "1.2K", 999 → "999" */
export function formatCount(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

/** Cell / dialog meta line: a real design count when there is one, else the category. Never a made-up number. */
export function useLabel(l: Pick<PageLogo, "uses" | "category">): string {
  return l.uses > 0 ? `IN ${formatCount(l.uses)} DESIGN${l.uses === 1 ? "" : "S"}` : l.category.toUpperCase();
}

/** "Often stacked with" in the dialog: same category first (most used), then the most used overall. */
export function oftenWith(logo: PageLogo, all: PageLogo[], n = 6): PageLogo[] {
  const same = all.filter((l) => l.category === logo.category && l.key !== logo.key).sort((a, b) => b.uses - a.uses);
  const rest = all.filter((l) => l.category !== logo.category).sort((a, b) => b.uses - a.uses);
  return [...same, ...rest].slice(0, n);
}

/** Step `dir` through `order` from `key`, wrapping; a key that isn't in `order` starts from its ends. */
export function stepKey(order: string[], key: string, dir: 1 | -1): string | null {
  if (!order.length) return null;
  const i = order.indexOf(key);
  if (i < 0) return dir === 1 ? order[0] : order[order.length - 1];
  return order[(i + dir + order.length) % order.length];
}

export type Picks = { picked: string[]; color: string };

/** Parse stored picks, keeping only known keys (deduped) and a string color; anything malformed → null. */
export function parsePicks(raw: string | null, known: (key: string) => boolean): Picks | null {
  if (!raw) return null;
  try {
    const v: unknown = JSON.parse(raw);
    if (typeof v !== "object" || v === null) return null;
    const o = v as { picked?: unknown; color?: unknown };
    const picked = Array.isArray(o.picked) ? [...new Set(o.picked.filter((k): k is string => typeof k === "string" && known(k)))] : [];
    return { picked, color: typeof o.color === "string" ? o.color : "silver" };
  } catch {
    return null;
  }
}

/** Toggle `key` in the picks (added at the end, so the tray shows the newest last). */
export const togglePick = (picked: string[], key: string): string[] => (picked.includes(key) ? picked.filter((k) => k !== key) : [...picked, key]);

/** Browser-only helpers around `parsePicks`; storage can throw (private mode, blocked), which reads as "no picks". */
export function loadPicks(known: (key: string) => boolean): Picks {
  try {
    return parsePicks(localStorage.getItem(PICKS_KEY), known) ?? { picked: [], color: "silver" };
  } catch {
    return { picked: [], color: "silver" };
  }
}
export function savePicks(p: Picks): void {
  try {
    localStorage.setItem(PICKS_KEY, JSON.stringify(p));
  } catch {
    // storage full or blocked: picks just won't survive a reload
  }
}

export type PageStyle = { id: string; label: string; href: string; hrefDark: string; wordmark?: string; wordmarkDark?: string };

/** Logo type and theme, named like the editor: Icon / Full logo, Theme Light / Dark. */
export type LogoKind = "icon" | "wordmark";
export type ArtTheme = "light" | "dark";

/**
 * The art for a logo type and theme, or null when the library doesn't have it: no full logo, or no separate dark-theme art
 * (light-coloured art for dark stickers). Callers keep every option visible and disable the null ones.
 */
export function pageArt(
  logo: Pick<PageLogo, "href" | "hrefDark" | "wordmark" | "wordmarkDark" | "styles">,
  kind: LogoKind,
  theme: ArtTheme,
  style?: string,
): string | null {
  const l = (style && logo.styles?.find((s) => s.id === style)) || logo;
  const a = kind === "icon" ? { light: l.href, dark: l.hrefDark } : l.wordmark ? { light: l.wordmark, dark: l.wordmarkDark } : null;
  if (!a) return null;
  if (theme === "light") return a.light;
  return a.dark && a.dark !== a.light ? a.dark : null;
}
