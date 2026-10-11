import { artFor, LOGO_BY_KEY, styleArt } from "./logos";
import { TEXT_KEY, uploadIdOf } from "./source";
import { textHref, type TextSpec } from "./text";
import { deleteUpload, listUploads, prepareUpload, saveUpload, type UploadKind } from "./uploads";

export type Upload = { id: string; name: string; kind: UploadKind; href: string };

/** Reactive registry of uploads and loaded fonts, so stickers re-render when their art becomes available. */
class CustomArt {
  uploads = $state<Upload[]>([]);
  /** uploads have been read from storage; before this, a missing upload may just be loading */
  ready = $state(false);
  /** bumped when a font finishes loading */
  fonts = $state(0);
  #init: Promise<void> | null = null;

  init(): Promise<void> {
    if (typeof indexedDB === "undefined") return Promise.resolve();
    this.#init ??= listUploads()
      .then((rows) => {
        this.uploads = rows.sort((a, b) => b.created - a.created).map((r) => ({ id: r.id, name: r.name, kind: r.kind, href: URL.createObjectURL(r.blob) }));
      })
      .catch(() => {})
      .finally(() => (this.ready = true));
    return this.#init;
  }

  get(id: string): Upload | undefined {
    return this.uploads.find((u) => u.id === id);
  }

  /** Validates, stores and registers a file; throws `UploadError` with a readable message. */
  async add(file: File): Promise<Upload> {
    await this.init();
    const rec = await prepareUpload(file);
    await saveUpload(rec);
    const up: Upload = { id: rec.id, name: rec.name, kind: rec.kind, href: URL.createObjectURL(rec.blob) };
    this.uploads = [up, ...this.uploads];
    return up;
  }

  async remove(id: string) {
    await deleteUpload(id);
    const up = this.get(id);
    this.uploads = this.uploads.filter((u) => u.id !== id);
    if (up) URL.revokeObjectURL(up.href);
  }
}

export const custom = new CustomArt();

export type StickerArt = {
  kind: "logo" | "upload" | "text";
  title: string;
  /** null while loading, or when an upload isn't in this browser */
  href: string | null;
  /** an upload this browser doesn't have (e.g. opened from someone else's link) */
  missing: boolean;
  /** library logo has a wordmark variant */
  wordmark: boolean;
  /** SVG art (recolourable, tight border); false for raster uploads */
  vector: boolean;
};

/** Where a sticker's art comes from: the library, an upload, or its own text. Reactive. */
export function stickerArt(s: { logo: string; variant: "icon" | "wordmark"; theme: "light" | "dark"; style?: string; text?: TextSpec }): StickerArt {
  if (s.logo === TEXT_KEY) {
    void custom.fonts;
    const t = s.text;
    const title = t ? t.value.split("\n")[0].slice(0, 32) || "Text" : "Text";
    return { kind: "text", title, href: t ? textHref(t, () => custom.fonts++) : null, missing: !t, wordmark: false, vector: true };
  }
  const id = uploadIdOf(s.logo);
  if (id) {
    const up = custom.get(id);
    return { kind: "upload", title: up?.name ?? "Missing upload", href: up?.href ?? null, missing: custom.ready && !up, wordmark: false, vector: up?.kind !== "image" };
  }
  const logo = LOGO_BY_KEY.get(s.logo);
  return logo
    ? { kind: "logo", title: logo.title, href: artFor(logo, s.variant, s.theme, s.style), missing: false, wordmark: !!styleArt(logo, s.style).wordmark, vector: true }
    : { kind: "logo", title: s.logo, href: null, missing: true, wordmark: false, vector: true };
}
