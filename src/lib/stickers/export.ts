/**
 * Export the editor canvas. Everything starts from one cleaned copy of the live SVG (editor UI stripped, images
 * inlined, viewBox = the device in mm), which is then saved as SVG, rasterised to PNG, or placed on a true-size PDF
 * page with vector cut lines on top.
 */

export type Background = "lid" | "none";
export type ExportFormat = "png" | "svg" | "pdf";

export type SvgOpts = {
  /** device size in mm; the export is exactly this rect */
  lid: { w: number; h: number };
  background: Background;
  /** show each sticker's cut path (print PDFs) */
  cutLines: boolean;
};

const SVG_NS = "http://www.w3.org/2000/svg";
const XLINK = "http://www.w3.org/1999/xlink";
/** print-shop cut line colour */
export const CUT_COLOR = "#ff3d7f";
/** PDF artwork resolution */
const PRINT_DPI = 300;

const dataUris = new Map<string, Promise<string>>();
function toDataUri(href: string): Promise<string> {
  if (href.startsWith("data:")) return Promise.resolve(href);
  let p = dataUris.get(href);
  if (!p) {
    p = fetch(href)
      .then(async (res) => {
        if (!res.ok) throw new Error(`fetch ${href}: ${res.status}`);
        // uploads can be PNGs; library art is SVG
        const type = (res.headers.get("content-type") ?? "").split(";")[0] || "image/svg+xml";
        return [type, await res.arrayBuffer()] as const;
      })
      .then(([type, ab]) => {
        const buf = new Uint8Array(ab);
        let bin = "";
        for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
        return `data:${type};base64,` + btoa(bin);
      });
    p.catch(() => dataUris.delete(href));
    dataUris.set(href, p);
  }
  return p;
}

/** A standalone copy of the canvas, sized to the device in mm. */
export async function buildSvg(svgEl: SVGSVGElement, opts: SvgOpts): Promise<SVGSVGElement> {
  const clone = svgEl.cloneNode(true) as SVGSVGElement;
  const { w, h } = opts.lid;
  clone.setAttribute("xmlns", SVG_NS);
  clone.setAttribute("xmlns:xlink", XLINK);
  clone.setAttribute("viewBox", `0 0 ${w} ${h}`);
  clone.setAttribute("width", `${w}mm`);
  clone.setAttribute("height", `${h}mm`);
  for (const a of ["style", "class", "data-editor-canvas"]) clone.removeAttribute(a);
  clone.querySelectorAll("[data-ui]").forEach((n) => n.remove());
  if (opts.background === "none") clone.querySelectorAll("[data-device]").forEach((n) => n.remove());
  clone.querySelectorAll<SVGElement>("[data-cutline]").forEach((n) => {
    if (!opts.cutLines) return n.remove();
    n.removeAttribute("display");
  });

  await Promise.all(
    [...clone.querySelectorAll("image")].map(async (img) => {
      const href = img.getAttribute("href") ?? img.getAttributeNS(XLINK, "href");
      if (!href) return;
      img.removeAttributeNS(XLINK, "href");
      img.setAttribute("href", await toDataUri(href));
    }),
  );
  return clone;
}

export const serialize = (svg: SVGSVGElement) => new XMLSerializer().serializeToString(svg);

export async function rasterize(svg: SVGSVGElement, lid: { w: number; h: number }, pxPerMm: number): Promise<HTMLCanvasElement> {
  const W = Math.round(lid.w * pxPerMm);
  const H = Math.round(lid.h * pxPerMm);
  const sized = svg.cloneNode(true) as SVGSVGElement;
  sized.setAttribute("width", String(W));
  sized.setAttribute("height", String(H));
  const url = URL.createObjectURL(new Blob([serialize(sized)], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = new Image();
    img.decoding = "sync";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("image load failed"));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d context");
    ctx.drawImage(img, 0, 0, W, H);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function save(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

/** Only the cut-line groups (with their ancestors' transforms), for drawing as vectors over the PDF artwork. */
function cutLinesOnly(svg: SVGSVGElement): SVGSVGElement {
  const out = svg.cloneNode(true) as SVGSVGElement;
  const keep = new Set<Element>();
  out.querySelectorAll("[data-cutline]").forEach((n) => {
    for (let e: Element | null = n; e && e !== out; e = e.parentElement) keep.add(e);
    n.querySelectorAll("*").forEach((c) => keep.add(c));
  });
  [...out.querySelectorAll("*")].reverse().forEach((e) => {
    if (!keep.has(e)) e.remove();
  });
  // filters and clips don't apply to the cut path
  out.querySelectorAll("[filter],[clip-path],[mask]").forEach((e) => ["filter", "clip-path", "mask"].forEach((a) => e.removeAttribute(a)));
  return out;
}

export type ExportRequest = SvgOpts & { format: ExportFormat; filename: string; /** PNG only */ pxPerMm?: number };

export async function exportStack(svgEl: SVGSVGElement, req: ExportRequest): Promise<void> {
  try {
    const svg = await buildSvg(svgEl, req);
    if (req.format === "svg") {
      save(new Blob([serialize(svg)], { type: "image/svg+xml;charset=utf-8" }), req.filename);
      return;
    }
    if (req.format === "png") {
      const canvas = await rasterize(svg, req.lid, req.pxPerMm ?? 8);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob returned null"))), "image/png"));
      save(blob, req.filename);
      return;
    }
    // PDF: true-size page, 300 dpi artwork, vector cut lines on top
    const [{ jsPDF }, { svg2pdf }] = await Promise.all([import("jspdf"), import("svg2pdf.js")]);
    const { w, h } = req.lid;
    const doc = new jsPDF({ unit: "mm", format: [w, h], orientation: w >= h ? "landscape" : "portrait", compress: true });
    const art = svg.cloneNode(true) as SVGSVGElement;
    art.querySelectorAll("[data-cutline]").forEach((n) => n.remove());
    const canvas = await rasterize(art, req.lid, PRINT_DPI / 25.4);
    // jsPDF stores images raw unless asked to deflate them
    doc.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, w, h, undefined, "MEDIUM");
    if (req.cutLines) {
      const lines = cutLinesOnly(svg);
      // svg2pdf needs the element in the document to resolve styles
      lines.style.cssText = "position:fixed;left:-99999px;top:0";
      document.body.appendChild(lines);
      try {
        await svg2pdf(lines, doc, { x: 0, y: 0, width: w, height: h });
      } finally {
        lines.remove();
      }
    }
    save(doc.output("blob"), req.filename);
  } catch (cause) {
    throw new Error("Export failed", { cause });
  }
}
