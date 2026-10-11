<script lang="ts">
  import { ToggleGroup as ToggleGroupPrimitive } from "bits-ui";
  import { cn } from "@/utils/cn";

  let { ref = $bindable(null), class: className, ...restProps }: ToggleGroupPrimitive.ItemProps = $props();
</script>

<ToggleGroupPrimitive.Item
  bind:ref
  data-slot="toggle-group-item"
  class={cn(
    "inline-flex h-6.5 cursor-pointer items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-medium whitespace-nowrap text-neutral-500 transition-colors outline-none hover:text-neutral-900 focus-visible:ring-2 focus-visible:ring-neutral-400 disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-white data-[state=on]:text-neutral-950 data-[state=on]:shadow-sm dark:text-neutral-400 dark:hover:text-white dark:data-[state=on]:bg-neutral-800 dark:data-[state=on]:text-white [&_svg]:pointer-events-none [&_svg]:shrink-0",
    className,
  )}
  {...restProps}
/>
