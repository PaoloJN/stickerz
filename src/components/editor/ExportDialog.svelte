<script lang="ts">
  import { getContext, onDestroy, untrack } from "svelte";
  import { toast } from "svelte-sonner";
  import type { EditorState } from "$lib/stickers/editor.svelte";
  import { getDevice, itemNoun } from "$lib/stickers/devices";
  import { buildSvg, exportStack, serialize, type Background, type ExportFormat } from "$lib/stickers/export";
  import * as Dialog from "@/components/ui/dialog";
  import { Button } from "@/components/ui/button";
  import { Switch } from "@/components/ui/switch";
  import * as ToggleGroup from "@/components/ui/toggle-group";
  import Mark from "@/components/logos/stickerz.svelte";
  import Download from "@lucide/svelte/icons/download";
  import Share from "@lucide/svelte/icons/share";
  import LinkIcon from "@lucide/svelte/icons/link";
  import ArrowUpRight from "@lucide/svelte/icons/arrow-up-right";
  import X from "@lucide/svelte/icons/x";
  import { canvasSvg } from "./actions";
  import { siteConfig } from "@/config/site";
  import { stickerArt } from "$lib/stickers/custom.svelte";
  import { stickerGeometry } from "$lib/stickers/geometry";
  import { save } from "$lib/stickers/export";
  import { bundle, buildKit, planKit, previewSheet, type KitOptions } from "$lib/stickers/print/compose";
  import { defaultPaper, METHODS, PAPERS, type Method, type PaperId } from "$lib/stickers/print/plan";
  import { saveStack } from "./save.svelte";
  import { getDemo } from "./demo";

  const editor = getContext<EditorState>("editor");
  // the home demo can't save, so it only exports: no Share tab
  const demo = !!getDemo();
  const device = $derived(getDevice(editor.layout.laptop.model));
  const noun = $derived(itemNoun(editor.layout.laptop.model));
  const count = $derived(editor.layout.stickers.length);

  type Format = ExportFormat | "print";
  // the two exports people use: a print kit to put it on the laptop, an image to post it
  let format = $state<Format>("print");
  // print kit
  let paper = $state<PaperId>(defaultPaper(typeof navigator === "undefined" ? undefined : navigator.language));
  let method = $state<Method>("scissors");
  let kitSheets = $state(true);
  let kitStencil = $state(true);
  let kitMap = $state(true);
  let perSticker = $state(false);
  let plan = $state<{ sheets: number; stencil: number; map: number; tooBig: string[] } | null>(null);
  const machine = $derived(method === "cricut" || method === "silhouette");
  const zipped = $derived(machine || (method === "shop" && perSticker));
  /** the design's stickers, as the print kit needs them: centre, tilt, size, name */
  function kitOptions(): KitOptions {
    const stickers = editor.layout.stickers.map((s) => {
      const art = stickerArt(s);
      const g = stickerGeometry(s, (art.href && editor.aspects[art.href]) || 1);
      return { id: s.id, title: art.title, x: s.x, y: s.y, rot: s.rot, w: g.w, h: g.h };
    });
    return { paper, method, sheets: kitSheets, stencil: kitStencil, map: kitMap, perSticker: method === "shop" && perSticker, name: name.trim() || "my-design", device, stickers };
  }
  let background = $state<Background>("lid");
  let res = $state<1 | 2 | 4>(2);
  let name = $state("my-design");
  let copied = $state(false);
  let busy = $state(false);

  const tab = $derived(editor.exportDialog ?? "download");
  const share = $derived(tab === "share");
  const ext = $derived(format === "print" ? (zipped ? ".zip" : ".pdf") : `.${format}`);
  /** PNG pixels per mm at 1× */
  const PNG_PPM = 4;
  const dims = $derived(
    !share && format === "print"
      ? PAPERS[paper].label
      : !share && format === "png" ? `${Math.round(device.w * PNG_PPM * res)} × ${Math.round(device.h * PNG_PPM * res)} px` : `${Math.round(device.w)} × ${Math.round(device.h)} mm · true scale`,
  );
  type Vis = "private" | "unlisted" | "public";
  let vis = $state<Vis>("unlisted");
  let visBusy = $state(false);
  let readyFor: string | null = null;
  const url = $derived(editor.savedId ? location.origin + "/designs/" + editor.savedId : "");

  async function setVis(v: Vis) {
    if (!editor.savedId) return;
    visBusy = true;
    try {
      const r = await fetch(`/api/stacks/${editor.savedId}/visibility`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ visibility: v }) });
      if (!r.ok) throw new Error();
      vis = v;
    } catch {
      toast.error("Couldn't change visibility");
    } finally {
      visBusy = false;
    }
  }
  /** Existing stack: only READ its visibility. New stack: save, then set unlisted so the link works. */
  async function shareReady() {
    if (!editor.savedId) {
      await saveStack(editor);
      const id = editor.savedId;
      if (!id) return;
      readyFor = id;
      await setVis("unlisted");
      return;
    }
    const id = editor.savedId;
    if (readyFor === id) return;
    readyFor = id;
    try {
      const r = await fetch(`/editor/saved/${id}`);
      if (!r.ok) throw new Error();
      const v = (await r.json()).visibility;
      if (v === "private" || v === "unlisted" || v === "public") vis = v;
    } catch {
      readyFor = null;
    }
  }
  // Optional display name. undefined = not fetched yet; null = owner has no name (prompt).
  let ownerName = $state<string | null | undefined>(undefined);
  let nameDraft = $state("");
  let nameBusy = $state(false);
  let nameSkipped = $state(false);
  async function loadOwnerName() {
    if (ownerName !== undefined) return;
    try {
      const r = await fetch("/api/owner");
      if (r.ok) ownerName = (await r.json()).displayName ?? null;
    } catch {
      // optional: leave unset, no prompt
    }
  }
  async function saveOwnerName() {
    const displayName = nameDraft.trim();
    if (!displayName) return;
    nameBusy = true;
    try {
      const r = await fetch("/api/owner", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ displayName }) });
      if (!r.ok) throw new Error();
      ownerName = (await r.json()).displayName ?? null;
    } catch {
      toast.error("Couldn't save your name");
    } finally {
      nameBusy = false;
    }
  }
  $effect(() => {
    if (editor.exportDialog === "share")
      untrack(() => {
        void shareReady();
        void loadOwnerName();
      });
  });
  const showBg = $derived(share ? "lid" : background);

  const FORMATS: [Format, string, string, () => string][] = [
    ["print", "KIT", "Print kit", () => "Sticker sheets to print and cut, plus a stencil and map to put them in place"],
    ["png", "PNG", "Image", () => `A sharp picture of your ${noun} to post anywhere`],
  ];

  // live preview: the same SVG the export uses.
  // An object URL is revoked only once a newer one has replaced it in the <img> (or on unmount);
  // revoking it in the effect cleanup left the <img> pointing at a dead blob: until the next
  // preview resolved (blob: ERR_FILE_NOT_FOUND when switching formats).
  let preview = $state<string | null>(null);
  function showPreview(next: string | null) {
    const prev = preview;
    preview = next;
    if (prev && prev !== next) setTimeout(() => URL.revokeObjectURL(prev), 0);
  }
  onDestroy(() => {
    if (preview) URL.revokeObjectURL(preview);
  });
  $effect(() => {
    if (!editor.exportDialog) return;
    const svgEl = canvasSvg();
    if (!svgEl) return;
    let live = true;
    if (!share && format === "print") {
      // the first sticker sheet, and a count of every page the kit will have
      void [paper, method, kitSheets, kitStencil, kitMap, editor.layout];
      const o = untrack(kitOptions);
      planKit(svgEl, o).then((p) => live && (plan = p));
      previewSheet(svgEl, o).then((svg) => {
        if (!live) return;
        showPreview(svg ? URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" })) : null);
      });
      return () => {
        live = false;
      };
    }
    const opts = { lid: { w: device.w, h: device.h }, background: showBg, cutLines: false };
    void editor.layout;
    buildSvg(svgEl, opts).then((svg) => {
      if (!live) return;
      showPreview(URL.createObjectURL(new Blob([serialize(svg)], { type: "image/svg+xml" })));
    });
    return () => {
      live = false;
    };
  });

  function close() {
    editor.exportDialog = null;
    copied = false;
  }
  async function download() {
    const svgEl = canvasSvg();
    if (!svgEl) return;
    busy = true;
    if (format === "print") {
      try {
        const kit = await buildKit(svgEl, kitOptions());
        if (!kit.files.length) throw new Error("nothing to export");
        const file = await bundle(kit.files, name.trim() || "my-design");
        save(file.blob, file.name);
        toast.success(`Downloaded ${file.name}`);
        if (kit.tooBig.length) toast.warning(`Too big for the paper, left off the sheets: ${kit.tooBig.join(", ")}`);
        close();
      } catch (e) {
        console.error(e);
        toast.error("Export failed");
      } finally {
        busy = false;
      }
      return;
    }
    const filename = (name.trim() || "my-design") + ext;
    try {
      await exportStack(svgEl, {
        format: format as ExportFormat,
        filename,
        lid: { w: device.w, h: device.h },
        background,
        cutLines: false,
        pxPerMm: PNG_PPM * res,
      });
      toast.success(`Downloaded ${filename}`);
      close();
    } catch (e) {
      console.error(e);
      toast.error("Export failed");
    } finally {
      busy = false;
    }
  }
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      copied = true;
    } catch {
      toast.error("Couldn't copy the link");
    }
  }
  const text = "My dev stack, as laptop stickers";
  const SOCIALS = $derived([
    ["Post to X", `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`],
    ["LinkedIn", `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`],
    ["Bluesky", `https://bsky.app/intent/compose?text=${encodeURIComponent(`${text} ${url}`)}`],
  ]);

  const label = "text-xs font-medium text-neutral-500 dark:text-neutral-400";
  const seg = "h-7.5 text-[12.5px]";
</script>

<Dialog.Root open={!!editor.exportDialog} onOpenChange={(o) => !o && close()}>
  <Dialog.Content
    showCloseButton={false}
    class="grid h-[min(600px,calc(100%-48px))] w-[min(880px,calc(100%-48px))] max-w-none! grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-2xl p-0 text-[13px] sm:max-w-none"
  >
    <div class="flex items-center gap-3 border-b border-neutral-200 py-4 pr-4 pl-5 dark:border-neutral-800">
      <div class="flex min-w-0 flex-1 flex-col gap-0.5">
        <Dialog.Title class="text-base font-semibold tracking-tight">{share ? "Share your design" : "Export your design"}</Dialog.Title>
        <Dialog.Description class="truncate text-xs text-neutral-500">{editor.layout.name ?? "My design"} · {count} {count === 1 ? "sticker" : "stickers"} · {device.name}</Dialog.Description>
      </div>
{#if !demo}
            <ToggleGroup.Root type="single" class="rounded-[10px] p-[3px]" value={tab} onValueChange={(v) => v && ((editor.exportDialog = v as "download" | "share"), (copied = false))} aria-label="Export or share">
        <ToggleGroup.Item value="download" class="h-7.5 px-3 text-[12.5px]"><Download class="size-3.5" />Download</ToggleGroup.Item>
        <ToggleGroup.Item value="share" class="h-7.5 px-3 text-[12.5px]"><Share class="size-3.5" />Share</ToggleGroup.Item>
      </ToggleGroup.Root>
      {/if}
      <div class="h-5 w-px bg-neutral-200 dark:bg-neutral-800"></div>
      <Button variant="ghost" size="icon" class="size-8 text-neutral-500" title="Close · Esc" aria-label="Close" onclick={close}><X class="size-3.5" /></Button>
    </div>

    <div class="grid min-h-0 grid-cols-[minmax(0,1.15fr)_minmax(300px,1fr)]">
      <div class="flex min-h-0 min-w-0 flex-col gap-2 px-5 py-4">
        <div class="flex h-4.5 items-center justify-between">
          <span class={label}>{share ? "Link preview" : "Preview"}</span>
          <span class="rounded-md border border-neutral-200 bg-neutral-50 px-1.5 py-px font-mono text-[11px] text-neutral-500 dark:border-neutral-800 dark:bg-neutral-950">{dims}</span>
        </div>
        <div class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
          <div class="ss-stage flex min-h-0 flex-1 items-center justify-center p-6" class:ss-checker={showBg === "none"}>
            {#if preview}
              <img src={preview} alt="Preview of the export" class="max-h-full max-w-full object-contain {showBg === 'lid' ? 'drop-shadow-xl' : ''}" />
            {/if}
          </div>
          {#if share}
            <div class="flex items-center gap-2.5 border-t border-neutral-200 bg-white px-3.5 py-2.75 dark:border-neutral-800 dark:bg-neutral-900">
              <Mark size={18} />
              <div class="flex min-w-0 flex-1 flex-col">
                <span class="truncate font-medium">{editor.layout.name ?? "My design"}</span>
                <span class="text-[11.5px] text-neutral-500">{count} {count === 1 ? "sticker" : "stickers"} · {device.name} · {siteConfig.url.replace(/^https?:\/\//, "")}</span>
              </div>
            </div>
          {/if}
        </div>
      </div>

      <div class="min-h-0 min-w-0 overflow-y-auto border-l border-neutral-200 px-5 py-4 dark:border-neutral-800">
        {#if !share}
          <div class="flex flex-col gap-3.5">
            <div class="flex flex-col gap-2" role="radiogroup" aria-label="Format">
              <span class={label}>Format</span>
              {#each FORMATS as [id, badge, title, desc] (id)}
                <button
                  type="button"
                  role="radio"
                  aria-checked={format === id}
                  class="group flex cursor-pointer items-center gap-3 rounded-[10px] border border-neutral-200 bg-neutral-50 py-1.75 pr-3 pl-1.75 text-left transition-colors aria-checked:border-neutral-900 aria-checked:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-950/50 dark:aria-checked:border-neutral-300 dark:aria-checked:bg-neutral-800/60"
                  onclick={() => (format = id)}
                >
                  <span
                    class="grid size-8.5 flex-none place-items-center rounded-md border border-neutral-200 bg-white font-mono text-[10.5px] font-semibold tracking-wide text-neutral-500 group-aria-checked:border-neutral-900 group-aria-checked:bg-neutral-900 group-aria-checked:text-white dark:border-neutral-800 dark:bg-neutral-950 dark:group-aria-checked:border-neutral-100 dark:group-aria-checked:bg-neutral-100 dark:group-aria-checked:text-neutral-950"
                    >{badge}</span
                  >
                  <span class="flex min-w-0 flex-1 flex-col gap-px">
                    <span class="font-medium">{title}</span>
                    <span class="text-[11.5px] leading-snug text-neutral-500">{desc()}</span>
                  </span>
                  <span class="grid size-4 flex-none place-items-center rounded-full border-[1.5px] border-neutral-300 group-aria-checked:border-neutral-900 dark:border-neutral-600 dark:group-aria-checked:border-neutral-100">
                    <span class="size-1.75 rounded-full group-aria-checked:bg-neutral-900 dark:group-aria-checked:bg-neutral-100"></span>
                  </span>
                </button>
              {/each}
            </div>

            {#if format === "print"}
              <div class="flex flex-col gap-2">
                <span class={label}>Paper</span>
                <ToggleGroup.Root type="single" class="grid grid-cols-2 rounded-[9px]" value={paper} onValueChange={(v) => v && (paper = v as PaperId)} aria-label="Paper">
                  <ToggleGroup.Item value="letter" class={seg}>Letter</ToggleGroup.Item>
                  <ToggleGroup.Item value="a4" class={seg}>A4</ToggleGroup.Item>
                </ToggleGroup.Root>
              </div>
              <div class="flex flex-col gap-1.5" role="radiogroup" aria-label="How you'll cut them">
                <span class={label}>How you'll cut them</span>
                {#each Object.entries(METHODS) as [id, m] (id)}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={method === id}
                    class="flex cursor-pointer flex-col gap-px rounded-[9px] border border-neutral-200 px-2.75 py-1.75 text-left aria-checked:border-neutral-900 aria-checked:bg-neutral-100 dark:border-neutral-800 dark:aria-checked:border-neutral-300 dark:aria-checked:bg-neutral-800/60"
                    onclick={() => (method = id as Method)}
                  >
                    <span class="text-[12.5px] font-medium">{m.label}</span>
                    <span class="text-[11.5px] leading-snug text-neutral-500">{m.hint}</span>
                  </button>
                {/each}
              </div>
              <div class="flex flex-col gap-2">
                <span class={label}>Include</span>
                {#each [["Sticker sheets", "Every sticker at true size, numbered", () => kitSheets, (v: boolean) => (kitSheets = v)], ["Placement stencil", "Full size: cut out the windows, line up the logo, stick", () => kitStencil, (v: boolean) => (kitStencil = v)], ["Placement map", "One page: where each sticker goes, in mm", () => kitMap, (v: boolean) => (kitMap = v)]] as const as [t, d, get, set] (t)}
                  <label class="flex cursor-pointer items-center justify-between gap-3">
                    <span class="flex flex-col gap-0.5"><span class="text-[12.5px]">{t}</span><span class="text-[11.5px] text-neutral-500">{d}</span></span>
                    <Switch checked={get()} onCheckedChange={set} aria-label={t} />
                  </label>
                {/each}
                {#if method === "shop"}
                  <label class="flex cursor-pointer items-center justify-between gap-3">
                    <span class="flex flex-col gap-0.5"><span class="text-[12.5px]">One file per sticker</span><span class="text-[11.5px] text-neutral-500">For shops that order each design separately</span></span>
                    <Switch bind:checked={perSticker} aria-label="One file per sticker" />
                  </label>
                {/if}
              </div>
              {#if plan}
                <span class="text-[11.5px] leading-snug text-neutral-500">
                  {[plan.sheets && `${plan.sheets} sticker ${plan.sheets === 1 ? "sheet" : "sheets"}${machine ? " (PNG + SVG cut file each)" : ""}`, plan.stencil && `${plan.stencil} stencil ${plan.stencil === 1 ? "page" : "pages"}`, plan.map && `${plan.map} map ${plan.map === 1 ? "page" : "pages"}`].filter(Boolean).join(" · ") || "Pick something to include"}
                </span>
                {#if plan.tooBig.length}
                  <span class="text-[11.5px] leading-snug text-amber-600 dark:text-amber-400">Too big for {PAPERS[paper].label}: {plan.tooBig.join(", ")}. Make them smaller, or they'll be left off.</span>
                {/if}
              {/if}
              <a href="/docs/print" target="_blank" class="-mt-1 text-[11.5px] text-neutral-500 underline-offset-2 hover:text-neutral-900 hover:underline dark:hover:text-white">How to print, cut and place them →</a>
            {:else}
            <div class="flex flex-col gap-2">
              <span class={label}>Background</span>
              <ToggleGroup.Root type="single" class="grid grid-cols-2 rounded-[9px]" value={background} onValueChange={(v) => v && (background = v as Background)} aria-label="Background">
                <ToggleGroup.Item value="lid" class={seg} title="Include the {noun}">With {noun}</ToggleGroup.Item>
                <ToggleGroup.Item value="none" class={seg} title="Stickers only">Stickers only</ToggleGroup.Item>
              </ToggleGroup.Root>
            </div>
            {/if}

            {#if format === "png"}
              <div class="flex flex-col gap-2">
                <div class="flex items-center justify-between"><span class={label}>Resolution</span><span class="text-[11.5px] text-neutral-500">{Math.round(device.w * PNG_PPM * res)} px wide</span></div>
                <ToggleGroup.Root type="single" class="grid grid-cols-3 rounded-[9px]" value={String(res)} onValueChange={(v) => v && (res = Number(v) as 1 | 2 | 4)} aria-label="Resolution">
                  {#each [1, 2, 4] as r (r)}<ToggleGroup.Item value={String(r)} class={seg} title="{r}x resolution">{r}×</ToggleGroup.Item>{/each}
                </ToggleGroup.Root>
              </div>
            {/if}

            <div class="flex flex-col gap-2">
              <span class={label}>File name</span>
              <div class="flex h-9 items-center overflow-hidden rounded-[9px] border border-neutral-200 bg-white focus-within:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-950 dark:focus-within:border-neutral-600">
                <input bind:value={name} spellcheck="false" aria-label="File name" class="h-full min-w-0 flex-1 bg-transparent px-2.75 outline-none" />
                <span class="grid h-full place-items-center border-l border-neutral-200 px-2.75 font-mono text-xs text-neutral-500 dark:border-neutral-800">{ext}</span>
              </div>
            </div>
          </div>
        {:else}
          <div class="flex flex-col gap-3.5">
            <div class="flex flex-col gap-2">
              <span class={label}>Link</span>
              {#if !editor.savedId}
                <div class="flex flex-col items-start gap-2 rounded-[9px] border border-dashed border-neutral-300 p-3 dark:border-neutral-700">
                  <span class="text-[12.5px] text-neutral-500">Save this design to get a shareable link</span>
                  <Button size="sm" class="h-7.5 px-3 text-[12.5px] dark:bg-neutral-100 dark:text-neutral-950 dark:hover:bg-white" disabled={editor.saving} onclick={shareReady}>Save &amp; share</Button>
                </div>
              {:else}
              <div class="flex h-9.5 items-center gap-1.5 rounded-[9px] border border-neutral-200 bg-white pr-1 pl-2.75 dark:border-neutral-800 dark:bg-neutral-950">
                <LinkIcon class="size-3.5 flex-none text-neutral-500" />
                <span class="min-w-0 flex-1 truncate font-mono text-xs">{url.replace(/^https?:\/\//, "")}</span>
                <Button size="sm" class="h-7.5 flex-none px-3 text-[12.5px] {copied ? 'bg-green-600 text-white hover:bg-green-600 dark:bg-green-600 dark:text-white dark:hover:bg-green-600' : 'dark:bg-neutral-100 dark:text-neutral-950 dark:hover:bg-white'}" onclick={copyLink}>
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
              <span class="text-[11.5px] leading-snug text-neutral-500">Anyone with the link can view and remix this design.</span>
              {/if}
            </div>
            {#if ownerName === null && !nameSkipped}
              <form
                class="flex flex-col gap-2"
                onsubmit={(e) => {
                  e.preventDefault();
                  void saveOwnerName();
                }}
              >
                <span class={label}>Share as <span class="font-normal">(optional)</span></span>
                <input bind:value={nameDraft} maxlength={40} spellcheck="false" placeholder="Your name" aria-label="Share as" class="h-9 rounded-[9px] border border-neutral-200 bg-white px-2.75 outline-none focus:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-950 dark:focus:border-neutral-600" />
                <div class="flex items-center gap-2">
                  <Button type="submit" size="sm" class="h-7.5 px-3 text-[12.5px] dark:bg-neutral-100 dark:text-neutral-950 dark:hover:bg-white" disabled={nameBusy || !nameDraft.trim()}>Use this name</Button>
                  <Button type="button" variant="ghost" size="sm" class="h-7.5 px-3 text-[12.5px] text-neutral-500" onclick={() => (nameSkipped = true)}>Skip</Button>
                </div>
                <span class="text-[11.5px] leading-snug text-neutral-500">Shown as the author. Skip to stay anonymous.</span>
              </form>
            {/if}
            {#if editor.savedId}
              <div class="flex flex-col gap-2">
                <span class={label}>Visibility</span>
                <ToggleGroup.Root type="single" class="grid grid-cols-3 rounded-[9px]" value={vis} disabled={visBusy} onValueChange={(v) => v && v !== vis && setVis(v as Vis)} aria-label="Visibility">
                  <ToggleGroup.Item value="private" class={seg} title="Only you">Private</ToggleGroup.Item>
                  <ToggleGroup.Item value="unlisted" class={seg} title="Anyone with the link">Unlisted</ToggleGroup.Item>
                  <ToggleGroup.Item value="public" class={seg} title="Listed in Community">Public</ToggleGroup.Item>
                </ToggleGroup.Root>
              </div>
            {/if}
            {#if editor.savedId}
            <div class="flex flex-col gap-2">
              <span class={label}>Share to</span>
              <div class="grid grid-cols-3 gap-1.5">
                {#each SOCIALS as [what, href] (what)}
                  <a {href} target="_blank" rel="noreferrer noopener" class="flex h-9 items-center justify-center gap-1.5 rounded-[9px] border border-neutral-200 bg-neutral-50 text-[12.5px] text-neutral-700 hover:border-neutral-300 hover:text-neutral-950 dark:border-neutral-800 dark:bg-neutral-950/50 dark:text-neutral-300 dark:hover:border-neutral-700 dark:hover:text-white">
                    {what}<ArrowUpRight class="size-3" />
                  </a>
                {/each}
              </div>
            </div>
            {/if}
          </div>
        {/if}
      </div>
    </div>

    <div class="flex items-center justify-end gap-2 border-t border-neutral-200 bg-neutral-50 py-3.5 pr-4 pl-5 dark:border-neutral-800 dark:bg-neutral-950">
      <span class="min-w-0 flex-1 text-xs text-neutral-500">Esc to close</span>
      {#if !share}
        <Button variant="outline" class="h-9 rounded-[9px] px-4" onclick={close}>Cancel</Button>
        <Button class="h-9 rounded-[9px] px-4.5 dark:bg-neutral-100 dark:text-neutral-950 dark:hover:bg-white" disabled={busy} onclick={download}>
          <Download class="size-3.5" />{busy && format === "print" ? "Building…" : `Download ${format === "print" ? (zipped ? "kit (ZIP)" : "kit (PDF)") : format.toUpperCase()}`}
        </Button>
      {:else}
        <Button class="h-9 rounded-[9px] px-5 dark:bg-neutral-100 dark:text-neutral-950 dark:hover:bg-white" onclick={close}>Done</Button>
      {/if}
    </div>
  </Dialog.Content>
</Dialog.Root>

<style>
  .ss-stage {
    background-color: var(--color-neutral-100);
    background-image: radial-gradient(var(--color-neutral-300) 1px, transparent 1px);
    background-size: 18px 18px;
  }
  :global(.dark) .ss-stage {
    background-color: var(--color-neutral-950);
    background-image: radial-gradient(var(--color-neutral-800) 1px, transparent 1px);
  }
  .ss-stage.ss-checker {
    background: repeating-conic-gradient(var(--color-neutral-200) 0 25%, var(--color-neutral-100) 0 50%) 0 0 / 16px 16px;
  }
  :global(.dark) .ss-stage.ss-checker {
    background: repeating-conic-gradient(#191919 0 25%, #121212 0 50%) 0 0 / 16px 16px;
  }
</style>
