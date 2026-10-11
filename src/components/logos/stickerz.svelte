<script lang="ts">
  import type { IconProps } from "@/types/icon";

  let props: IconProps = $props();
</script>

<svg
  name="Stickerz logo"
  xmlns="http://www.w3.org/2000/svg"
  width={props.size}
  height={props.size}
  viewBox="0 0 24 24"
  fill="none"
  stroke={props.color ?? "currentColor"}
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
  class={props.className}
>
  <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"></path>
  <path d="m15 9-6 6"></path>
  <path d="M9 9h.01"></path>
  <path d="M15 15h.01"></path>
</svg>
