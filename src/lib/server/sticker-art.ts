import { error } from "@sveltejs/kit";
import { cutFor } from "$lib/stickers/cuts";
import { LOGOS } from "$lib/stickers/logos";
import { libraryFile, stickerSvg, VINYL } from "$lib/stickers/sticker-art";

/** Library art files to prerender: every one on white vinyl, and the light-coloured (dark-background) ones on dark. */
export function stickerArtFiles(dark: boolean): string[] {
  const files = new Set<string>();
  for (const l of LOGOS)
    for (const set of l.styles ?? [l])
      for (const a of [set.icon, set.wordmark]) {
        if (!a) continue;
        const pick = dark ? (a.dark && a.dark !== a.light ? a.dark : null) : a.light;
        const f = pick && libraryFile(pick);
        if (f) files.add(f);
        // white vinyl also gets the dark art, so every file a sticker can show exists in both sets where it makes sense
        if (!dark && a.dark) {
          const fd = libraryFile(a.dark);
          if (fd) files.add(fd);
        }
      }
  return [...files];
}

/** GET handler body shared by /sticker-art/<file> and /sticker-art/dark/<file>. */
export async function stickerArtResponse(file: string, dark: boolean, fetch: typeof globalThis.fetch): Promise<Response> {
  if (!/^[\w.-]+\.svg$/.test(file)) error(404, "Not found");
  const res = await fetch(`/library/${file}`);
  if (!res.ok) error(404, "Not found");
  const svg = stickerSvg(await res.text(), cutFor(`/library/${file}`) ?? cutFor(`library/${file}`), 1, dark ? VINYL.dark : VINYL.light);
  if (!svg) error(404, "Not a usable SVG");
  return new Response(svg, { headers: { "content-type": "image/svg+xml", "cache-control": "public, max-age=86400" } });
}
