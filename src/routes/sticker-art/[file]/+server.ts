import type { EntryGenerator, RequestHandler } from "./$types";
import { stickerArtFiles, stickerArtResponse } from "$lib/server/sticker-art";

/**
 * /sticker-art/<file>.svg: a library logo as a finished sticker on white vinyl (see $lib/stickers/sticker-art).
 * Prerendered at build for every library art file, so production serves static files; dev renders on demand.
 */
export const prerender = true;
export const entries: EntryGenerator = () => stickerArtFiles(false).map((file) => ({ file }));
export const GET: RequestHandler = ({ params, fetch }) => stickerArtResponse(params.file, false, fetch);
