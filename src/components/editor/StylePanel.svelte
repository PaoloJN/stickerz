<script lang="ts">
  import { getContext } from "svelte";
  import { toast } from "svelte-sonner";
  import type { EditorState } from "$lib/stickers/editor.svelte";
  import { stickerArt } from "$lib/stickers/custom.svelte";
  import { ALIGNS, FONTS, fontFamily, loadFontFaces, TEXT_LIMITS, type TextSpec } from "$lib/stickers/text";
  import { BORDER_COLORS, BORDER_LABELS, FILLS, HOLO_CSS, LIMITS, LOGO_COLORS, OUTLINE_COLORS, resolveFill } from "$lib/stickers/style";
  import { loadInline, peekInline, type InlineArt } from "$lib/stickers/inline";
  import type { StickerStyle } from "$lib/stickers/types";
  import { DEFAULT_STYLE } from "$lib/stickers/style";
  import { LOGO_BY_KEY } from "$lib/stickers/logos";
  import { overrideSnippet } from "$lib/stickers/overrides";
  import { Button } from "@/components/ui/button";
  import { Slider } from "@/components/ui/slider";
  import { Switch } from "@/components/ui/switch";
  import X from "@lucide/svelte/icons/x";
  import { caption, cls, FINISH_UI, SHAPE_UI, shapeName, swatchBg } from "./ui";
  import { getDemo } from "./demo";

  const editor = getContext<EditorState>("editor");
  const s = $derived(editor.selected);
  const logo = $derived(s ? stickerArt(s) : undefined);
  const isText = $derived(logo?.kind === "text" && !!s?.text);
  /** raster uploads have no vector shapes to grow, so they always use the traced cut line */
  const contour = $derived(logo?.vector === false ? "smooth" : s?.contour);
  const die = $derived(s?.shape === "diecut");

  // 32px preview of the sticker itself
  const preview = $derived.by(() => {
    if (!s || !logo) return null;
    const fill = resolveFill(s);
    const bg = die ? "transparent" : (fill ?? HOLO_CSS);
    const shape = s.shape === "circle" ? "border-radius: 50%" : s.shape === "square" ? `border-radius: ${(32 * s.radius) / 100}px` : s.shape === "hex" ? SHAPE_UI[3][2] : "";
    return { src: logo.href ?? "", style: `background: ${bg}; ${shape}` };
  });

  // the logo's own colours, for per-colour editing
  let art = $state<InlineArt | null>(null);
  $effect(() => {
    const href = preview?.src;
    art = null;
    if (!href || !logo?.vector || isText) return;
    const cached = peekInline(href);
    art = cached;
    if (!cached) loadInline(href).then((a) => href === preview?.src && (art = a));
  });
  const recolored = $derived(Object.keys(s?.colors ?? {}).length > 0);

  function setColor(orig: string, next: string) {
    if (!s) return;
    editor.beginGesture();
    const colors = { ...s.colors };
    if (next.toLowerCase() === orig) delete colors[orig];
    else colors[orig] = next.toLowerCase();
    editor.update(s.id, { colors: Object.keys(colors).length ? colors : undefined, logoColor: "original" });
  }

  $effect(() => {
    if (isText) loadFontFaces();
  });
  function setText(patch: Partial<TextSpec>) {
    if (!s?.text) return;
    editor.beginGesture();
    editor.update(s.id, { text: { ...s.text, ...patch } });
  }
  const TEXT_COLORS = ["#121212", "#ffffff", "#efe7d4", "#ff6a3d", "#facc15", "#3b82f6", "#22c55e"];

  // dev only: turn this sticker's look into an OVERRIDES line for overrides.ts
  async function copyOverride() {
    if (!s) return;
    const theme = LOGO_BY_KEY.get(s.logo)?.icon.dark ? "dark" : "light";
    const line = overrideSnippet(s, { style: DEFAULT_STYLE, theme });
    if (!line) return toast("Nothing to copy: this sticker uses the default settings");
    try {
      await navigator.clipboard.writeText(line);
      toast.success("Override copied. Paste it into src/lib/stickers/overrides.ts");
    } catch {
      console.log(line);
      toast("Couldn't copy; the line is in the console");
    }
  }

  function set(patch: Partial<StickerStyle>) {
    if (s) editor.update(s.id, patch);
  }
  // one undo entry per slider drag
  const demo = !!getDemo();
  let pressed = false;
  const slide = {
    onpointerdown: () => editor.beginGesture(),
    onValueCommit: () => editor.endGesture(),
  };
</script>

<!-- the demo only ends gestures it started (a press inside the panel), so page clicks never reach the editor -->
<svelte:window onpointerup={() => (demo ? pressed && ((pressed = false), editor.endGesture()) : editor.endGesture())} />

{#if s && logo && preview}
  <div
    data-panel
    data-ui
    onpointerdowncapture={() => (pressed = true)}
    class="pointer-events-auto flex max-h-full w-76 flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white text-[13px] shadow-xl dark:border-neutral-800 dark:bg-neutral-900"
  >
    <div class="flex flex-none items-center gap-3 py-3 pr-2.5 pl-3">
      <div class="grid size-11 flex-none place-items-center rounded-[10px] border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950">
        <div class="grid size-8 place-items-center" style={preview.style}>{#if preview.src}<img src={preview.src} alt="" class="size-[62%] object-contain" />{/if}</div>
      </div>
      <div class="flex min-w-0 flex-1 flex-col gap-0.5">
        <span class="truncate text-sm font-semibold tracking-tight">{logo.title}</span>
        <span class="text-[11.5px] text-neutral-500">{shapeName(s.shape)} · {s.theme === "dark" ? "Dark" : "Light"} · {Math.round(s.w)} mm</span>
      </div>
      <Button variant="ghost" size="icon" class="size-7 self-start text-neutral-500" title="Close" aria-label="Close style panel" onclick={() => (editor.stylePanel = false)}>
        <X class="size-3.5" />
      </Button>
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin]">
      {#if isText && s.text}
        {@const t = s.text}
        <div class={cls.section}>
          <span class={cls.title}>Text</span>
          <textarea
            rows={Math.min(TEXT_LIMITS.lines, t.value.split("\n").length)}
            maxlength={TEXT_LIMITS.length}
            value={t.value}
            aria-label="Sticker text"
            class="w-full resize-none rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-2 text-[13px] leading-snug outline-none focus:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-950 dark:focus:border-neutral-600"
            oninput={(e) => setText({ value: e.currentTarget.value.split("\n").slice(0, TEXT_LIMITS.lines).join("\n") })}
            onblur={() => editor.endGesture()}
          ></textarea>
          <div class="grid grid-cols-3 gap-1.5">
            {#each FONTS as f (f.id)}
              <button type="button" aria-pressed={t.font === f.id} title={f.name} class="h-11 flex-col gap-0.5 {cls.tile}" onclick={() => setText({ font: f.id })}>
                <span class="text-[17px] leading-none text-neutral-900 dark:text-neutral-100" style="font-family: {fontFamily(f.id)}, system-ui">Aa</span>
                <span class="text-[10px]">{f.name}</span>
              </button>
            {/each}
          </div>
          <div class="grid grid-cols-8 gap-1.5">
            {#each TEXT_COLORS as c (c)}
              <button type="button" title={c} aria-label="Text color {c}" aria-pressed={t.color === c} class={cls.swatch} style="background: {c}" onclick={() => setText({ color: c })}></button>
            {/each}
            <label class="relative {cls.swatch}" title="Custom color" style="background: conic-gradient(#ff6a3d,#facc15,#22c55e,#3b82f6,#a855f7,#ff6a3d)" aria-pressed={!TEXT_COLORS.includes(t.color)}>
              <input type="color" class="absolute inset-0 size-full cursor-pointer opacity-0" value={t.color} aria-label="Custom text color" oninput={(e) => setText({ color: e.currentTarget.value.toLowerCase() })} onchange={() => editor.endGesture()} />
            </label>
          </div>
          <div class="flex items-center gap-3">
            <div class="grid flex-none grid-cols-3 gap-1">
              {#each ALIGNS as a (a)}
                <button type="button" aria-pressed={t.align === a} title="Align {a}" class="h-7 w-8 text-[11px] {cls.tile}" onclick={() => setText({ align: a })}>{a === "left" ? "⇤" : a === "center" ? "↔" : "⇥"}</button>
              {/each}
            </div>
            <div class="flex min-w-0 flex-1 flex-col gap-1.5">
              <div class="flex items-baseline justify-between"><span class={cls.sub}>Spacing</span><span class={cls.pill}>{t.spacing}</span></div>
              <Slider type="single" min={TEXT_LIMITS.spacing[0]} max={TEXT_LIMITS.spacing[1]} step={1} value={t.spacing} onValueChange={(v) => setText({ spacing: v })} {...slide} />
            </div>
          </div>
        </div>
      {/if}
      <div class={cls.section}>
        <div class="flex items-baseline justify-between gap-2"><span class={cls.title}>Shape</span><span class={cls.caption}>{shapeName(s.shape)}</span></div>
        <div class="grid grid-cols-4 gap-1.5">
          {#each SHAPE_UI as [id, name, css] (id)}
            <button type="button" title={name} aria-pressed={s.shape === id} class="group h-15.5 flex-col gap-1.5 text-[10.5px] {cls.tile}" onclick={() => set({ shape: id })}>
              <span class="size-6 {cls.shapeIcon}" style={css}></span>{name}
            </button>
          {/each}
        </div>
        {#if s.shape === "square"}
          <div class="flex flex-col gap-1.5 pt-0.5">
            <div class="flex items-baseline justify-between"><span class={cls.sub}>Corner radius</span><span class={cls.pill}>{s.radius}%</span></div>
            <Slider type="single" min={LIMITS.radius[0]} max={LIMITS.radius[1]} step={1} value={s.radius} onValueChange={(v) => set({ radius: v })} {...slide} />
          </div>
        {/if}
      </div>

      <div class={cls.section}>
        <div class="flex items-baseline justify-between gap-2">
          <span class={cls.title}>Fill</span><span class={cls.caption}>{s.finish === "holo" ? "Holographic (finish)" : caption(FILLS, s.fill)}</span>
        </div>
        <div class="grid grid-cols-8 gap-1.5 transition-opacity {die ? 'pointer-events-none opacity-30' : ''}">
          {#each FILLS as [c, title] (c)}
            <button
              type="button"
              {title}
              aria-label={title}
              aria-pressed={s.fill === c && s.finish !== "holo"}
              disabled={die}
              class={cls.swatch}
              style="background: {swatchBg(c)}"
              onclick={() => set({ fill: c, finish: s.finish === "holo" ? "matte" : s.finish })}
            ></button>
          {/each}
        </div>
        {#if die}
          <span class="text-[11.5px] leading-normal text-neutral-500">Die-cut follows the logo outline, so there's no backing. Style the border instead.</span>
        {/if}
      </div>

      <div class={cls.section}>
        <div class="flex items-baseline justify-between gap-2"><span class={cls.title}>Logo</span><span class={cls.caption}>{caption(LOGO_COLORS, s.logoColor)}</span></div>
        <div class="grid grid-cols-8 gap-1.5">
          {#each LOGO_COLORS as [c, title] (c)}
            <button type="button" {title} aria-label={title} aria-pressed={s.logoColor === c} class={cls.swatch} style="background: {swatchBg(c)}" onclick={() => set({ logoColor: c })}></button>
          {/each}
        </div>
        {#if art && art.palette.length > 0}
          <div class="flex flex-col gap-1.5">
            <div class="flex items-baseline justify-between">
              <span class={cls.sub}>Colors in this logo</span>
              {#if recolored}
                <button type="button" class="cursor-pointer text-[11.5px] text-neutral-500 hover:text-neutral-900 dark:hover:text-white" onclick={() => s && editor.update(s.id, { colors: undefined })}>Reset</button>
              {/if}
            </div>
            <div class="grid grid-cols-8 gap-1.5 {s.logoColor === 'original' ? '' : 'opacity-40'}">
              {#each art.palette as c (c)}
                {@const cur = s.colors?.[c] ?? c}
                <label class="relative {cls.swatch}" style="background: {cur}" title="{c}{cur !== c ? ` → ${cur}` : ''}" aria-pressed={cur !== c}>
                  <input type="color" class="absolute inset-0 size-full cursor-pointer opacity-0" value={cur} aria-label="Replace {c}" oninput={(e) => setColor(c, e.currentTarget.value)} onchange={() => editor.endGesture()} />
                </label>
              {/each}
            </div>
          </div>
        {/if}
        <div class="flex flex-col gap-1.5 transition-opacity {die ? 'pointer-events-none opacity-30' : ''}">
          <div class="flex items-baseline justify-between"><span class={cls.sub}>Logo size</span><span class={cls.pill}>{s.pad}%</span></div>
          <Slider type="single" min={LIMITS.pad[0]} max={LIMITS.pad[1]} step={1} value={s.pad} disabled={die} onValueChange={(v) => set({ pad: v })} {...slide} />
        </div>
      </div>

      <div class={cls.section}>
        <div class="flex items-center justify-between gap-2">
          <span class={cls.title}>Border</span>
          <div class="flex min-w-0 items-center gap-2.5">
            <span class={cls.caption}>{caption(BORDER_LABELS, s.borderColor)}</span>
            <Switch checked={s.border} aria-label="Border" onCheckedChange={(v) => set({ border: v })} />
          </div>
        </div>
        <div class="flex flex-col gap-3 transition-opacity {s.border ? '' : 'pointer-events-none opacity-35'}">
          <div class="grid grid-cols-8 gap-1.5">
            {#each BORDER_COLORS as [c, title] (c)}
              <button type="button" {title} aria-label={title} aria-pressed={s.borderColor === c} class={cls.swatch} style="background: {swatchBg(c)}" onclick={() => set({ borderColor: c, border: true })}></button>
            {/each}
          </div>
          <div class="flex flex-col gap-1.5">
            <div class="flex items-baseline justify-between"><span class={cls.sub}>{die ? "Margin" : "Width"}</span><span class={cls.pill}>{s.borderWidth.toFixed(2)} mm</span></div>
            <Slider type="single" min={LIMITS.borderWidth[0]} max={LIMITS.borderWidth[1]} step={0.25} value={s.borderWidth} disabled={!s.border} onValueChange={(v) => set({ borderWidth: v })} {...slide} />
          </div>
        </div>
      </div>

      <div class={cls.section}>
        <div class="flex items-center justify-between gap-2">
          <span class={cls.title}>Outline</span>
          <div class="flex min-w-0 items-center gap-2.5">
            <span class={cls.caption}>{caption(OUTLINE_COLORS, s.outlineColor)}</span>
            <Switch checked={s.outline} aria-label="Outline" onCheckedChange={(v) => set({ outline: v })} />
          </div>
        </div>
        <div class="flex flex-col gap-3 transition-opacity {s.outline ? '' : 'pointer-events-none opacity-35'}">
          <div class="grid grid-cols-8 gap-1.5">
            {#each OUTLINE_COLORS as [c, title] (c)}
              <button type="button" {title} aria-label={title} aria-pressed={s.outlineColor === c} class={cls.swatch} style="background: {swatchBg(c)}" onclick={() => set({ outlineColor: c, outline: true })}></button>
            {/each}
          </div>
          <div class="flex flex-col gap-1.5">
            <div class="flex items-baseline justify-between"><span class={cls.sub}>Width</span><span class={cls.pill}>{s.outlineWidth.toFixed(2)} mm</span></div>
            <Slider type="single" min={LIMITS.outlineWidth[0]} max={LIMITS.outlineWidth[1]} step={0.25} value={s.outlineWidth} disabled={!s.outline} onValueChange={(v) => set({ outlineWidth: v })} {...slide} />
          </div>
        </div>
      </div>

      {#if die}
        <div class={cls.section}>
          <div class="flex items-baseline justify-between gap-2">
            <span class={cls.title}>Cut line</span><span class={cls.caption}>{contour === "tight" ? "Hugs the logo exactly" : "Traced, like a printed sticker"}</span>
          </div>
          <div class="grid grid-cols-2 gap-1.5">
            {#each [["smooth", "Smooth"], ["tight", "Tight"]] as const as [id, name] (id)}
              <button
                type="button"
                aria-pressed={contour === id}
                disabled={id === "tight" && !logo.vector}
                title={id === "tight" && !logo.vector ? "Tight needs an SVG" : undefined}
                class="h-8.5 text-xs disabled:cursor-not-allowed disabled:opacity-40 {cls.tile}"
                onclick={() => set({ contour: id })}>{name}</button
              >
            {/each}
          </div>
          {#if !logo.vector}
            <span class="text-[11.5px] leading-normal text-neutral-500">Tight needs vector art. Upload an SVG to get it; images use a traced cut line.</span>
          {/if}
          {#if contour === "smooth"}
          <div class="flex flex-col gap-1.5">
            <div class="flex items-baseline justify-between">
              <span class={cls.sub}>Smoothness</span><span class={cls.pill}>{s.smooth < 15 ? "Crisp" : s.smooth < 60 ? "Smooth" : "Soft"}</span>
            </div>
            <Slider type="single" min={LIMITS.smooth[0]} max={LIMITS.smooth[1]} step={1} value={s.smooth} onValueChange={(v) => set({ smooth: v })} {...slide} />
          </div>
          <div class="flex items-center justify-between"><span class={cls.sub}>Fill holes</span><Switch checked={s.fillHoles} aria-label="Fill holes" onCheckedChange={(v) => set({ fillHoles: v })} /></div>
          <div class="flex items-center justify-between"><span class={cls.sub}>One piece</span><Switch checked={s.merge} aria-label="One piece" onCheckedChange={(v) => set({ merge: v })} /></div>
          {/if}
          {#if !s.border && !s.outline}
            <span class="text-[11.5px] leading-normal text-neutral-500">Turn on a border or outline to see the cut line.</span>
          {/if}
        </div>
      {/if}

      <div class={cls.section}>
        <span class={cls.title}>Finish</span>
        <div class="grid grid-cols-3 gap-1.5">
          {#each FINISH_UI as [id, name, dot] (id)}
            <button type="button" aria-pressed={s.finish === id} class="h-8.5 gap-1.5 text-xs {cls.tile}" onclick={() => set({ finish: id })}>
              <span class="size-2.5 flex-none rounded-full" style="background: {dot}"></span>{name}
            </button>
          {/each}
        </div>
        <div class="flex flex-col gap-1.5">
          <div class="flex items-baseline justify-between">
            <span class={cls.sub}>Shadow</span><span class={cls.pill}>{s.lift < 15 ? "None" : s.lift < 60 ? "Soft" : "Deep"}</span>
          </div>
          <Slider type="single" min={LIMITS.lift[0]} max={LIMITS.lift[1]} step={1} value={s.lift} onValueChange={(v) => set({ lift: v })} {...slide} />
        </div>
      </div>
    </div>

    <div class="grid flex-none grid-cols-[1fr_auto] gap-1.5 border-t border-neutral-200 px-3 py-2.5 dark:border-neutral-800">
      <Button
        size="sm"
        class="text-[12.5px] dark:bg-neutral-100 dark:text-neutral-950 dark:hover:bg-white"
        onclick={() => {
          editor.applyStyleToAll(s.id);
          toast(`Style applied to ${editor.layout.stickers.length} stickers`);
        }}>Apply to all stickers</Button
      >
      <Button variant="outline" size="sm" class="text-[12.5px] text-neutral-500" title="Reset this sticker's style" onclick={() => editor.resetStyle(s.id)}>Reset</Button>
      {#if import.meta.env.DEV && logo?.kind === "logo"}
        <Button variant="ghost" size="sm" class="col-span-2 h-7 font-mono text-[11px] text-neutral-500" title="Dev only: copy this look as a line for src/lib/stickers/overrides.ts" onclick={copyOverride}>
          Copy as override
        </Button>
      {/if}
    </div>
  </div>
{/if}
