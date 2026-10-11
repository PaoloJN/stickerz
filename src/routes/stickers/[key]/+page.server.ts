import { error, redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { artFor, LOGO_BY_KEY, LOGOS, STYLE_ALIASES } from "$lib/stickers/logos";
import { artUrlsIn, cutsFor } from "$lib/stickers/cuts";
import { designsWithLogo, logoUsage, type GalleryStack } from "$lib/server/stacks";
import { STACKS } from "$lib/stacks/mock";
import { oftenStacked, versionsFor } from "$lib/sticker-page";
import { siteConfig } from "@/config/site";

const categoryOf = (l: { categories: string[] }) => l.categories[0] ?? "Other";

export const load: PageServerLoad = async ({ params }) => {
  // entries folded into another sticker's styles (e.g. jetbrainsSolid → jetbrains) keep their old URL working
  const alias = STYLE_ALIASES[params.key];
  if (alias) redirect(308, `/stickers/${alias.logo}`);
  const logo = LOGO_BY_KEY.get(params.key);
  if (!logo) error(404, "Sticker not found");

  // real designs and counts when the database answers; otherwise the mock designs stand in (no counts shown)
  let real: GalleryStack[] = [];
  let usage: Record<string, number> = {};
  try {
    [real, usage] = await Promise.all([designsWithLogo(logo.key), logoUsage()]);
  } catch (e) {
    console.warn(`stickers/${logo.key}: community designs unavailable`, e);
  }
  const designsAreMock = real.length === 0;
  const pool: GalleryStack[] = designsAreMock ? STACKS.filter((s) => s.layout.stickers.some((x) => x.logo === logo.key)) : real;
  const designs = pool.slice(0, 3);
  const uses = designsAreMock ? 0 : Math.max(usage[logo.key] ?? 0, real.length);

  const all = LOGOS.map((l) => ({ key: l.key, title: l.title, category: categoryOf(l), uses: usage[l.key] ?? 0 }));
  const related = oftenStacked(
    logo.key,
    pool.map((s) => s.layout.stickers.map((x) => x.logo)),
    all,
    8,
  ).map(({ logo: r, n }) => ({ ...r, href: artFor(LOGO_BY_KEY.get(r.key)!, "icon", "light"), n: designsAreMock ? 0 : n }));

  const versions = versionsFor(logo);
  // brands with alternate designs (JetBrains Solid, Adobe Grayscale…): each style has its own versions
  const styles = logo.styles?.map((st) => ({ id: st.id, label: st.label, versions: versionsFor(st) }));
  const allVersions = [...versions, ...(styles ?? []).flatMap((st) => st.versions)];
  const arts = [...new Set(allVersions.flatMap((v) => [v.light, v.dark])), ...related.map((r) => r.href)];

  return {
    logo: { key: logo.key, title: logo.title, category: categoryOf(logo) },
    versions,
    styles,
    related,
    uses,
    designs,
    designsAreMock,
    /** shared designs considered for "often stacked with" (real ones only; 0 for mocks) */
    designTotal: designsAreMock ? 0 : pool.length,
    cuts: cutsFor([...arts, ...artUrlsIn(designs.map((d) => d.layout))]),
    seo: {
      title: `${logo.title} laptop sticker · ${siteConfig.name}`,
      description: `${logo.title} laptop sticker: put the ${logo.title} logo on your laptop at true size, then print it yourself or send it to a print shop. Free.`,
    },
  };
};
