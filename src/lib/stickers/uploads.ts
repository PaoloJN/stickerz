import { newId } from "./id";

/**
 * Your own logos, kept in this browser only (IndexedDB). Stickers point at them as `@up:<id>`; share links carry the
 * id but not the file, so they show up as missing anywhere else.
 */

export type UploadKind = "svg" | "image";
export type UploadRecord = { id: string; name: string; kind: UploadKind; blob: Blob; created: number };

export const MAX_SVG_BYTES = 2 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
/** raster uploads are scaled down to this long side */
const MAX_IMAGE_PX = 1024;
export const ACCEPT = ".svg,image/svg+xml,image/png,image/jpeg,image/webp,image/gif";

// IndexedDB name; kept as is so existing uploads survive the rename to Stickerz
const DB = "stackstickers";
const STORE = "uploads";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const req = run(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

export const listUploads = () => tx<UploadRecord[]>("readonly", (s) => s.getAll() as IDBRequest<UploadRecord[]>);
export const saveUpload = (r: UploadRecord) => tx("readwrite", (s) => s.put(r));
export const deleteUpload = (id: string) => tx("readwrite", (s) => s.delete(id));

export class UploadError extends Error {}

const baseName = (name: string) => name.replace(/\.[a-z0-9]+$/i, "").slice(0, 60) || "Upload";

/** SVGs get explicit width/height (so images report a size) and are checked to be real SVG. */
async function prepareSvg(file: File): Promise<Blob> {
  if (file.size > MAX_SVG_BYTES) throw new UploadError("That SVG is over 2 MB");
  const doc = new DOMParser().parseFromString(await file.text(), "image/svg+xml");
  const root = doc.documentElement;
  if (root.nodeName !== "svg" || doc.querySelector("parsererror")) throw new UploadError("That file isn't a valid SVG");
  const vb = root.getAttribute("viewBox")?.trim().split(/[\s,]+/).map(Number);
  const hasVb = vb?.length === 4 && vb[2] > 0 && vb[3] > 0;
  const w = parseFloat(root.getAttribute("width") ?? "");
  const h = parseFloat(root.getAttribute("height") ?? "");
  if (!hasVb && !(w > 0 && h > 0)) throw new UploadError("That SVG has no size (add a viewBox)");
  if (hasVb) {
    if (!(w > 0) || /%/.test(root.getAttribute("width") ?? "")) root.setAttribute("width", String(vb![2]));
    if (!(h > 0) || /%/.test(root.getAttribute("height") ?? "")) root.setAttribute("height", String(vb![3]));
  } else {
    root.setAttribute("viewBox", `0 0 ${w} ${h}`);
  }
  return new Blob([new XMLSerializer().serializeToString(doc)], { type: "image/svg+xml" });
}

/** Raster images are decoded, scaled to fit 1024 px and stored as PNG (transparency kept for the cut line). */
async function prepareImage(file: File): Promise<Blob> {
  if (file.size > MAX_IMAGE_BYTES) throw new UploadError("That image is over 15 MB");
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(file);
  } catch {
    throw new UploadError("Couldn't read that image");
  }
  const k = Math.min(1, MAX_IMAGE_PX / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bmp.width * k));
  canvas.height = Math.max(1, Math.round(bmp.height * k));
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new UploadError("Couldn't read that image"))), "image/png"));
}

export async function prepareUpload(file: File): Promise<UploadRecord> {
  const svg = file.type === "image/svg+xml" || /\.svg$/i.test(file.name);
  if (!svg && !/^image\/(png|jpeg|webp|gif)$/.test(file.type)) throw new UploadError("Use an SVG, PNG, JPG, WebP or GIF");
  const blob = svg ? await prepareSvg(file) : await prepareImage(file);
  return { id: newId(), name: baseName(file.name), kind: svg ? "svg" : "image", blob, created: Date.now() };
}
