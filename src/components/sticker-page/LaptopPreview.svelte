<script lang="ts">
  /**
   * True-scale laptop with one sticker on it (and optionally a few companions): an SVG in millimetres, so a 55 mm
   * sticker on a 304 mm MacBook Air is exactly that fraction of the lid. Die-cuts use the precomputed cut paths from
   * the server load; White / Black backings are drawn as a circle (icons) or a pill (wordmarks).
   */
  import Sticker from "@/components/stack/Sticker.svelte";
  import type { DeviceFinish, DeviceSpec } from "$lib/stickers/devices";
  import type { CutEntry } from "$lib/stickers/cuts-types";
  import { TONE } from "$lib/stickers/style";
  import type { Back, Theme, Variant } from "$lib/sticker-page";

  type Main = { href: string; variant: Variant; back: Back; theme: Theme; w: number; h: number; x: number; y: number; rot: number };
  type Companion = { key: string; href: string; x: number; y: number; rot: number; w: number };
  type Props = {
    device: DeviceSpec;
    finish: DeviceFinish;
    main: Main;
    companions?: Companion[];
    cuts: Record<string, CutEntry>;
    /** draw the width dimension under the main sticker */
    dim?: boolean;
    label: string;
  };
  let { device, finish, main, companions = [], cuts, dim = false, label }: Props = $props();

  const gid = $derived(`ss-preview-${finish.dark ? "d" : "l"}`);
  // vinyl colour: white unless the sticker is on dark vinyl
  const vinyl = $derived(main.theme === "dark" ? TONE.dark : TONE.light);
  const ink = $derived(finish.dark ? "rgb(255 255 255 / .85)" : "#111214");
  const dimY = $derived(Math.min(device.h - 14, main.y + main.h / 2 + 7));
  // logo inside a backing: 56 % of a circle, 74 % × 60 % of a pill
  const inner = $derived(main.variant === "wordmark" ? { w: main.w * 0.74, h: main.h * 0.6 } : { w: main.w * 0.56, h: main.h * 0.56 });
</script>

<svg viewBox="0 0 {device.w} {device.h}" class="block w-full" style="aspect-ratio: {device.w}/{device.h}" role="img" aria-label={label}>
  <defs>
    <linearGradient id={gid} x1="0" y1="0" x2="0.35" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity={finish.dark ? 0.09 : 0.35} />
      <stop offset="0.55" stop-color="#fff" stop-opacity="0" />
      <stop offset="1" stop-color="#000" stop-opacity={finish.dark ? 0.25 : 0.1} />
    </linearGradient>
  </defs>
  <rect width={device.w} height={device.h} rx={device.radius} fill={finish.base} />
  <rect width={device.w} height={device.h} rx={device.radius} fill="url(#{gid})" />

  {#each companions as c (c.key)}
    <Sticker href={c.href} cut={cuts[c.href] ?? null} x={c.x} y={c.y} w={c.w} rot={c.rot} />
  {/each}

  {#if main.back === "diecut"}
    <Sticker href={main.href} cut={cuts[main.href] ?? null} x={main.x} y={main.y} w={main.w} rot={main.rot} fill={vinyl} />
  {:else}
    <g
      transform="translate({main.x} {main.y}) rotate({main.rot})"
      style="filter: drop-shadow(0 0.6px 0.6px rgb(0 0 0 / .25)) drop-shadow(0 2px 3px rgb(0 0 0 / .2))"
    >
      <rect x={-main.w / 2} y={-main.h / 2} width={main.w} height={main.h} rx={main.h / 2} fill={main.back === "black" ? TONE.dark : TONE.light} />
      <image href={main.href} x={-inner.w / 2} y={-inner.h / 2} width={inner.w} height={inner.h} preserveAspectRatio="xMidYMid meet" />
    </g>
  {/if}

  {#if dim}
    <g stroke={ink} stroke-width="0.35" fill="none" aria-hidden="true">
      <line x1={main.x - main.w / 2} x2={main.x + main.w / 2} y1={dimY} y2={dimY} />
      <line x1={main.x - main.w / 2} x2={main.x - main.w / 2} y1={dimY - 2} y2={dimY + 2} />
      <line x1={main.x + main.w / 2} x2={main.x + main.w / 2} y1={dimY - 2} y2={dimY + 2} />
    </g>
    <text
      x={main.x}
      y={dimY + 8.5}
      text-anchor="middle"
      fill={ink}
      font-size="5.2"
      letter-spacing="0.2"
      class="font-mono"
      aria-hidden="true">{Math.round(main.w)} MM</text
    >
  {/if}

  <rect
    x="0.2"
    y="0.2"
    width={device.w - 0.4}
    height={device.h - 0.4}
    rx={device.radius}
    fill="none"
    stroke="#000"
    stroke-opacity={finish.dark ? 0.4 : 0.12}
    stroke-width="0.4"
  />
</svg>
