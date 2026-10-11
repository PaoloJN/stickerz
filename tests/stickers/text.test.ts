import { readFileSync } from "node:fs";
import { parse } from "opentype.js";
import { expect, test } from "vitest";
import { FONTS, sanitizeText, textSvg, DEFAULT_TEXT } from "@/lib/stickers/text";
import { decodeLayout, encodeLayout } from "@/lib/stickers/codec";
import { DEFAULT_STYLE } from "@/lib/stickers/style";
import type { Layout } from "@/lib/stickers/types";

const font = (file: string) => {
  const b = readFileSync(`static/fonts/sticker/${file}`);
  return parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.length) as ArrayBuffer);
};
const viewBox = (svg: string) => svg.match(/viewBox="([^"]+)"/)![1].split(" ").map(Number);

test("every bundled font sets text as a single path", () => {
  for (const f of FONTS) {
    const svg = textSvg(font(f.file), { ...DEFAULT_TEXT, font: f.id })!;
    expect(svg).toMatch(/^<svg [^>]*width="[\d.]+" height="[\d.]+"><path fill="#121212" d="M/);
  }
});

test("lines stack, spacing widens, blank text draws nothing", () => {
  const f = font("ArchivoBlack-Regular.ttf");
  const one = viewBox(textSvg(f, { ...DEFAULT_TEXT, value: "hi" })!);
  const two = viewBox(textSvg(f, { ...DEFAULT_TEXT, value: "hi\nhi" })!);
  expect(two[3]).toBeGreaterThan(one[3] * 1.8);
  const wide = viewBox(textSvg(f, { ...DEFAULT_TEXT, value: "hi", spacing: 40 })!);
  expect(wide[2]).toBeGreaterThan(one[2]);
  expect(textSvg(f, { ...DEFAULT_TEXT, value: "   " })).toBeNull();
});

test("sanitize trims, clamps and rejects junk", () => {
  expect(sanitizeText({ value: "a\nb\nc\nd\ne\r", font: "nope", color: "red", align: "up", spacing: 999 })).toEqual({
    value: "a\nb\nc\nd", font: "bold", color: "#121212", align: "center", spacing: 50,
  });
  expect(sanitizeText({ value: "  " })).toBeNull();
  expect(sanitizeText("x")).toBeNull();
});

test("text and upload stickers survive share links", () => {
  const base = { variant: "icon" as const, theme: "light" as const, locked: false, ...DEFAULT_STYLE, x: 10, y: 10, w: 40, rot: 0 };
  const layout: Layout = {
    v: 1, laptop: { model: "air13", color: "silver" },
    stickers: [
      { id: "t", logo: "@text", text: { value: "ship it\nfriday", font: "script", color: "#ff6a3d", align: "left", spacing: 5 }, ...base },
      { id: "u", logo: "@up:abc123", ...base },
      { id: "x", logo: "@text", ...base },
    ],
  };
  const out = decodeLayout(encodeLayout(layout), () => false)!;
  expect(out.stickers.map((s) => s.logo)).toEqual(["@text", "@up:abc123"]);
  expect(out.stickers[0].text).toEqual(layout.stickers[0].text);
});
