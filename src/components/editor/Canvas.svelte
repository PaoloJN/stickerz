<script lang="ts">
  import { getContext, setContext } from "svelte";
  import type { EditorState } from "$lib/stickers/editor.svelte";
  import { getDevice, getFinish } from "$lib/stickers/devices";
  import { LOGO_BY_KEY } from "$lib/stickers/logos";
  import { addUploadSticker } from "./actions";
  import { custom } from "$lib/stickers/custom.svelte";
  import DeviceView from "./DeviceView.svelte";
  import StickerDefs from "./StickerDefs.svelte";
  import StickerView from "./StickerView.svelte";
  import SelectionOverlay from "./SelectionOverlay.svelte";
  import EmptyState from "./EmptyState.svelte";
  import Grid from "@lucide/svelte/icons/grip";
  import { getDemo } from "./demo";

  /**
   * In the home demo (see `EditorShell`'s `demo`): keys only act while focus is inside the demo, the
   * wheel scrolls the page unless ⌘/Ctrl is held, nothing can be dropped in and uploads aren't loaded.
   */
  const demoScope = getDemo();
  const demo = !!demoScope;

  const editor = getContext<EditorState>("editor");
  /** room around the lid, mm */
  const MARGIN = 6;
  /** px kept clear for the floating panels, toolbar and dock */
  const INSET = $derived(editor.preview ? { left: 24, right: 24, top: 64, bottom: 24 } : { left: 328, right: 328, top: 64, bottom: 124 });
  const TRUE_SCALE = 96 / 25.4;
  const DEFAULT_SCALE = 0.5;
  const lid = $derived(getDevice(editor.layout.laptop.model));

  let svg: SVGSVGElement | undefined = $state();
  let root: HTMLDivElement | undefined = $state();
  let sw = $state(0);
  let sh = $state(0);
  let spaceDown = $state(false);
  let panning: { x: number; y: number; px: number; py: number } | null = $state(null);

  // Mirrors the svg's viewBox fit + CSS pan/zoom so overlays can be placed without reading layout.
  const fit = $derived.by(() => {
    const vw = lid.w + MARGIN * 2;
    const vh = lid.h + MARGIN * 2;
    // open at half of real size, or smaller when the window can't fit that
    const k = sw && sh ? Math.min(sw / vw, sh / vh, DEFAULT_SCALE * TRUE_SCALE) : 1;
    return { k, ox: (sw - vw * k) / 2, oy: (sh - vh * k) / 2 };
  });
  const pxPerMmValue = $derived(fit.k * editor.zoom);

  function mmToScreen(x: number, y: number) {
    const lx = fit.ox + (x + MARGIN) * fit.k;
    const ly = fit.oy + (y + MARGIN) * fit.k;
    return {
      x: INSET.left + sw / 2 + editor.panX + editor.zoom * (lx - sw / 2),
      y: INSET.top + sh / 2 + editor.panY + editor.zoom * (ly - sh / 2),
    };
  }
  function clientToMm(clientX: number, clientY: number) {
    const m = svg?.getScreenCTM();
    if (!svg || !m) return { x: 0, y: 0 };
    const p = new DOMPoint(clientX, clientY).matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  }
  function pxPerMm() {
    return pxPerMmValue;
  }
  setContext("canvas", { clientToMm, pxPerMm, mmToScreen, bounds: () => ({ w: root?.clientWidth ?? 0, inset: INSET }) });

  $effect(() => {
    editor.viewScale = pxPerMmValue / TRUE_SCALE;
  });
  const captionAt = $derived(mmToScreen(lid.w / 2, lid.h));
  const count = $derived(editor.layout.stickers.length);

  const DROP_TYPE = "application/x-sticker-logo";
  // uploads live in IndexedDB; load them before stickers that use them try to render
  $effect(() => {
    if (!demo) void custom.init();
  });

  function dragover(e: DragEvent) {
    if (demo) return;
    if (e.dataTransfer?.types.includes(DROP_TYPE) || e.dataTransfer?.types.includes("Files")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    }
  }
  function drop(e: DragEvent) {
    if (demo) return;
    const files = [...(e.dataTransfer?.files ?? [])];
    if (files.length) {
      e.preventDefault();
      const at = clientToMm(e.clientX, e.clientY);
      files.slice(0, 10).forEach((f, i) => addUploadSticker(editor, f, { x: at.x + i * 8, y: at.y + i * 8 }));
      return;
    }
    const key = e.dataTransfer?.getData(DROP_TYPE);
    if (!key || !LOGO_BY_KEY.has(key)) return;
    e.preventDefault();
    editor.addSticker(key, clientToMm(e.clientX, e.clientY));
  }

  function wheel(e: WheelEvent) {
    if ((e.target as Element).closest("[data-panel]")) return;
    // embedded: a plain wheel scrolls the page; only a pinch / ⌘-wheel zooms the demo
    if (demo && !(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      editor.setZoom(editor.zoom * Math.exp(-e.deltaY * 0.01));
    } else {
      editor.panX -= e.deltaX;
      editor.panY -= e.deltaY;
    }
  }
  function wheelAction(node: HTMLElement) {
    node.addEventListener("wheel", wheel, { passive: false });
    return { destroy: () => node.removeEventListener("wheel", wheel) };
  }

  function isTyping(t: EventTarget | null) {
    const el = t as HTMLElement | null;
    return !!el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));
  }
  function keydown(ev: Event) {
    const e = ev as KeyboardEvent;
    if (isTyping(e.target)) return;
    if (e.code === "Space") {
      if ((e.target as Element | null)?.closest?.("button, input, textarea, select, a, [role=dialog], [role=button]")) return;
      spaceDown = true;
      e.preventDefault();
    } else if ((e.metaKey || e.ctrlKey) && (e.key === "=" || e.key === "+")) {
      e.preventDefault();
      editor.setZoom(editor.zoom * 1.25);
    } else if ((e.metaKey || e.ctrlKey) && e.key === "-") {
      e.preventDefault();
      editor.setZoom(editor.zoom / 1.25);
    } else if ((e.metaKey || e.ctrlKey) && e.key === "0") {
      e.preventDefault();
      editor.setZoom(1);
      editor.panX = 0;
      editor.panY = 0;
    }
  }
  function keyup(ev: Event) {
    const e = ev as KeyboardEvent;
    if (e.code === "Space") spaceDown = false;
  }

  // the full editor listens on the window; the demo only on its own root, so the page's keys stay the page's
  $effect(() => {
    const target: Window | HTMLElement | undefined = demoScope ? demoScope.root() : window;
    if (!target) return;
    target.addEventListener("keydown", keydown);
    target.addEventListener("keyup", keyup);
    return () => {
      target.removeEventListener("keydown", keydown);
      target.removeEventListener("keyup", keyup);
    };
  });

  // drag a box on empty canvas to select every sticker whose centre falls inside; ⇧ adds to the selection
  let marquee: { p0: { x: number; y: number }; base: string[]; rect: { x: number; y: number; w: number; h: number } | null } | null = $state(null);

  function down(e: PointerEvent) {
    if (spaceDown || e.button === 1) {
      panning = { x: e.clientX, y: e.clientY, px: editor.panX, py: editor.panY };
      root?.setPointerCapture(e.pointerId);
      e.preventDefault();
    } else if (e.button === 0 && !editor.preview && !(e.target as Element).closest("[data-sticker-id], [data-panel]")) {
      marquee = { p0: clientToMm(e.clientX, e.clientY), base: e.shiftKey ? editor.selection : [], rect: null };
      root?.setPointerCapture(e.pointerId);
    }
  }
  function move(e: PointerEvent) {
    if (marquee) {
      const p = clientToMm(e.clientX, e.clientY);
      const rect = { x: Math.min(p.x, marquee.p0.x), y: Math.min(p.y, marquee.p0.y), w: Math.abs(p.x - marquee.p0.x), h: Math.abs(p.y - marquee.p0.y) };
      if (marquee.rect || (rect.w + rect.h) * pxPerMmValue > 6) marquee.rect = rect;
      return;
    }
    if (!panning) return;
    editor.panX = panning.px + e.clientX - panning.x;
    editor.panY = panning.py + e.clientY - panning.y;
  }
  function up() {
    panning = null;
    if (!marquee) return;
    const { rect, base } = marquee;
    marquee = null;
    if (!rect) {
      if (!base.length) editor.select(null);
      return;
    }
    const hits = editor.layout.stickers.filter((s) => s.x >= rect.x && s.x <= rect.x + rect.w && s.y >= rect.y && s.y <= rect.y + rect.h).map((s) => s.id);
    editor.setSelection([...base, ...hits]);
  }

  // empty lid: faint dashed spots where stickers could go
  const GHOSTS = [
    [0.18, 0.3, 30],
    [0.38, 0.2, 24],
    [0.78, 0.28, 28],
    [0.84, 0.7, 34],
    [0.2, 0.76, 26],
    [0.6, 0.8, 22],
  ];
  const darkLid = $derived(getFinish(lid, editor.layout.laptop.color).dark);
</script>

<svelte:window onblur={() => (spaceDown = false)} />

<div
  bind:this={root}
  use:wheelAction
  role="presentation"
  class="ss-canvas absolute inset-0 {editor.showGrid ? '' : 'ss-nogrid'} overflow-hidden bg-neutral-50 outline-none dark:bg-neutral-950 {panning ? 'cursor-grabbing' : spaceDown ? 'cursor-grab' : ''}"
  style="touch-action: none"
  onpointerdown={down}
  onpointermove={move}
  onpointerup={up}
  onpointercancel={up}
  ondragover={dragover}
  ondrop={drop}
>
  <div
    class="absolute"
    style="left: {INSET.left}px; right: {INSET.right}px; top: {INSET.top}px; bottom: {INSET.bottom}px"
    bind:clientWidth={sw}
    bind:clientHeight={sh}
  >
    <svg
      bind:this={svg}
      data-editor-canvas
      viewBox="{-MARGIN} {-MARGIN} {lid.w + MARGIN * 2} {lid.h + MARGIN * 2}"
      class="absolute select-none"
      style="left: {fit.ox}px; top: {fit.oy}px; width: {sw - 2 * fit.ox}px; height: {sh - 2 * fit.oy}px; transform: translate({editor.panX}px, {editor.panY}px) scale({editor.zoom}); transform-origin: center; overflow: visible"
      preserveAspectRatio="xMidYMid meet"
    >
      <StickerDefs />
      <DeviceView model={editor.layout.laptop.model} color={editor.layout.laptop.color} />
      {#each editor.layout.stickers as s (s.id)}
        <StickerView sticker={s} selected={editor.selectedId === s.id} inMulti={editor.selectedIds.includes(s.id)} />
      {/each}
      {#if !editor.layout.stickers.length}
        <g data-ui style="pointer-events: none">
          {#each GHOSTS as [fx, fy, mm], i (i)}
            <circle cx={lid.w * fx} cy={lid.h * fy} r={mm / 2} fill="none" stroke={darkLid ? "#fff" : "#000"} stroke-opacity={darkLid ? 0.14 : 0.13} stroke-width="2" stroke-dasharray="5 4" vector-effect="non-scaling-stroke" />
          {/each}
        </g>
      {/if}
      {#if marquee?.rect}
        <rect
          data-ui
          x={marquee.rect.x}
          y={marquee.rect.y}
          width={marquee.rect.w}
          height={marquee.rect.h}
          rx={2 / pxPerMmValue}
          fill="#3b82f6"
          fill-opacity="0.1"
          stroke="#3b82f6"
          stroke-width="1"
          vector-effect="non-scaling-stroke"
          style="pointer-events: none"
        />
      {/if}
    </svg>
  </div>


  {#if !editor.preview}
    <div
      data-panel
      class="pointer-events-none absolute flex -translate-x-1/2 items-center gap-1.5 font-mono text-[11px] whitespace-nowrap text-neutral-400 dark:text-neutral-600"
      style="left: {captionAt.x}px; top: {captionAt.y + 10}px"
    >
      <span>{count} {count === 1 ? "sticker" : "stickers"} / {Math.round(lid.w)} × {Math.round(lid.h)} mm / {Math.min(100, Math.round(editor.viewScale * 100))}% scale</span>
      <button
        type="button"
        title="Dot grid"
        aria-label="Dot grid"
        aria-pressed={editor.showGrid}
        class="pointer-events-auto grid size-5 cursor-pointer place-items-center rounded text-neutral-300 hover:text-neutral-700 aria-pressed:text-neutral-400 dark:text-neutral-700 dark:hover:text-neutral-300 dark:aria-pressed:text-neutral-500"
        onclick={() => (editor.showGrid = !editor.showGrid)}
      >
        <Grid class="size-3.5" />
      </button>
    </div>
  {/if}

  <SelectionOverlay />
  {#if !editor.layout.stickers.length && !editor.preview}
    {@const c = mmToScreen(lid.w / 2, lid.h / 2)}
    <EmptyState x={c.x} y={c.y} />
  {/if}
</div>

<style>
  .ss-canvas {
    background-image: radial-gradient(var(--color-neutral-300) 1px, transparent 1px);
    background-size: 22px 22px;
  }
  :global(.dark) .ss-canvas {
    background-image: radial-gradient(var(--color-neutral-800) 1px, transparent 1px);
  }
  .ss-canvas.ss-nogrid {
    background-image: none;
  }
</style>
