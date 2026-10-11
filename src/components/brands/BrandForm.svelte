<script lang="ts">
  /**
   * The For Brands request form (left column). Validates with the same zod schema as
   * POST /api/brand-requests: errors appear after the first submit attempt and then update live.
   */
  import { Button } from "@/components/ui/button";
  import { Input } from "@/components/ui/input";
  import { Textarea } from "@/components/ui/textarea";
  import { Checkbox } from "@/components/ui/checkbox";
  import { cn } from "@/utils/cn";
  import {
    brandRequestSchema,
    fieldErrors,
    MODES,
    needsLogos,
    PLAN_IDS,
    PLANS,
    type BrandMode,
    type PlanId,
    type SentRequest,
  } from "$lib/brands";
  import { artFor, LOGO_BY_KEY, LOGOS, type StickerLogo } from "$lib/stickers/logos";
  import { radioKeydown } from "./radio";
  import X from "@lucide/svelte/icons/x";
  import LoaderCircle from "@lucide/svelte/icons/loader-circle";

  let {
    mode,
    plan,
    onplan,
    onsent,
  }: {
    mode: BrandMode;
    plan: PlanId | null;
    onplan: (p: PlanId | null) => void;
    onsent: (r: SentRequest) => void;
  } = $props();

  let company = $state("");
  let name = $state("");
  let email = $state("");
  let chosen = $state<string[]>([]);
  let details = $state("");
  let authorized = $state(false);
  let tried = $state(false);
  let sending = $state(false);
  let serverErrors = $state<Record<string, string>>({});

  const copy = $derived(MODES[mode]);
  const wantsLogos = $derived(needsLogos(mode));
  const payload = $derived({
    mode,
    company,
    name,
    email,
    logos: wantsLogos ? chosen : [],
    plan: mode === "feature" ? plan : null,
    details: details || null,
    authorized,
  });
  const result = $derived(brandRequestSchema.safeParse(payload));
  const errors = $derived<Record<string, string>>({
    ...serverErrors,
    ...(tried && !result.success ? fieldErrors(result.error) : {}),
  });

  // ---- logo picker -------------------------------------------------------------------------
  let query = $state("");
  let active = $state(0);
  let pickerOpen = $state(false);
  let queryEl = $state<HTMLInputElement | null>(null);
  const suggestions = $derived.by(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [] as StickerLogo[];
    const out: StickerLogo[] = [];
    for (const l of LOGOS) {
      if (out.length === 5) break;
      if (!chosen.includes(l.key) && l.title.toLowerCase().includes(q)) out.push(l);
    }
    return out;
  });
  const showSuggestions = $derived(pickerOpen && suggestions.length > 0);

  function addLogo(l: StickerLogo) {
    chosen = [...chosen, l.key];
    query = "";
    active = 0;
    queryEl?.focus();
  }
  function removeLogo(key: string) {
    chosen = chosen.filter((k) => k !== key);
    queryEl?.focus();
  }
  function onQueryKey(e: KeyboardEvent) {
    if (e.key === "ArrowDown" && suggestions.length) {
      e.preventDefault();
      pickerOpen = true;
      active = (active + 1) % suggestions.length;
    } else if (e.key === "ArrowUp" && suggestions.length) {
      e.preventDefault();
      active = (active - 1 + suggestions.length) % suggestions.length;
    } else if (e.key === "Enter") {
      e.preventDefault(); // never submit the form from the picker
      if (showSuggestions) addLogo(suggestions[Math.min(active, suggestions.length - 1)]);
    } else if (e.key === "Escape") {
      pickerOpen = false;
    } else if (e.key === "Backspace" && !query && chosen.length) {
      chosen = chosen.slice(0, -1);
    }
  }

  // ---- plan chips ("Not sure yet" = null) ----------------------------------------------------
  const planChoices: (PlanId | null)[] = [...PLAN_IDS, null];

  // ---- submit --------------------------------------------------------------------------------
  async function submit(e: SubmitEvent) {
    e.preventDefault();
    tried = true;
    serverErrors = {};
    if (!result.success || sending) return;
    sending = true;
    try {
      const res = await fetch("/api/brand-requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (res.status === 201 && typeof body.id === "string") {
        const d = result.data;
        onsent({ id: body.id, mode: d.mode, company: d.company, email: d.email, logos: d.logos, plan: d.plan });
      } else if (body.errors) {
        serverErrors = body.errors;
      } else {
        serverErrors = { form: body.error ?? "Something went wrong. Please try again." };
      }
    } catch {
      serverErrors = { form: "Couldn’t reach the server. Check your connection and try again." };
    } finally {
      sending = false;
    }
  }

  const submitLabel = $derived(
    sending ? "Sending…" : mode === "feature" && plan ? `Request ${PLANS[plan].name}` : copy.submit,
  );
  const field = "h-[42px] rounded-[10px] bg-card px-3 text-sm dark:bg-card";
  const label = "text-[13px] font-medium";
  const err = "text-[12.5px] text-destructive";
</script>

{#snippet logoArt(l: StickerLogo, size: string)}
  <img src={artFor(l, "icon", "light")} alt="" class={cn(size, "object-contain dark:hidden")} />
  <img src={artFor(l, "icon", "dark")} alt="" class={cn(size, "hidden object-contain dark:block")} />
{/snippet}

<form class="flex flex-col gap-[18px]" novalidate onsubmit={submit}>
  <h2 class="text-[22px] font-semibold tracking-[-.03em]">{copy.form}</h2>

  <div class="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
    <div class="flex flex-col gap-1.5">
      <label for="br-company" class={label}>Company</label>
      <Input
        id="br-company"
        bind:value={company}
        placeholder="Acme Inc."
        autocomplete="organization"
        maxlength={120}
        class={field}
        aria-invalid={errors.company ? true : undefined}
        aria-describedby={errors.company ? "br-company-err" : undefined}
      />
      {#if errors.company}<span id="br-company-err" class={err}>{errors.company}</span>{/if}
    </div>
    <div class="flex flex-col gap-1.5">
      <label for="br-name" class={label}>Your name</label>
      <Input
        id="br-name"
        bind:value={name}
        placeholder="Alex Rivera"
        autocomplete="name"
        maxlength={120}
        class={field}
        aria-invalid={errors.name ? true : undefined}
        aria-describedby={errors.name ? "br-name-err" : undefined}
      />
      {#if errors.name}<span id="br-name-err" class={err}>{errors.name}</span>{/if}
    </div>
  </div>

  <div class="flex flex-col gap-1.5">
    <label for="br-email" class={label}>Work email</label>
    <Input
      id="br-email"
      type="email"
      bind:value={email}
      placeholder="alex@acme.com"
      autocomplete="email"
      maxlength={200}
      class={field}
      aria-invalid={errors.email ? true : undefined}
      aria-describedby={errors.email ? "br-email-err" : undefined}
    />
    {#if errors.email}
      <span id="br-email-err" class={err}>{errors.email}</span>
    {:else if wantsLogos}
      <span class="text-[12.5px] text-muted-foreground">We’ll reply to this address.</span>
    {/if}
  </div>

  {#if wantsLogos}
    <div class="relative flex flex-col gap-1.5">
      <label for="br-logos" class={label}>Which logos?</label>
      <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
      <div
        class={cn(
          "flex min-h-[42px] cursor-text flex-wrap items-center gap-1.5 rounded-[10px] border border-input bg-card px-2 py-[7px] transition-[box-shadow]",
          "focus-within:border-foreground focus-within:ring-[3px] focus-within:ring-ring/40",
          errors.logos && "border-destructive ring-[3px] ring-destructive/15",
        )}
        onclick={() => queryEl?.focus()}
      >
        {#each chosen as key (key)}
          {@const l = LOGO_BY_KEY.get(key)}
          {#if l}
            <button
              type="button"
              class="flex h-[26px] items-center gap-1.5 rounded-md border border-border bg-muted pr-[7px] pl-[5px] text-[12.5px] hover:border-foreground/30"
              aria-label={`Remove ${l.title}`}
              onclick={(e) => {
                e.stopPropagation();
                removeLogo(key);
              }}
            >
              {@render logoArt(l, "size-3.5")}{l.title}<X class="size-3 text-muted-foreground" />
            </button>
          {/if}
        {/each}
        <input
          id="br-logos"
          bind:this={queryEl}
          bind:value={query}
          oninput={() => {
            pickerOpen = true;
            active = 0;
          }}
          onfocus={() => (pickerOpen = true)}
          onblur={() => setTimeout(() => (pickerOpen = false), 120)}
          onkeydown={onQueryKey}
          placeholder={chosen.length ? "Add another" : "Search, like Vercel"}
          autocomplete="off"
          role="combobox"
          aria-expanded={showSuggestions}
          aria-controls="br-logo-list"
          aria-autocomplete="list"
          aria-activedescendant={showSuggestions ? `br-logo-opt-${active}` : undefined}
          aria-invalid={errors.logos ? true : undefined}
          aria-describedby={errors.logos ? "br-logos-err" : undefined}
          class="h-[26px] min-w-[120px] flex-1 border-0 bg-transparent px-1 text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
      </div>
      {#if showSuggestions}
        <ul
          id="br-logo-list"
          role="listbox"
          aria-label="Matching logos"
          class="absolute inset-x-0 top-full z-10 mt-1 flex flex-col rounded-[10px] border border-border bg-popover p-1 text-popover-foreground shadow-lg"
        >
          {#each suggestions as l, i (l.key)}
            <li
              id={`br-logo-opt-${i}`}
              role="option"
              aria-selected={i === active}
              class={cn(
                "flex h-[34px] cursor-pointer items-center gap-2.5 rounded-[7px] px-2.5 text-[13.5px]",
                i === active && "bg-muted",
              )}
              onmousedown={(e) => {
                e.preventDefault(); // keep focus in the input
                addLogo(l);
              }}
              onmouseenter={() => (active = i)}
            >
              {@render logoArt(l, "size-4")}{l.title}
            </li>
          {/each}
        </ul>
      {/if}
      {#if errors.logos}<span id="br-logos-err" class={err}>{errors.logos}</span>{/if}
    </div>
  {/if}

  {#if mode === "feature"}
    <div class="flex flex-col gap-2">
      <span id="br-plan-label" class={label}>Plan</span>
      <div
        role="radiogroup"
        aria-labelledby="br-plan-label"
        tabindex="-1"
        class="flex flex-wrap gap-1.5"
        onkeydown={(e) => radioKeydown(e, planChoices, plan, onplan)}
      >
        {#each planChoices as p (p ?? "none")}
          {@const on = plan === p}
          <button
            type="button"
            role="radio"
            aria-checked={on}
            tabindex={on ? 0 : -1}
            onclick={() => onplan(p)}
            class={cn(
              "flex h-8 items-center rounded-full border px-3 text-[13px] font-medium transition-colors",
              on ? "border-foreground bg-foreground text-background" : "border-input bg-card text-foreground/80 hover:bg-muted",
            )}
          >
            {p ? PLANS[p].name : "Not sure yet"}
          </button>
        {/each}
      </div>
    </div>
  {/if}

  <div class="flex flex-col gap-1.5">
    <label for="br-details" class={label}>{copy.details}<span class="font-normal text-muted-foreground"> · optional</span></label>
    <Textarea
      id="br-details"
      bind:value={details}
      placeholder={copy.placeholder}
      rows={4}
      maxlength={2000}
      class="min-h-[104px] resize-y rounded-[10px] bg-card px-3 py-2.5 text-sm leading-normal md:text-sm dark:bg-card"
      aria-invalid={errors.details ? true : undefined}
    />
    {#if errors.details}<span class={err}>{errors.details}</span>{/if}
  </div>

  {#if wantsLogos}
    <div class="flex flex-col gap-1.5">
      <div class="flex items-start gap-2.5">
        <Checkbox
          id="br-auth"
          bind:checked={authorized}
          class="mt-[3px] size-[18px] rounded-[5px]"
          aria-invalid={errors.authorized ? true : undefined}
        />
        <label for="br-auth" class="cursor-pointer text-[13.5px] leading-normal text-foreground/80 select-none">
          I’m allowed to make this request for the brand.
        </label>
      </div>
      {#if errors.authorized}<span class={err}>{errors.authorized}</span>{/if}
    </div>
  {/if}

  {#if errors.form}<p class={err} role="alert">{errors.form}</p>{/if}

  <div class="flex flex-wrap items-center gap-3.5 pt-1">
    <Button type="submit" disabled={sending} class="h-11 shrink-0 rounded-[10px] px-[18px] text-[14.5px]">
      {#if sending}<LoaderCircle class="size-4 animate-spin" />{/if}{submitLabel}
    </Button>
    <span class="text-[12.5px] text-muted-foreground">{copy.note}</span>
  </div>
</form>
