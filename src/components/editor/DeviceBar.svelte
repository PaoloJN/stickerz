<script lang="ts">
  import { getContext } from "svelte";
  import { toast } from "svelte-sonner";
  import type { EditorState } from "$lib/stickers/editor.svelte";
  import { deviceGroups, getDevice, getFinish } from "$lib/stickers/devices";
  import { Button } from "@/components/ui/button";
  import * as DropdownMenu from "@/components/ui/dropdown-menu";
  import { Separator } from "@/components/ui/separator";
  import LaptopIcon from "@lucide/svelte/icons/laptop";
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import Check from "@lucide/svelte/icons/check";
  import ShuffleIcon from "@lucide/svelte/icons/shuffle";

  const editor = getContext<EditorState>("editor");
  const laptop = $derived(editor.layout.laptop);
  const device = $derived(getDevice(laptop.model));
  const finish = $derived(getFinish(device, laptop.color));
  const groups = deviceGroups();

  const group = "pointer-events-auto flex items-center gap-0.5 rounded-[10px] border border-neutral-200 bg-white p-0.5 shadow-lg dark:border-neutral-800 dark:bg-neutral-900";

  function shuffle() {
    editor.shuffle();
    toast("Shuffled · locked stickers stay put · ⌘Z to undo");
  }
</script>

<div data-panel data-ui class="flex flex-wrap items-start justify-center gap-2">
  <div class={group}>
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        {#snippet child({ props })}
          <Button {...props} variant="ghost" size="sm" class="h-7.5 gap-2 pr-2 pl-2.5 text-[13px]">
            <LaptopIcon class="size-3.5" />
            {device.name}
            <ChevronDown class="size-3 text-neutral-500" />
          </Button>
        {/snippet}
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="start" class="w-76">
        {#each groups as g, i (g.family)}
          {#if i > 0}<DropdownMenu.Separator />{/if}
          <DropdownMenu.Label class="px-2.5 pt-2 pb-1.5 font-mono text-[10.5px] font-normal tracking-wider text-neutral-500 uppercase">{g.family} · true scale</DropdownMenu.Label>
          {#each g.devices as d (d.id)}
            <DropdownMenu.Item class="h-8.5 gap-2.5 px-2.5" onSelect={() => editor.setLaptop({ model: d.id })}>
              <span class="flex-1">{d.name}</span>
              <span class="font-mono text-[11px] text-neutral-500">{Math.round(d.w)}×{Math.round(d.h)}</span>
              <Check class="size-3.5 {laptop.model === d.id ? '' : 'invisible'}" />
            </DropdownMenu.Item>
          {/each}
        {/each}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
    <Separator orientation="vertical" class="h-4!" />
    <div class="flex items-center gap-2 px-2.5" role="radiogroup" aria-label="Color">
      {#each device.finishes as c (c.id)}
        <button
          type="button"
          role="radio"
          aria-checked={finish.id === c.id}
          aria-label={c.name}
          title={c.name}
          class="size-4 cursor-pointer rounded-full ring-1 ring-black/15 ring-offset-2 ring-offset-white aria-checked:ring-2 aria-checked:ring-neutral-900 dark:ring-white/20 dark:ring-offset-neutral-900 dark:aria-checked:ring-white"
          style="background: {c.base}"
          onclick={() => editor.setLaptop({ color: c.id })}
        ></button>
      {/each}
    </div>
    <span class="hidden min-w-17 pr-2 text-xs whitespace-nowrap text-neutral-500 xl:inline">{finish.name}</span>
  </div>

  <div class={group}>
    <Button variant="ghost" size="sm" class="h-7.5 px-2.5 text-[13px]" title="Shuffle · S" disabled={editor.layout.stickers.length === 0} onclick={shuffle}>
      <ShuffleIcon class="size-3.5" />Shuffle
    </Button>
  </div>

</div>
