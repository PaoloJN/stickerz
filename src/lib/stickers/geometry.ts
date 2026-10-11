import type { StickerShape } from "./types";

export const MIN_W = 10;
export const MAX_W = 200;
const DEFAULT_W = 50;

export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
export const clampWidth = (w: number) => (Number.isFinite(w) ? clamp(w, MIN_W, MAX_W) : DEFAULT_W);

export function normalizeDeg(d: number): number {
  const r = ((d % 360) + 360) % 360; // [0,360)
  return r > 180 ? r - 360 : r === 0 ? 0 : r === 180 ? 180 : r;
}

export function rotatePoint(px: number, py: number, cx: number, cy: number, deg: number) {
  const a = (deg * Math.PI) / 180;
  const dx = px - cx;
  const dy = py - cy;
  return { x: cx + dx * Math.cos(a) - dy * Math.sin(a), y: cy + dx * Math.sin(a) + dy * Math.cos(a) };
}

/** Angle for a rotate handle that sits above the sticker (0 = handle straight up). */
export function rotationFromPointer(cx: number, cy: number, px: number, py: number, snap = false): number {
  let deg = (Math.atan2(py - cy, px - cx) * 180) / Math.PI + 90;
  if (snap) deg = Math.round(deg / 15) * 15;
  return normalizeDeg(deg);
}

/** Symmetric resize about the centre: width from the pointer's distance in the sticker's local space. */
export function widthFromPointer(s: { x: number; y: number; rot: number }, px: number, py: number, hOverW: number): number {
  const local = rotatePoint(px, py, s.x, s.y, -s.rot);
  const fromW = Math.abs(local.x - s.x) * 2;
  const fromH = hOverW > 0 ? (Math.abs(local.y - s.y) * 2) / hOverW : 0;
  return clampWidth(Math.max(fromW, fromH));
}

type BoxInput = { w: number; shape: StickerShape; pad?: number; variant?: "icon" | "wordmark" };

/**
 * Outer box and logo box, mm. aspect = art width / height.
 * Die-cut follows the art; other shapes are square, except a rounded wordmark which becomes a pill.
 */
export function stickerGeometry(s: BoxInput, aspect: number): { w: number; h: number; artW: number; artH: number } {
  const ok = aspect > 0;
  if (s.shape === "diecut") {
    const h = ok ? s.w / aspect : s.w;
    return { w: s.w, h, artW: s.w, artH: h };
  }
  const artW = ((s.w * (s.pad ?? 58)) / 100) * (s.shape === "hex" ? 0.88 : 1);
  const wide = s.variant === "wordmark" && ok;
  const artH = wide ? artW / aspect : artW;
  const h = wide && s.shape === "square" ? Math.min(s.w, artH + (s.w - artW) * 0.8) : s.w;
  return { w: s.w, h, artW, artH };
}

export function stickerBox(s: BoxInput, aspect: number): { w: number; h: number } {
  const { w, h } = stickerGeometry(s, aspect);
  return { w, h };
}

/** Flat-top hexagon inside a w×h box centred on 0,0. */
export function hexPoints(w: number, h: number): string {
  const x = w / 2;
  const y = h * 0.44;
  return [[-x / 2, -y], [x / 2, -y], [x, 0], [x / 2, y], [-x / 2, y], [-x, 0]].map(([a, b]) => `${a.toFixed(3)},${b.toFixed(3)}`).join(" ");
}

/** Half extents of a w×h box rotated by deg — its axis-aligned bounds around the centre. */
export function rotatedExtents(w: number, h: number, deg: number): { hw: number; hh: number } {
  const a = (deg * Math.PI) / 180;
  const c = Math.abs(Math.cos(a));
  const s = Math.abs(Math.sin(a));
  return { hw: (w / 2) * c + (h / 2) * s, hh: (w / 2) * s + (h / 2) * c };
}
