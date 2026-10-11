<script lang="ts">
  /**
   * SVG sticker: white vinyl (precomputed die-cut path) + logo art. Place inside an <svg> whose units are mm.
   * `x,y` is the centre, `w` the art width; without a cut it falls back to a rounded tile.
   * `shape` swaps the backing (die-cut needs a cut; circle / square draw a tile and shrink the art to sit
   * inside it); `animate` moves via a CSS transform so a change of x/y/rot slides instead of jumping.
   */
  import { fade } from "svelte/transition";
  import { CANON, type CutEntry } from "$lib/stickers/cuts-types";

  let {
    href,
    cut = null,
    x,
    y,
    w,
    rot = 0,
    shadow = true,
    fill = "#fff",
    shape = "diecut",
    animate = false,
  }: {
    href: string;
    cut?: CutEntry | null;
    x: number;
    y: number;
    w: number;
    rot?: number;
    shadow?: boolean;
    /** vinyl colour (resolveFill of the sticker); white by default */
    fill?: string;
    shape?: "diecut" | "circle" | "square";
    animate?: boolean;
  } = $props();

  const aspect = $derived(cut?.aspect ?? 1);
  const h = $derived(w / aspect);
  // paths are centred on the art box and were traced CANON.artW wide (or CANON.artW tall when aspect < 1)
  const k = $derived(aspect >= 1 ? w / CANON.artW : h / CANON.artW);
  const pad = $derived(w * 0.06);
  // on a circle / square tile the art sits a step smaller (the mock's 140 → 104 px), eased when the shape changes
  const artScale = $derived(shape === "diecut" ? 1 : 0.74);

  const shadowCss = $derived(shadow ? "filter: drop-shadow(0 0.6px 0.6px rgb(0 0 0 / .25)) drop-shadow(0 2px 3px rgb(0 0 0 / .18));" : "");
  // CSS px on an svg element are user units, so this matches the attribute form (origin 0 0 keeps translate→rotate order)
  const moveCss = $derived(animate ? `transform: translate(${x}px, ${y}px) rotate(${rot}deg); transform-box: view-box; transform-origin: 0 0;` : "");
</script>

<g transform={animate ? undefined : `translate(${x} ${y}) rotate(${rot})`} class={animate ? "ss-anim" : undefined} style="{moveCss}{shadowCss}">
  {#key shape}
    <g in:fade={{ duration: 180 }}>
      {#if shape === "circle"}
        <ellipse rx={w / 2 + pad} ry={h / 2 + pad} {fill} />
      {:else if shape === "square" || !cut}
        <rect x={-w / 2 - pad} y={-h / 2 - pad} width={w + 2 * pad} height={h + 2 * pad} rx={w * 0.12} {fill} />
      {:else}
        <path d={cut.d} transform="scale({k})" {fill} />
      {/if}
    </g>
  {/key}
  <image
    {href}
    x={-w / 2}
    y={-h / 2}
    width={w}
    height={h}
    preserveAspectRatio="xMidYMid meet"
    style="transform: scale({artScale}); transform-box: fill-box; transform-origin: center; transition: transform 0.3s ease;"
  />
</g>
