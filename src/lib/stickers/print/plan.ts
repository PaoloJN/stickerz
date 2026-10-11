/**
 * Print kit planning: pure geometry, no DOM. Paper and cutting-method presets, packing stickers onto sheets at true
 * size, the order to apply them, the placement-map rows, and splitting the full-size placement stencil across pages.
 * All lengths are millimetres.
 */

export type PaperId = "letter" | "a4";
export const PAPERS: Record<PaperId, { label: string; w: number; h: number }> = {
  letter: { label: "Letter (8.5 × 11 in)", w: 215.9, h: 279.4 },
  a4: { label: "A4 (210 × 297 mm)", w: 210, h: 297 },
};

/** Letter where it's the norm (US, Canada, Mexico, the Philippines and a few more); A4 everywhere else. */
export function defaultPaper(locale: string | undefined): PaperId {
  const region = (locale ?? "").split(/[-_]/)[1]?.toUpperCase();
  return region && ["US", "CA", "MX", "PH", "CL", "CO", "VE", "GT", "CR", "PA", "DO", "PR", "SV", "NI", "BZ"].includes(region) ? "letter" : "a4";
}

export type Method = "scissors" | "shop" | "cricut" | "silhouette";
export const METHODS: Record<Method, { label: string; hint: string }> = {
  scissors: { label: "Scissors / craft knife", hint: "Printed cut line around every sticker" },
  shop: { label: "Print shop", hint: "Magenta cut lines on top of the art, ready to upload" },
  cricut: { label: "Cricut", hint: "Print Then Cut image + SVG cut file" },
  silhouette: { label: "Silhouette", hint: "Print & Cut image + SVG cut file" },
};

/** page margin, the header band (brand + page title), and room at the bottom for the 50 mm ruler and URL */
export const MARGIN = 10;
export const HEADER = 14;
export const FOOTER = 14;
/** space between stickers on a sheet (room to cut), and above each one for its number */
export const GAP = 3;
export const LABEL = 5.5;
/** Cricut Print Then Cut's largest printable area (6.75 × 9.25 in) */
const CRICUT = { w: 171.45, h: 234.95 };
/** Silhouette prints registration marks in the corners; stay well inside them */
const SILHOUETTE_INSET = 25;

export type Area = { x: number; y: number; w: number; h: number };

/** Where stickers may go on one sheet for a paper and cutting method. */
export function sheetArea(paper: PaperId, method: Method): Area {
  const p = PAPERS[paper];
  if (method === "cricut") {
    const w = Math.min(CRICUT.w, p.w - 2 * MARGIN);
    const h = Math.min(CRICUT.h, p.h - 2 * MARGIN);
    return { x: (p.w - w) / 2, y: (p.h - h) / 2, w, h };
  }
  if (method === "silhouette") return { x: SILHOUETTE_INSET, y: SILHOUETTE_INSET, w: p.w - 2 * SILHOUETTE_INSET, h: p.h - 2 * SILHOUETTE_INSET };
  return { x: MARGIN, y: MARGIN + HEADER, w: p.w - 2 * MARGIN, h: p.h - 2 * MARGIN - HEADER - FOOTER };
}

export type PackItem = { id: string; w: number; h: number };
export type Placement = { id: string; x: number; y: number; /** turned 90° to fit */ rotated: boolean; w: number; h: number };
export type PackResult = { pages: Placement[][]; /** too big for the sheet even turned */ tooBig: string[] };

/**
 * Shelf packing: tallest first, left to right in rows, new page when a row won't fit. A sticker is turned 90° when
 * that's the only way it fits, or when it makes a flatter row. `pad` is extra space above each item (its number).
 */
export function pack(items: PackItem[], area: { w: number; h: number }, gap = GAP, pad = 0): PackResult {
  const fits = (w: number, h: number) => w <= area.w + 1e-6 && h + pad <= area.h + 1e-6;
  const tooBig: string[] = [];
  const sized = items
    .map((it) => {
      const upright = fits(it.w, it.h);
      const turned = fits(it.h, it.w);
      if (!upright && !turned) {
        tooBig.push(it.id);
        return null;
      }
      // prefer landscape (flatter rows pack tighter); otherwise whichever fits
      const rotated = upright && turned ? it.h > it.w : !upright;
      return { id: it.id, w: rotated ? it.h : it.w, h: rotated ? it.w : it.h, rotated };
    })
    .filter((x): x is { id: string; w: number; h: number; rotated: boolean } => x !== null)
    .sort((a, b) => b.h - a.h || b.w - a.w);

  const pages: Placement[][] = [];
  let page: Placement[] = [];
  let x = 0;
  let y = 0;
  let rowH = 0;
  for (const it of sized) {
    if (x > 0 && x + it.w > area.w + 1e-6) {
      x = 0;
      y += rowH + gap;
      rowH = 0;
    }
    if (y + pad + it.h > area.h + 1e-6) {
      pages.push(page);
      page = [];
      x = 0;
      y = 0;
      rowH = 0;
    }
    page.push({ id: it.id, x, y: y + pad, rotated: it.rotated, w: it.w, h: it.h });
    x += it.w + gap;
    rowH = Math.max(rowH, it.h + pad);
  }
  if (page.length) pages.push(page);
  return { pages, tooBig };
}

export type Placed = { id: string; title: string; x: number; y: number; rot: number; w: number; h: number };

/**
 * The order to stick them on: biggest first (it anchors the layout), then outward from the middle, so one slightly
 * off sticker doesn't push everything after it. Returns ids; position + 1 is the sticker's number everywhere.
 */
export function applyOrder(stickers: Placed[], lid: { w: number; h: number }): string[] {
  const cx = lid.w / 2;
  const cy = lid.h / 2;
  const [first, ...rest] = [...stickers].sort((a, b) => b.w * b.h - a.w * a.h);
  if (!first) return [];
  rest.sort((a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy));
  return [first.id, ...rest.map((s) => s.id)];
}

const r1 = (n: number) => Math.round(n * 10) / 10;
export const normalizeTilt = (deg: number) => {
  const d = ((deg % 360) + 540) % 360 - 180;
  return Math.round(d) === -180 ? 180 : Math.round(d);
};

/** Placement-map rows: where each sticker's centre goes, measured from the left edge and the top edge (away from the hinge). */
export function mapRows(stickers: Placed[], order: string[]) {
  const by = new Map(stickers.map((s) => [s.id, s]));
  return order.map((id, i) => {
    const s = by.get(id)!;
    return { n: i + 1, id, title: s.title, left: r1(s.x), top: r1(s.y), tilt: normalizeTilt(s.rot), width: r1(s.w) };
  });
}

export type Tile = { col: number; row: number; x: number; y: number; w: number; h: number };

/**
 * Where to split one axis into `n` pieces no longer than `max`, each sharing `overlap` with the next. With two pieces
 * the split moves off the `avoid` range (the Apple logo: the landmark people line the stencil up with must stay
 * whole on one page), staying as close to the middle as the page size allows.
 */
function splitAxis(length: number, max: number, overlap: number, avoid?: [number, number]): [number, number][] {
  if (length <= max) return [[0, length]];
  const n = Math.ceil((length - overlap) / (max - overlap));
  if (n === 2) {
    // the split's centre s: first piece [0, s + o/2], second [s - o/2, length], both no longer than max
    const lo = length - max + overlap / 2;
    const hi = max - overlap / 2;
    let s = Math.min(hi, Math.max(lo, length / 2));
    if (avoid) {
      const [a, b] = [avoid[0] - overlap / 2 - 6, avoid[1] + overlap / 2 + 6];
      if (s > a && s < b) {
        const left = a >= lo ? a : null;
        const right = b <= hi ? b : null;
        if (left !== null || right !== null) s = left === null ? right! : right === null ? left : s - a <= b - s ? left : right;
      }
    }
    return [
      [0, s + overlap / 2],
      [s - overlap / 2, length],
    ];
  }
  const size = (length + (n - 1) * overlap) / n;
  return Array.from({ length: n }, (_, i) => [i * (size - overlap), i * (size - overlap) + size] as [number, number]);
}

/**
 * Split the full-size lid across pages, each sharing `overlap` mm with its neighbour so they can be taped together.
 * Tries portrait and landscape and keeps the one with fewer pages; splits avoid `logo` (lid coordinates).
 */
export function stencilTiles(
  lid: { w: number; h: number },
  paper: PaperId,
  overlap = 12,
  logo?: { x: [number, number]; y: [number, number] },
): { landscape: boolean; tiles: Tile[] } {
  const p = PAPERS[paper];
  const plan = (pw: number, ph: number) => {
    const xs = splitAxis(lid.w, pw - 2 * MARGIN, overlap, logo?.x);
    const ys = splitAxis(lid.h, ph - 2 * MARGIN - HEADER - FOOTER, overlap, logo?.y);
    const tiles: Tile[] = [];
    ys.forEach(([y0, y1], row) => xs.forEach(([x0, x1], col) => tiles.push({ col, row, x: x0, y: y0, w: x1 - x0, h: y1 - y0 })));
    return tiles;
  };
  const portrait = plan(p.w, p.h);
  const landscape = plan(p.h, p.w);
  return landscape.length < portrait.length ? { landscape: true, tiles: landscape } : { landscape: false, tiles: portrait };
}

/** "A1", "B2"…: column letter, row number, for labelling stencil pages. */
export const tileName = (t: Pick<Tile, "col" | "row">) => `${String.fromCharCode(65 + t.col)}${t.row + 1}`;
