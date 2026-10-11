<script lang="ts">
  /** Legal — terms, privacy, affiliate disclosure and trademark notice. Metadata lives in $lib/legal/docs. */
  import type { PageProps } from "./$types";
  import SiteChrome from "@/components/site/SiteChrome.svelte";
  import SiteFrame from "@/components/site/SiteFrame.svelte";
  import SiteFooter from "@/components/site/SiteFooter.svelte";
  import { LEGAL_DOCS } from "$lib/legal/docs";
  import { REPO_URL } from "$lib/support";
  import { siteConfig } from "@/config/site";
  import { cn } from "@/utils/cn";

  let { data }: PageProps = $props();
  const doc = $derived(data.doc);

  const eyebrow = "font-mono text-[11.5px] uppercase tracking-[.08em] text-muted-foreground";
  const link = "underline underline-offset-2 hover:text-muted-foreground";
  const row = "grid items-center gap-4 border-b border-border/60 px-4 py-[13px] text-[13px] last:border-b-0";
</script>

<svelte:head>
  <title>{doc.title} · {siteConfig.name}</title>
  <meta name="description" content="{doc.title} for Stickerz. In short: {doc.short.join(' ')}" />
</svelte:head>

<SiteChrome stars={data.stars} />

<SiteFrame>
  <div class="grid grid-cols-1 lg:grid-cols-[232px_minmax(0,1fr)]">
    <aside class="border-b border-border lg:border-r lg:border-b-0">
      <nav class="flex flex-col gap-0.5 px-4 py-6 lg:sticky lg:top-16 lg:py-10" aria-label="Legal documents">
        <span class="px-2.5 pb-2 font-mono text-[10.5px] tracking-[.08em] text-muted-foreground">LEGAL</span>
        {#each LEGAL_DOCS as d (d.slug)}
          <a
            href="/legal/{d.slug}"
            aria-current={d.slug === doc.slug ? "page" : undefined}
            class={cn(
              "flex h-8 items-center rounded-[7px] px-2.5 text-[13.5px] hover:text-foreground",
              d.slug === doc.slug ? "bg-muted font-medium text-foreground" : "text-muted-foreground",
            )}>{d.label}</a
          >
        {/each}
        <div class="mx-2.5 my-4 h-px bg-border"></div>
        <a
          href="/brands#remove"
          class="flex h-8 items-center justify-between rounded-[7px] px-2.5 text-[13.5px] text-muted-foreground hover:bg-muted hover:text-foreground"
          >Brand removal request<span class="text-xs">→</span></a
        >
        <span class="px-2.5 pt-3 text-[12.5px] leading-normal text-muted-foreground">
          Questions? <a href="mailto:{siteConfig.emails.legal}" class="text-foreground">{siteConfig.emails.legal}</a>
        </span>
      </nav>
    </aside>

    <div class="min-w-0 px-4 pt-8 pb-16 sm:px-10 lg:px-16 lg:pt-14 lg:pb-20">
      <article
        class="flex max-w-[660px] flex-col [&_h3]:mt-9 [&_h3]:mb-2.5 [&_h3]:text-[20px] [&_h3]:font-semibold [&_h3]:tracking-[-.02em] [&_h3:first-of-type]:mt-11 [&_p]:text-[15px] [&_p]:leading-[1.75] [&_p]:text-pretty [&_p]:text-foreground/80"
      >
        <span class={eyebrow}>Legal · Updated {doc.updated}</span>
        <h1 class="mt-3.5 text-[32px] sm:text-[44px] leading-[1.05] font-semibold tracking-[-.045em]">{doc.title}</h1>
        <div class="mt-7 flex flex-col gap-2.5 rounded-xl bg-muted px-5 py-[18px]">
          <span class="font-mono text-[11px] tracking-[.08em]">IN SHORT</span>
          {#each doc.short as s}
            <span class="flex gap-2.5 text-[14.5px] leading-[1.55] text-foreground/80">
              <span class="flex-none text-foreground">✓</span>{s}
            </span>
          {/each}
        </div>

        {#if doc.slug === "terms"}
          <h3>1. Using Stickerz</h3>
          <p>
            Stickerz is a free tool for designing laptop sticker layouts. You don’t need an account. By using the
            site you agree to these terms. If you don’t agree, please don’t use it.
          </p>
          <h3>2. Your designs</h3>
          <p>
            Layouts you make are yours. Saved designs live on our server under an anonymous device cookie, with no
            account. When you share one, it gets a public link and can appear in Community if you post it there. You
            let us show, link to and make preview images of shared designs. You can delete a saved or shared design from My designs on the device you made it on, or email us and we’ll remove it within a week.
          </p>
          <h3>3. Logos and trademarks</h3>
          <p>
            The logos belong to their owners. They’re here so you can make stickers for your own
            laptop. Don’t use Stickerz to make stickers or merchandise to sell unless you have permission from
            each brand. See the <a href="/legal/trademark" class={link}>Trademark notice</a>.
          </p>
          <h3>4. What not to do</h3>
          <p>
            Don’t upload artwork you don’t have the right to use, share designs meant to harass or mislead, or try to break
            or overload the site. We may remove shared designs that do.
          </p>
          <h3>5. Sponsorships</h3>
          <p>
            Brands can sponsor placements. Sponsored placements are always labeled and never change search results or
            what you can put on your laptop.
          </p>
          <h3>6. No warranty</h3>
          <p>
            The site is provided as is. We work hard to get sizes right, but always print a test sheet before ordering.
            We aren’t responsible for print costs or results.
          </p>
          <h3>7. Changes</h3>
          <p>If these terms change in a way that matters, we’ll say so on this page and in the changelog.</p>
        {:else if doc.slug === "privacy"}
          <h3>What we store</h3>
          <div class="overflow-hidden rounded-xl border border-border bg-card">
            <div
              class="hidden grid-cols-[170px_1fr_190px] gap-4 border-b border-border bg-muted px-4 sm:grid py-2.5 font-mono text-[11px] tracking-[.06em] text-muted-foreground"
            >
              <span>WHAT</span><span>WHY</span><span>WHERE</span>
            </div>
            <div class={cn(row, "grid-cols-1 gap-1 sm:grid-cols-[170px_1fr_190px] sm:gap-4")}>
              <span class="font-medium">Your designs</span>
              <span class="text-foreground/80">So your designs are there when you come back.</span>
              <span class="text-muted-foreground">Your browser, and our server once you save or share</span>
            </div>
            <div class={cn(row, "grid-cols-1 gap-1 sm:grid-cols-[170px_1fr_190px] sm:gap-4")}>
              <span class="font-medium">Shared designs</span>
              <span class="text-foreground/80">The layout, name and handle you choose, so the link works.</span>
              <span class="text-muted-foreground">Our server</span>
            </div>
            <div class={cn(row, "grid-cols-1 gap-1 sm:grid-cols-[170px_1fr_190px] sm:gap-4")}>
              <span class="font-medium">Brand requests</span>
              <span class="text-foreground/80">Company, name, work email and which logos, so we can answer your request.</span>
              <span class="text-muted-foreground">Our server</span>
            </div>
            <div class={cn(row, "grid-cols-1 gap-1 sm:grid-cols-[170px_1fr_190px] sm:gap-4")}>
              <span class="font-medium">Device cookie</span>
              <span class="text-foreground/80"
                >An anonymous <code class="font-mono text-[12px]">owner_id</code> cookie (2 years) that ties your saved designs
                to this browser; no account.</span
              >
              <span class="text-muted-foreground">Your browser</span>
            </div>
          </div>
          <p class="mt-4">We don’t run analytics yet.</p>
          <h3>What we don’t do</h3>
          <p>No accounts, no ad trackers, no selling data. We don’t know who you are unless you email us or send a brand request.</p>
          <h3>Other sites</h3>
          <p>
            GitHub Sponsors and Ko-fi handle payments; we never see your card. Print shops you reach through our links
            may set their own cookies after you click. Their privacy policies apply there.
          </p>
          <h3>Deleting things</h3>
          <p>
            Clear site data to remove designs from your browser. You can delete a saved or shared design from My designs on the device you made it on, or email us and we’ll remove it within a week.
          </p>
        {:else if doc.slug === "affiliate"}
          <h3>Which links pay us</h3>
          <p>
            Some links to print shops and cutting machines are affiliate links. If you buy after clicking one, the shop
            pays us a commission. You pay the same price. None of these affiliate links are active yet; this page will
            say so when one is.
          </p>
          <div class="mt-4 overflow-hidden rounded-xl border border-border bg-card">
            {#each [["Sticker Mule", "Print orders"], ["Cricut", "Machines and materials"], ["Silhouette", "Machines, US only"], ["Sticker paper and laminate", "Supplies"]] as [name, note]}
              <div class={cn(row, "grid-cols-[1fr_auto]")}>
                <span class="font-medium">{name}</span>
                <span class="text-muted-foreground">{note}</span>
              </div>
            {/each}
          </div>
          <h3>How you’ll know</h3>
          <p>
            Every one of these links sits next to this label:
            <span
              class="inline-flex items-center gap-2 rounded-lg bg-muted px-2.5 py-1.5 align-middle text-xs text-muted-foreground"
              ><span class="font-mono text-[10px] tracking-[.06em] text-foreground">PAID LINKS</span>We earn a commission
              if you buy.</span
            >
          </p>
          <h3>What it doesn’t change</h3>
          <p>
            We only list shops that accept our print files and that we’d use ourselves. The printing guide works the
            same with any shop or machine.
          </p>
        {:else if doc.slug === "trademark"}
          <h3>Whose logos these are</h3>
          <p>
            All logos are trademarks of their owners. They’re shown so people can design stickers for their own
            laptops, and nothing more.
          </p>
          <h3>No endorsement</h3>
          <p>
            Stickerz isn’t affiliated with, endorsed by or sponsored by any brand shown, unless a placement is
            labeled “Sponsored”. Pages like “Vercel laptop sticker” describe what you can make here. They aren’t
            official merchandise, and nothing is for sale.
          </p>
          <h3>Official and Sponsored labels</h3>
          <p>
            An “Official” badge appears only when a brand has given us a written logo license. “Sponsored” appears on
            every paid placement, without exception.
          </p>
          <h3>Removal</h3>
          <p>
            If you own a mark and want it removed, use the <a href="/brands#remove" class={link}>brand request form</a>.
            We hide it within 48 hours of confirming the request. Removal is free and has nothing to do with
            sponsorship.
          </p>
          <h3>Device names</h3>
          <p>
            MacBook, MacBook Air and MacBook Pro are trademarks of Apple Inc., used only to describe laptop sizes.
          </p>
        {/if}

        <div class="mt-14 flex flex-wrap items-center gap-3 border-t border-border pt-5 text-[13px] text-muted-foreground">
          <span>
            Something unclear? <a href="mailto:{siteConfig.emails.legal}" class="text-foreground">{siteConfig.emails.legal}</a>
          </span>
          <div class="flex-1"></div>
          <a
            href="{REPO_URL}/commits/main/src/routes/legal/[doc]/+page.svelte"
            target="_blank"
            rel="noopener noreferrer"
            class="hover:text-foreground">View history on GitHub ↗</a
          >
        </div>
      </article>
    </div>
  </div>

  <SiteFooter />
</SiteFrame>
