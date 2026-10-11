<script lang="ts">
  /**
   * The hero's server-rendered stand-in for the live editor demo: the editor's chrome drawn as one SVG
   * on the same 1152×640 board, scaled the same way (`xMinYMin meet` = the demo's top-left `scale(k)`
   * with k = min(w/1152, h/640)). The lid sits exactly where `Canvas` first draws it (same insets, same
   * fit), so when the demo mounts on top nothing moves. No JS.
   */
  import { getDevice, getFinish } from "$lib/stickers/devices";
  import { artFor, LOGO_BY_KEY } from "$lib/stickers/logos";
  import { resolveFill } from "$lib/stickers/style";
  import type { CutEntry } from "$lib/stickers/cuts-types";
  import type { Layout } from "$lib/stickers/types";
  import { siteConfig } from "@/config/site";
  import Sticker from "@/components/stack/Sticker.svelte";

  let { layout, cuts = {}, logoCount }: { layout: Layout; cuts?: Record<string, CutEntry>; logoCount: number } = $props();

  const W = 1152;
  const H = 640;
  const HEADER = 44;
  // mirrors Canvas.svelte: panel insets, 6 mm margin, fit capped at half of true size
  const INSET = { left: 328, right: 328, top: 64, bottom: 124 };
  const MARGIN = 6;
  const TRUE_SCALE = 96 / 25.4;
  const device = $derived(getDevice(layout.laptop.model));
  const finish = $derived(getFinish(device, layout.laptop.color));
  const fit = $derived.by(() => {
    const sw = W - INSET.left - INSET.right;
    const sh = H - HEADER - INSET.top - INSET.bottom;
    const vw = device.w + MARGIN * 2;
    const vh = device.h + MARGIN * 2;
    const k = Math.min(sw / vw, sh / vh, 0.5 * TRUE_SCALE);
    return { k, x: INSET.left + (sw - vw * k) / 2, y: HEADER + INSET.top + (sh - vh * k) / 2, w: vw * k, h: vh * k };
  });
  const mark = $derived.by(() => {
    if (!device.mark) return null;
    const [bx, by, bw, bh] = device.mark.art.box;
    const k = device.mark.h / bh;
    const [cx, cy] = device.mark.at ?? [device.w / 2, device.h / 2];
    return { d: device.mark.art.d, k, x: cx - (bx + bw / 2) * k, y: cy - (by + bh / 2) * k };
  });
  const caption = $derived(
    `${layout.stickers.length} ${layout.stickers.length === 1 ? "sticker" : "stickers"} / ${Math.round(device.w)} × ${Math.round(device.h)} mm / ${Math.min(100, Math.round((fit.k / TRUE_SCALE) * 100))}% scale`,
  );

  // 12 faint library tiles from the design's own logos
  const icons = $derived.by(() => {
    const keys = [...new Set(layout.stickers.map((s) => s.logo))].filter((k) => LOGO_BY_KEY.has(k));
    return keys.length ? Array.from({ length: 12 }, (_, i) => artFor(LOGO_BY_KEY.get(keys[i % keys.length])!, "icon", "light")) : [];
  });
  const shapeOf = (s: Layout["stickers"][number]) => (s.shape === "circle" ? "circle" : s.shape === "square" || s.shape === "hex" ? "square" : "diecut");

  const panel = "fill-white stroke-neutral-200 dark:fill-neutral-900 dark:stroke-neutral-800";
  const line = "fill-neutral-100 dark:fill-neutral-800";
</script>

<svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMinYMin meet" class="block size-full select-none" aria-hidden="true" style="font-family: inherit">
  <defs>
    <pattern id="ss-skel-dots" width="22" height="22" patternUnits="userSpaceOnUse" y={HEADER}>
      <circle cx="11" cy="11" r="1" class="fill-neutral-300 dark:fill-neutral-800" />
    </pattern>
    <linearGradient id="ss-skel-shade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#171717" stop-opacity="0" />
      <stop offset="1" stop-color="#171717" stop-opacity="0.06" />
    </linearGradient>
    <linearGradient id="ss-skel-light" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity={finish.dark ? 0.05 : 0.18} />
      <stop offset="1" stop-color="#000" stop-opacity={finish.dark ? 0.12 : 0.05} />
    </linearGradient>
    <filter id="ss-skel-lid" x="-20%" y="-20%" width="140%" height="160%">
      <feDropShadow dx="0" dy="10" stdDeviation="14" flood-opacity="0.35" />
    </filter>
    <filter id="ss-skel-panel" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="10" stdDeviation="8" flood-opacity="0.08" />
    </filter>
  </defs>

  <!-- canvas -->
  <rect width={W} height={H} class="fill-neutral-50 dark:fill-neutral-950" />
  <rect y={HEADER} width={W} height={H - HEADER} fill="url(#ss-skel-dots)" />
  <rect y={H - 128} width={W} height="128" fill="url(#ss-skel-shade)" />

  <!-- the lid, where Canvas draws it -->
  <svg x={fit.x} y={fit.y} width={fit.w} height={fit.h} viewBox="{-MARGIN} {-MARGIN} {device.w + MARGIN * 2} {device.h + MARGIN * 2}" overflow="visible">
    <rect width={device.w} height={device.h} rx={device.radius} fill={finish.base} filter="url(#ss-skel-lid)" />
    <rect width={device.w} height={device.h} rx={device.radius} fill="url(#ss-skel-light)" />
    {#if mark}<path d={mark.d} transform="translate({mark.x} {mark.y}) scale({mark.k})" fill={finish.logo} />{/if}
    <rect x="0.15" y="0.15" width={device.w - 0.3} height={device.h - 0.3} rx={device.radius} fill="none" stroke="#000" stroke-opacity={finish.dark ? 0.45 : 0.12} stroke-width="0.3" />
    {#each layout.stickers as s (s.id)}
      {@const logo = LOGO_BY_KEY.get(s.logo)}
      {#if logo}
        {@const href = artFor(logo, s.variant, s.theme, s.style)}
        <Sticker {href} cut={cuts[href] ?? null} x={s.x} y={s.y} w={s.w} rot={s.rot} fill={resolveFill(s) ?? "#fff"} shape={shapeOf(s)} />
      {/if}
    {/each}
  </svg>
  <text x={fit.x + fit.w / 2} y={fit.y + fit.h - MARGIN * fit.k + 24} text-anchor="middle" class="fill-neutral-400 font-mono text-[11px] dark:fill-neutral-600">{caption}</text>

  <!-- header -->
  <rect width={W} height={HEADER} class="fill-white dark:fill-neutral-900" />
  <rect y={HEADER - 1} width={W} height="1" class="fill-neutral-200 dark:fill-neutral-800" />
  <image href="/icon.svg" x="60" y="12.5" width="18" height="18" />
  <text x="83" y="26.5" class="fill-neutral-950 text-[13px] font-semibold tracking-tight dark:fill-white">{siteConfig.name}</text>
  <rect x="160.5" y="13" width="57" height="17" rx="4" class="fill-none stroke-neutral-200 dark:stroke-neutral-700" />
  <text x="189" y="25" text-anchor="middle" class="fill-neutral-500 font-mono text-[10px]">{siteConfig.version}</text>
  <text x="512.5" y="26" text-anchor="middle" class="fill-neutral-500 text-[13px]">My designs</text>
  <rect x="902.5" y="6.5" width="148.5" height="30" rx="6" class="fill-white stroke-neutral-200 dark:fill-neutral-900 dark:stroke-neutral-800" />
  <rect x="1057" y="6.5" width="85" height="30" rx="6" class="fill-neutral-900 dark:fill-neutral-100" />

  <!-- library panel -->
  <rect x="12.5" y="56.5" width="303" height="571" rx="12" class={panel} filter="url(#ss-skel-panel)" />
  <rect x="25.5" y="69.5" width="277" height="35" rx="6" class="fill-none stroke-neutral-200 dark:stroke-neutral-800" />
  <text x="58" y="91.5" class="fill-neutral-500 text-[13px]">Search {logoCount} stickers…</text>
  <rect x="25" y="113" width="278" height="32" rx="6" class={line} />
  <rect x="25" y="153" width="278" height="32" rx="8" class={line} />
  <rect x="13" y="237.5" width="302" height="1" class="fill-neutral-200 dark:fill-neutral-800" />
  {#each icons as href, i (i)}
    {@const x = 23 + (i % 3) * 96}
    {@const y = 248 + Math.floor(i / 3) * 82}
    <rect x={x + 0.5} y={y + 0.5} width="89" height="75" rx="8" class="fill-neutral-50 stroke-neutral-200 dark:fill-neutral-950/50 dark:stroke-neutral-800" />
    <image {href} x={x + 32} y={y + 13.4} width="26" height="26" opacity="0.45" />
    <rect x={x + 22} y={y + 50} width="46" height="7" rx="3.5" class={line} />
  {/each}

  <!-- device bar -->
  <rect x="340.5" y="56.5" width="370" height="35" rx="10" class={panel} />
  <rect x="720.5" y="56.5" width="91" height="35" rx="10" class={panel} />

  <!-- right panel -->
  <rect x="836.5" y="56.5" width="303" height="571" rx="12" class={panel} filter="url(#ss-skel-panel)" />
  <rect x="850" y="70" width="40" height="40" rx="8" class={line} />
  <rect x="902" y="78" width="80" height="9" rx="4.5" class="fill-neutral-200 dark:fill-neutral-700" />
  <rect x="902" y="95" width="130" height="7" rx="3.5" class={line} />
  {#each [140, 172, 204, 260, 292, 348, 380] as y, i (y)}
    <rect x="850" {y} width={[110, 276, 200, 276, 150, 276, 220][i]} height={i % 2 ? 26 : 8} rx="4" class={line} />
  {/each}
</svg>
