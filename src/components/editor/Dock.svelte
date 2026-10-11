<script lang="ts">
  import { getContext } from "svelte";
  import { toast } from "svelte-sonner";
  import type { EditorState } from "$lib/stickers/editor.svelte";
  import { getDevice, itemNoun } from "$lib/stickers/devices";
  import { clampWidth, normalizeDeg } from "$lib/stickers/geometry";
  import { stickerArt } from "$lib/stickers/custom.svelte";
  import { LOGO_BY_KEY } from "$lib/stickers/logos";
  import { Button } from "@/components/ui/button";
  import * as ToggleGroup from "@/components/ui/toggle-group";
  import * as DropdownMenu from "@/components/ui/dropdown-menu";
  import { Separator } from "@/components/ui/separator";
  import Minus from "@lucide/svelte/icons/minus";
  import Plus from "@lucide/svelte/icons/plus";
  import RotateCw from "@lucide/svelte/icons/rotate-cw";
  import MoveDiagonal2 from "@lucide/svelte/icons/move-diagonal-2";
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import Check from "@lucide/svelte/icons/check";
  import SendBack from "@lucide/svelte/icons/layers-2";
  import BringForward from "@lucide/svelte/icons/layers";
  import Crosshair from "@lucide/svelte/icons/locate-fixed";
  import Lock from "@lucide/svelte/icons/lock";
  import LockOpen from "@lucide/svelte/icons/lock-open";
  import Ellipsis from "@lucide/svelte/icons/ellipsis";

  const editor = getContext<EditorState>("editor");
  const s = $derived(editor.selected);
  const noun = $derived(itemNoun(editor.layout.laptop.model));
  const logo = $derived(s ? stickerArt(s) : undefined);
  /** alternate designs of the brand (JetBrains Solid, Adobe Grayscale…), only for the few that have them */
  const styles = $derived(s ? LOGO_BY_KEY.get(s.logo)?.styles : undefined);

  const icon = "size-8 flex-none rounded-lg text-neutral-500 dark:text-neutral-400";
  const sep = "mx-1 h-5! flex-none";
  const item = "h-8 px-2.5";
  const trigger = "h-8 flex-none gap-1.5 px-2.5 text-[12.5px] font-normal data-[state=open]:bg-neutral-100 dark:data-[state=open]:bg-neutral-800";
  const row = "flex items-center justify-between gap-6";

  // the toolbar's size & angle are preset menus; a Custom row keeps fine control (DEFAULT_SIZE mirrors editor.addSticker)
  const DEFAULT_SIZE = 32;
  const SIZE_PRESETS = [
    ["Default", DEFAULT_SIZE],
    ["Small", 20],
    ["Medium", 28],
    ["Large", 45],
  ] as const;
  const ANGLE_PRESETS = [
    ["Straight", 0],
    ["Slight left", -8],
    ["Slight right", 8],
    ["Tilt left", -15],
    ["Tilt right", 15],
  ] as const;
  const sizeMm = $derived(s ? Math.round(s.w) : 0);
  const angleDeg = $derived(s ? Math.round(normalizeDeg(s.rot)) : 0);
  const sizeLabel = $derived(SIZE_PRESETS.find(([, v]) => v === sizeMm)?.[0] ?? `${sizeMm} mm`);
  const angleLabel = $derived(ANGLE_PRESETS.find(([, v]) => v === angleDeg)?.[0] ?? `${angleDeg}°`);
  const setSize = (mm: number) => s && editor.update(s.id, { w: clampWidth(mm) });
  const setAngle = (deg: number) => s && editor.update(s.id, { rot: normalizeDeg(deg) });
</script>

{#if s && logo}
  <div
    data-panel
    data-ui
    role="toolbar"
    aria-label="Sticker properties"
    tabindex="-1"
    class="pointer-events-auto flex h-12 max-w-full items-center gap-0.5 overflow-x-auto rounded-xl border border-neutral-200 bg-white px-1.5 text-[12.5px] whitespace-nowrap shadow-xl [scrollbar-width:none] dark:border-neutral-800 dark:bg-neutral-900"
  >
    <ToggleGroup.Root type="single" class="flex-none rounded-[9px]" value={s.theme} onValueChange={(v) => v && editor.update(s.id, { theme: v as "light" | "dark" })} aria-label="Sticker theme">
      {#each ["dark", "light"] as const as tone (tone)}
        <ToggleGroup.Item value={tone} class="h-8 px-2.5 text-[12.5px]" title={tone === "dark" ? "Dark sticker · light logo" : "Light sticker · dark logo"}>
          {tone === "dark" ? "Dark" : "Light"}
        </ToggleGroup.Item>
      {/each}
    </ToggleGroup.Root>
    {#if logo.wordmark}
      <ToggleGroup.Root type="single" class="ml-1 flex-none rounded-[9px]" value={s.variant} onValueChange={(v) => v && editor.update(s.id, { variant: v as "icon" | "wordmark" })} aria-label="Variant">
        <ToggleGroup.Item value="icon" class="h-8 text-[12.5px]" title="Icon only">Icon</ToggleGroup.Item>
        <ToggleGroup.Item value="wordmark" class="h-8 text-[12.5px]" title="Full logotype">Full logo</ToggleGroup.Item>
      </ToggleGroup.Root>
    {/if}
    {#if styles && styles.length > 1}
      <ToggleGroup.Root
        type="single"
        class="ml-1 flex-none rounded-[9px]"
        value={s.style ?? styles[0].id}
        onValueChange={(v) => v && editor.update(s.id, { style: v === styles[0].id ? undefined : v })}
        aria-label="Style"
      >
        {#each styles as st (st.id)}
          <ToggleGroup.Item value={st.id} class="h-8 text-[12.5px]" title="{st.label} style">{st.label}</ToggleGroup.Item>
        {/each}
      </ToggleGroup.Root>
    {/if}

    <Separator orientation="vertical" class={sep} />
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        {#snippet child({ props })}
          <Button {...props} variant="ghost" size="sm" class={trigger} title="Size" aria-label="Size">
            <MoveDiagonal2 class="size-3.5 text-neutral-500 dark:text-neutral-400" />
            <span>{sizeLabel}</span>
            <ChevronDown class="size-3 text-neutral-500" />
          </Button>
        {/snippet}
      </DropdownMenu.Trigger>
      <DropdownMenu.Content side="top" align="center" sideOffset={10} class="w-52 rounded-xl p-1 text-[12.5px]">
        {#each SIZE_PRESETS as [name, mm], i (name)}
          {#if i === 1}<DropdownMenu.Separator />{/if}
          <DropdownMenu.Item class="{item} {row}" onSelect={() => setSize(mm)}>
            <span class="flex items-center gap-2"><Check class="size-3.5 {sizeMm === mm ? '' : 'invisible'}" />{name}</span>
            <span class="font-mono text-neutral-500">{mm} mm</span>
          </DropdownMenu.Item>
        {/each}
        <DropdownMenu.Separator />
        <div class="{row} px-2 py-1">
          <span class="flex items-center gap-2 text-neutral-500"><span class="size-3.5"></span>Custom</span>
          <div class="flex items-center gap-1">
            <Button variant="ghost" size="icon" class="size-6 text-neutral-500" title="Smaller" aria-label="Smaller" onclick={() => setSize(sizeMm - 1)}><Minus class="size-3" /></Button>
            <input
              type="number"
              inputmode="numeric"
              value={sizeMm}
              aria-label="Custom size in millimetres"
              class="w-12 rounded-md border border-neutral-200 bg-transparent py-0.5 text-center font-mono text-xs dark:border-neutral-700"
              onkeydown={(e) => e.stopPropagation()}
              oninput={(e) => {
                const v = parseInt(e.currentTarget.value, 10);
                if (Number.isFinite(v)) setSize(v);
              }}
            />
            <Button variant="ghost" size="icon" class="size-6 text-neutral-500" title="Bigger" aria-label="Bigger" onclick={() => setSize(sizeMm + 1)}><Plus class="size-3" /></Button>
          </div>
        </div>
      </DropdownMenu.Content>
    </DropdownMenu.Root>

    <Separator orientation="vertical" class={sep} />
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        {#snippet child({ props })}
          <Button {...props} variant="ghost" size="sm" class={trigger} title="Angle" aria-label="Angle">
            <RotateCw class="size-3.5 text-neutral-500 dark:text-neutral-400" />
            <span>{angleLabel}</span>
            <ChevronDown class="size-3 text-neutral-500" />
          </Button>
        {/snippet}
      </DropdownMenu.Trigger>
      <DropdownMenu.Content side="top" align="center" sideOffset={10} class="w-52 rounded-xl p-1 text-[12.5px]">
        {#each ANGLE_PRESETS as [name, deg] (name)}
          <DropdownMenu.Item class="{item} {row}" onSelect={() => setAngle(deg)}>
            <span class="flex items-center gap-2"><Check class="size-3.5 {angleDeg === deg ? '' : 'invisible'}" />{name}</span>
            <span class="font-mono text-neutral-500">{deg > 0 ? `+${deg}` : deg}°</span>
          </DropdownMenu.Item>
        {/each}
        <DropdownMenu.Separator />
        <div class="{row} px-2 py-1">
          <span class="flex items-center gap-2 text-neutral-500"><span class="size-3.5"></span>Custom</span>
          <div class="flex items-center gap-1">
            <Button variant="ghost" size="icon" class="size-6 text-neutral-500" title="Rotate left · −1°" aria-label="Rotate left" onclick={() => setAngle(angleDeg - 1)}><Minus class="size-3" /></Button>
            <input
              type="number"
              inputmode="numeric"
              value={angleDeg}
              aria-label="Custom angle in degrees"
              class="w-12 rounded-md border border-neutral-200 bg-transparent py-0.5 text-center font-mono text-xs dark:border-neutral-700"
              onkeydown={(e) => e.stopPropagation()}
              oninput={(e) => {
                const v = parseInt(e.currentTarget.value, 10);
                if (Number.isFinite(v)) setAngle(v);
              }}
            />
            <Button variant="ghost" size="icon" class="size-6 text-neutral-500" title="Rotate right · +1°" aria-label="Rotate right" onclick={() => setAngle(angleDeg + 1)}><Plus class="size-3" /></Button>
          </div>
        </div>
      </DropdownMenu.Content>
    </DropdownMenu.Root>

    <Separator orientation="vertical" class={sep} />
    <Button variant="ghost" size="icon" class={icon} title="Send back · [" aria-label="Send back" onclick={() => editor.sendBackward(s.id)}><SendBack class="size-3.5" /></Button>
    <Button variant="ghost" size="icon" class={icon} title="Bring forward · ]" aria-label="Bring forward" onclick={() => editor.bringForward(s.id)}><BringForward class="size-3.5" /></Button>
    <Button
      variant="ghost"
      size="icon"
      class={icon}
      title="Center on {noun}"
      aria-label="Center on {noun}"
      onclick={() => {
        const lid = getDevice(editor.layout.laptop.model);
        editor.update(s.id, { x: lid.w / 2, y: lid.h / 2 });
      }}><Crosshair class="size-3.5" /></Button
    >
    <Button
      variant="ghost"
      size="icon"
      class="{icon} {s.locked ? 'bg-blue-500/15 text-blue-600 hover:bg-blue-500/20 hover:text-blue-600 dark:text-blue-300 dark:hover:text-blue-300' : ''}"
      title="Lock position · L"
      aria-label="Lock position"
      aria-pressed={s.locked}
      onclick={() => editor.update(s.id, { locked: !s.locked })}
    >
      {#if s.locked}<Lock class="size-3.5" />{:else}<LockOpen class="size-3.5" />{/if}
    </Button>

    <Separator orientation="vertical" class={sep} />
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        {#snippet child({ props })}
          <Button {...props} variant="ghost" size="icon" class="{icon} data-[state=open]:bg-neutral-100 dark:data-[state=open]:bg-neutral-800" title="More" aria-label="More">
            <Ellipsis class="size-4" />
          </Button>
        {/snippet}
      </DropdownMenu.Trigger>
      <DropdownMenu.Content side="top" align="end" sideOffset={10} class="w-59 rounded-xl p-1 text-[12.5px]">
        <DropdownMenu.Item class={item} onSelect={() => editor.toFront(s.id)}>Bring to front<DropdownMenu.Shortcut class="tracking-normal text-neutral-500 dark:text-neutral-500">⇧]</DropdownMenu.Shortcut></DropdownMenu.Item>
        <DropdownMenu.Item class={item} onSelect={() => editor.toBack(s.id)}>Send to back<DropdownMenu.Shortcut class="tracking-normal text-neutral-500 dark:text-neutral-500">⇧[</DropdownMenu.Shortcut></DropdownMenu.Item>
        <DropdownMenu.Separator />
        <DropdownMenu.Item class={item} onSelect={() => editor.duplicate(s.id)}>Duplicate<DropdownMenu.Shortcut class="tracking-normal text-neutral-500 dark:text-neutral-500">⌘D</DropdownMenu.Shortcut></DropdownMenu.Item>
        <DropdownMenu.Item
          class={item}
          onSelect={() => {
            editor.updateAll({ w: s.w });
            toast(`All stickers set to ${Math.round(s.w)} mm`);
          }}>Match size on all stickers</DropdownMenu.Item
        >
        <DropdownMenu.Item
          class={item}
          onSelect={() => {
            editor.updateAll({ rot: 0 });
            toast("All stickers straightened");
          }}>Straighten all</DropdownMenu.Item
        >
        <DropdownMenu.Separator />
        <DropdownMenu.Item class="{item} text-red-500 data-highlighted:text-red-500 dark:text-red-400 dark:data-highlighted:text-red-400" onSelect={() => editor.remove(s.id)}>
          Delete<DropdownMenu.Shortcut class="tracking-normal text-neutral-500 dark:text-neutral-500">⌫</DropdownMenu.Shortcut>
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  </div>
{/if}
