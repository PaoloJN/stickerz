import { error } from "@sveltejs/kit";
import { getStack } from "$lib/server/stacks";
import { artUrlsIn, cutsFor } from "$lib/stickers/cuts";
import { getDevice } from "$lib/stickers/devices";
import { siteConfig } from "@/config/site";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params, locals }) => {
  const stack = await getStack(params.id, locals.ownerId);
  if (!stack) error(404, "Design not found");
  const v = stack.updatedAt ? `?v=${Date.parse(stack.updatedAt)}` : "";
  return {
    stack,
    cuts: cutsFor(artUrlsIn([stack.layout])),
    seo: {
      title: `${stack.name} · ${siteConfig.name}`,
      description: `${stack.count} sticker${stack.count === 1 ? "" : "s"} on a ${getDevice(stack.layout.laptop.model).name}, by ${stack.by}. Remix it or print it at true size.`,
      image: `${siteConfig.url}/designs/${stack.id}/og.png${v}`,
      imageAlt: `${stack.name}: a laptop lid with ${stack.count} stickers`,
    },
  };
};
