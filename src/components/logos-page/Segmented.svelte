<script lang="ts" generics="T extends string | number">
  /** Segmented control (the mocks' grey pill of options): real buttons with aria-pressed inside a labelled group. */
  import { cn } from "@/utils/cn";

  type Props = {
    /** `disabled` options stay visible (so every picker keeps the same shape); `title` says why */
    options: readonly { id: T; label: string; disabled?: boolean; title?: string }[];
    value: T;
    onchange: (id: T) => void;
    label: string;
    /** options share the width equally */
    grow?: boolean;
    class?: string;
    itemClass?: string;
  };
  let { options, value, onchange, label, grow = false, class: className, itemClass }: Props = $props();
</script>

<div class={cn("flex gap-0.5 rounded-[9px] border border-border bg-muted p-0.5", className)} role="group" aria-label={label}>
  {#each options as o (o.id)}
    {@const active = value === o.id}
    <button
      type="button"
      aria-pressed={active}
      disabled={o.disabled}
      title={o.title}
      class={cn(
        "flex h-7 cursor-pointer items-center justify-center rounded-[7px] px-[11px] text-[12.5px] font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
        grow && "min-w-0 flex-1",
        active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
        o.disabled && "cursor-not-allowed opacity-40 hover:text-muted-foreground",
        itemClass,
      )}
      onclick={() => onchange(o.id)}
    >
      {o.label}
    </button>
  {/each}
</div>
