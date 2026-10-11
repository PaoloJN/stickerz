<script lang="ts">
  import { getContext } from "svelte";
  import type { EditorState } from "$lib/stickers/editor.svelte";
  import { rotatedExtents, stickerGeometry } from "$lib/stickers/geometry";
  import { LOGO_BY_KEY } from "$lib/stickers/logos";
  import { stickerArt } from "$lib/stickers/custom.svelte";
  import { edgeGrow } from "$lib/stickers/style";
  import { Button } from "@/components/ui/button";
  import * as ToggleGroup from "@/components/ui/toggle-group";
  import { Separator } from "@/components/ui/separator";
  import SlidersVertical from "@lucide/svelte/icons/sliders-vertical";
  import Copy from "@lucide/svelte/icons/copy";
  import Trash from "@lucide/svelte/icons/trash-2";
  import LogoImg from "./LogoImg.svelte";

  type Canvas = {
    mmToScreen: (x: number, y: number) => { x: number; y: number };
    pxPerMm: () => number;
    bounds: () => { w: number; inset: { left: number; right: number; top: number; bottom: number } };
  };
  const editor = getContext<EditorState>("editor");
  const canvas = getContext<Canvas>("canvas");

  const s = $derived(editor.selected);
  const art = $derived(s ? stickerArt(s) : null);
  const libLogo = $derived(s ? LOGO_BY_KEY.get(s.logo) : undefined);
  let tbWidth = $state(0);

  const place = $derived.by(() => {
    if (!s || !art) return null;
    const g = stickerGeometry(s, (art.href && editor.aspects[art.href]) || 1);
    const { hh } = rotatedExtents(g.w, g.h, s.rot);
    const k = canvas.pxPerMm();
    const pad = edgeGrow(s) * k + 6;
    const c = canvas.mmToScreen(s.x, s.y);
    const top = canvas.mmToScreen(s.x, s.y - hh).y - pad;
    const bottom = canvas.mmToScreen(s.x, s.y + hh).y + pad;
    const { w, inset } = canvas.bounds();
    const half = tbWidth / 2;
    const lo = inset.left + half - 24;
    const hi = w - inset.right - half + 24;
    const above = top - 44 - 48 > 8;
    return {
      x: lo > hi ? w / 2 : Math.min(Math.max(c.x, lo), hi),
      // above the rotate handle, else under the size readout
      tbTop: above ? top - 44 - 48 : bottom + 40,
      readX: c.x,
      readY: bottom + 10,
      label: `${Math.round(g.w)} × ${Math.round(g.h)} mm · ${Math.round(s.rot)}°`,
    };
  });
</script>

{#if s && art && place}
  <div
    class="pointer-events-none absolute z-10 -translate-x-1/2 rounded-[5px] bg-blue-500 px-1.5 py-0.5 font-mono text-[11px] whitespace-nowrap text-white"
    style="left: {place.readX}px; top: {place.readY}px"
  >
    {place.label}
  </div>

  <div
    data-panel
    role="toolbar"
    aria-label="Sticker"
    tabindex="-1"
    bind:clientWidth={tbWidth}
    class="absolute z-20 flex h-10 -translate-x-1/2 items-center gap-0.5 rounded-xl border border-neutral-200 bg-white p-1 text-[12.5px] whitespace-nowrap shadow-xl dark:border-neutral-800 dark:bg-neutral-900"
    style="left: {place.x}px; top: {place.tbTop}px"
  >
    <div class="flex items-center gap-2 pr-2.5 pl-1.5">
      {#if libLogo}
        <LogoImg art={libLogo.icon} class="size-4" />
      {:else if art.href}
        <img src={art.href} alt="" draggable="false" class="size-4 object-contain" />
      {/if}
      <span class="hidden max-w-40 truncate font-medium xl:inline">{art.title}</span>
    </div>
    <Separator orientation="vertical" class="mx-1 h-4.5!" />
    <ToggleGroup.Root type="single" class="rounded-[9px]" value={s.theme} onValueChange={(v) => v && editor.update(s.id, { theme: v as "light" | "dark" })} aria-label="Sticker tone">
      {#each ["dark", "light"] as const as tone (tone)}
        <ToggleGroup.Item value={tone} class="px-2.5" title={tone === "dark" ? "Dark sticker · light logo" : "Light sticker · dark logo"}>
          {tone === "dark" ? "Dark" : "Light"}
        </ToggleGroup.Item>
      {/each}
    </ToggleGroup.Root>
    <Separator orientation="vertical" class="mx-1 h-4.5!" />
    <Button
      variant="ghost"
      size="sm"
      class="h-7.5 px-2.5 {editor.stylePanel ? 'bg-neutral-100 dark:bg-neutral-800' : ''}"
      aria-pressed={editor.stylePanel}
      title="Sticker style"
      onclick={() => (editor.stylePanel = !editor.stylePanel)}
    >
      <SlidersVertical class="size-3.5" />Style
    </Button>
    <Separator orientation="vertical" class="mx-1 h-4.5!" />
    <Button variant="ghost" size="icon" class="size-7.5 text-neutral-500 dark:text-neutral-400" title="Duplicate · ⌘D" aria-label="Duplicate" onclick={() => editor.duplicate(s.id)}>
      <Copy class="size-3.5" />
    </Button>
    <Button
      variant="ghost"
      size="icon"
      class="size-7.5 text-neutral-500 hover:bg-red-50 hover:text-red-500 dark:text-neutral-400 dark:hover:bg-red-950/50 dark:hover:text-red-400"
      title="Delete · ⌫"
      aria-label="Delete"
      onclick={() => editor.remove(s.id)}
    >
      <Trash class="size-3.5" />
    </Button>
  </div>
{/if}
