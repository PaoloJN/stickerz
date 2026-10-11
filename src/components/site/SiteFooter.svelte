<script lang="ts">
  import { siteConfig } from "@/config/site";
  /** 4-column footer + copyright row. Render it inside a SiteFrame so the side rules continue. */
  import { REPO_URL, X_URL } from "$lib/support";
  import ThemeToggle from "@/components/site/ThemeToggle.svelte";

  type Col = { title: string; links: { label: string; href: string }[] };
  const cols: Col[] = [
    {
      title: "Product",
      links: [
        { label: "Editor", href: "/editor" },
        { label: "Community", href: "/community" },
        { label: "Stickers", href: "/stickers" },
        { label: "Support", href: "/support" },
      ],
    },
    {
      title: "Resources",
      links: [
        { label: "Docs", href: "/docs" },
        { label: "How to print", href: "/docs/print" },
        { label: "Contribute", href: "/docs/contribute" },
        { label: "GitHub", href: REPO_URL },
      ],
    },
    {
      title: "Legal",
      links: [
        { label: "Terms", href: "/legal/terms" },
        { label: "Privacy", href: "/legal/privacy" },
        { label: "Affiliate disclosure", href: "/legal/affiliate" },
        { label: "Trademark notice", href: "/legal/trademark" },
        { label: "Brand removal request", href: "/brands#remove" },
      ],
    },
  ];
</script>

<footer class="mt-auto">
  <div
    class="grid grid-cols-1 gap-8 border-t border-border px-4 pt-14 pb-12 sm:grid-cols-2 sm:px-8 lg:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))]"
  >
    <div class="flex flex-col gap-3.5">
      <a href="/" class="flex items-center gap-[9px] text-foreground">
        <img src="/icon.svg" alt="" class="size-5" />
        <span class="text-[15px] font-semibold">{siteConfig.name}</span>
      </a>
      <span
        class="max-w-[240px] text-[13.5px] leading-normal text-muted-foreground"
        >Design stickers for your laptop, bottle or anything, at true size, then post it or print it.</span
      >
    </div>
    {#each cols as col (col.title)}
      <div class="flex flex-col gap-3">
        <span class="text-[13px] font-medium text-foreground">{col.title}</span>
        {#each col.links as link (link.href)}
          <a
            href={link.href}
            class="text-[13.5px] text-muted-foreground transition-colors duration-150 hover:text-foreground"
            >{link.label}</a
          >
        {/each}
      </div>
    {/each}
  </div>
  <div
    class="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border px-4 py-5 text-[12.5px] text-muted-foreground sm:px-8 lg:flex-nowrap lg:gap-y-0"
  >
    <span>© 2026 {siteConfig.name}</span>
    <span class="text-muted-foreground/50 max-sm:hidden" aria-hidden="true">·</span>
    <span>Every logo belongs to its owner.</span>
    <div class="flex-1"></div>
    <a href={REPO_URL} class="transition-colors duration-150 hover:text-foreground">GitHub</a>
    {#if X_URL}<a href={X_URL} class="transition-colors duration-150 hover:text-foreground">X</a>{/if}
    <ThemeToggle class="-my-1.5 -mr-1.5" />
  </div>
</footer>
