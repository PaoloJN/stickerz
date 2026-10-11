<script lang="ts">
  /**
   * The hero's static editor stand-in: a device card with the title bar (device · finish, size)
   * over a dotted canvas holding the lid at its real proportions.
   */
  import StackLid from "@/components/stack/StackLid.svelte";
  import { getDevice, getFinish } from "$lib/stickers/devices";
  import type { CutEntry } from "$lib/stickers/cuts-types";
  import type { Layout } from "$lib/stickers/types";

  let { layout, cuts = {} }: { layout: Layout; cuts?: Record<string, CutEntry> } = $props();

  const device = $derived(getDevice(layout.laptop.model));
  const finish = $derived(getFinish(device, layout.laptop.color));
  const dots = "background-image: radial-gradient(var(--color-border) 1.2px, transparent 1.2px); background-size: 20px 20px;";
</script>

<div
  class="flex h-[240px] w-[968px] max-w-full sm:h-[400px] lg:h-[538px] flex-col overflow-hidden rounded-[12px] border border-foreground/10 bg-card text-[13px] text-foreground shadow-[0_1px_2px_rgb(0_0_0/.06),0_30px_60px_rgb(10_40_40/.35)]"
>
  <div class="flex h-[38px] flex-none items-center justify-between gap-2 border-b border-border px-3">
    <span class="truncate font-medium">{device.name} <span class="text-muted-foreground">· {finish.name}</span></span>
    <span class="flex-none font-mono text-[11px] text-muted-foreground">{Math.round(device.w)} × {Math.round(device.h)} mm · 1:1</span>
  </div>
  <div class="grid min-h-0 flex-1 place-items-center bg-muted p-4 sm:p-10" style={dots}>
    <StackLid {layout} {cuts} class="h-full max-h-full w-auto max-w-full drop-shadow-[0_10px_24px_rgb(0_0_0/.14)]" />
  </div>
</div>
