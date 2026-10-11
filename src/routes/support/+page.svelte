<script lang="ts">
  /**
   * Support v2 — back the project (GitHub Sponsors, Ko-fi), sponsor a brand logo, free ways to help, print through our
   * links. Links live in $lib/support; unconfigured ones only show in dev, tagged "not set up".
   */
  import type { PageProps } from "./$types";
  import SiteChrome from "@/components/site/SiteChrome.svelte";
  import SiteFrame from "@/components/site/SiteFrame.svelte";
  import SiteFooter from "@/components/site/SiteFooter.svelte";
  import { Button } from "@/components/ui/button";
  import { cn } from "@/utils/cn";
  import { AFFILIATE_DISCLOSURE, AMAZON_DISCLOSURE, AMAZON_LINKS, BRAND_TIERS, DONATE, PRINT_SHOPS, REPO_URL, showPending, SUPPLIES, UPSTREAM, type Shop } from "@/lib/support";
  import { sponsorUrl, SPONSOR_AMOUNTS } from "@/lib/sponsor-url";
  import { siteConfig } from "@/config/site";
  import Heart from "@lucide/svelte/icons/heart";
  import ArrowUpRight from "@lucide/svelte/icons/arrow-up-right";

  let { data }: PageProps = $props();

  const sponsorUser = siteConfig.donate.githubSponsors;
  let frequency = $state<"recurring" | "one-time">("recurring");
  let amount = $state(5);
  const amounts = $derived(SPONSOR_AMOUNTS[frequency]);
  const ghUrl = $derived(sponsorUser ? sponsorUrl(sponsorUser, { frequency, amount }) : "");
  function setFrequency(f: "recurring" | "one-time") {
    frequency = f;
    if (!(SPONSOR_AMOUNTS[f] as readonly number[]).includes(amount)) amount = 5;
  }

  const showKofi = Boolean(DONATE.kofi) || showPending;
  const visible = (list: Shop[]) => list.filter((x) => x.href || showPending);
  const listed = $derived([...visible(PRINT_SHOPS), ...visible(SUPPLIES)]);
  const paidLinks = [...PRINT_SHOPS, ...SUPPLIES].some((s) => s.affiliate && s.href);

  const eyebrow = "font-mono text-[11.5px] uppercase tracking-[.08em] text-muted-foreground";
  const card = "rounded-2xl border border-border bg-card";
  const pending = "rounded-md border border-dashed border-border px-1.5 py-0.5 font-mono text-[10.5px] text-muted-foreground";
  const freqs = [
    { id: "recurring", label: "Monthly" },
    { id: "one-time", label: "One-time" },
  ] as const;
</script>

<svelte:head>
  <title>Support · {siteConfig.name}</title>
  <meta name="description" content="Keep Stickerz free and open source: sponsor the project, sponsor your brand's logo, or print your design." />
</svelte:head>

<SiteChrome stars={data.stars} />

<SiteFrame>
  <main>
    <!-- Hero -->
    <section class="grid grid-cols-1 items-end gap-8 px-4 pt-12 pb-10 sm:px-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-10 lg:pt-20 lg:pb-12">
      <div class="flex flex-col gap-4">
        <span class="{eyebrow} flex gap-2"><span class="text-destructive" aria-hidden="true">♥</span>Support</span>
        <h1 class="text-[40px] leading-none sm:text-[60px] font-semibold tracking-[-.05em] text-foreground">Keep Stickerz free</h1>
        <p class="max-w-[560px] text-[17px] leading-[1.55] text-pretty text-muted-foreground">
          Stickerz is free, open source and has no ads. It’s built by one person. If it saved you an afternoon, here’s how to say thanks.
        </p>
      </div>
      <a href="/brands" class="{card} flex flex-col gap-2 p-5 shadow-sm transition-colors hover:border-foreground/30">
        <span class="font-mono text-[10.5px] tracking-[.08em] text-muted-foreground uppercase">Here for your brand?</span>
        <span class="text-[17px] leading-[1.3] font-semibold tracking-[-.02em]">Make your logo official on every design it’s on.</span>
        <span class="flex items-center justify-between pt-1 text-[13.5px] text-muted-foreground">
          From {BRAND_TIERS[0]?.price} {BRAND_TIERS[0]?.period}<span class="font-medium text-foreground">See plans →</span>
        </span>
      </a>
    </section>

    <!-- Back the project -->
    <section class="grid grid-cols-1 gap-4 border-t border-border px-4 py-10 sm:px-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      {#if sponsorUser}
        <div class="{card} flex flex-col gap-[18px] border-foreground p-6 shadow-lg ring-1 ring-foreground">
          <div class="flex items-center gap-3">
            <span class="grid size-10 flex-none place-items-center rounded-[11px] bg-muted">
              <img src="/library/github_light.svg" alt="" class="size-5 dark:hidden" />
              <img src="/library/github_dark.svg" alt="" class="hidden size-5 dark:block" />
            </span>
            <div class="flex flex-1 flex-col gap-0.5">
              <h2 class="text-[18px] font-semibold tracking-[-.02em]">GitHub Sponsors</h2>
              <span class="text-[13px] text-muted-foreground">@{sponsorUser} · monthly or one-time</span>
            </div>
            <span class="rounded-md bg-muted px-2 py-1 font-mono text-[10.5px] tracking-[.06em]">BEST WAY</span>
          </div>
          <div class="flex flex-wrap items-center gap-2.5">
            <div class="flex gap-0.5 rounded-[9px] border border-border bg-muted p-0.5" role="group" aria-label="Frequency">
              {#each freqs as f (f.id)}
                <button
                  type="button"
                  aria-pressed={frequency === f.id}
                  onclick={() => setFrequency(f.id)}
                  class={cn("h-[30px] rounded-[7px] px-3 text-[13px] font-medium transition-colors", frequency === f.id ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}
                >{f.label}</button>
              {/each}
            </div>
            <div class="flex gap-1.5" role="group" aria-label="Amount">
              {#each amounts as a (a)}
                <button
                  type="button"
                  aria-pressed={amount === a}
                  onclick={() => (amount = a)}
                  class={cn("h-[34px] min-w-[52px] rounded-[9px] border px-3 text-[14px] font-medium transition-colors", amount === a ? "border-foreground bg-foreground text-background" : "border-border bg-card hover:bg-muted")}
                >${a}</button>
              {/each}
            </div>
          </div>
          <a href={ghUrl} target="_blank" rel="noreferrer" class="flex h-12 items-center justify-center gap-2 rounded-xl bg-foreground text-[15px] font-medium text-background transition-opacity hover:opacity-90">
            <Heart class="size-4 fill-current text-destructive" />Sponsor ${amount}{frequency === "recurring" ? " a month" : " once"} on GitHub
          </a>
          <p class="text-[12.5px] leading-normal text-muted-foreground">GitHub takes no fee from personal sponsors, so all of it reaches the project. Cancel any time.</p>
        </div>
      {/if}

      <div class={cn("flex flex-col gap-4", !sponsorUser && "lg:col-span-2")}>
        {#if showKofi}
          <div class="{card} flex flex-1 flex-col gap-2.5 p-[22px]">
            <div class="flex items-center gap-2">
              <h3 class="text-[16px] font-semibold tracking-[-.015em]">No GitHub account?</h3>
              {#if !DONATE.kofi}<span class="ml-auto {pending}">not set up</span>{/if}
            </div>
            <p class="flex-1 text-[13.5px] leading-normal text-pretty text-muted-foreground">Leave a one-time tip on Ko-fi with a card or PayPal.</p>
            <Button href={DONATE.kofi ?? undefined} disabled={!DONATE.kofi} target="_blank" rel="noreferrer" variant="outline" class="h-10 rounded-[10px]">
              Tip on Ko-fi<ArrowUpRight class="size-3.5" />
            </Button>
          </div>
        {/if}
        <div class="flex flex-col gap-1 rounded-2xl bg-muted px-[22px] py-4">
          <h3 class="text-[14px] font-medium">Need an invoice?</h3>
          <p class="text-[13px] leading-normal text-pretty text-muted-foreground">
            Open Collective for companies is coming. Until then, <a href="/brands#feature" class="text-foreground underline underline-offset-[3px]">get in touch</a>.
          </p>
        </div>
      </div>
    </section>

    <!-- TODO: sponsors row once we have real sponsor data; see docs/design/*Support v2.dc.html -->

    <!-- Brands (the full pitch lives at /brands) -->
    <section id="brands" class="flex scroll-mt-20 flex-col items-start gap-4 border-t border-border bg-muted px-4 py-14 sm:px-8">
      <span class={eyebrow}>For brands</span>
      <p class="max-w-[560px] text-[16px] leading-[1.6] text-pretty text-muted-foreground">
        Developers add your logo for free. Sponsoring lets you choose how it looks and puts it in front of people while they pick their stack.
      </p>
      <Button href="/brands" class="h-10">For brands: sponsor your logo →</Button>
    </section>

    <!-- Free ways to help + print -->
    <section class="flex flex-col gap-5 border-t border-border px-4 py-12 sm:px-8">
      <div class="flex flex-col gap-1.5">
        <h2 class="text-[22px] font-semibold tracking-[-.03em]">Free ways to help</h2>
        <p class="text-[14px] text-muted-foreground">None of these cost you anything.</p>
      </div>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {#each [{ t: "Star the repo", b: "Stars help other developers find it.", l: "Star on GitHub ↗", h: REPO_URL, ext: true }, { t: "Contribute code", b: "New laptop sizes, export fixes, or a good first issue.", l: "How to contribute →", h: "/docs/contribute", ext: false }, { t: "Share your design", b: "Post it to the Community. Every share brings someone new.", l: "Open Community →", h: "/community", ext: false }] as w (w.t)}
          <div class="flex flex-col gap-1.5 rounded-[14px] border border-border bg-card p-5">
            <h3 class="text-[15px] font-medium">{w.t}</h3>
            <p class="flex-1 text-[13.5px] leading-normal text-muted-foreground">{w.b}</p>
            <a href={w.h} target={w.ext ? "_blank" : undefined} rel={w.ext ? "noreferrer" : undefined} class="pt-1.5 text-[13.5px] font-medium hover:text-muted-foreground">{w.l}</a>
          </div>
        {/each}
      </div>

      <div id="print" class="{card} grid scroll-mt-20 grid-cols-1 items-start gap-7 p-[22px] md:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
        <div class="flex flex-col gap-2">
          <h3 class="text-[15px] font-medium">Print through our links</h3>
          <p class="text-[13.5px] leading-normal text-pretty text-muted-foreground">
            {#if paidLinks}When you’re ready to print, these shops and tools pay us a small cut. You pay the same price.{:else}When you’re ready to print, these are the shops and tools our export files are made for.{/if}
          </p>
          {#if paidLinks}
            <!-- FTC: disclose right next to the links, in plain words -->
            <p class="mt-1.5 flex items-start gap-2 rounded-lg bg-muted px-2.5 py-2 text-[12px] leading-[1.45] text-muted-foreground">
              <span class="flex-none pt-px font-mono text-[10px] tracking-[.06em] text-foreground">PAID LINKS</span>
              <span>{AFFILIATE_DISCLOSURE}{#if AMAZON_LINKS} {AMAZON_DISCLOSURE}{/if}</span>
            </p>
          {/if}
        </div>
        <div class="flex flex-col">
          {#each listed as s (s.name)}
            <a
              href={s.href ?? undefined}
              target="_blank"
              rel={s.affiliate ? "noreferrer sponsored" : "noreferrer"}
              aria-disabled={!s.href}
              class={cn("grid grid-cols-[1fr_auto] items-center gap-4 border-b border-border py-3", !s.href && "pointer-events-none opacity-60")}
            >
              <span class="flex flex-col gap-0.5">
                <span class="flex items-center gap-2 text-[14px] font-medium">{s.name}{#if !s.href}<span class={pending}>not set up</span>{/if}</span>
                <span class="text-[12.5px] text-muted-foreground">{s.blurb}</span>
              </span>
              {#if s.href}<span class="flex items-center gap-1 text-[13px] font-medium">Open<ArrowUpRight class="size-3.5" /></span>{/if}
            </a>
          {/each}
          <a href="/docs/print" class="flex gap-1.5 pt-3 text-[13px] text-muted-foreground hover:text-foreground">Read the printing guide first<span>→</span></a>
        </div>
      </div>
    </section>

    <!-- Credit: the logo library started from svgl -->
    <section class="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-6 border-t border-border bg-muted px-4 py-10 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:px-8">
      <span class="grid size-[52px] place-items-center rounded-[14px] border border-border bg-card font-mono text-[13px] font-semibold tracking-tight">svg</span>
      <div class="flex flex-col gap-1">
        <h2 class="text-[17px] font-semibold tracking-[-.02em]">Thanks to <a href={UPSTREAM.site} class="underline underline-offset-[3px]">{UPSTREAM.name}</a></h2>
        <p class="max-w-[560px] text-[14px] leading-normal text-pretty text-muted-foreground">
          The logo library started from svgl, pheralb’s open collection of SVG logos. If you sponsor us, consider sponsoring him too.
        </p>
      </div>
      <Button href={UPSTREAM.sponsors} target="_blank" rel="noreferrer" variant="outline" class="col-span-2 h-10 rounded-[10px] sm:col-span-1"><span class="text-destructive" aria-hidden="true">♥</span>Sponsor pheralb</Button>
    </section>
  </main>
  <SiteFooter />
</SiteFrame>
