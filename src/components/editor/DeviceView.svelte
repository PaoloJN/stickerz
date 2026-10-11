<script lang="ts">
  import { getDevice, getFinish } from "$lib/stickers/devices";

  let { model, color }: { model: string; color: string } = $props();
  const d = $derived(getDevice(model));
  const f = $derived(getFinish(d, color));

  // logo: scale the art's tight box to the mark height, centre it on `at`
  const mark = $derived.by(() => {
    if (!d.mark) return null;
    const [bx, by, bw, bh] = d.mark.art.box;
    const k = d.mark.h / bh;
    const [cx, cy] = d.mark.at ?? [d.w / 2, d.h / 2];
    return { k, x: cx - (bx + bw / 2) * k, y: cy - (by + bh / 2) * k };
  });
</script>

<defs>
  <!-- soft overhead light: a touch brighter at the top, a touch darker at the bottom -->
  <linearGradient id="ss-dev-light" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#fff" stop-opacity={f.dark ? 0.05 : 0.18} />
    <stop offset="1" stop-color="#000" stop-opacity={f.dark ? 0.12 : 0.05} />
  </linearGradient>
  <filter id="ss-dev-shadow" x="-20%" y="-20%" width="140%" height="160%">
    <feDropShadow dx="0" dy="10" stdDeviation="14" flood-opacity="0.35" />
  </filter>
</defs>

<rect width={d.w} height={d.h} rx={d.radius} fill={f.base} filter="url(#ss-dev-shadow)" style="transition: fill 0.3s" data-ui />
<!-- the device itself; exports with a transparent background drop this group -->
<g data-device>
<rect width={d.w} height={d.h} rx={d.radius} fill={f.base} style="transition: fill 0.3s" />
<rect width={d.w} height={d.h} rx={d.radius} fill="url(#ss-dev-light)" />
{#if mark && d.mark}
  <path d={d.mark.art.d} transform="translate({mark.x} {mark.y}) scale({mark.k})" fill={f.logo} style="transition: fill 0.3s" />
{/if}
<rect x="0.15" y="0.15" width={d.w - 0.3} height={d.h - 0.3} rx={d.radius} fill="none" stroke="#000" stroke-opacity={f.dark ? 0.45 : 0.12} stroke-width="0.3" />
</g>
