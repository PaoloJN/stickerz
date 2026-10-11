<script lang="ts">
  import { getContext } from "svelte";
  import { toggleMode } from "mode-watcher";
  import type { EditorState } from "$lib/stickers/editor.svelte";
  import { MAX_NAME } from "$lib/stickers/codec";
  import { globals } from "@/globals";
  import Contrast from "@/components/icons/contrast.svelte";
  import { Button } from "@/components/ui/button";
  import * as DropdownMenu from "@/components/ui/dropdown-menu";
  import * as Popover from "@/components/ui/popover";
  import { Separator } from "@/components/ui/separator";
  import Mark from "@/components/logos/stickerz.svelte";
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import Undo from "@lucide/svelte/icons/undo-2";
  import Redo from "@lucide/svelte/icons/redo-2";
  import Eye from "@lucide/svelte/icons/eye";
  import LinkIcon from "@lucide/svelte/icons/link";
  import SaveIcon from "@lucide/svelte/icons/save";
  import { saveStack } from "./save.svelte";
  import Download from "@lucide/svelte/icons/download";
  import ArrowUpRight from "@lucide/svelte/icons/arrow-up-right";
  import ArrowLeft from "@lucide/svelte/icons/arrow-left";
  import Check from "@lucide/svelte/icons/check";
  import Plus from "@lucide/svelte/icons/plus";
  import { siteConfig } from "@/config/site";
  import { getDevice, getFinish } from "$lib/stickers/devices";
  import { duplicateDesign, listDesigns, newDesign, openDesign, type DesignSummary } from "./designs.svelte";
  import { goto } from "$app/navigation";
  import { encodeLayout } from "$lib/stickers/codec";
  import type { Layout } from "$lib/stickers/types";
  import { getDemo, ours } from "./demo";

  const editor = getContext<EditorState>("editor");
  // the home demo has no storage: no save/share/switcher, and its links lead into the real editor
  const demoScope = getDemo();
  const demo = !!demoScope;
  const home = demo ? "/editor" : "/designs";
  /** the played-with layout becomes the visitor's first design */
  function openInEditor() {
    goto(`/editor#l=${encodeLayout($state.snapshot(editor.layout) as Layout)}`);
  }
  let keysOpen = $state(false);
  let draft = $state<string | null>(null);
  const name = $derived(draft ?? editor.layout.name ?? "My design");

  const SHORTCUTS = [
    ["Undo / redo", "⌘Z · ⇧⌘Z"],
    ["Select several", "⇧ click · drag"],
    ["Select all", "⌘A"],
    ["Duplicate", "⌘D"],
    ["Delete", "⌫"],
    ["Forward / back", "] · ["],
    ["Front / back", "⇧] · ⇧["],
    ["Nudge", "← → · ⇧ 10mm"],
    ["Preview", "P"],
    ["Lock", "L"],
    ["Shuffle", "S"],
    ["Search stickers", "⌘K"],
    ["Zoom", "⌘+ · ⌘− · ⌘0"],
    ["Pan", "Space + drag"],
    ["Deselect", "Esc"],
  ];

  function keydown(e: KeyboardEvent) {
    if (!ours(demoScope, e)) return;
    const t = e.target as HTMLElement | null;
    if (t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))) return;
    if (document.querySelector("[role=dialog][aria-modal=true]")) return;
    if (e.key === "?") keysOpen = !keysOpen;
    else if (e.key.toLowerCase() === "p" && !e.metaKey && !e.ctrlKey && !e.altKey) togglePreview();
    else if (e.key === "Escape" && editor.preview) togglePreview();
  }
  function togglePreview() {
    editor.preview = !editor.preview;
    editor.select(null);
    keysOpen = false;
  }
  // the design switcher loads the list each time it opens, so it's always current
  let designs = $state<DesignSummary[] | null>(null);
  let designsError = $state(false);
  let switcherOpen = $state(false);
  async function loadDesigns() {
    designsError = false;
    try {
      designs = await listDesigns();
    } catch {
      designsError = true;
    }
  }
  const swatch = (d: DesignSummary) => getFinish(getDevice(d.model), d.color).base;
  const current = $derived(editor.savedId);

  function commitName() {
    if (draft !== null) editor.rename(draft);
    draft = null;
  }

  const ghost = "size-7.5 text-neutral-500 dark:text-neutral-400";
  const menuItem = "h-8 px-2.5 text-[13px]";
</script>

<svelte:window onkeydown={keydown} />

<header class="relative z-40 grid h-11 flex-none grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 border-b border-neutral-200 bg-white px-2.5 dark:border-neutral-800 dark:bg-neutral-900">
  <div class="flex min-w-0 items-center gap-0.5">
    <Button href={home} variant="ghost" size="icon" class={ghost} title={demo ? "Open the editor" : "Back to My designs"} aria-label={demo ? "Open the editor" : "Back to My designs"}><ArrowLeft class="size-4" /></Button>
    <Separator orientation="vertical" class="mx-1 h-4.5!" />
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        {#snippet child({ props })}
          <Button {...props} variant="ghost" size="sm" class="h-8 gap-1.25 pr-1.5 pl-1.75 data-[state=open]:bg-neutral-100 dark:data-[state=open]:bg-neutral-800" title="Menu" aria-label="Menu">
            <Mark size={18} />
            <span class="hidden text-[13px] font-semibold tracking-tight lg:inline">{siteConfig.name}</span>
            <span class="hidden rounded border border-neutral-200 px-1 font-mono text-[10px] leading-4 font-normal text-neutral-500 lg:inline dark:border-neutral-700">{siteConfig.version}</span>
            <ChevronDown class="size-3 text-neutral-500" />
          </Button>
        {/snippet}
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="start" class="w-55">
        {#if !demo}
          <DropdownMenu.Item class={menuItem} onSelect={() => newDesign(editor)}>New design</DropdownMenu.Item>
          <DropdownMenu.Item class={menuItem} onSelect={() => duplicateDesign(editor)}>Duplicate design</DropdownMenu.Item>
          <DropdownMenu.Item class={menuItem} onSelect={() => setTimeout(() => (switcherOpen = true))}>Open recent…</DropdownMenu.Item>
          <DropdownMenu.Separator />
        {/if}
        <DropdownMenu.Item class={menuItem} onSelect={() => (location.href = "/designs")}>My designs</DropdownMenu.Item>
        <DropdownMenu.Item class={menuItem} onSelect={() => (location.href = "/community")}>Browse the community</DropdownMenu.Item>
        <DropdownMenu.Item class={menuItem} onSelect={() => window.open(globals.submitUrl, "_blank", "noopener")}>
          Request a logo<ArrowUpRight class="ml-auto size-3 text-neutral-500" />
        </DropdownMenu.Item>
        <DropdownMenu.Separator />
        <DropdownMenu.Item class={menuItem} onSelect={() => setTimeout(() => (keysOpen = true))}>
          Keyboard shortcuts<DropdownMenu.Shortcut class="font-mono tracking-normal text-neutral-500 dark:text-neutral-500">?</DropdownMenu.Shortcut>
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
    <Separator orientation="vertical" class="mx-1.5 h-4.5!" />
    <Button variant="ghost" size="icon" class={ghost} aria-label="Undo" title="Undo ⌘Z" disabled={!editor.canUndo} onclick={() => editor.undo()}><Undo class="size-4" /></Button>
    <Button variant="ghost" size="icon" class={ghost} aria-label="Redo" title="Redo ⇧⌘Z" disabled={!editor.canRedo} onclick={() => editor.redo()}><Redo class="size-4" /></Button>
  </div>

  <div class="flex min-w-0 items-center gap-2">
    <a href={home} class="text-neutral-500 hover:text-neutral-900 dark:hover:text-white">My designs</a>
    <span class="text-neutral-300 dark:text-neutral-700">/</span>
    <input
      value={name}
      size={Math.max(4, name.length + 1)}
      maxlength={MAX_NAME}
      spellcheck="false"
      title="Rename design"
      aria-label="Design name"
      class="h-7 max-w-60 min-w-10 truncate rounded-md border [field-sizing:content] border-transparent bg-transparent px-1.5 font-medium text-neutral-900 outline-none hover:border-neutral-200 focus:border-neutral-400 focus:bg-neutral-50 dark:text-neutral-100 dark:hover:border-neutral-800 dark:focus:border-neutral-600 dark:focus:bg-neutral-950"
      oninput={(e) => (draft = e.currentTarget.value)}
      onblur={commitName}
      onkeydown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          draft = null;
          e.currentTarget.blur();
        }
      }}
    />
    {#if !demo}
    <DropdownMenu.Root bind:open={switcherOpen} onOpenChange={(o) => o && loadDesigns()}>
      <DropdownMenu.Trigger>
        {#snippet child({ props })}
          <Button {...props} variant="ghost" size="icon" class="-ml-1.5 size-5.5 rounded-md text-neutral-500 data-[state=open]:bg-neutral-100 dark:data-[state=open]:bg-neutral-800" title="Switch design" aria-label="Switch design">
            <ChevronDown class="size-3" />
          </Button>
        {/snippet}
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="center" sideOffset={10} class="w-65">
        <DropdownMenu.Label class="px-2.5 pt-2 pb-1.5 font-mono text-[10.5px] font-normal tracking-wider text-neutral-500 uppercase">Your designs</DropdownMenu.Label>
        {#if !current}
          <!-- this design isn't saved yet, so it's not in the list -->
          <DropdownMenu.Item class="h-10 gap-2.5 px-2.5" disabled>
            <span class="h-3.5 w-5 flex-none rounded-[3px] ring-1 ring-black/10 ring-inset dark:ring-white/20" style="background: {getFinish(getDevice(editor.layout.laptop.model), editor.layout.laptop.color).base}"></span>
            <span class="flex min-w-0 flex-1 flex-col">
              <span class="truncate text-[13px] text-neutral-900 dark:text-neutral-100">{editor.layout.name ?? "My design"}</span>
              <span class="text-[11px] text-neutral-500">Not saved yet</span>
            </span>
            <Check class="size-3.5" />
          </DropdownMenu.Item>
        {/if}
        {#if designs === null && !designsError}
          <div class="px-2.5 py-2 text-xs text-neutral-500">Loading…</div>
        {:else if designsError}
          <div class="px-2.5 py-2 text-xs text-neutral-500">Couldn't load your designs</div>
        {:else if designs}
          {#each designs.slice(0, 8) as d (d.id)}
            <DropdownMenu.Item class="h-10 gap-2.5 px-2.5" onSelect={() => openDesign(editor, d.id)}>
              <span class="h-3.5 w-5 flex-none rounded-[3px] ring-1 ring-black/10 ring-inset dark:ring-white/20" style="background: {swatch(d)}"></span>
              <span class="flex min-w-0 flex-1 flex-col">
                <span class="truncate text-[13px]">{d.name}</span>
                <span class="truncate text-[11px] text-neutral-500">{d.count} {d.count === 1 ? "sticker" : "stickers"} · {getDevice(d.model).name}</span>
              </span>
              <Check class="size-3.5 {d.id === current ? '' : 'invisible'}" />
            </DropdownMenu.Item>
          {:else}
            {#if current}<div class="px-2.5 py-2 text-xs text-neutral-500">No saved designs yet</div>{/if}
          {/each}
          {#if designs.length > 8}
            <DropdownMenu.Item class="h-8 px-2.5 text-[12.5px] text-neutral-500" onSelect={() => (location.href = "/designs")}>All {designs.length} designs…</DropdownMenu.Item>
          {/if}
        {/if}
        <DropdownMenu.Separator />
        <DropdownMenu.Item class="h-8 gap-2.5 px-2.5 text-[13px]" onSelect={() => newDesign(editor)}><Plus class="size-3.5" />New design</DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
    {/if}
  </div>

  <div class="flex min-w-0 items-center justify-end gap-1.5">
    <Button variant="ghost" size="icon" class={ghost} title="Toggle theme" aria-label="Toggle theme" onclick={toggleMode}><Contrast class="size-4" /></Button>
    <Button
      variant="ghost"
      size="icon"
      class="{ghost} {editor.preview ? 'bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-white' : ''}"
      title="Preview · P"
      aria-label="Preview"
      aria-pressed={editor.preview}
      onclick={togglePreview}><Eye class="size-4" /></Button
    >
    <Popover.Root bind:open={keysOpen}>
      <Popover.Trigger>
        {#snippet child({ props })}
          <Button {...props} variant="ghost" size="icon" class="{ghost} font-mono text-[13px] data-[state=open]:bg-neutral-100 dark:data-[state=open]:bg-neutral-800" title="Keyboard shortcuts · ?">?</Button>
        {/snippet}
      </Popover.Trigger>
      <Popover.Content align="end" sideOffset={8} class="flex w-64 flex-col gap-1.5 rounded-xl px-3.5 py-3 text-[12.5px]">
        <div class="mb-0.5 font-mono text-[10.5px] tracking-wider text-neutral-500 uppercase">Shortcuts</div>
        {#each SHORTCUTS as [what, keys] (what)}
          <div class="flex justify-between gap-4"><span>{what}</span><kbd class="font-mono text-neutral-500">{keys}</kbd></div>
        {/each}
      </Popover.Content>
    </Popover.Root>
    <Separator orientation="vertical" class="mx-1 h-4.5!" />
    {#if demo}
      <Button variant="outline" size="sm" class="h-7.5 px-3 text-[13px]" title="Keep going in the full editor" onclick={openInEditor}>Open in the editor →</Button>
    {:else}
      <Button variant="outline" size="sm" class="h-7.5 gap-1.75 px-3 text-[13px]" title="Save to My designs" disabled={editor.saving} onclick={() => saveStack(editor)}>
        <SaveIcon class="size-3.5" />Save
      </Button>
      <Button variant="outline" size="sm" class="h-7.5 gap-1.75 px-3 text-[13px]" title="Share" onclick={() => (editor.exportDialog = "share")}><LinkIcon class="size-3.5" />Share</Button>
    {/if}
    <Button size="sm" class="h-7.5 gap-1.75 px-3 text-[13px] dark:bg-neutral-100 dark:text-neutral-950 dark:hover:bg-white" title="Export" onclick={() => (editor.exportDialog = "download")}>
      <Download class="size-3.5" />Export
    </Button>
  </div>
</header>
