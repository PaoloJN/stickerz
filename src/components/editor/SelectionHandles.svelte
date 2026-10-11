<script lang="ts">
  import { getContext } from "svelte";
  import type { EditorState } from "$lib/stickers/editor.svelte";
  import { rotationFromPointer, widthFromPointer } from "$lib/stickers/geometry";
  import { edgeGrow } from "$lib/stickers/style";
  import type { Sticker } from "$lib/stickers/types";

  /** `frameOnly`: part of a multi-selection, so just the outline */
  let { sticker, box, frameOnly = false }: { sticker: Sticker; box: { w: number; h: number }; frameOnly?: boolean } = $props();

  const editor = getContext<EditorState>("editor");
  const canvas = getContext<{ clientToMm: (x: number, y: number) => { x: number; y: number }; pxPerMm: () => number }>("canvas");

  const BLUE = "#3b82f6";
  /** screen px → mm at the current zoom */
  const px = $derived(1 / Math.max(canvas.pxPerMm(), 0.0001));
  const pad = $derived(edgeGrow(sticker) + 6 * px);
  const fw = $derived(box.w / 2 + pad);
  const fh = $derived(box.h / 2 + pad);
  const hs = $derived(9 * px);
  const corners = $derived([
    [-fw, -fh, "nwse-resize"],
    [fw, -fh, "nesw-resize"],
    [fw, fh, "nwse-resize"],
    [-fw, fh, "nesw-resize"],
  ] as const);

  let active: "resize" | "rotate" | null = $state(null);

  function start(kind: "resize" | "rotate", e: PointerEvent) {
    e.stopPropagation();
    e.preventDefault();
    editor.beginGesture();
    active = kind;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  }
  function move(e: PointerEvent) {
    if (!active) return;
    const p = canvas.clientToMm(e.clientX, e.clientY);
    if (active === "resize") {
      editor.update(sticker.id, { w: widthFromPointer(sticker, p.x, p.y, box.h / box.w) });
    } else {
      editor.update(sticker.id, { rot: rotationFromPointer(sticker.x, sticker.y, p.x, p.y, e.shiftKey) });
    }
  }
  function end(e: PointerEvent) {
    if (!active) return;
    active = null;
    editor.endGesture();
    try {
      (e.currentTarget as Element).releasePointerCapture(e.pointerId);
    } catch {
      // already released
    }
  }
</script>

<g data-ui data-handles>
  <rect
    x={-fw}
    y={-fh}
    width={fw * 2}
    height={fh * 2}
    rx={3 * px}
    fill="none"
    stroke={BLUE}
    stroke-width="1.5"
    stroke-dasharray={sticker.locked ? "4 3" : undefined}
    vector-effect="non-scaling-stroke"
    style="pointer-events: none"
  />
  {#if frameOnly}
    <!-- multi-selection: outline only -->
  {:else if sticker.locked}
    <g transform="translate({fw} {-fh}) scale({px})" style="pointer-events: none">
      <circle r="9" fill={BLUE} />
      <g transform="translate(-5 -5) scale(0.42)" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
        <rect width="16" height="11" x="4" y="11" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </g>
    </g>
  {:else}
    <line x1="0" y1={-fh} x2="0" y2={-fh - 24 * px} stroke={BLUE} stroke-width="1.5" vector-effect="non-scaling-stroke" style="pointer-events: none" />
    <g
      transform="translate(0 {-fh - 32 * px}) scale({px})"
      style="cursor: grab"
      data-handle="rotate"
      role="presentation"
      onpointerdown={(e) => start("rotate", e)}
      onpointermove={move}
      onpointerup={end}
      onpointercancel={end}
    >
      <title>Rotate · ⇧ snaps 15°</title>
      <circle r="8.5" fill="#fff" stroke={BLUE} stroke-width="1.5" />
      <g transform="translate(-4.5 -4.5) scale(0.375)" fill="none" stroke={BLUE} stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
        <path d="M21 3v5h-5" />
      </g>
    </g>
    {#each corners as [cx, cy, cursor], i (i)}
      <rect
        x={cx - hs / 2}
        y={cy - hs / 2}
        width={hs}
        height={hs}
        rx={2 * px}
        fill="#fff"
        stroke={BLUE}
        stroke-width="1.5"
        vector-effect="non-scaling-stroke"
        style="cursor: {cursor}"
        data-handle="resize"
        role="presentation"
        onpointerdown={(e) => start("resize", e)}
        onpointermove={move}
        onpointerup={end}
        onpointercancel={end}
      />
    {/each}
  {/if}
</g>
