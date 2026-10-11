<script lang="ts">
  import { cn } from "@/utils/cn";
  import { DropdownMenu as DropdownMenuPrimitive } from "bits-ui";

  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: DropdownMenuPrimitive.SubContentProps = $props();
</script>

<DropdownMenuPrimitive.SubContent
  bind:ref
  data-slot="dropdown-menu-sub-content"
  class={cn(
    "z-50 min-w-32 overflow-hidden rounded-md border border-neutral-200 bg-neutral-50 p-1 text-neutral-950 shadow-lg outline-none dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-50",
    className,
  )}
  {...restProps}
/>
