import type { Layout } from "./types";

const idx = (l: Layout, id: string) => l.stickers.findIndex((s) => s.id === id);

/** Move sticker to index `to` (clamped). Returns the same layout object when nothing changes. */
function move(l: Layout, id: string, to: (i: number, n: number) => number): Layout {
  const i = idx(l, id);
  if (i < 0) return l;
  const j = Math.max(0, Math.min(l.stickers.length - 1, to(i, l.stickers.length)));
  if (j === i) return l;
  const stickers = l.stickers.slice();
  const [s] = stickers.splice(i, 1);
  stickers.splice(j, 0, s);
  return { ...l, stickers };
}

export const bringForward = (l: Layout, id: string) => move(l, id, (i) => i + 1);
export const sendBackward = (l: Layout, id: string) => move(l, id, (i) => i - 1);
export const toFront = (l: Layout, id: string) => move(l, id, (_i, n) => n - 1);
export const toBack = (l: Layout, id: string) => move(l, id, () => 0);

/** Spread unlocked stickers over a jittered grid with fresh tilts. `rand` is injectable for tests. */
export function shuffle(l: Layout, lid: { w: number; h: number }, rand: () => number = Math.random): Layout {
  const n = l.stickers.length;
  if (!n) return l;
  const cols = Math.max(1, Math.round(Math.sqrt((n * lid.w) / lid.h)));
  const rows = Math.ceil(n / cols);
  const cells = Array.from({ length: cols * rows }, (_, i) => i);
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  const cw = lid.w / cols;
  const ch = lid.h / rows;
  return {
    ...l,
    stickers: l.stickers.map((s, i) => {
      if (s.locked) return s;
      const c = cells[i] % cols;
      const r = Math.floor(cells[i] / cols);
      return {
        ...s,
        x: cw * (c + 0.5) + (rand() - 0.5) * cw * 0.4,
        y: ch * (r + 0.5) + (rand() - 0.5) * ch * 0.4,
        rot: Math.round(rand() * 36 - 18),
      };
    }),
  };
}

/** Keep stickers at the same relative spot when the lid size changes. */
export function rescale(l: Layout, from: { w: number; h: number }, to: { w: number; h: number }): Layout {
  if (from.w === to.w && from.h === to.h) return l;
  const kx = to.w / from.w;
  const ky = to.h / from.h;
  return { ...l, stickers: l.stickers.map((s) => ({ ...s, x: s.x * kx, y: s.y * ky })) };
}

export type AlignKind = "left" | "hcenter" | "right" | "top" | "vcenter" | "bottom";
/** a sticker's centre and half extents on the lid, mm */
export type Box = { id: string; x: number; y: number; hw: number; hh: number; locked: boolean };

/** New centres that line the boxes up against their shared bounds. Locked boxes stay put but still count. */
export function align(boxes: Box[], kind: AlignKind): Record<string, { x?: number; y?: number }> {
  const L = Math.min(...boxes.map((b) => b.x - b.hw));
  const R = Math.max(...boxes.map((b) => b.x + b.hw));
  const T = Math.min(...boxes.map((b) => b.y - b.hh));
  const B = Math.max(...boxes.map((b) => b.y + b.hh));
  const out: Record<string, { x?: number; y?: number }> = {};
  for (const b of boxes) {
    if (b.locked) continue;
    out[b.id] =
      kind === "left" ? { x: L + b.hw }
      : kind === "right" ? { x: R - b.hw }
      : kind === "hcenter" ? { x: (L + R) / 2 }
      : kind === "top" ? { y: T + b.hh }
      : kind === "bottom" ? { y: B - b.hh }
      : { y: (T + B) / 2 };
  }
  return out;
}

/** Even spacing of centres between the two outermost boxes along one axis. Needs 3+ boxes. */
export function distribute(boxes: Box[], axis: "x" | "y"): Record<string, { x?: number; y?: number }> {
  if (boxes.length < 3) return {};
  const sorted = [...boxes].sort((a, b) => a[axis] - b[axis]);
  const a0 = sorted[0][axis];
  const step = (sorted[sorted.length - 1][axis] - a0) / (sorted.length - 1);
  const out: Record<string, { x?: number; y?: number }> = {};
  sorted.forEach((b, i) => {
    if (!b.locked) out[b.id] = { [axis]: a0 + step * i };
  });
  return out;
}

/** Spots for `n` new stickers spread over a jittered grid on the lid, with small tilts. */
export function gridSpots(n: number, lid: { w: number; h: number }, rand: () => number = Math.random) {
  const cols = Math.max(1, Math.round(Math.sqrt((n * lid.w) / lid.h)));
  const rows = Math.ceil(n / cols);
  const cw = lid.w / cols;
  const ch = lid.h / rows;
  return Array.from({ length: n }, (_, i) => ({
    x: cw * ((i % cols) + 0.5) + (rand() - 0.5) * cw * 0.3,
    y: ch * (Math.floor(i / cols) + 0.5) + (rand() - 0.5) * ch * 0.3,
    rot: Math.round(rand() * 24 - 12),
  }));
}
