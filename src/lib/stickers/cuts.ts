// SERVER-ONLY. Import from +page.server.ts / +layout.server.ts / $lib/server only; cuts.json is large.
// Client code (e.g. Sticker.svelte) imports the types from ./cuts-types instead.
import cuts from "./cuts.json";
import { artFor, LOGO_BY_KEY } from "./logos";
import type { Layout } from "./types";
import type { CutEntry } from "./cuts-types";

export { CANON, type CutEntry } from "./cuts-types";

/** keyed by art href ("/library/x.svg"); paths are in mm, centred on the art box (see CutEntry) */
const table = cuts as Record<string, CutEntry>;

export const cutFor = (href: string): CutEntry | null => table[href] ?? null;

export function cutsFor(hrefs: Iterable<string>): Record<string, CutEntry> {
  const out: Record<string, CutEntry> = {};
  for (const h of hrefs) {
    const c = table[h];
    if (c) out[h] = c;
  }
  return out;
}

/** Library art URLs used by the layouts; text and upload stickers have no library art and are skipped. */
export function artUrlsIn(layouts: Layout[]): string[] {
  const set = new Set<string>();
  for (const l of layouts)
    for (const s of l.stickers) {
      const logo = LOGO_BY_KEY.get(s.logo);
      if (logo) set.add(artFor(logo, s.variant, s.theme, s.style));
    }
  return [...set];
}
