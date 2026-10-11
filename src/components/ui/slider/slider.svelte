<script lang="ts">
  import { Slider as SliderPrimitive } from "bits-ui";
  import type { WithoutChildrenOrChild } from "@/types/components";
  import { cn } from "@/utils/cn";

  let {
    ref = $bindable(null),
    value = $bindable(),
    class: className,
    ...restProps
  }: WithoutChildrenOrChild<SliderPrimitive.RootProps> = $props();
</script>

<!-- Explicit type annotation to avoid the union type issue with bindable value -->
<SliderPrimitive.Root
  bind:ref
  bind:value={value as never}
  data-slot="slider"
  class={cn("relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50", className)}
  {...restProps}
>
  {#snippet children({ thumbItems })}
    <span data-slot="slider-track" class="relative h-1 w-full grow overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
      <SliderPrimitive.Range data-slot="slider-range" class="absolute h-full bg-neutral-900 dark:bg-neutral-100" />
    </span>
    {#each thumbItems as thumb (thumb)}
      <SliderPrimitive.Thumb
        data-slot="slider-thumb"
        index={thumb.index}
        class="block size-3.5 shrink-0 cursor-grab rounded-full border border-neutral-900 bg-white shadow-sm transition-[box-shadow] hover:ring-4 hover:ring-neutral-300/50 focus-visible:ring-4 focus-visible:ring-neutral-300/50 focus-visible:outline-hidden active:cursor-grabbing dark:border-neutral-100 dark:bg-neutral-950 dark:hover:ring-neutral-500/40 dark:focus-visible:ring-neutral-500/40"
      />
    {/each}
  {/snippet}
</SliderPrimitive.Root>
