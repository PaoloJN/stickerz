<script lang="ts">
  import { cn } from "@/utils/cn";

  /** A tiny sticker swatch: the tone's backing with the logo art on it. */
  let { tone, src, size = 24, class: className }: { tone: "light" | "dark"; src: string; size?: number; class?: string } = $props();
</script>

<span
  class={cn("grid flex-none place-items-center", tone === "dark" ? "bg-[#121212] ring-1 ring-white/15 ring-inset" : "bg-[#f5f5f5] ring-1 ring-black/10 ring-inset", className)}
  style="width: {size}px; height: {size}px; border-radius: {size * 0.28}px"
>
  <img {src} alt="" class="size-[62%] object-contain" draggable="false" />
</span>
