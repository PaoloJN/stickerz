<script lang="ts">
  import { siteConfig } from "@/config/site";
  /**
   * For Brands — brands ask to remove or update their logo, or sponsor a placement.
   * Layout and copy: docs/design/*For Brands.dc.html. Requests go to POST /api/brand-requests.
   * Deep links: #remove | #update | #feature pick a mode; #verified | #featured | #partner pick Feature + that plan.
   */
  import { onMount } from "svelte";
  import type { PageProps } from "./$types";
  import SiteChrome from "@/components/site/SiteChrome.svelte";
  import SiteFrame from "@/components/site/SiteFrame.svelte";
  import SiteFooter from "@/components/site/SiteFooter.svelte";
  import BrandForm from "@/components/brands/BrandForm.svelte";
  import BrandRequestReceived from "@/components/brands/BrandRequestReceived.svelte";
  import { radioKeydown } from "@/components/brands/radio";
  import { cn } from "@/utils/cn";
  import { MODE_IDS, MODES, PLAN_IDS, PLANS, type BrandMode, type PlanId, type SentRequest } from "$lib/brands";
  import Check from "@lucide/svelte/icons/check";

  let { data }: PageProps = $props();

  let mode = $state<BrandMode>("remove");
  let plan = $state<PlanId | null>("featured");
  let sent = $state<SentRequest | null>(null);
  /** bumped on "Send another request" so the form remounts blank */
  let formKey = $state(0);

  const copy = $derived(MODES[mode]);

  function fromHash() {
    const h = location.hash.slice(1);
    if ((PLAN_IDS as string[]).includes(h)) {
      if (mode !== "feature" && sent) reset();
      mode = "feature";
      plan = h as PlanId;
    } else if ((MODE_IDS as string[]).includes(h)) {
      if (h !== mode && sent) reset();
      mode = h as BrandMode;
    }
  }

  onMount(() => {
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  });

  /** reflect the choice in the URL without a navigation or history entry */
  function syncHash() {
    const h = mode === "feature" && plan ? plan : mode;
    if (location.hash.slice(1) !== h) history.replaceState(history.state, "", `#${h}`);
  }
  function pickMode(m: BrandMode) {
    if (m !== mode && sent) reset(); // a new kind of request starts from a blank form
    mode = m;
    syncHash();
  }
  function pickPlan(p: PlanId | null) {
    plan = p;
    syncHash();
  }
  function reset() {
    sent = null;
    formKey++;
  }

  const eyebrow = "font-mono text-[11.5px] uppercase tracking-[.08em] text-muted-foreground";
  const card = (on: boolean) =>
    cn(
      "flex cursor-pointer flex-col rounded-[14px] border bg-card text-left outline-none transition-shadow",
      "focus-visible:ring-[3px] focus-visible:ring-ring/50",
      on ? "border-foreground shadow-[0_0_0_1px_var(--color-foreground),0_10px_24px_rgb(20_30_40/.08)]" : "border-border shadow-xs hover:border-foreground/30",
    );
  const dot = (on: boolean) =>
    cn("size-4 shrink-0 rounded-full", on ? "border-[5px] border-foreground" : "border-[1.5px] border-foreground/25");
</script>

<svelte:head>
  <title>For brands · {siteConfig.name}</title>
  <meta
    name="description"
    content="Remove or update your logo on Stickerz, or sponsor a clearly labeled placement. No lawyers needed."
  />
</svelte:head>

<SiteChrome stars={data.stars} />

<SiteFrame>
  <main>
    <!-- Hero -->
    <section class="flex flex-col gap-4 px-4 pt-12 pb-10 sm:px-8 lg:pt-20">
      <span class={eyebrow}>For brands</span>
      <h1 class="text-[40px] leading-none sm:text-[60px] font-semibold tracking-[-.05em]">Your logo, your call</h1>
      <p class="max-w-[580px] text-[17px] leading-[1.55] text-pretty text-muted-foreground">
        People put your logo on their stickers and designs because they like what you make. If you’d rather they didn’t, or you want it
        to look right, tell us here. No lawyers needed.
      </p>
    </section>

    <!-- Mode cards -->
    <div
      role="radiogroup"
      aria-label="What would you like to do?"
      tabindex="-1"
      class="grid grid-cols-1 gap-3 px-4 pb-10 sm:px-8 md:grid-cols-3"
      onkeydown={(e) => radioKeydown(e, MODE_IDS, mode, pickMode)}
    >
      {#each MODE_IDS as m (m)}
        {@const on = mode === m}
        {@const c = MODES[m]}
        <button
          type="button"
          role="radio"
          aria-checked={on}
          tabindex={on ? 0 : -1}
          class={cn(card(on), "min-h-[150px] gap-2.5 p-[18px]")}
          onclick={() => pickMode(m)}
        >
          <span class="flex w-full items-center justify-between">
            <span class="text-base font-semibold tracking-[-.015em]">{c.title}</span><span class={dot(on)}></span>
          </span>
          <span class="flex-1 text-[13.5px] leading-normal text-pretty text-muted-foreground">{c.body}</span>
          <span class="font-mono text-[10.5px] tracking-[.06em] text-foreground">{c.sla}</span>
        </button>
      {/each}
    </div>

    <!-- Plans (Feature only) -->
    {#if mode === "feature"}
      <section class="flex flex-col gap-[18px] border-t border-border px-4 pt-9 pb-10 sm:px-8" aria-labelledby="plans-title">
        <h2 id="plans-title" class="text-[22px] font-semibold tracking-[-.03em]">Pick a plan</h2>
        <div
          role="radiogroup"
          aria-labelledby="plans-title"
          tabindex="-1"
          class="grid grid-cols-1 gap-3 md:grid-cols-3"
          onkeydown={(e) => radioKeydown(e, PLAN_IDS, plan, pickPlan)}
        >
          {#each PLAN_IDS as p, i (p)}
            {@const on = plan === p}
            {@const t = PLANS[p]}
            <button
              type="button"
              role="radio"
              aria-checked={on}
              tabindex={on || (plan === null && i === 0) ? 0 : -1}
              class={cn(card(on), "gap-4 p-[22px]")}
              onclick={() => pickPlan(p)}
            >
              <span class="flex w-full items-center justify-between">
                <span class="text-base font-semibold tracking-[-.015em]">{t.name}</span><span class={dot(on)}></span>
              </span>
              <span class="flex items-baseline gap-1.5">
                <span class="text-[34px] leading-none font-semibold tracking-[-.04em]">{t.price}</span>
                <span class="text-[13px] text-muted-foreground">{t.period}</span>
              </span>
              <span class="flex flex-col gap-[9px] text-[13.5px] leading-[1.45] text-foreground/80">
                {#each t.perks as k (k)}
                  <span class="flex gap-[9px]"><Check class="mt-[3px] size-3.5 shrink-0 text-foreground" />{k}</span>
                {/each}
              </span>
            </button>
          {/each}
        </div>
        <ul class="flex flex-wrap gap-x-7 gap-y-2 text-[13px] leading-[1.45] text-muted-foreground">
          {#each ["Always labeled “Sponsored”", "Never pushed up in search results", "“Official” needs a short written logo license"] as k (k)}
            <li class="flex gap-[9px]"><Check class="mt-0.5 size-3.5 shrink-0 text-foreground" />{k}</li>
          {/each}
        </ul>
      </section>
    {/if}

    <!-- Form + how it works -->
    <div class="grid grid-cols-1 border-t border-border lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
      <div class="border-b border-border px-4 py-10 sm:px-8 lg:border-r lg:border-b-0">
        {#if sent}
          <BrandRequestReceived request={sent} onreset={reset} />
        {:else}
          {#key formKey}
            <BrandForm {mode} {plan} onplan={pickPlan} onsent={(r) => (sent = r)} />
          {/key}
        {/if}
      </div>

      <aside class="flex flex-col gap-7 px-4 py-10 sm:px-8">
        <div class="flex flex-col gap-3.5">
          <h2 class="text-[15px] font-semibold">{copy.stepsTitle}</h2>
          <ol class="flex flex-col gap-3.5">
            {#each copy.steps as [t, d], i (t)}
              {@const done = sent !== null && i === 0}
              <li class="grid grid-cols-[28px_minmax(0,1fr)] gap-3">
                <span
                  class={cn(
                    "grid size-[26px] place-items-center rounded-full border font-mono text-[11.5px]",
                    done ? "border-foreground bg-foreground text-background" : "border-input bg-card text-foreground",
                  )}
                >
                  {#if done}<Check class="size-3.5" aria-label="Done" />{:else}{i + 1}{/if}
                </span>
                <div class="flex flex-col gap-[3px] pt-[3px]">
                  <span class="text-sm font-medium">{t}</span>
                  <span class="text-[13px] leading-normal text-pretty text-muted-foreground">{d}</span>
                </div>
              </li>
            {/each}
          </ol>
        </div>
        <div class="flex flex-col gap-3 rounded-xl bg-muted px-[18px] py-4">
          <span class="font-mono text-[11px] tracking-[.08em] text-foreground">GOOD TO KNOW</span>
          <p class="text-[13.5px] leading-[1.55] text-pretty text-foreground/80">
            <span class="font-medium text-foreground">Removal is free and permanent.</span> Once hidden, the logo leaves the
            library and the picker on {siteConfig.name}, and stays out unless you ask us to bring it back.
          </p>
          <p class="text-[13.5px] leading-[1.55] text-pretty text-foreground/80">
            <span class="font-medium text-foreground">Designs already shared</span> will show a blank sticker where your logo
            was.
          </p>
          <p class="text-[13.5px] leading-[1.55] text-pretty text-foreground/80">
            <span class="font-medium text-foreground">Sponsored placements</span> are always labeled, and never hide or push
            down anyone else’s logo.
          </p>
        </div>
      </aside>
    </div>

    <!-- Trademark notice -->
    <section class="grid grid-cols-1 gap-3 border-t border-border bg-muted px-4 py-7 sm:grid-cols-[160px_minmax(0,1fr)] sm:gap-6 sm:px-8">
      <h2 class="pt-0.5 font-mono text-[11px] font-normal tracking-[.08em] text-foreground">TRADEMARK NOTICE</h2>
      <p class="max-w-[720px] text-[13.5px] leading-[1.6] text-pretty text-muted-foreground">
        All logos are trademarks of their owners. Stickerz isn’t affiliated with, endorsed by or sponsored by any of
        them unless a placement says “Sponsored”. We don’t sell stickers or merchandise with these logos. Designs are made
        and printed by people for their own use.
      </p>
    </section>
  </main>
  <SiteFooter />
</SiteFrame>
