<script lang="ts">
  /** CSS-only infinite logo strip: the list twice in a row, slid by -50 %. Stops for reduced motion. */
  import { lib } from "$lib/home";

  let { items }: { items: [file: string, name: string][] } = $props();
</script>

<!-- edge fades are a mask, so they work on whatever background the page has -->
<div
  class="relative min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_96px,black_calc(100%-120px),transparent)]"
>
  <div class="flex w-max animate-[ss-marquee_60s_linear_infinite] motion-reduce:animate-none">
    {#each [0, 1] as copy (copy)}
      <div class="flex flex-none gap-11 pr-11" aria-hidden={copy === 1 ? "true" : undefined}>
        {#each items as [file, name] (file)}
          <span class="flex flex-none items-center gap-2 text-sm font-medium whitespace-nowrap text-muted-foreground">
            <img src={lib(file)} alt="" class="size-[18px] object-contain opacity-60 grayscale dark:invert" />
            {name}
          </span>
        {/each}
      </div>
    {/each}
  </div>
</div>

<style>
  @keyframes -global-ss-marquee {
    from {
      transform: translateX(0);
    }
    to {
      transform: translateX(-50%);
    }
  }
</style>
