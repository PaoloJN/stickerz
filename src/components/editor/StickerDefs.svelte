<script lang="ts">
  import { HOLO_STOPS } from "$lib/stickers/style";
</script>

<defs>
  <linearGradient id="ss-holo" x1="0" y1="0" x2="1" y2="1">
    {#each HOLO_STOPS as [o, c] (o)}<stop offset={o} stop-color={c} />{/each}
  </linearGradient>
  <linearGradient id="ss-gloss" x1="0" y1="0" x2="1" y2="0.6">
    <stop offset="0.28" stop-color="#fff" stop-opacity="0" />
    <stop offset="0.42" stop-color="#fff" stop-opacity="0.4" />
    <stop offset="0.56" stop-color="#fff" stop-opacity="0" />
    <stop offset="0.72" stop-color="#fff" stop-opacity="0.14" />
    <stop offset="0.86" stop-color="#fff" stop-opacity="0" />
  </linearGradient>
</defs>
