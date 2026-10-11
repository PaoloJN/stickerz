import { listGallery } from "$lib/server/stacks";
import { STACKS, buildLayout, toKeys } from "$lib/stacks/mock";
import { artUrlsIn, cutsFor } from "$lib/stickers/cuts";
import { LOGOS } from "$lib/stickers/logos";
import { HERO_IDS, SHUFFLE_IDS, decorativeHrefs, pickTeaser } from "$lib/home";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
  // a DB hiccup must not take the landing page down: fall back to the mock teaser
  let real: Awaited<ReturnType<typeof listGallery>> = [];
  try {
    real = await listGallery("trending");
  } catch (e) {
    console.warn("home: gallery teaser unavailable, using mocks", e);
  }
  // never an empty teaser: the mocks stand in until someone shares a public stack.
  // Mock stacks have no /stack/<id> page, so their cards open the editor with the layout instead.
  const teaserIsMock = real.length === 0;
  const stacks = pickTeaser(real, STACKS);
  const hero = stacks[0]?.layout ?? buildLayout(toKeys(HERO_IDS), "silver", 1);
  const shuffle = buildLayout(toKeys(SHUFFLE_IDS), "starlight", 4);
  const layouts = [hero, shuffle, ...stacks.map((s) => s.layout)];
  return {
    stacks,
    teaserIsMock,
    hero,
    shuffle,
    cuts: cutsFor([...artUrlsIn(layouts), ...decorativeHrefs()]),
    logoCount: LOGOS.length,
  };
};
