/** Decorative stickers scattered over the error page hero. left/top in %, size in px, rot in degrees. */
export type ErrorSticker = {
  href: string;
  left: number;
  top: number;
  size: number;
  rot: number;
};

export const ERROR_STICKERS: ErrorSticker[] = [
  { href: "/library/vercel.svg", left: 22, top: 24, size: 64, rot: -12 },
  { href: "/library/react_light.svg", left: 78, top: 20, size: 72, rot: 10 },
  { href: "/library/tailwindcss.svg", left: 86, top: 58, size: 56, rot: -8 },
  { href: "/library/figma.svg", left: 12, top: 62, size: 58, rot: 9 },
  { href: "/library/supabase.svg", left: 30, top: 84, size: 50, rot: -6 },
  { href: "/library/linear.svg", left: 70, top: 84, size: 54, rot: 14 },
  { href: "/library/github_light.svg", left: 38, top: 14, size: 44, rot: 6 },
  { href: "/library/bun.svg", left: 62, top: 12, size: 46, rot: -10 },
];
