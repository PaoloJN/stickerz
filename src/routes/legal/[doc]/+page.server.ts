import { error, redirect } from "@sveltejs/kit";
import { getLegalDoc, LEGAL_ALIASES } from "$lib/legal/docs";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = ({ params }) => {
  // own keys only: `constructor`, `__proto__` etc. must not resolve through the prototype chain
  const alias = Object.hasOwn(LEGAL_ALIASES, params.doc)
    ? LEGAL_ALIASES[params.doc as keyof typeof LEGAL_ALIASES]
    : undefined;
  if (alias) redirect(301, `/legal/${alias}`);
  const doc = getLegalDoc(params.doc);
  if (!doc) error(404, "Not found");
  return { doc };
};
