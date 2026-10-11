/**
 * Print kit (browser only): lays the design's stickers out on paper at true size and draws the placement stencil and
 * map, then packs it all into files. Stickers are lifted straight out of the live editor's own rendering (the
 * `data-print-art` group of each sticker, shadow and tilt removed), so borders, outlines, finishes, text and uploads
 * print exactly as designed. Each page is two layers: artwork (rasterised at 300 dpi) and vectors (cut lines,
 * numbers, rulers, text) drawn on top as real PDF paths.
 */
import { buildSvg, rasterize, serialize } from "../export";
import type { DeviceSpec } from "../devices";
import {
  applyOrder,
  FOOTER,
  HEADER,
  LABEL,
  mapRows,
  MARGIN,
  pack,
  PAPERS,
  sheetArea,
  stencilTiles,
  type Method,
  type PaperId,
  type Placed,
  type Placement,
  type Tile,
} from "./plan";

const NS = "http://www.w3.org/2000/svg";
const PRINT_PPM = 300 / 25.4;
const INK = "#111214";
const MUTED = "#8a8b8f";
/** magenta hairline: what print shops read as the cut path */
const SHOP_CUT = "#ff00ff";
/** the PDF's built-in Helvetica (a font list makes svg2pdf drop bold) */
const FONT = "helvetica";
/** the built-in PDF font only has WinAnsi characters: swap the few we use that it lacks */
const pdfText = (t: string) => t.replace(/″/g, '"').replace(/′/g, "'").replace(/[^\x00-\xff‘’“”–—…•€™]/g, "?");

export type KitOptions = {
  paper: PaperId;
  method: Method;
  sheets: boolean;
  stencil: boolean;
  map: boolean;
  /** print shop: also one file per sticker */
  perSticker: boolean;
  name: string;
  device: DeviceSpec;
  /** the design's stickers with their lid positions (mm, centre) and names */
  stickers: Placed[];
};
export type KitFile = { name: string; blob: Blob };
export type KitResult = { files: KitFile[]; tooBig: string[]; sheetCount: number };

type Page = { w: number; h: number; art?: SVGSVGElement; vector: SVGSVGElement; title: string; hint?: string; ruler?: boolean };
type Measured = { id: string; title: string; art: Element; cut: Element; edge: string; box: DOMRect };

const el = <K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}, text?: string): SVGElementTagNameMap[K] => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  if (text !== undefined) e.textContent = pdfText(text);
  return e;
};
const svgPage = (w: number, h: number) => el("svg", { xmlns: NS, viewBox: `0 0 ${w} ${h}`, width: `${w}mm`, height: `${h}mm` });
const isWhite = (paint: string) => /^(#fff|#ffffff|white)$/i.test(paint.trim());
const safe = (s: string) => s.replace(/[^\w.-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "sticker";

/** Mount off-screen so getBBox works (and svg2pdf can resolve styles); returns an unmount function. */
function mount(svg: SVGSVGElement): () => void {
  svg.style.cssText = "position:fixed;left:-99999px;top:0;width:1px;height:1px;overflow:visible";
  document.body.appendChild(svg);
  return () => svg.remove();
}

/** Every <defs> child of the design (gradients, filters, clips the stickers use), copied into a page once. */
function defsFrom(design: SVGSVGElement): SVGDefsElement {
  const defs = el("defs");
  const seen = new Set<string>();
  design.querySelectorAll("defs > *").forEach((d) => {
    const id = d.getAttribute("id");
    if (id && seen.has(id)) return;
    if (id) seen.add(id);
    defs.appendChild(d.cloneNode(true));
  });
  return defs;
}

/** Each sticker's art and cut line, measured in its own upright coordinates. */
function measure(design: SVGSVGElement, stickers: Placed[]): Measured[] {
  const unmount = mount(design);
  try {
    return stickers.flatMap((s) => {
      const root = design.querySelector(`[data-sticker-id="${CSS.escape(s.id)}"]`);
      const art = root?.querySelector("[data-print-art]");
      const cut = root?.querySelector("[data-cutline]");
      if (!root || !art || !cut) return [];
      const a = (art as SVGGraphicsElement).getBBox();
      const c = (cut as SVGGraphicsElement).getBBox();
      const x = Math.min(a.x, c.width ? c.x : a.x);
      const y = Math.min(a.y, c.height ? c.y : a.y);
      const box = new DOMRect(x, y, Math.max(a.x + a.width, c.x + c.width) - x, Math.max(a.y + a.height, c.y + c.height) - y);
      return [{ id: s.id, title: s.title, art, cut, edge: root.getAttribute("data-edge") ?? "", box }];
    });
  } finally {
    unmount();
  }
}

/** A sticker's art, upright, as a fresh group (no tilt, no hover scale, no shadow). */
function artCopy(m: Measured): SVGGElement {
  const g = m.art.cloneNode(true) as SVGGElement;
  g.removeAttribute("transform");
  g.removeAttribute("data-print-art");
  return g;
}

/** A sticker's cut line, upright, styled as a solid line. */
function cutCopy(m: Measured, stroke: string, width: number): SVGGElement {
  const g = m.cut.cloneNode(true) as SVGGElement;
  for (const a of ["transform", "display", "data-cutline", "stroke-dasharray"]) g.removeAttribute(a);
  g.setAttribute("fill", "none");
  g.setAttribute("stroke", stroke);
  g.setAttribute("stroke-width", String(width));
  g.querySelectorAll("*").forEach((c) => c.removeAttribute("stroke-dasharray"));
  return g;
}

/** Colour beyond the cut line, so a slightly-off cut never leaves a sliver of bare paper (white needs none). */
function bleed(m: Measured): SVGGElement | null {
  if (!m.edge || isWhite(m.edge)) return null;
  const g = cutCopy(m, m.edge, 2);
  g.setAttribute("fill", m.edge);
  return g;
}

/** Placement on a sheet: upright, or turned 90° clockwise, with the measured box's corner at (x, y). */
function placeTransform(m: Measured, p: Placement, ox: number, oy: number): string {
  const b = m.box;
  return p.rotated ? `translate(${ox + p.x + b.y + b.height} ${oy + p.y - b.x}) rotate(90)` : `translate(${ox + p.x - b.x} ${oy + p.y - b.y})`;
}

/** "This line is 50 mm" check, so a printer's fit-to-page scaling gets noticed before anything is cut. */
function ruler(x: number, y: number): SVGGElement {
  const g = el("g", { stroke: INK, "stroke-width": 0.3, fill: "none" });
  g.append(el("line", { x1: x, y1: y, x2: x + 50, y2: y }));
  for (let i = 0; i <= 50; i += 10) g.append(el("line", { x1: x + i, y1: y - (i % 50 ? 1.2 : 2.4), x2: x + i, y2: y }));
  g.append(el("text", { x: x + 53, y: y + 0.2, "font-size": 2.7, "font-family": FONT, fill: MUTED, stroke: "none" }, "This line should be exactly 50 mm. If not, print at 100% (“Actual size”)."));
  return g;
}

/** Same header and footer on every page: brand, page title and hint; design name; 50 mm check; guide URL and page n of N. */
function chrome(v: SVGSVGElement, p: Page, n: number, total: number, o: KitOptions) {
  const right = p.w - MARGIN;
  v.append(el("text", { x: MARGIN, y: MARGIN + 4, "font-size": 4.4, "font-weight": 700, "font-family": FONT, fill: INK }, "stickerz.dev"));
  v.append(el("text", { x: MARGIN + 31, y: MARGIN + 4, "font-size": 4.4, "font-family": FONT, fill: INK }, p.title));
  v.append(el("text", { x: right, y: MARGIN + 4, "text-anchor": "end", "font-size": 3, "font-family": FONT, fill: MUTED }, `${o.name} · ${o.device.name}`));
  if (p.hint) v.append(el("text", { x: MARGIN, y: MARGIN + 9.2, "font-size": 3, "font-family": FONT, fill: MUTED }, p.hint));
  v.append(el("line", { x1: MARGIN, y1: MARGIN + HEADER - 2.5, x2: right, y2: MARGIN + HEADER - 2.5, stroke: "#dcdcd8", "stroke-width": 0.25 }));
  if (p.ruler !== false) v.append(ruler(MARGIN, p.h - MARGIN - 1.5));
  v.append(el("text", { x: right, y: p.h - MARGIN - 1, "text-anchor": "end", "font-size": 2.7, "font-family": FONT, fill: MUTED }, `stickerz.dev/docs/print · page ${n} of ${total}`));
}

function sheetPages(design: SVGSVGElement, ms: Measured[], numbers: Map<string, number>, o: KitOptions) {
  const paper = PAPERS[o.paper];
  const area = sheetArea(o.paper, o.method);
  const machine = o.method === "cricut" || o.method === "silhouette";
  const { pages, tooBig } = pack(
    ms.map((m) => ({ id: m.id, w: m.box.width, h: m.box.height })),
    area,
    undefined,
    machine ? 0 : LABEL,
  );
  const by = new Map(ms.map((m) => [m.id, m]));
  const out: { page: Page; placements: Placement[]; ox: number; oy: number }[] = [];
  pages.forEach((placements, i) => {
    // centre each sheet's block of stickers across the page (machines keep their area's corner: the PNG is cropped to it)
    const blockW = Math.max(...placements.map((p) => p.x + p.w));
    const ox = machine ? area.x : area.x + (area.w - blockW) / 2;
    const oy = area.y;
    const art = svgPage(paper.w, paper.h);
    art.append(defsFrom(design));
    const vector = svgPage(paper.w, paper.h);
    for (const p of placements) {
      const m = by.get(p.id)!;
      const g = el("g", { transform: placeTransform(m, p, ox, oy) });
      const b = bleed(m);
      if (b) g.append(b);
      g.append(artCopy(m));
      art.append(g);
      if (machine) continue;
      const line = el("g", { transform: placeTransform(m, p, ox, oy) });
      line.append(o.method === "shop" ? cutCopy(m, SHOP_CUT, 0.1) : cutCopy(m, "#666666", 0.25));
      vector.append(line);
      // a small numbered badge above each sticker: the same number as on the stencil and the map
      const cx = ox + p.x + 2.4;
      const cy = oy + p.y - LABEL / 2 - 0.2;
      vector.append(el("circle", { cx, cy, r: 2.3, fill: INK }));
      vector.append(el("text", { x: cx, y: cy + 0.95, "text-anchor": "middle", "font-size": 2.7, "font-weight": 700, "font-family": FONT, fill: "#fff" }, String(numbers.get(p.id))));
    }
    out.push({
      page: {
        w: paper.w,
        h: paper.h,
        art,
        vector,
        title: `Sticker sheet${pages.length > 1 ? ` ${i + 1} of ${pages.length}` : ""}`,
        hint: o.method === "shop" ? "True size. Magenta lines are the cut path. Numbers match the stencil and the map." : "True size. Cut along the grey lines. Numbers match the stencil and the map.",
      },
      placements,
      ox,
      oy,
    });
  });
  return { sheets: out, tooBig: tooBig.map((id) => by.get(id)?.title ?? id), area };
}

function markTransform(d: DeviceSpec): string | null {
  if (!d.mark) return null;
  const [bx, by, bw, bh] = d.mark.art.box;
  const k = d.mark.h / bh;
  const [cx, cy] = d.mark.at ?? [d.w / 2, d.h / 2];
  return `translate(${cx - (bx + bw / 2) * k} ${cy - (by + bh / 2) * k}) scale(${k})`;
}

/** The logo's box on the lid, so the stencil split can keep it whole. */
function markBox(d: DeviceSpec): { x: [number, number]; y: [number, number] } | undefined {
  if (!d.mark) return undefined;
  const [, , bw, bh] = d.mark.art.box;
  const w = (bw * d.mark.h) / bh;
  const [cx, cy] = d.mark.at ?? [d.w / 2, d.h / 2];
  return { x: [cx - w / 2, cx + w / 2], y: [cy - d.mark.h / 2, cy + d.mark.h / 2 + 7] };
}

/** The lid at 1:1 in lid coordinates: outline, logo cut-out, every sticker's outline at its spot, numbered. */
function stencilContent(ms: Measured[], numbers: Map<string, number>, o: KitOptions): SVGGElement {
  const d = o.device;
  const g = el("g", { fill: "none", stroke: INK, "stroke-width": 0.4 });
  g.append(el("rect", { x: 0, y: 0, width: d.w, height: d.h, rx: d.radius }));
  const mt = markTransform(d);
  if (mt && d.mark) {
    // the mark is drawn in its own units and scaled up: divide the stroke so it prints at the stencil's line weight
    const k = d.mark.h / d.mark.art.box[3];
    g.append(el("path", { d: d.mark.art.d, transform: mt, "stroke-width": 0.4 / k, "stroke-dasharray": `${1.4 / k} ${1 / k}` }));
    const [cx, cy] = d.mark.at ?? [d.w / 2, d.h / 2];
    g.append(el("text", { x: cx, y: cy + d.mark.h / 2 + 4.5, "text-anchor": "middle", "font-size": 2.8, "font-family": FONT, fill: MUTED, stroke: "none" }, "cut out · line up with your laptop's logo"));
  }
  const pos = new Map(o.stickers.map((s) => [s.id, s]));
  for (const m of ms) {
    const s = pos.get(m.id);
    if (!s) continue;
    const c = cutCopy(m, INK, 0.4);
    c.setAttribute("transform", `translate(${s.x} ${s.y}) rotate(${s.rot})`);
    g.append(c);
    g.append(el("circle", { cx: s.x, cy: s.y, r: 3.2, fill: INK, stroke: "none" }));
    g.append(el("text", { x: s.x, y: s.y + 1.25, "text-anchor": "middle", "font-size": 3.6, "font-weight": 700, "font-family": FONT, fill: "#fff", stroke: "none" }, String(numbers.get(m.id))));
  }
  return g;
}

function stencilPages(ms: Measured[], numbers: Map<string, number>, o: KitOptions): Page[] {
  const d = o.device;
  const paper = PAPERS[o.paper];
  const { landscape, tiles } = stencilTiles({ w: d.w, h: d.h }, o.paper, 12, markBox(d));
  const [pw, ph] = landscape ? [paper.h, paper.w] : [paper.w, paper.h];
  const content = stencilContent(ms, numbers, o);
  const many = tiles.length > 1;
  return tiles.map((t, i) => {
    const vector = svgPage(pw, ph);
    const id = `ss-tile-${t.col}-${t.row}`;
    const clip = el("clipPath", { id });
    clip.append(el("rect", { x: t.x, y: t.y, width: t.w, height: t.h }));
    const defs = el("defs");
    defs.append(clip);
    vector.append(defs);
    // centre the piece in the space between header and footer
    const ox = (pw - t.w) / 2 - t.x;
    const oy = MARGIN + HEADER + (ph - 2 * MARGIN - HEADER - FOOTER - t.h) / 2 - t.y;
    const g = el("g", { transform: `translate(${ox} ${oy})`, "clip-path": `url(#${id})` });
    g.append(content.cloneNode(true));
    if (many) {
      // the strip this page shares with its right / lower neighbour: shaded, with + marks to line the pages up
      const right = tiles.find((u) => u.row === t.row && u.col === t.col + 1);
      const below = tiles.find((u) => u.col === t.col && u.row === t.row + 1);
      const strips: [number, number, number, number, Tile][] = [];
      if (right) strips.push([right.x, t.y, t.x + t.w - right.x, t.h, right]);
      if (below) strips.push([t.x, below.y, t.w, t.y + t.h - below.y, below]);
      for (const [x, y, w, h, next] of strips) {
        g.append(el("rect", { x, y, width: w, height: h, fill: "#000", "fill-opacity": 0.07, stroke: "none" }));
        const along = w > h;
        for (let k = 22; k < (along ? w : h) - 8; k += 44) {
          const cx = along ? x + k : x + w / 2;
          const cy = along ? y + h / 2 : y + k;
          g.append(el("path", { d: `M${cx - 3.5} ${cy}H${cx + 3.5}M${cx} ${cy - 3.5}V${cy + 3.5}`, stroke: INK, "stroke-width": 0.35, fill: "none" }));
        }
        const label = `tape page ${tiles.indexOf(next) + 1} over this strip`;
        const lx = along ? x + 44 : x + w / 2 + 1;
        // between the first two + marks, so the label never sits on one
        const ly = along ? y + h / 2 + 1 : y + 44;
        g.append(el("text", { x: lx, y: ly, "text-anchor": "middle", "font-size": 2.6, "font-family": FONT, fill: MUTED, stroke: "none", ...(along ? {} : { transform: `rotate(-90 ${lx} ${ly})` }) }, label));
      }
    }
    vector.append(g);
    return {
      w: pw,
      h: ph,
      vector,
      title: `Placement stencil${many ? `, part ${i + 1} of ${tiles.length}` : ""}`,
      hint: many
        ? "Tape the parts together so the + marks line up. Cut along the outline, the logo and every numbered window."
        : "Cut along the outline, the logo and every numbered window. Then lay it on your laptop.",
    };
  });
}

const ROW = 5.4;
/** where the map's drawing and table sit; shared with planKit's page count */
function mapLayout(paper: { w: number; h: number }, d: DeviceSpec) {
  const W = paper.w - 2 * MARGIN;
  const scale = W / d.w;
  const drawTop = MARGIN + HEADER + 2;
  const tableTop = drawTop + d.h * scale + 10;
  const perFirst = Math.max(1, Math.floor((paper.h - MARGIN - FOOTER - tableTop - 10) / ROW));
  const perNext = Math.floor((paper.h - 2 * MARGIN - HEADER - FOOTER - 10) / ROW);
  return { W, scale, drawTop, tableTop, perFirst, perNext };
}

async function mapPages(svgEl: SVGSVGElement, ms: Measured[], order: string[], o: KitOptions): Promise<Page[]> {
  const paper = PAPERS[o.paper];
  const d = o.device;
  const rows = mapRows(o.stickers.filter((s) => ms.some((m) => m.id === s.id)), order);
  const { W, scale, drawTop, tableTop, perFirst, perNext } = mapLayout(paper, d);
  const pages: Page[] = [];

  // the design itself, small, with numbers on it
  const lidArt = await buildSvg(svgEl, { lid: { w: d.w, h: d.h }, background: "lid", cutLines: false });
  const art = svgPage(paper.w, paper.h);
  const holder = el("svg", { x: MARGIN, y: drawTop, width: W, height: d.h * scale, viewBox: `0 0 ${d.w} ${d.h}` });
  holder.append(...[...lidArt.childNodes].map((n) => n.cloneNode(true)));
  art.append(holder);

  const COLS: [number, string][] = [[0, "#"], [10, "Sticker"], [92, "From left"], [118, "From top"], [144, "Tilt"], [164, "Width"]];
  const tableHead = (v: SVGSVGElement, y: number) => {
    for (const [x, t] of COLS) v.append(el("text", { x: MARGIN + x, y, "font-size": 3, "font-weight": 700, "font-family": FONT, fill: INK }, t));
    v.append(el("line", { x1: MARGIN, y1: y + 1.8, x2: paper.w - MARGIN, y2: y + 1.8, stroke: INK, "stroke-width": 0.25 }));
  };
  const row = (v: SVGSVGElement, y: number, r: ReturnType<typeof mapRows>[number], i: number) => {
    if (i % 2 === 1) v.append(el("rect", { x: MARGIN, y: y - 3.7, width: paper.w - 2 * MARGIN, height: ROW, fill: "#f3f3f1" }));
    const cells: [number, string][] = [
      [0, String(r.n)],
      [10, r.title.length > 34 ? r.title.slice(0, 33) + "…" : r.title],
      [92, `${r.left} mm`],
      [118, `${r.top} mm`],
      [144, `${r.tilt}°`],
      [164, `${r.width} mm`],
    ];
    for (const [x, t] of cells) v.append(el("text", { x: MARGIN + x, y, "font-size": 3, "font-weight": x === 0 ? 700 : 400, "font-family": FONT, fill: INK }, t));
  };

  const hint = "Measure to each sticker's centre from the left edge and the top edge (away from the hinge). Stick them on in this order.";
  const first = svgPage(paper.w, paper.h);
  const pos = new Map(o.stickers.map((s) => [s.id, s]));
  for (const r of rows) {
    const s = pos.get(r.id)!;
    const cx = MARGIN + s.x * scale;
    const cy = drawTop + s.y * scale;
    first.append(el("circle", { cx, cy, r: 2.6, fill: INK, stroke: "#fff", "stroke-width": 0.5 }));
    first.append(el("text", { x: cx, y: cy + 1, "text-anchor": "middle", "font-size": 2.9, "font-weight": 700, "font-family": FONT, fill: "#fff" }, String(r.n)));
  }
  tableHead(first, tableTop);
  rows.slice(0, perFirst).forEach((r, i) => row(first, tableTop + 7 + i * ROW, r, i));
  pages.push({ w: paper.w, h: paper.h, art, vector: first, title: "Placement map", hint });

  for (let i = perFirst; i < rows.length; i += perNext) {
    const v = svgPage(paper.w, paper.h);
    const top = MARGIN + HEADER + 4;
    tableHead(v, top);
    rows.slice(i, i + perNext).forEach((r, j) => row(v, top + 7 + j * ROW, r, j));
    pages.push({ w: paper.w, h: paper.h, vector: v, title: "Placement map (continued)", hint });
  }
  return pages;
}

/** First page: what's in the kit and how to use it, with a picture of the design. */
async function coverPage(svgEl: SVGSVGElement, o: KitOptions, sections: { label: string; detail: string; from: number; to: number }[], count: number): Promise<Page> {
  const paper = PAPERS[o.paper];
  const d = o.device;
  const art = svgPage(paper.w, paper.h);
  const v = svgPage(paper.w, paper.h);
  let y = MARGIN + HEADER + 14;
  v.append(el("text", { x: MARGIN, y, "font-size": 10, "font-weight": 700, "font-family": FONT, fill: INK }, "Your sticker kit"));
  y += 7;
  v.append(el("text", { x: MARGIN, y, "font-size": 3.6, "font-family": FONT, fill: MUTED }, `${o.name} · ${count} ${count === 1 ? "sticker" : "stickers"} · ${d.name}`));
  y += 8;
  // the picture leaves room for the contents and the steps on Letter and A4 alike
  const h = 105;
  const W = Math.min(paper.w - 2 * MARGIN, (d.w * h) / d.h);
  const lidArt = await buildSvg(svgEl, { lid: { w: d.w, h: d.h }, background: "lid", cutLines: false });
  const holder = el("svg", { x: MARGIN, y, width: W, height: (d.h * W) / d.w, viewBox: `0 0 ${d.w} ${d.h}` });
  holder.append(...[...lidArt.childNodes].map((n) => n.cloneNode(true)));
  art.append(holder);
  y += h + 13;

  v.append(el("text", { x: MARGIN, y, "font-size": 4.4, "font-weight": 700, "font-family": FONT, fill: INK }, "In this kit"));
  y += 7;
  for (const s of sections) {
    v.append(el("text", { x: MARGIN, y, "font-size": 3.3, "font-weight": 700, "font-family": FONT, fill: INK }, s.label));
    v.append(el("text", { x: MARGIN + 46, y, "font-size": 3.3, "font-family": FONT, fill: INK }, s.detail));
    v.append(el("text", { x: paper.w - MARGIN, y, "text-anchor": "end", "font-size": 3.3, "font-family": FONT, fill: MUTED }, s.from === 0 ? "in the ZIP" : s.from === s.to ? `page ${s.from}` : `pages ${s.from}–${s.to}`));
    y += 6;
  }
  y += 6;
  v.append(el("text", { x: MARGIN, y, "font-size": 4.4, "font-weight": 700, "font-family": FONT, fill: INK }, "How to use it"));
  y += 7;
  const machine = o.method === "cricut" || o.method === "silhouette";
  const steps = [
    "Print at 100% (“Actual size”). The line at the bottom of every page should measure exactly 50 mm.",
    o.method === "shop"
      ? "Send the sticker sheets to your print shop. The magenta lines are where they cut."
      : machine
        ? `Load the PNG sheet${o.sheets ? "s" : ""} from the ZIP into ${o.method === "cricut" ? "Cricut Design Space as a Print Then Cut image" : "Silhouette Studio"}, at the size in the file name.`
        : "Print the sticker sheets on sticker paper and cut along the grey lines.",
    "Tape the stencil parts together, cut out the logo and the numbered windows, and line it up on your laptop.",
    "Stick them on in number order: the biggest first, then outward. The map has every position in mm.",
  ];
  steps.forEach((t, i) => {
    v.append(el("circle", { cx: MARGIN + 2.6, cy: y - 1.1, r: 2.6, fill: INK }));
    v.append(el("text", { x: MARGIN + 2.6, y: y - 0.1, "text-anchor": "middle", "font-size": 2.9, "font-weight": 700, "font-family": FONT, fill: "#fff" }, String(i + 1)));
    v.append(el("text", { x: MARGIN + 8, y, "font-size": 3.3, "font-family": FONT, fill: INK }, t));
    y += 7;
  });
  return { w: paper.w, h: paper.h, art, vector: v, title: "Print kit", hint: "Start here." };
}

async function toPdf(pages: Page[], o: KitOptions): Promise<Blob> {
  const [{ jsPDF }, { svg2pdf }] = await Promise.all([import("jspdf"), import("svg2pdf.js")]);
  pages.forEach((p, i) => chrome(p.vector, p, i + 1, pages.length, o));
  const fmt = (p: Page) => ({ format: [p.w, p.h] as [number, number], orientation: (p.w > p.h ? "landscape" : "portrait") as "landscape" | "portrait" });
  const doc = new jsPDF({ unit: "mm", compress: true, ...fmt(pages[0]) });
  doc.setProperties({ title: `${o.name} · print kit`, subject: "Sticker sheets, placement stencil and map", creator: "stickerz.dev" });
  for (const [i, p] of pages.entries()) {
    if (i > 0) doc.addPage(fmt(p).format, fmt(p).orientation);
    if (p.art) {
      const canvas = await rasterize(p.art, { w: p.w, h: p.h }, PRINT_PPM);
      doc.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, p.w, p.h, undefined, "MEDIUM");
    }
    const unmount = mount(p.vector);
    try {
      await svg2pdf(p.vector, doc, { x: 0, y: 0, width: p.w, height: p.h });
    } finally {
      unmount();
    }
  }
  return doc.output("blob");
}

const pngBlob = (c: HTMLCanvasElement) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("toBlob returned null"))), "image/png"));

/** Build every file the chosen options ask for. */
export async function buildKit(svgEl: SVGSVGElement, o: KitOptions): Promise<KitResult> {
  const d = o.device;
  const design = await buildSvg(svgEl, { lid: { w: d.w, h: d.h }, background: "none", cutLines: true });
  const ms = measure(design, o.stickers);
  const order = applyOrder(o.stickers.filter((s) => ms.some((m) => m.id === s.id)), { w: d.w, h: d.h });
  const numbers = new Map(order.map((id, i) => [id, i + 1]));
  const machine = o.method === "cricut" || o.method === "silhouette";
  const files: KitFile[] = [];
  const pdfPages: Page[] = [];
  let tooBig: string[] = [];
  let sheetCount = 0;
  const base = safe(o.name);

  if (o.sheets) {
    const { sheets, tooBig: big, area } = sheetPages(design, ms, numbers, o);
    tooBig = big;
    sheetCount = sheets.length;
    if (!machine) pdfPages.push(...sheets.map((s) => s.page));
    else {
      // the machine's own software prints registration marks and traces the image's outline, so each sheet is a
      // transparent PNG of just the printable area, named with the size to set it to, plus an SVG of the cut lines
      for (const [i, s] of sheets.entries()) {
        const crop = svgPage(area.w, area.h);
        crop.setAttribute("viewBox", `${area.x} ${area.y} ${area.w} ${area.h}`);
        crop.append(...[...s.page.art!.childNodes].map((n) => n.cloneNode(true)));
        const size = `${Math.round(area.w * 10) / 10}x${Math.round(area.h * 10) / 10}mm`;
        files.push({ name: `${base}-sheet-${i + 1}-print-${size}.png`, blob: await pngBlob(await rasterize(crop, { w: area.w, h: area.h }, PRINT_PPM)) });
        const cuts = svgPage(area.w, area.h);
        cuts.setAttribute("viewBox", `${area.x} ${area.y} ${area.w} ${area.h}`);
        const by = new Map(ms.map((m) => [m.id, m]));
        for (const p of s.placements) {
          const m = by.get(p.id)!;
          const g = el("g", { transform: placeTransform(m, p, s.ox, s.oy) });
          g.append(cutCopy(m, "#000000", 0.25));
          cuts.append(g);
        }
        files.push({ name: `${base}-sheet-${i + 1}-cut-${size}.svg`, blob: new Blob([serialize(cuts)], { type: "image/svg+xml" }) });
      }
    }
  }
  const sections: { label: string; detail: string; from: number; to: number }[] = [];
  const section = (label: string, detail: string, pages: Page[]) => {
    if (!pages.length) return;
    // +2: page 1 is the cover
    sections.push({ label, detail, from: pdfPages.length + 2, to: pdfPages.length + pages.length + 1 });
    pdfPages.push(...pages);
  };
  const sheetPdf = pdfPages.splice(0);
  section("Sticker sheets", o.method === "shop" ? "Every sticker at true size, with magenta cut paths" : "Every sticker at true size, numbered, to cut out", sheetPdf);
  if (o.stencil) section("Placement stencil", "The laptop at full size: cut out the windows", stencilPages(ms, numbers, o));
  if (o.map) section("Placement map", "Where each sticker goes, in mm", await mapPages(svgEl, ms, order, o));
  if (machine && sheetCount) sections.unshift({ label: "Sticker sheets", detail: `${sheetCount} PNG + SVG cut file${sheetCount > 1 ? "s" : ""}, in the ZIP`, from: 0, to: 0 });
  if (pdfPages.length) {
    pdfPages.unshift(await coverPage(svgEl, o, sections, ms.length));
    files.unshift({ name: `${base}-${machine ? "placement" : "print-kit"}.pdf`, blob: await toPdf(pdfPages, o) });
  }

  if (o.method === "shop" && o.perSticker) {
    // one vector file per sticker: its art with the magenta cut path on top, at true size
    const defs = defsFrom(design);
    for (const m of ms) {
      const b = m.box;
      const one = svgPage(b.width, b.height);
      one.setAttribute("viewBox", `${b.x} ${b.y} ${b.width} ${b.height}`);
      one.append(defs.cloneNode(true));
      const bl = bleed(m);
      if (bl) one.append(bl);
      one.append(artCopy(m), cutCopy(m, SHOP_CUT, 0.1));
      files.push({ name: `${base}-${String(numbers.get(m.id)).padStart(2, "0")}-${safe(m.title)}.svg`, blob: new Blob([serialize(one)], { type: "image/svg+xml" }) });
    }
  }
  return { files, tooBig, sheetCount };
}

/** One file as is; several in a zip. */
export async function bundle(files: KitFile[], name: string): Promise<KitFile> {
  if (files.length === 1) return files[0];
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  for (const f of files) zip.file(f.name, f.blob);
  return { name: `${safe(name)}-print-kit.zip`, blob: await zip.generateAsync({ type: "blob" }) };
}

/** What the options will produce, without rendering anything (for the dialog's summary). */
export async function planKit(svgEl: SVGSVGElement, o: KitOptions): Promise<{ sheets: number; stencil: number; map: number; tooBig: string[] }> {
  const d = o.device;
  const design = await buildSvg(svgEl, { lid: { w: d.w, h: d.h }, background: "none", cutLines: true });
  const ms = measure(design, o.stickers);
  const machine = o.method === "cricut" || o.method === "silhouette";
  const { pages, tooBig } = pack(ms.map((m) => ({ id: m.id, w: m.box.width, h: m.box.height })), sheetArea(o.paper, o.method), undefined, machine ? 0 : LABEL);
  const by = new Map(ms.map((m) => [m.id, m.title]));
  const { perFirst, perNext } = mapLayout(PAPERS[o.paper], d);
  return {
    sheets: o.sheets ? pages.length : 0,
    stencil: o.stencil ? stencilTiles({ w: d.w, h: d.h }, o.paper, 12, markBox(d)).tiles.length : 0,
    map: o.map ? 1 + Math.max(0, Math.ceil((ms.length - perFirst) / perNext)) : 0,
    tooBig: tooBig.map((id) => by.get(id) ?? id),
  };
}

/** The first sticker sheet as one SVG (art + lines), for the export dialog's preview. */
export async function previewSheet(svgEl: SVGSVGElement, o: KitOptions): Promise<string | null> {
  const d = o.device;
  const design = await buildSvg(svgEl, { lid: { w: d.w, h: d.h }, background: "none", cutLines: true });
  const ms = measure(design, o.stickers);
  const order = applyOrder(o.stickers.filter((s) => ms.some((m) => m.id === s.id)), { w: d.w, h: d.h });
  const numbers = new Map(order.map((id, i) => [id, i + 1]));
  const { sheets } = sheetPages(design, ms, numbers, o);
  const first = sheets[0]?.page;
  if (!first?.art) return null;
  const page = first.art.cloneNode(true) as SVGSVGElement;
  page.insertBefore(el("rect", { width: first.w, height: first.h, fill: "#fff" }), page.firstChild);
  chrome(first.vector, first, 1, 1, o);
  page.append(...[...first.vector.childNodes].map((n) => n.cloneNode(true)));
  return serialize(page);
}
