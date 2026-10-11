<script lang="ts">
  import { cn } from "@/utils/cn";
  import { DropdownMenu as DropdownMenuPrimitive } from "bits-ui";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";

  let {
    ref = $bindable(null),
    class: className,
    children,
    ...restProps
  }: DropdownMenuPrimitive.SubTriggerProps = $props();
</script>

<DropdownMenuPrimitive.SubTrigger
  bind:ref
  data-slot="dropdown-menu-sub-trigger"
  class={cn(
    "flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-highlighted:bg-neutral-200 data-[state=open]:bg-neutral-200 dark:data-highlighted:bg-neutral-800 dark:data-[state=open]:bg-neutral-800",
    className,
  )}
  {...restProps}
>
  {@render children?.()}
  <ChevronRight class="ml-auto size-4" />
</DropdownMenuPrimitive.SubTrigger>
