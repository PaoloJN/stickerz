<script lang="ts">
  /**
   * The home hero's live editor: the real `EditorShell` (header, library, canvas, style panel, dock,
   * export) in demo mode, laid out at a fixed 1152×640 and scaled down to fit the hero frame. Demo
   * mode never touches storage, never autosaves, ignores ?id / #l= / ?add=, and its keys only act
   * while focus is inside it. Loaded lazily by the home page, so none of this ships in its initial JS.
   */
  import type { Layout } from "$lib/stickers/types";
  import EditorShell from "./EditorShell.svelte";

  let { layout }: { layout: Layout } = $props();

  const W = 1152;
  const H = 640;
  let box: HTMLDivElement | undefined = $state();
  let k = $state(0);

  $effect(() => {
    if (!box) return;
    const el = box;
    const fit = () => (k = Math.min(el.clientWidth / W, el.clientHeight / H));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  });
</script>

<div
  bind:this={box}
  class="h-full w-full overflow-hidden rounded-[12px] border border-foreground/10 bg-neutral-50 shadow-[0_1px_2px_rgb(0_0_0/.06),0_30px_60px_rgb(10_40_40/.35)] dark:bg-neutral-950"
>
  <div style="width: {W}px; height: {H}px; transform: scale({k}); transform-origin: top left; visibility: {k ? 'visible' : 'hidden'}">
    <EditorShell demo={{ layout }} />
  </div>
</div>
