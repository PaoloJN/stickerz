<script lang="ts">
  import { getContext } from "svelte";
  import { Spring } from "svelte/motion";
  import type { EditorState } from "$lib/stickers/editor.svelte";
  import { getDevice, getFinish } from "$lib/stickers/devices";
  import { clamp, hexPoints, stickerGeometry } from "$lib/stickers/geometry";
  import { stickerArt } from "$lib/stickers/custom.svelte";
  import { getCut, loadAlpha, peekAlpha } from "$lib/stickers/alpha";
  import { loadInline, peekInline, renderArt, renderSilhouette, unitsPerMm } from "$lib/stickers/inline";
  import { resolveBorder, resolveFill, resolveLogoColor, resolveOutline, smoothMm } from "$lib/stickers/style";
  import type { Sticker } from "$lib/stickers/types";
  import SelectionHandles from "./SelectionHandles.svelte";
  import { CUT_COLOR } from "$lib/stickers/export";

  let {
    sticker,
    selected = false,
    inMulti = false,
  }: {
    sticker: Sticker;
    selected?: boolean;
    /** part of a multi-selection */
    inMulti?: boolean;
  } = $props();

  const editor = getContext<EditorState>("editor");
  const canvas = getContext<{ clientToMm: (x: number, y: number) => { x: number; y: number } }>("canvas");

  const source = $derived(stickerArt(sticker));
  /** empty while text fonts load, or for an upload this browser doesn't have */
  const href = $derived(source.href ?? "");
  const g = $derived(stickerGeometry(sticker, editor.aspects[href] ?? 1));
  const die = $derived(sticker.shape === "diecut");
  const fill = $derived(resolveFill(sticker));
  const tint = $derived(resolveLogoColor(sticker));
  const deviceDark = $derived(getFinish(getDevice(editor.layout.laptop.model), editor.layout.laptop.color).dark);
  const borderPaint = $derived(resolveBorder(sticker, deviceDark) ?? "url(#ss-holo)");
  const outlinePaint = $derived(resolveOutline(sticker) ?? "url(#ss-holo)");
  // shapes grow by stroking their own outline with round joins: an exact vector offset
  const bw = $derived(sticker.border ? sticker.borderWidth : 0);
  const ow = $derived(sticker.outline ? sticker.outlineWidth : 0);
  /** the sticker's outermost colour, for print bleed: outline, else border, else a shape's fill (die-cut without either: none) */
  const edgePaint = $derived(ow ? outlinePaint : bw ? borderPaint : die ? "" : (fill ?? "url(#ss-holo)"));
  const hex = $derived(hexPoints(g.w, g.h));
  const radius = $derived(sticker.shape === "square" ? (Math.min(g.w, g.h) * sticker.radius) / 100 : 0);
  const sheen = $derived(sticker.finish === "gloss" || (sticker.finish === "holo" && die));

  const fid = $derived(`ss-${sticker.id}`);

  // inline logo: recolourable, and the source of the "tight" silhouette; the <image> stands in until it loads
  // svelte-ignore state_referenced_locally
  let inline = $state(peekInline(href));
  $effect(() => {
    const key = href;
    const cached = key && source.vector ? peekInline(key) : null;
    inline = cached;
    if (key && source.vector && !cached) loadInline(key).then((a) => key === href && (inline = a));
  });
  const artMarkup = $derived(inline ? renderArt(inline, `${fid}-a`, (c) => tint ?? sticker.colors?.[c] ?? c) : null);
  const tight = $derived(die && sticker.contour === "tight" && !!inline);
  /** extra stroke width that grows the silhouette by `mm` on every side, in viewBox units */
  const growBy = (mm: number) => (inline ? 2 * mm * unitsPerMm(inline, g.artW, g.artH) : 0);

  // die-cut: the vinyl is a vector cut line traced around the logo's coverage
  // svelte-ignore state_referenced_locally
  let alpha = $state(peekAlpha(href));
  $effect(() => {
    const key = href;
    const aspect = editor.aspects[key];
    if (!key || !aspect) return;
    const cached = peekAlpha(key);
    alpha = cached;
    if (!cached) loadAlpha(key, aspect).then((a) => key === href && (alpha = a));
  });
  const cut = $derived(
    die && !tight && (sticker.border || sticker.outline) && alpha
      ? getCut(href, alpha, {
          artW: g.artW,
          artH: g.artH,
          margin: bw,
          smooth: smoothMm(sticker.smooth, g.artW, g.artH),
          fillHoles: sticker.fillHoles,
          merge: sticker.merge,
        }) || null
      : null,
  );

  // print cut line: the outer edge of the vinyl, border and outline included
  const grow = $derived(bw + ow);
  const cutLine = $derived(
    die && alpha
      ? getCut(href, alpha, {
          artW: g.artW,
          artH: g.artH,
          margin: Math.max(grow, 0.5),
          // tight borders follow the logo, so the print cut does too
          smooth: tight ? 0 : smoothMm(sticker.smooth, g.artW, g.artH),
          fillHoles: tight ? false : sticker.fillHoles,
          merge: tight ? false : sticker.merge,
        }) || null
      : null,
  );

  const reduced = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  let dragging = $state(false);
  const scale = new Spring(1, { stiffness: 0.2, damping: 0.6 });
  $effect(() => {
    scale.set(dragging ? 1.06 : selected ? 1.02 : 1, reduced ? { instant: true } : undefined);
  });

  // shadow in mm, unrotated so light always comes from above
  const shadow = $derived.by(() => {
    const l = sticker.lift / 100;
    if (dragging) return { dy: (16 + l * 8) / 2.3, sd: (14 + l * 8) / 4.6, op: 0.42 };
    const sel = selected ? 1 : 0;
    return { dy: (0.6 + l * 3.4 + sel * 2) / 2.3, sd: (0.6 + l * 5 + sel * 3) / 4.6, op: 0.32 + l * 0.22 };
  });

  // Position spring: used for add + shuffle + undo; instant while dragging so the sticker tracks the pointer.
  // svelte-ignore state_referenced_locally
  const px = new Spring(sticker.x, { stiffness: 0.12, damping: 0.7 });
  // svelte-ignore state_referenced_locally
  const py = new Spring(sticker.y, { stiffness: 0.12, damping: 0.7 });
  $effect(() => {
    const instant = reduced || dragging || (inMulti && editor.groupDragging);
    px.set(sticker.x, instant ? { instant: true } : undefined);
    py.set(sticker.y, instant ? { instant: true } : undefined);
  });

  let grab = { dx: 0, dy: 0 };
  /** group drag: pointer start and every unlocked member's start position */
  let group: { p: { x: number; y: number }; start: Map<string, { x: number; y: number }> } | null = null;
  function down(e: PointerEvent) {
    if (e.button !== 0 || editor.preview) return;
    e.stopPropagation();
    if (e.shiftKey) {
      editor.toggleSelected(sticker.id);
      return;
    }
    const p = canvas.clientToMm(e.clientX, e.clientY);
    if (inMulti) {
      const ids = new Set(editor.selectedIds);
      group = { p, start: new Map(editor.layout.stickers.filter((s) => ids.has(s.id) && !s.locked).map((s) => [s.id, { x: s.x, y: s.y }])) };
      editor.groupDragging = true;
    } else {
      editor.select(sticker.id);
      if (sticker.locked) return;
      grab = { dx: sticker.x - p.x, dy: sticker.y - p.y };
      dragging = true;
    }
    editor.beginGesture();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  }
  function move(e: PointerEvent) {
    const lid = getDevice(editor.layout.laptop.model);
    const p = canvas.clientToMm(e.clientX, e.clientY);
    if (group) {
      const { start } = group;
      const dx = p.x - group.p.x;
      const dy = p.y - group.p.y;
      editor.updateMany([...start.keys()], (s) => {
        const o = start.get(s.id)!;
        return { x: clamp(o.x + dx, 0, lid.w), y: clamp(o.y + dy, 0, lid.h) };
      });
      return;
    }
    if (!dragging) return;
    editor.update(sticker.id, { x: clamp(p.x + grab.dx, 0, lid.w), y: clamp(p.y + grab.dy, 0, lid.h) });
  }
  function up(e: PointerEvent) {
    if (group) {
      group = null;
      editor.groupDragging = false;
      editor.endGesture();
      return;
    }
    if (!dragging) return;
    dragging = false;
    editor.endGesture();
    try {
      (e.currentTarget as Element).releasePointerCapture(e.pointerId);
    } catch {
      // already released
    }
  }

  // Measure natural art aspect once per art URL (variant/theme change the art).
  $effect(() => {
    const key = href;
    if (!key || editor.aspects[key]) return;
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0 && !editor.aspects[key]) editor.aspects[key] = img.naturalWidth / img.naturalHeight;
    };
    img.src = key;
  });
</script>

{#snippet shape(paint: string, extra: Record<string, unknown> = {})}
  {#if sticker.shape === "circle"}
    <ellipse rx={g.w / 2} ry={g.h / 2} fill={paint} {...extra} />
  {:else if sticker.shape === "hex"}
    <polygon points={hex} fill={paint} {...extra} />
  {:else}
    <rect x={-g.w / 2} y={-g.h / 2} width={g.w} height={g.h} rx={radius} fill={paint} {...extra} />
  {/if}
{/snippet}

{#snippet logoSvg(markup: string)}
  <svg x={-g.artW / 2} y={-g.artH / 2} width={g.artW} height={g.artH} viewBox={inline?.viewBox.join(" ")} preserveAspectRatio="xMidYMid meet" overflow="visible">
    {@html markup}
  </svg>
{/snippet}

{#snippet art()}
  {#if artMarkup}
    {@render logoSvg(artMarkup)}
  {:else if !href}
    {#if source.missing}
      <!-- an upload that only lives in someone else's browser -->
      <rect x={-g.w / 2} y={-g.h / 2} width={g.w} height={g.h} rx="2" fill="#888" fill-opacity="0.15" stroke="#888" stroke-width="0.4" stroke-dasharray="1.5 1" />
      <text y="1.4" text-anchor="middle" font-size="4" fill="#888" font-family="system-ui, sans-serif">missing</text>
    {/if}
  {:else}
  <image {href} x={-g.artW / 2} y={-g.artH / 2} width={g.artW} height={g.artH} preserveAspectRatio="xMidYMid meet" filter={tint ? `url(#${fid}-tint)` : undefined} />
  {/if}
{/snippet}

<defs>
  <filter id="{fid}-shadow" x="-50%" y="-50%" width="200%" height="200%">
    <feDropShadow dx="0" dy={shadow.dy} stdDeviation={shadow.sd} flood-color="#000" flood-opacity={shadow.op} />
  </filter>
  {#if tint}
    <filter id="{fid}-tint" color-interpolation-filters="sRGB">
      <feFlood flood-color={tint} />
      <feComposite in2="SourceAlpha" operator="in" />
    </filter>
  {/if}
  {#if cut}
    <clipPath id="{fid}-cut"><path d={cut} clip-rule="evenodd" /></clipPath>
  {/if}
  {#if die && sheen}
    <mask id="{fid}-art" maskContentUnits="userSpaceOnUse" style="mask-type: alpha">
      <image {href} x={-g.artW / 2} y={-g.artH / 2} width={g.artW} height={g.artH} preserveAspectRatio="xMidYMid meet" />
    </mask>
  {/if}
</defs>

<g transform="translate({px.current} {py.current})" data-sticker-id={sticker.id} data-title={source.title} data-edge={edgePaint}>
  <g filter="url(#{fid}-shadow)" style="pointer-events: none">
    <!-- data-print-art: what the print kit lifts out (without the shadow) to lay stickers on a sheet -->
    <g transform="rotate({sticker.rot}) scale({scale.current})" data-print-art>
      {#if die}
        {#if tight && inline}
          {#if ow}{@render logoSvg(renderSilhouette(inline, `${fid}-o`, outlinePaint, growBy(bw + ow)))}{/if}
          {#if bw}{@render logoSvg(renderSilhouette(inline, `${fid}-b`, borderPaint, growBy(bw)))}{/if}
        {:else if cut}
          {#if ow}<path d={cut} fill-rule="evenodd" fill={outlinePaint} stroke={outlinePaint} stroke-width={2 * ow} stroke-linejoin="round" />{/if}
          {#if bw}<path d={cut} fill-rule="evenodd" fill={borderPaint} />{/if}
        {/if}
      {:else}
        {#if ow}{@render shape(outlinePaint, { stroke: outlinePaint, "stroke-width": 2 * (bw + ow), "stroke-linejoin": "round" })}{/if}
        {#if bw}{@render shape(borderPaint, { stroke: borderPaint, "stroke-width": 2 * bw, "stroke-linejoin": "round" })}{/if}
        {@render shape(fill ?? "url(#ss-holo)", fill && sticker.fill === "clear" ? { stroke: "#fff", "stroke-opacity": 0.4, "stroke-width": 0.3 } : {})}
      {/if}
      {@render art()}
      {#if sheen && die && cut && sticker.finish === "gloss"}
        <!-- gloss covers the whole piece of vinyl -->
        <rect x={-g.w / 2 - bw - ow} y={-g.h / 2 - bw - ow} width={g.w + 2 * (bw + ow)} height={g.h + 2 * (bw + ow)} fill="url(#ss-gloss)" clip-path="url(#{fid}-cut)" />
      {:else if sheen && die}
        <rect
          x={-g.artW / 2}
          y={-g.artH / 2}
          width={g.artW}
          height={g.artH}
          fill={sticker.finish === "holo" ? "url(#ss-holo)" : "url(#ss-gloss)"}
          mask="url(#{fid}-art)"
          opacity={sticker.finish === "holo" ? 0.85 : 1}
          style:mix-blend-mode={sticker.finish === "holo" ? "multiply" : "normal"}
        />
      {:else if sheen}
        {@render shape("url(#ss-gloss)")}
      {/if}
    </g>
  </g>
  <!-- hidden in the editor; exports turn it on for print PDFs -->
  <g data-cutline display="none" transform="rotate({sticker.rot})" fill="none" stroke={CUT_COLOR} stroke-width="0.25" stroke-dasharray="1.2 0.8">
    {#if die}
      {#if cutLine}<path d={cutLine} />{/if}
    {:else if sticker.shape === "circle"}
      <ellipse rx={g.w / 2 + grow} ry={g.h / 2 + grow} />
    {:else if sticker.shape === "hex"}
      <polygon points={hexPoints(g.w + 2.31 * grow, g.h + 2.27 * grow)} />
    {:else}
      <rect x={-g.w / 2 - grow} y={-g.h / 2 - grow} width={g.w + 2 * grow} height={g.h + 2 * grow} rx={radius + grow} />
    {/if}
  </g>
  <g transform="rotate({sticker.rot})">
    <!-- hit target so transparent art stays grabbable -->
    <rect
      x={-g.w / 2}
      y={-g.h / 2}
      width={g.w}
      height={g.h}
      fill="transparent"
      style="cursor: {sticker.locked || editor.preview ? 'default' : dragging ? 'grabbing' : 'grab'}; touch-action: none"
      role="presentation"
      onpointerdown={down}
      onpointermove={move}
      onpointerup={up}
      onpointercancel={up}
    />
    {#if selected || inMulti}
      <SelectionHandles {sticker} box={{ w: g.w, h: g.h }} frameOnly={inMulti} />
    {/if}
  </g>
</g>
