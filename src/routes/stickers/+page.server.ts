import type { PageServerLoad } from "./$types";
import { artFor, LOGOS } from "$lib/stickers/logos";
import { logoUsage } from "$lib/server/stacks";
import { categoryList, type PageLogo } from "$lib/logos-page";

const base = LOGOS.map((logo) => ({
  key: logo.key,
  title: logo.title,
  category: logo.categories[0] ?? "Other",
  href: artFor(logo, "icon", "light"),
  hrefDark: artFor(logo, "icon", "dark"),
  ...(logo.wordmark ? { wordmark: artFor(logo, "wordmark", "light"), wordmarkDark: artFor(logo, "wordmark", "dark") } : {}),
  ...(logo.styles
    ? {
        styles: logo.styles.map((st) => ({
          id: st.id,
          label: st.label,
          href: artFor(logo, "icon", "light", st.id),
          hrefDark: artFor(logo, "icon", "dark", st.id),
          ...(st.wordmark ? { wordmark: artFor(logo, "wordmark", "light", st.id), wordmarkDark: artFor(logo, "wordmark", "dark", st.id) } : {}),
        })),
      }
    : {}),
}));
// categories don't depend on usage: build them once per server
const categories = categoryList(base.map((l) => ({ ...l, uses: 0 })));

export const load: PageServerLoad = async () => {
  // real design counts when the database is there; a hiccup just means no counts (never mock numbers)
  let usage: Record<string, number> = {};
  try {
    usage = await logoUsage();
  } catch (e) {
    console.warn("stickers: usage counts unavailable", e);
  }
  const logos: PageLogo[] = base.map((l) => ({ ...l, uses: usage[l.key] ?? 0 }));
  return { logos, categories };
};
