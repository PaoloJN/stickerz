<script lang="ts">
  /**
   * Read-only laptop lid thumbnail. Renders a stack (device + scattered stickers) with zero
   * editor dependencies — safe to use in grids, hero previews and the shared-stack page.
   * Mirrors the mini-svg in the editor's StackPanel.
   */
  import { getDevice, getFinish } from "$lib/stickers/devices";
  import { artFor, LOGO_BY_KEY } from "$lib/stickers/logos";
  import type { Layout } from "$lib/stickers/types";
  import type { CutEntry } from "$lib/stickers/cuts-types";
  import { resolveFill } from "$lib/stickers/style";
  import Sticker from "./Sticker.svelte";

  type Props = {
    layout: Layout;
    /** extra classes on the <svg> (size it from the parent, e.g. "w-full") */
    class?: string;
    /** die-cut paths by art href, from `cutsFor(artUrlsIn(...))` in a server load; missing ones draw as tiles */
    cuts?: Record<string, CutEntry>;
    /** slide stickers to new positions when the layout changes (e.g. a shuffle) instead of jumping */
    animate?: boolean;
  };
  let { layout, class: className = "w-full", cuts = {}, animate = false }: Props = $props();

  const device = $derived(getDevice(layout.laptop.model));
  const finish = $derived(getFinish(device, layout.laptop.color));
  // deterministic id (two variants) so SSR and client agree; duplicate <defs> ids resolve fine
  const gid = $derived(`ss-lid-${finish.dark ? "d" : "l"}`);
</script>

<svg
  viewBox="0 0 {device.w} {device.h}"
  class={className}
  style="aspect-ratio: {device.w}/{device.h}"
  preserveAspectRatio="xMidYMid meet"
  aria-hidden="true"
>
  <defs>
    <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity={finish.dark ? 0.08 : 0.3} />
      <stop offset="0.55" stop-color="#fff" stop-opacity="0" />
      <stop offset="1" stop-color="#000" stop-opacity={finish.dark ? 0.22 : 0.08} />
    </linearGradient>
  </defs>
  <rect width={device.w} height={device.h} rx={device.radius} fill={finish.base} />
  <rect width={device.w} height={device.h} rx={device.radius} fill="url(#{gid})" />
  {#each layout.stickers as s (s.id)}
    {@const logo = LOGO_BY_KEY.get(s.logo)}
    {#if logo}
      {@const href = artFor(logo, s.variant, s.theme, s.style)}
      <Sticker
        {href}
        cut={cuts[href] ?? null}
        x={s.x}
        y={s.y}
        w={s.w}
        rot={s.rot}
        fill={resolveFill(s) ?? "#fff"}
        {animate}
      />
    {/if}
  {/each}
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
