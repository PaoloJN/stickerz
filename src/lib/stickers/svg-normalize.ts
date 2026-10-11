/**
 * One pass every library SVG goes through before any renderer sees it, so the file draws the same in a browser
 * <img>, in the editor's inliner and in resvg (cuts, social cards). The library is upstream art, authored for
 * browsers: it leans on CSS that only browsers understand. Each rule here turns one such construct into the plain
 * SVG attribute every renderer reads. Pure string work, safe on the client and the server.
 *
 * Rules:
 * - `style="mask-type: alpha"` on <mask> → `mask-type="alpha"`. resvg only honours the attribute; without it an
 *   alpha mask whose content is dark hides everything (the Next.js "N" vanished), and the inliner drops `style`.
 * - `fill: color(display-p3 …)` (and stroke / stop-color) inside `style` is dropped. Design tools export a wide-gamut
 *   colour after the sRGB one; resvg can't parse `color()` and paints the element black. The sRGB value that
 *   precedes it is what every other renderer uses anyway.
 */
export function normalizeSvg(svg: string): string {
  return svg
    .replace(/<mask\b[^>]*>/gi, (tag) => {
      if (/\smask-type\s*=/i.test(tag)) return tag;
      const m = tag.match(/mask-type\s*:\s*(alpha|luminance)/i);
      return m ? tag.replace(/^<mask\b/i, `<mask mask-type="${m[1].toLowerCase()}"`) : tag;
    })
    .replace(/\sstyle="([^"]*)"/gi, (m, css: string) => {
      if (!/color\(/i.test(css)) return m;
      const kept = css
        .split(";")
        .filter((d) => !/^\s*(fill|stroke|stop-color|color)\s*:\s*color\(/i.test(d))
        .join(";");
      return ` style="${kept}"`;
    });
}
