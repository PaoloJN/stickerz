<script lang="ts">
  import { getContext } from "svelte";
  import { toast } from "svelte-sonner";
  import type { EditorState } from "$lib/stickers/editor.svelte";
  import { getDevice, getFinish, itemNoun } from "$lib/stickers/devices";
  import { artFor, LOGO_BY_KEY } from "$lib/stickers/logos";
  import { stickerArt } from "$lib/stickers/custom.svelte";
  import { BORDER_COLORS } from "$lib/stickers/style";
  import type { Sticker } from "$lib/stickers/types";
  import { Button } from "@/components/ui/button";
  import { Switch } from "@/components/ui/switch";
  import * as ToggleGroup from "@/components/ui/toggle-group";
  import Lock from "@lucide/svelte/icons/lock";
  import { mode } from "mode-watcher";
  import { cls, FINISH_UI, SHAPE_UI, shapeName, swatchBg } from "./ui";
  import ToneTile from "./ToneTile.svelte";

  const editor = getContext<EditorState>("editor");
  const stickers = $derived(editor.layout.stickers);
  /** the app's own light/dark, so layer previews read against the editor — not each sticker's tone */
  const appTone = $derived<"light" | "dark">(mode.current === "light" ? "light" : "dark");
  // with several selected, the panel styles just those
  const multi = $derived(editor.selectedIds.length > 1);
  const scope = $derived(multi ? stickers.filter((s) => editor.selectedIds.includes(s.id)) : stickers);
  const scopeIds = $derived(scope.map((s) => s.id));
  const apply = (patch: Partial<Omit<Sticker, "id">>) => editor.updateMany(scopeIds, patch);
  const device = $derived(getDevice(editor.layout.laptop.model));
  const noun = $derived(itemNoun(editor.layout.laptop.model));
  const finish = $derived(getFinish(device, editor.layout.laptop.color));

  /** the shared value of a field across all stickers, or null when mixed/empty */
  function same<K extends keyof Sticker>(k: K): Sticker[K] | null {
    return scope.length && scope.every((x) => x[k] === scope[0][k]) ? scope[0][k] : null;
  }
  const tone = $derived(same("theme"));
  const shape = $derived(same("shape"));
  const borderColor = $derived(same("borderColor"));
  const finishAll = $derived(same("finish"));
  const border = $derived(scope.length > 0 && scope.every((x) => x.border));
  const none = $derived(!scope.length);

  const layers = $derived(
    [...stickers].reverse().flatMap((s) => {
      const art = stickerArt(s);
      const logo = LOGO_BY_KEY.get(s.logo);
      // library logos show their icon in the app's tone; your own art shows as-is
      const icon = logo ? artFor(logo, "icon", appTone, s.style) : (art.href ?? "");
      return [{ s, icon, name: art.title + (s.variant === "wordmark" && art.wordmark ? " wordmark" : "") }];
    }),
  );

  function select(e: MouseEvent, id: string) {
    if (e.shiftKey) return editor.toggleSelected(id);
    editor.select(id);
    editor.stylePanel = true;
  }
</script>

<div
  data-panel
  data-ui
  class="pointer-events-auto flex max-h-full w-76 flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white text-[13px] shadow-xl dark:border-neutral-800 dark:bg-neutral-900"
>
  <div class="flex flex-none items-center gap-3 p-3">
    <div class="grid size-11 flex-none place-items-center overflow-hidden rounded-[10px] border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950">
      <svg viewBox="0 0 {device.w} {device.h}" class="w-[34px]" style="aspect-ratio: {device.w}/{device.h}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <defs>
          <linearGradient id="ss-mini-light" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#fff" stop-opacity={finish.dark ? 0.05 : 0.18} />
            <stop offset="1" stop-color="#000" stop-opacity={finish.dark ? 0.12 : 0.05} />
          </linearGradient>
        </defs>
        <rect width={device.w} height={device.h} rx={device.radius} fill={finish.base} style="transition: fill 0.3s" />
        <rect width={device.w} height={device.h} rx={device.radius} fill="url(#ss-mini-light)" />
        {#each stickers as s (s.id)}
          {@const href = stickerArt(s).href}
          {#if href}
            <image {href} x={s.x - s.w / 2} y={s.y - s.w / 2} width={s.w} height={s.w} transform="rotate({s.rot} {s.x} {s.y})" preserveAspectRatio="xMidYMid meet" />
          {/if}
        {/each}
        <rect x="0.2" y="0.2" width={device.w - 0.4} height={device.h - 0.4} rx={device.radius} fill="none" stroke="#000" stroke-opacity={finish.dark ? 0.4 : 0.12} stroke-width="0.4" />
      </svg>
    </div>
    <div class="flex min-w-0 flex-1 flex-col gap-0.5">
      <span class="text-sm font-semibold tracking-tight">{multi ? `${scope.length} stickers selected` : "My design"}</span>
      <span class="truncate text-[11.5px] text-neutral-500">{stickers.length} {stickers.length === 1 ? "sticker" : "stickers"} · {device.name}</span>
    </div>
  </div>

  <div class="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin]">
    <div class={cls.section} class:opacity-35={none} class:pointer-events-none={none}>
      <div class="flex items-baseline justify-between gap-2">
        <span class={cls.title}>{multi ? "Selected stickers" : "All stickers"}</span><span class={cls.caption}>{multi ? "Applies to selection" : "Applies to every sticker"}</span>
      </div>

      <div class="flex flex-col gap-1.5">
        <div class="flex items-baseline justify-between"><span class={cls.sub}>Theme</span><span class={cls.caption}>{none ? "—" : tone ? (tone === "dark" ? "All dark" : "All light") : "Mixed"}</span></div>
        <ToggleGroup.Root type="single" class="grid grid-cols-2 rounded-[9px]" value={tone ?? ""} onValueChange={(v) => v && apply({ theme: v as "light" | "dark" })} aria-label="Theme for all stickers">
          {#each ["dark", "light"] as const as t (t)}
            <ToggleGroup.Item value={t} class="h-7">
              <span class="size-3 rounded {t === 'dark' ? 'bg-[#121212]' : 'bg-white'} ring-1 ring-neutral-400 dark:ring-neutral-600"></span>{t === "dark" ? "Dark" : "Light"}
            </ToggleGroup.Item>
          {/each}
        </ToggleGroup.Root>
      </div>

      <div class="flex flex-col gap-1.5">
        <div class="flex items-baseline justify-between"><span class={cls.sub}>Shape</span><span class={cls.caption}>{none ? "—" : shape ? shapeName(shape) : "Mixed"}</span></div>
        <div class="grid grid-cols-4 gap-1.5">
          {#each SHAPE_UI as [id, name, css] (id)}
            <button type="button" title={name} aria-label={name} aria-pressed={shape === id} class="group h-10 {cls.tile}" onclick={() => apply({ shape: id })}>
              <span class="size-4.5 {cls.shapeIcon}" style={css}></span>
            </button>
          {/each}
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between"><span class={cls.sub}>Border</span><Switch checked={border} aria-label="Border on all stickers" onCheckedChange={(v) => apply({ border: v })} /></div>
        <div class="grid grid-cols-8 gap-1.5">
          {#each BORDER_COLORS as [c, title] (c)}
            <button
              type="button"
              {title}
              aria-label={title}
              aria-pressed={border && borderColor === c}
              class={cls.swatch}
              style="background: {swatchBg(c)}"
              onclick={() => apply({ borderColor: c, border: true })}
            ></button>
          {/each}
        </div>
      </div>

      <div class="flex flex-col gap-1.5">
        <span class={cls.sub}>Finish</span>
        <div class="grid grid-cols-3 gap-1.5">
          {#each FINISH_UI as [id, name, dot] (id)}
            <button type="button" aria-pressed={finishAll === id} class="h-8.5 gap-1.5 text-xs {cls.tile}" onclick={() => apply({ finish: id })}>
              <span class="size-2.5 flex-none rounded-full" style="background: {dot}"></span>{name}
            </button>
          {/each}
        </div>
      </div>
    </div>

    <div class="{cls.section} gap-1.5!">
      <div class="flex items-baseline justify-between gap-2"><span class={cls.title}>Layers</span><span class={cls.caption}>Top to bottom</span></div>
      <div class="-mx-1.5 flex flex-col gap-px">
        {#each layers as { s, icon, name } (s.id)}
          <button
            type="button"
            title="Click to select · ⇧-click to add"
            aria-pressed={editor.selectedIds.includes(s.id)}
            class="flex h-8.5 cursor-pointer items-center gap-2.5 rounded-lg pr-2 pl-1.5 text-left hover:bg-neutral-100 aria-pressed:bg-blue-500/15 dark:hover:bg-neutral-800/60 dark:aria-pressed:bg-blue-500/15"
            onclick={(e) => select(e, s.id)}
          >
            <ToneTile tone={appTone} src={icon} size={22} />
            <span class="min-w-0 flex-1 truncate text-neutral-700 dark:text-neutral-300">{name}</span>
            {#if s.locked}<Lock class="size-3 text-blue-500 dark:text-blue-300" aria-label="Locked" />{/if}
            <span class="font-mono text-[11px] text-neutral-500">{Math.round(s.w)} mm</span>
          </button>
        {:else}
          <p class="px-1.5 py-3.5 text-xs leading-normal text-neutral-500">Your {noun} is empty. Click a sticker on the left to add it.</p>
        {/each}
      </div>
    </div>
  </div>

  <div class="grid flex-none grid-cols-2 gap-1.5 border-t border-neutral-200 px-3 py-2.5 dark:border-neutral-800">
    <Button
      variant="outline"
      size="sm"
      class="text-[12.5px]"
      disabled={!stickers.length}
      onclick={() => {
        editor.updateAll({ rot: 0 });
        toast("All stickers straightened · ⌘Z to undo");
      }}>Straighten all</Button
    >
    <Button
      variant="outline"
      size="sm"
      class="text-[12.5px] text-red-500 hover:bg-red-50 hover:text-red-500 dark:text-red-400 dark:hover:bg-red-950/40 dark:hover:text-red-400"
      disabled={!stickers.length}
      onclick={() => {
        editor.clear();
        toast("All stickers removed · ⌘Z to undo");
      }}>Remove all stickers</Button
    >
  </div>
</div>
