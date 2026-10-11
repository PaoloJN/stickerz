import type { EntryGenerator, RequestHandler } from "./$types";
import { stickerArtFiles, stickerArtResponse } from "$lib/server/sticker-art";

/** /sticker-art/dark/<file>.svg: light-coloured art (drawn for dark backgrounds) as a sticker on dark vinyl. */
export const prerender = true;
export const entries: EntryGenerator = () => stickerArtFiles(true).map((file) => ({ file }));
export const GET: RequestHandler = ({ params, fetch }) => stickerArtResponse(params.file, true, fetch);
