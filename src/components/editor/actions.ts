import { toast } from "svelte-sonner";
import type { EditorState } from "$lib/stickers/editor.svelte";
import { custom } from "$lib/stickers/custom.svelte";
import { uploadKey } from "$lib/stickers/source";
import { UploadError } from "$lib/stickers/uploads";

/** The full share URL: the whole layout lives in the hash, nothing is stored server-side. */
export const shareUrl = (editor: EditorState) => location.origin + "/editor" + editor.shareHash();

export const canvasSvg = () => document.querySelector<SVGSVGElement>("svg[data-editor-canvas]");

/** Store a file as an upload and stick it on the lid; errors become a toast. */
export async function addUploadSticker(editor: EditorState, file: File, at?: { x: number; y: number }) {
  try {
    const up = await custom.add(file);
    editor.addSticker(uploadKey(up.id), at, { theme: "light" });
  } catch (e) {
    toast.error(e instanceof UploadError ? e.message : "Couldn't add that file");
    if (!(e instanceof UploadError)) console.error(e);
  }
}
