<script lang="ts">
  /**
   * Decorative die-cut stickers, absolutely positioned in px (parent must be `relative`).
   * Items follow the design's `[file, left, top, size, rot, far]` lists; `art` is the art size
   * as a fraction of the box (the mock's scatter draws art at 72 % of `size`, plain stickers at 100 %).
   * `float`: each sticker pops in on first paint (staggered, with a bounce), then drifts gently and leans
   * a few px toward the cursor (far ones less). All of it is off under reduced motion.
   */
  import type { Action } from "svelte/action";
  import Sticker from "@/components/stack/Sticker.svelte";
  import type { CutEntry } from "$lib/stickers/cuts-types";
  import { lib, type Scatter } from "$lib/home";
  import { cn } from "@/utils/cn";

  let {
    items,
    cuts = {},
    art = 0.72,
    float = false,
    class: className = "",
  }: { items: Scatter[]; cuts?: Record<string, CutEntry>; art?: number; float?: boolean; class?: string } = $props();

  // cursor position over the parent as -1..1, exposed as --px/--py; each sticker scales it by its own --depth
  const parallax: Action<HTMLElement> = (node) => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const host = node.parentElement ?? node;
    let raf = 0;
    const move = (e: PointerEvent) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const r = host.getBoundingClientRect();
        node.style.setProperty("--px", (((e.clientX - r.left) / r.width - 0.5) * 2).toFixed(3));
        node.style.setProperty("--py", (((e.clientY - r.top) / r.height - 0.5) * 2).toFixed(3));
      });
    };
    const leave = () => {
      node.style.setProperty("--px", "0");
      node.style.setProperty("--py", "0");
    };
    host.addEventListener("pointermove", move);
    host.addEventListener("pointerleave", leave);
    return {
      destroy() {
        host.removeEventListener("pointermove", move);
        host.removeEventListener("pointerleave", leave);
        cancelAnimationFrame(raf);
      },
    };
  };

  // per-sticker: pop-in stagger (55 ms each) and resting opacity, then a desynced drift so nothing moves in lockstep
  const motion = (i: number, far?: 0 | 1) =>
    `--pop:${i * 55}ms; --rest:${far ? 0.8 : 1}; --dur:${7 + (i % 4) * 1.5}s; --delay:-${((i * 1.37) % 7).toFixed(2)}s; ` +
    `--amp:${-(4 + (i % 3) * 2)}px; --tilt:${(i % 2 ? 1 : -1) * (1 + (i % 3) * 0.4)}deg; --depth:${far ? 5 : 12}px;`;
</script>

{#snippet stickers()}
  {#each items as [file, left, top, size, rot, far], i (i)}
    {@const href = lib(file)}
    {@const cut = cuts[href] ?? null}
    {@const aspect = cut?.aspect ?? 1}
    <!-- viewBox is 120 units for a 100-unit art box, so the svg is 1.2× the art size -->
    {@const px = size * art * 1.2}
    <svg
      viewBox="-60 -60 120 120"
      aria-hidden="true"
      class={cn("pointer-events-none absolute overflow-visible select-none", far && "opacity-80 blur-[1.2px]", float && "ss-float", className)}
      style="left:{left + (size - px) / 2}px; top:{top + (size - px) / 2}px; width:{px}px; height:{px}px; {float ? motion(i, far) : ''}"
    >
      <Sticker {href} {cut} x={0} y={0} w={aspect >= 1 ? 100 : 100 * aspect} {rot} />
    </svg>
  {/each}
{/snippet}

{#if float}
  <div class="pointer-events-none absolute inset-0" use:parallax>
    {@render stickers()}
  </div>
{:else}
  {@render stickers()}
{/if}

<style>
  /* three animations on three independent properties so they compose: pop-in on `scale` + `opacity`,
     the drift on `transform`, and the cursor lean on `translate` */
  :global(.ss-float) {
    animation:
      ss-pop-scale 0.5s cubic-bezier(0.2, 1.6, 0.4, 1) var(--pop, 0ms) both,
      ss-pop-fade 0.18s ease var(--pop, 0ms) both,
      ss-float var(--dur, 8s) ease-in-out var(--delay, 0s) infinite;
    translate: calc(var(--px, 0) * var(--depth, 10px)) calc(var(--py, 0) * var(--depth, 10px));
    transition: translate 0.35s ease-out;
    will-change: transform;
  }
  @keyframes -global-ss-pop-scale {
    from {
      scale: 0.3;
    }
    to {
      scale: 1;
    }
  }
  @keyframes -global-ss-pop-fade {
    from {
      opacity: 0;
    }
    to {
      opacity: var(--rest, 1);
    }
  }
  @keyframes -global-ss-float {
    0%,
    100% {
      transform: translate3d(0, 0, 0) rotate(0deg);
    }
    50% {
      transform: translate3d(0, var(--amp, -6px), 0) rotate(var(--tilt, 1.2deg));
    }
  }
  @media (prefers-reduced-motion: reduce) {
    :global(.ss-float) {
      animation: none;
      translate: none;
      transition: none;
    }
  }
</style>
