<script lang="ts">
  /** Everything above a marketing page: announcement bar, stats bar, nav. */
  import AnnouncementBar from "./AnnouncementBar.svelte";
  import StatsBar from "./StatsBar.svelte";
  import SiteNav from "./SiteNav.svelte";

  let { stars = null }: { stars?: number | null } = $props();
</script>

<AnnouncementBar />
<StatsBar {stars} />
<SiteNav />
