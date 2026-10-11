<script lang="ts">
  import { getContext } from "svelte";
  import { toast } from "svelte-sonner";
  import type { EditorState } from "$lib/stickers/editor.svelte";
  import { LOGOS, LOGO_BY_KEY, artFor } from "$lib/stickers/logos";
  import { PACKS } from "$lib/stickers/packs";
  import ChevronLeft from "@lucide/svelte/icons/chevron-left";
  import { getDemo } from "./demo";

  /** centre of the lid on screen, px */
  let { x, y }: { x: number; y: number } = $props();
  const editor = getContext<EditorState>("editor");
  const demoScope = getDemo();

  const art = (key: string) => {
    const l = LOGO_BY_KEY.get(key);
    return l ? artFor(l, "icon", "dark") : "";
  };
  // [logo, left, top, size, tilt, round]
  const HERO: [string, number, number, number, number, boolean][] = [
    ["vercel", 8, 26, 44, -12, true],
    ["react", 44, 2, 50, 6, true],
    ["supabase", 88, 22, 44, 14, false],
    ["linear", 60, 44, 38, -6, false],
  ];
  const FAN: [number, number, number][] = [
    [0, 6, -10],
    [16, 0, 4],
    [32, 5, 12],
  ];

  function addPack(p: (typeof PACKS)[number]) {
    editor.addMany(p.logos);
    toast(`Added the ${p.name} pack · ${p.logos.length} stickers`);
  }
  function focusSearch() {
    (demoScope?.root() ?? document).querySelector<HTMLInputElement>('input[aria-label="Search stickers"]')?.focus();
  }
</script>

<div
  data-panel
  data-ui
  class="pointer-events-auto absolute z-10 flex w-100 -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[18px] border border-neutral-200 bg-white text-[13px] shadow-2xl dark:border-neutral-800 dark:bg-neutral-900"
  style="left: {x}px; top: {y}px"
>
  <div class="ss-dots grid h-29.5 place-items-center border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950">
    <div class="relative h-21 w-37.5">
      {#each HERO as [key, left, top, size, tilt, round] (key)}
        <div
          class="absolute grid place-items-center bg-[#141414] shadow-[0_0_0_2.5px_#ececec,0_6px_12px_rgba(0,0,0,.35)]"
          style="left: {left}px; top: {top}px; width: {size}px; height: {size}px; border-radius: {round ? '50%' : '26%'}; transform: rotate({tilt}deg)"
        >
          <img src={art(key)} alt="" class="size-[56%] object-contain" />
        </div>
      {/each}
    </div>
  </div>
  <div class="flex flex-col items-center gap-1.5 px-5 pt-4.5 pb-1.5 text-center">
    <span class="text-lg font-semibold tracking-tight">Start your stack</span>
    <span class="max-w-75 leading-normal text-pretty text-neutral-500">Stick the tools you build with. Pick a starter pack, or click any logo in the library.</span>
  </div>
  <div class="grid grid-cols-3 gap-2 px-4 pt-3.5 pb-4">
    {#each PACKS as p (p.name)}
      <button
        type="button"
        class="flex cursor-pointer flex-col items-center gap-2.5 rounded-xl border border-neutral-200 bg-neutral-50 px-2 pt-3.5 pb-3 hover:border-neutral-300 hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-950/50 dark:hover:border-neutral-700 dark:hover:bg-neutral-800/60"
        onclick={() => addPack(p)}
      >
        <span class="relative h-8.5 w-15.5">
          {#each p.logos.slice(0, 3) as key, i (key)}
            <span
              class="absolute grid size-7.5 place-items-center rounded-full bg-[#121212] shadow-[0_0_0_2px_#e9e9e9,0_3px_6px_rgba(0,0,0,.35)]"
              style="left: {FAN[i][0]}px; top: {FAN[i][1]}px; transform: rotate({FAN[i][2]}deg); z-index: {i}"
            >
              <img src={art(key)} alt="" class="size-[56%] object-contain" />
            </span>
          {/each}
        </span>
        <span class="flex flex-col items-center gap-px">
          <span class="font-medium">{p.name}</span>
          <span class="font-mono text-[10.5px] text-neutral-500">{p.logos.length} stickers</span>
        </span>
      </button>
    {/each}
  </div>
  <button
    type="button"
    class="flex cursor-pointer items-center justify-center gap-2 border-t border-neutral-200 px-4 py-2.75 text-xs text-neutral-500 hover:text-neutral-900 dark:border-neutral-800 dark:hover:text-white"
    onclick={focusSearch}
  >
    <ChevronLeft class="size-3.5" />
    Or search {LOGOS.length} stickers
    <kbd class="rounded border border-neutral-200 px-1.5 font-mono text-[10.5px] text-neutral-500 dark:border-neutral-700">⌘K</kbd>
  </button>
</div>

<style>
  .ss-dots {
    background-image: radial-gradient(var(--color-neutral-200) 1px, transparent 1px);
    background-size: 14px 14px;
  }
  :global(.dark) .ss-dots {
    background-image: radial-gradient(var(--color-neutral-800) 1px, transparent 1px);
  }
</style>
