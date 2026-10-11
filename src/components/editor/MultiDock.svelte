<script lang="ts">
  import { getContext } from "svelte";
  import { toast } from "svelte-sonner";
  import type { EditorState } from "$lib/stickers/editor.svelte";
  import type { AlignKind } from "$lib/stickers/ops";
  import { Button } from "@/components/ui/button";
  import * as ToggleGroup from "@/components/ui/toggle-group";
  import { Separator } from "@/components/ui/separator";
  import AlignLeft from "@lucide/svelte/icons/align-start-vertical";
  import AlignHCenter from "@lucide/svelte/icons/align-center-vertical";
  import AlignRight from "@lucide/svelte/icons/align-end-vertical";
  import AlignTop from "@lucide/svelte/icons/align-start-horizontal";
  import AlignVCenter from "@lucide/svelte/icons/align-center-horizontal";
  import AlignBottom from "@lucide/svelte/icons/align-end-horizontal";
  import DistributeH from "@lucide/svelte/icons/align-horizontal-distribute-center";
  import DistributeV from "@lucide/svelte/icons/align-vertical-distribute-center";
  import MatchSize from "@lucide/svelte/icons/scan";
  import Lock from "@lucide/svelte/icons/lock";
  import Copy from "@lucide/svelte/icons/copy";
  import Trash from "@lucide/svelte/icons/trash-2";
  import X from "@lucide/svelte/icons/x";
  import type { Component } from "svelte";

  const editor = getContext<EditorState>("editor");
  const ids = $derived(editor.selectedIds);
  const items = $derived(editor.layout.stickers.filter((s) => ids.includes(s.id)));
  const tone = $derived(items.length && items.every((s) => s.theme === items[0].theme) ? items[0].theme : "");

  const ALIGN: [AlignKind, string, Component][] = [
    ["left", "Align left", AlignLeft],
    ["hcenter", "Align centers horizontally", AlignHCenter],
    ["right", "Align right", AlignRight],
    ["top", "Align top", AlignTop],
    ["vcenter", "Align centers vertically", AlignVCenter],
    ["bottom", "Align bottom", AlignBottom],
  ];

  const icon = "size-8 flex-none rounded-lg text-neutral-500 dark:text-neutral-400";
  const sep = "mx-1 h-5! flex-none";

  function distribute(axis: "x" | "y") {
    if (!editor.distribute(axis)) toast("Select 3 or more stickers to distribute");
  }
  function lock() {
    const on = !items.every((s) => s.locked);
    editor.updateMany(ids, { locked: on });
    toast(`${on ? "Locked" : "Unlocked"} ${ids.length} stickers`);
  }
  function remove() {
    const n = ids.length;
    editor.removeMany(ids);
    toast(`Deleted ${n} stickers · ⌘Z to undo`);
  }
</script>

<div
  data-panel
  data-ui
  role="toolbar"
  aria-label="Selected stickers"
  tabindex="-1"
  class="pointer-events-auto flex h-12 max-w-full items-center gap-0.5 overflow-x-auto rounded-xl border border-neutral-200 bg-white px-1.5 text-[12.5px] whitespace-nowrap shadow-xl [scrollbar-width:none] dark:border-neutral-800 dark:bg-neutral-900"
>
  <div class="flex flex-none items-center gap-2 pr-2 pl-1.5">
    <span class="grid h-5.5 min-w-5.5 place-items-center rounded-md bg-blue-500 px-1.5 text-xs font-semibold text-white">{ids.length}</span>
    <span class="font-medium">selected</span>
  </div>
  <Separator orientation="vertical" class={sep} />
  <ToggleGroup.Root type="single" class="flex-none rounded-[9px]" value={tone} onValueChange={(v) => v && editor.updateMany(ids, { theme: v as "light" | "dark" })} aria-label="Theme">
    {#each ["dark", "light"] as const as t (t)}
      <ToggleGroup.Item value={t} class="h-8 text-[12.5px]">
        <span class="size-3 rounded {t === 'dark' ? 'bg-[#121212]' : 'bg-white'} ring-1 ring-neutral-400 dark:ring-neutral-600"></span>{t === "dark" ? "Dark" : "Light"}
      </ToggleGroup.Item>
    {/each}
  </ToggleGroup.Root>
  <Separator orientation="vertical" class={sep} />
  {#each ALIGN as [kind, title, Icon] (kind)}
    <Button variant="ghost" size="icon" class={icon} {title} aria-label={title} onclick={() => editor.align(kind)}><Icon class="size-3.5" /></Button>
  {/each}
  <Separator orientation="vertical" class={sep} />
  <Button variant="ghost" size="icon" class={icon} title="Distribute horizontally" aria-label="Distribute horizontally" onclick={() => distribute("x")}><DistributeH class="size-3.5" /></Button>
  <Button variant="ghost" size="icon" class={icon} title="Distribute vertically" aria-label="Distribute vertically" onclick={() => distribute("y")}><DistributeV class="size-3.5" /></Button>
  <Separator orientation="vertical" class={sep} />
  <Button
    variant="ghost"
    size="icon"
    class={icon}
    title="Match size to first selected"
    aria-label="Match size to first selected"
    onclick={() => {
      const first = items.find((s) => s.id === ids[0]);
      if (first) editor.updateMany(ids, { w: first.w });
    }}><MatchSize class="size-3.5" /></Button
  >
  <Button variant="ghost" size="sm" class="h-8 flex-none px-2 font-mono text-xs text-neutral-500 dark:text-neutral-400" title="Straighten selection" onclick={() => editor.updateMany(ids, { rot: 0 })}>0°</Button>
  <Button variant="ghost" size="icon" class={icon} title="Lock / unlock · L" aria-label="Lock or unlock" onclick={lock}><Lock class="size-3.5" /></Button>
  <Button variant="ghost" size="icon" class={icon} title="Duplicate · ⌘D" aria-label="Duplicate" onclick={() => editor.duplicateMany(ids)}><Copy class="size-3.5" /></Button>
  <Button
    variant="ghost"
    size="icon"
    class="{icon} hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/50 dark:hover:text-red-400"
    title="Delete · ⌫"
    aria-label="Delete"
    onclick={remove}><Trash class="size-3.5" /></Button
  >
  <Separator orientation="vertical" class={sep} />
  <Button variant="ghost" size="icon" class={icon} title="Deselect · Esc" aria-label="Deselect" onclick={() => editor.select(null)}><X class="size-3.5" /></Button>
</div>
