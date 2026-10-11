<script lang="ts">
  import { ToggleGroup as ToggleGroupPrimitive } from "bits-ui";
  import { cn } from "@/utils/cn";

  let {
    ref = $bindable(null),
    value = $bindable(),
    class: className,
    ...restProps
  }: ToggleGroupPrimitive.RootProps = $props();
</script>

<ToggleGroupPrimitive.Root
  bind:ref
  bind:value={value as never}
  data-slot="toggle-group"
  class={cn("flex items-center gap-0.5 rounded-lg border border-neutral-200 bg-neutral-100 p-0.5 dark:border-neutral-800 dark:bg-neutral-950", className)}
  {...restProps}
/>
