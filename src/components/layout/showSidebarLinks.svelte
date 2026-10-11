<script lang="ts">
  import { cn } from "@/utils/cn";
  import { globals } from "@/globals";

  import { page } from "$app/state";
  import favoritesStore from "@/stores/favorites.store";

  import ExternalLink from "@/components/ui/links/external-link.svelte";
  import InternalLink from "@/components/ui/links/internal-link.svelte";

  import { sidebarItemClasses } from "@/components/layout/sidebarItemClasses";
  import { sidebarBadgeClasses } from "@/components/layout/sidebarBadgeClasses";

  import House from "@lucide/svelte/icons/house";
  import Heart from "@lucide/svelte/icons/heart";
  import Sticker from "@lucide/svelte/icons/sticker";
  import Submit from "@lucide/svelte/icons/send";

  import Github from "@/components/logos/github.svelte";

  let favorites = $derived($favoritesStore);
  let favoritesCount = $derived(favoritesStore.getCount(favorites));
</script>

<InternalLink
  href="/archived/logos"
  preloadData={true}
  className={cn(
    sidebarItemClasses.base,
    "justify-start space-x-3",
    page.url.pathname === "/archived/logos" && sidebarItemClasses.active,
  )}
>
  <House size={16} />
  <p class="truncate">Logos</p>
</InternalLink>
<InternalLink
  href="/archived/favorites"
  preloadData={true}
  className={cn(
    sidebarItemClasses.base,
    "justify-between",
    String(page.url.pathname) === "/archived/favorites" && sidebarItemClasses.active,
  )}
>
  <div class="flex items-center space-x-3">
    <Heart size={16} />
    <p class="truncate">Favorites</p>
  </div>
  {#if favoritesCount > 0}
    <span
      class={cn(sidebarBadgeClasses, page.url.pathname && "border-transparent")}
    >
      {favoritesCount}
    </span>
  {/if}
</InternalLink>
<InternalLink
  href="/editor"
  className={cn(
    sidebarItemClasses.base,
    "justify-start space-x-3",
    page.url.pathname.startsWith("/editor") && sidebarItemClasses.active,
  )}
>
  <Sticker size={16} />
  <p class="truncate">Editor</p>
</InternalLink>
<ExternalLink
  href={globals.submitUrl}
  className={cn(
    sidebarItemClasses.base,
    "flex justify-start space-x-3 md:hidden",
  )}
>
  <Submit size={16} />
  <p class="truncate">Submit SVG</p>
</ExternalLink>
<ExternalLink
  href={globals.githubUrl}
  className={cn(
    sidebarItemClasses.base,
    "flex justify-start space-x-3 md:hidden",
  )}
>
  <Github size={16} />
  <p class="truncate">GitHub Repository</p>
</ExternalLink>
