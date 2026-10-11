/**
 * Die-cut outline: the line a plotter would cut around a logo, as an SVG path.
 *
 * The logo's coverage is resampled onto a working grid, offset with an exact Euclidean distance transform (so every
 * corner rounds evenly, unlike feMorphology's square kernel), optionally closed to soften notches, merged into one
 * piece and hole-filled, then traced with marching squares and smoothed. Pure, so it runs in tests and caches well.
 */

/** Logo coverage, 0–1, covering exactly the art box. */
export type Alpha = { w: number; h: number; data: Float32Array };

export type CutOpts = {
  /** art box, mm */
  artW: number;
  artH: number;
  /** vinyl past the logo, mm */
  margin: number;
  /** closing radius, mm: rounds off notches and bridges gaps narrower than twice this */
  smooth: number;
  fillHoles: boolean;
  /** grow the closing until the sticker is a single piece */
  merge: boolean;
};

/** longest side of the working grid, px */
const GRID = 360;
const INF = 1e20;

/** Felzenszwalb & Huttenlocher squared distance transform, one row or column. */
function dt1(f: Float64Array, n: number, d: Float64Array, v: Int32Array, z: Float64Array) {
  let k = 0;
  v[0] = 0;
  z[0] = -INF;
  z[1] = INF;
  for (let q = 1; q < n; q++) {
    let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) {
      k--;
      s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = INF;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    d[q] = (q - v[k]) * (q - v[k]) + f[v[k]];
  }
}

/** Distance (px) from every cell to the nearest cell where `on` is true. */
function edt(on: Uint8Array, w: number, h: number): Float64Array {
  const n = Math.max(w, h);
  const f = new Float64Array(n);
  const d = new Float64Array(n);
  const v = new Int32Array(n);
  const z = new Float64Array(n + 1);
  const out = new Float64Array(w * h);
  for (let i = 0; i < w * h; i++) out[i] = on[i] ? 0 : INF;
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) f[y] = out[y * w + x];
    dt1(f, h, d, v, z);
    for (let y = 0; y < h; y++) out[y * w + x] = d[y];
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) f[x] = out[y * w + x];
    dt1(f, w, d, v, z);
    for (let x = 0; x < w; x++) out[y * w + x] = Math.sqrt(d[x]);
  }
  return out;
}

/** Signed distance (px) to the region: negative inside, positive outside, ~0 on the edge. */
function signed(inside: Uint8Array, w: number, h: number): Float64Array {
  const outside = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) outside[i] = inside[i] ? 0 : 1;
  const toIn = edt(inside, w, h);
  const toOut = edt(outside, w, h);
  const sd = new Float64Array(w * h);
  for (let i = 0; i < w * h; i++) sd[i] = inside[i] ? 0.5 - toOut[i] : toIn[i] - 0.5;
  return sd;
}

/** Cells reachable from the grid edge through `open` cells. */
function floodFromEdge(open: Uint8Array, w: number, h: number): Uint8Array {
  const seen = new Uint8Array(w * h);
  const stack: number[] = [];
  const push = (i: number) => {
    if (open[i] && !seen[i]) {
      seen[i] = 1;
      stack.push(i);
    }
  };
  for (let x = 0; x < w; x++) push(x), push((h - 1) * w + x);
  for (let y = 0; y < h; y++) push(y * w), push(y * w + w - 1);
  while (stack.length) {
    const i = stack.pop()!;
    const x = i % w;
    if (x > 0) push(i - 1);
    if (x < w - 1) push(i + 1);
    if (i >= w) push(i - w);
    if (i < w * (h - 1)) push(i + w);
  }
  return seen;
}

function countParts(on: Uint8Array, w: number, h: number): number {
  const seen = new Uint8Array(w * h);
  const stack: number[] = [];
  let parts = 0;
  for (let s = 0; s < w * h; s++) {
    if (!on[s] || seen[s]) continue;
    parts++;
    seen[s] = 1;
    stack.push(s);
    while (stack.length) {
      const i = stack.pop()!;
      const x = i % w;
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) {
        if (j >= 0 && j < w * h && on[j] && !seen[j]) {
          seen[j] = 1;
          stack.push(j);
        }
      }
    }
  }
  return parts;
}

// marching squares: corner bits tl=8 tr=4 br=2 bl=1; edges 0=top 1=right 2=bottom 3=left
const SEGS: Record<number, [number, number][]> = {
  1: [[3, 2]], 2: [[2, 1]], 3: [[3, 1]], 4: [[0, 1]], 6: [[0, 2]], 7: [[3, 0]],
  8: [[3, 0]], 9: [[0, 2]], 11: [[0, 1]], 12: [[3, 1]], 13: [[2, 1]], 14: [[3, 2]],
};

/** Closed loops where `g` crosses 0, in grid px (cell centres at integer coords). */
function trace(g: Float64Array, w: number, h: number): [number, number][][] {
  const pts = new Map<number, [number, number]>();
  const links = new Map<number, number[]>();
  // an edge point is keyed by the grid edge it sits on: 2*(cell) for the horizontal edge, +1 for the vertical one
  const point = (x: number, y: number, e: number): number => {
    const [key, ax, ay, bx, by] =
      e === 0 ? [2 * (y * w + x), x, y, x + 1, y]
      : e === 2 ? [2 * ((y + 1) * w + x), x, y + 1, x + 1, y + 1]
      : e === 3 ? [2 * (y * w + x) + 1, x, y, x, y + 1]
      : [2 * (y * w + x + 1) + 1, x + 1, y, x + 1, y + 1];
    if (!pts.has(key)) {
      const ga = g[ay * w + ax];
      const gb = g[by * w + bx];
      const t = ga / (ga - gb);
      pts.set(key, [ax + (bx - ax) * t, ay + (by - ay) * t]);
    }
    return key;
  };
  const link = (a: number, b: number) => {
    (links.get(a) ?? links.set(a, []).get(a)!).push(b);
    (links.get(b) ?? links.set(b, []).get(b)!).push(a);
  };
  for (let y = 0; y < h - 1; y++) {
    for (let x = 0; x < w - 1; x++) {
      const tl = g[y * w + x] > 0, tr = g[y * w + x + 1] > 0, br = g[(y + 1) * w + x + 1] > 0, bl = g[(y + 1) * w + x] > 0;
      const c = (tl ? 8 : 0) | (tr ? 4 : 0) | (br ? 2 : 0) | (bl ? 1 : 0);
      if (c === 0 || c === 15) continue;
      let segs = SEGS[c];
      if (c === 5 || c === 10) {
        const centre = g[y * w + x] + g[y * w + x + 1] + g[(y + 1) * w + x + 1] + g[(y + 1) * w + x] > 0;
        // saddle: keep the inside corners joined when the centre is inside
        segs = (c === 5) === centre ? [[3, 0], [2, 1]] : [[0, 1], [3, 2]];
      }
      for (const [a, b] of segs) link(point(x, y, a), point(x, y, b));
    }
  }
  const loops: [number, number][][] = [];
  const used = new Set<number>();
  for (const start of links.keys()) {
    if (used.has(start)) continue;
    const loop: [number, number][] = [];
    let prev = -1;
    let cur = start;
    while (!used.has(cur)) {
      used.add(cur);
      loop.push(pts.get(cur)!);
      const next = links.get(cur)!.find((n) => n !== prev && !used.has(n));
      if (next === undefined) break;
      prev = cur;
      cur = next;
    }
    if (loop.length >= 3) loops.push(loop);
  }
  return loops;
}

/** Ramer–Douglas–Peucker on a closed loop. */
function simplify(loop: [number, number][], eps: number): [number, number][] {
  const keep = new Uint8Array(loop.length);
  const rdp = (a: number, b: number) => {
    const [ax, ay] = loop[a];
    const [bx, by] = loop[b % loop.length];
    const len = Math.hypot(bx - ax, by - ay) || 1;
    let worst = -1;
    let at = -1;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = loop[i];
      const d = Math.abs((bx - ax) * (ay - py) - (ax - px) * (by - ay)) / len;
      if (d > worst) (worst = d), (at = i);
    }
    if (worst > eps) {
      keep[at] = 1;
      rdp(a, at);
      rdp(at, b);
    }
  };
  const half = loop.length >> 1;
  keep[0] = keep[half] = 1;
  rdp(0, half);
  rdp(half, loop.length);
  return loop.filter((_, i) => keep[i]);
}

/** Smooth closed path: quadratic curves through the midpoints of each edge. */
function toPath(loops: [number, number][][]): string {
  const f = (n: number) => (Math.round(n * 100) / 100).toString();
  return loops
    .map((pts) => {
      const mid = (i: number) => {
        const [ax, ay] = pts[i % pts.length];
        const [bx, by] = pts[(i + 1) % pts.length];
        return `${f((ax + bx) / 2)} ${f((ay + by) / 2)}`;
      };
      let d = `M${mid(0)}`;
      for (let i = 1; i <= pts.length; i++) {
        const [x, y] = pts[i % pts.length];
        d += `Q${f(x)} ${f(y)} ${mid(i)}`;
      }
      return d + "Z";
    })
    .join("");
}

type Grid = { w: number; h: number; r: number; pad: number; sd: Float64Array };

/** In-place box blur, three passes per axis (≈ gaussian with σ ≈ radius). */
function blur(g: Float64Array, w: number, h: number, radius: number) {
  const k = Math.round(radius);
  if (k < 1) return;
  const line = new Float64Array(Math.max(w, h));
  const pass = (n: number, get: (i: number) => number, set: (i: number, v: number) => void) => {
    for (let i = 0; i < n; i++) line[i] = get(i);
    let sum = 0;
    const at = (i: number) => line[i < 0 ? 0 : i >= n ? n - 1 : i];
    for (let i = -k; i <= k; i++) sum += at(i);
    for (let i = 0; i < n; i++) {
      set(i, sum / (2 * k + 1));
      sum += at(i + k + 1) - at(i - k);
    }
  };
  for (let p = 0; p < 3; p++) {
    for (let y = 0; y < h; y++) pass(w, (x) => g[y * w + x], (x, v) => (g[y * w + x] = v));
    for (let x = 0; x < w; x++) pass(h, (y) => g[y * w + x], (y, v) => (g[y * w + x] = v));
  }
}

/** Logo coverage resampled onto a grid `size` px on its long side, as a signed distance field. */
function grid(a: Alpha, o: CutOpts, pad: number, size: number): Grid | null {
  const r = size / (Math.max(o.artW, o.artH) + 2 * pad); // px per mm
  const w = Math.ceil((o.artW + 2 * pad) * r);
  const h = Math.ceil((o.artH + 2 * pad) * r);
  const inside = new Uint8Array(w * h);
  const sx = a.w / o.artW;
  const sy = a.h / o.artH;
  const at = (i: number, j: number) => (i < 0 || j < 0 || i >= a.w || j >= a.h ? 0 : a.data[j * a.w + i]);
  for (let y = 0; y < h; y++) {
    const ay = ((y + 0.5) / r - pad) * sy - 0.5;
    if (ay < -1 || ay > a.h) continue;
    const y0 = Math.floor(ay);
    const fy = ay - y0;
    for (let x = 0; x < w; x++) {
      const ax = ((x + 0.5) / r - pad) * sx - 0.5;
      if (ax < -1 || ax > a.w) continue;
      const x0 = Math.floor(ax);
      const fx = ax - x0;
      const v = (at(x0, y0) * (1 - fx) + at(x0 + 1, y0) * fx) * (1 - fy) + (at(x0, y0 + 1) * (1 - fx) + at(x0 + 1, y0 + 1) * fx) * fy;
      if (v >= 0.5) inside[y * w + x] = 1;
    }
  }
  return inside.includes(1) ? { w, h, r, pad, sd: signed(inside, w, h) } : null;
}

/** Dilate by margin + s, erode by s: a closing that rounds notches and joins nearby parts. Positive inside. */
function field({ w, h, r, sd }: Grid, o: CutOpts, s: number): Float64Array {
  const m = o.margin * r;
  const sp = s * r;
  const g = new Float64Array(w * h);
  if (sp < 0.5) {
    for (let i = 0; i < w * h; i++) g[i] = m - sd[i];
  } else {
    const grown = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) grown[i] = sd[i] <= m + sp ? 1 : 0;
    const sg = signed(grown, w, h);
    for (let i = 0; i < w * h; i++) g[i] = -sg[i] - sp;
    // closing only fills notches; the blur also evens out bumps it leaves behind, like letters along a wordmark
    blur(g, w, h, sp / 3);
  }
  if (o.fillHoles) {
    const open = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) open[i] = g[i] > 0 ? 0 : 1;
    const outside = floodFromEdge(open, w, h);
    for (let i = 0; i < w * h; i++) if (open[i] && !outside[i]) g[i] = 0.5;
  }
  return g;
}

const parts = (g: Float64Array, w: number, h: number) => countParts(Uint8Array.from(g, (v) => (v > 0 ? 1 : 0)), w, h);

/** Cut line around the art, in mm, centred on the art box. Empty string when there's nothing to cut. */
export function cutPath(a: Alpha, o: CutOpts): string {
  const big = Math.max(o.artW, o.artH);
  if (!(big > 0) || a.w < 1 || a.h < 1) return "";
  const mergeMax = o.merge ? big * 0.3 : 0;
  const pad = o.margin + Math.max(o.smooth, mergeMax) + big * 0.02 + 0.5;

  let smooth = o.smooth;
  if (o.merge && smooth < mergeMax) {
    // find the smallest closing that makes one piece on a coarse grid, then trace it at full size
    const c = grid(a, o, pad, GRID / 3);
    if (!c) return "";
    if (parts(field(c, o, smooth), c.w, c.h) > 1) {
      let lo = smooth;
      let hi = mergeMax;
      for (let i = 0; i < 7; i++) {
        const mid = (lo + hi) / 2;
        if (parts(field(c, o, mid), c.w, c.h) > 1) lo = mid;
        else hi = mid;
      }
      smooth = Math.min(mergeMax, hi + 1.5 / c.r);
    }
  }

  const fine = grid(a, o, pad, GRID);
  if (!fine) return "";
  const { w, h, r } = fine;
  const g = field(fine, o, smooth);
  // keep the grid edge outside so every loop closes
  for (let x = 0; x < w; x++) g[x] = g[(h - 1) * w + x] = -1;
  for (let y = 0; y < h; y++) g[y * w] = g[y * w + w - 1] = -1;

  const toMm = (p: [number, number]): [number, number] => [(p[0] + 0.5) / r - pad - o.artW / 2, (p[1] + 0.5) / r - pad - o.artH / 2];
  return toPath(trace(g, w, h).map((l) => simplify(l, 0.3).map(toMm)));
}
