/**
 * Builds the favicon set, PWA icons and the social share image from the
 * Stickerz icon (source: static/icon.svg).
 * Run: ./node_modules/.bin/vite-node scripts/build-icons.ts
 */
import { Resvg } from "@resvg/resvg-js";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const staticDir = join(root, "static");
const SRC = join(staticDir, "icon.svg");
const BG = "#111214";
const iconSvg = readFileSync(SRC, "utf8");
const iconUri = (svg: string) =>
  `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

const png = (svg: string, width: number, fonts = false) =>
  new Resvg(svg, {
    fitTo: { mode: "width", value: width },
    background: undefined,
    font: fonts
      ? {
          // resvg cannot read woff2: these are static instances of static/fonts/Geist.woff2
          fontFiles: [join(root, "scripts/fonts/Geist-Bold.ttf"), join(root, "scripts/fonts/Geist-Regular.ttf")],
          loadSystemFonts: false,
          defaultFontFamily: "Geist",
        }
      : undefined,
  })
    .render()
    .asPng();

const out = (p: string, buf: Buffer | Uint8Array) => {
  const f = join(staticDir, p);
  mkdirSync(join(f, ".."), { recursive: true });
  writeFileSync(f, buf);
  console.log("wrote", p);
};

/** Icon centred at `scale` on a full-bleed dark square (no transparency). */
const padded = (size: number, scale: number) => {
  const s = size * scale;
  const o = (size - s) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
<rect width="${size}" height="${size}" fill="#161616"/>
<image href="${iconUri(iconSvg)}" x="${o}" y="${o}" width="${s}" height="${s}"/></svg>`;
};

// 1. favicon.svg
copyFileSync(SRC, join(staticDir, "favicon.svg"));

// 2. favicon.ico (PNG entries)
const sizes = [16, 32, 48];
const pngs = sizes.map((n) => Buffer.from(png(iconSvg, n)));
const head = Buffer.alloc(6);
head.writeUInt16LE(0, 0);
head.writeUInt16LE(1, 2);
head.writeUInt16LE(sizes.length, 4);
let offset = 6 + 16 * sizes.length;
const dirs = sizes.map((n, i) => {
  const d = Buffer.alloc(16);
  d.writeUInt8(n, 0);
  d.writeUInt8(n, 1);
  d.writeUInt16LE(1, 4);
  d.writeUInt16LE(32, 6);
  d.writeUInt32LE(pngs[i].length, 8);
  d.writeUInt32LE(offset, 12);
  offset += pngs[i].length;
  return d;
});
out("favicon.ico", Buffer.concat([head, ...dirs, ...pngs]));

// 3. apple-touch-icon
out("apple-touch-icon.png", png(padded(180, 1), 180));

// 4. PWA icons
for (const n of [192, 256, 384, 512]) out(`images/icons/icon-${n}x${n}.png`, png(iconSvg, n));
out("images/icons/maskable_icon.png", png(padded(512, 0.8), 512));

// 5. og.png
const tiles: [string, number, number, number][] = [
  // file, x, y, rotation
  ["vercel", 0, 0, -6],
  ["react_light", 1, 0, 5],
  ["tailwindcss", 2, 0, -4],
  ["figma", 0, 1, 4],
  ["supabase", 1, 1, -5],
  ["github_light", 2, 1, 6],
  ["typescript", 0, 2, -3],
  ["linear", 1, 2, 5],
];
const T = 128, GAP = 22, GX = 724, GY = 100;
const tileSvg = tiles
  .map(([name, c, r, rot]) => {
    const x = GX + c * (T + GAP) + (r === 1 ? 24 : 0);
    const y = GY + r * (T + GAP);
    const logo = readFileSync(join(staticDir, "library", `${name}.svg`), "utf8");
    const pad = 26;
    return `<g transform="translate(${x + T / 2} ${y + T / 2}) rotate(${rot}) translate(${-T / 2} ${-T / 2})">
<rect x="0" y="6" width="${T}" height="${T}" rx="26" fill="#000" opacity="0.35"/>
<rect width="${T}" height="${T}" rx="26" fill="#fff"/>
<image href="${iconUri(logo)}" x="${pad}" y="${pad}" width="${T - 2 * pad}" height="${T - 2 * pad}" preserveAspectRatio="xMidYMid meet"/></g>`;
  })
  .join("\n");
const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="${BG}"/>
<image href="${iconUri(iconSvg)}" x="64" y="64" width="200" height="200"/>
<text x="64" y="388" font-family="Geist" font-weight="700" font-size="84" fill="#fff" letter-spacing="-2">stickerz.dev</text>
<text x="66" y="450" font-family="Geist" font-size="34" fill="#8b8d93">Your stack, on your laptop.</text>
${tileSvg}
</svg>`;
out("og.png", png(og, 1200, true));
