# Stickerz launch posts

Link everywhere: https://stickerz.dev
Repo: https://github.com/PaoloJN/stickerz

## Before posting

- [ ] Repo is public (github.com/PaoloJN/stickerz), README and LICENSE (MIT) render fine
- [ ] `GITHUB_TOKEN` is set in Vercel env, so the star count and issue links work in production
- [ ] 6-10 real designs are on /community (not the mock fallback; check `DATABASE_URL` is set in prod)
- [ ] OG image renders for `/`, `/community` and one `/designs/<id>` in https://cards-dev.twitter.com/validator or https://www.opengraph.xyz/
- [ ] Favicon shows in the browser tab and on a fresh bookmark
- [ ] Open the editor in a private window, make a design, export PNG / SVG / PDF once to be sure all three work
- [ ] Record the screen captures listed under the X thread (do them before you post, not after)
- [ ] Post Show HN on a weekday morning US time, then stay around for the comments

---

## 1. X / Twitter thread

**1/** (under 200 chars, with link)

```
Your stack, on your laptop.

I made Stickerz: lay out your tech stack's logos as die-cut stickers on a true-scale laptop lid, then share it or print it.

https://stickerz.dev
```

Media: screen recording of the editor, 10-15 s: drop 5-6 logos on a MacBook lid, hit S to shuffle once. Or a screenshot of the home hero.

**2/**

```
Pick your laptop and the canvas becomes its surface, in millimeters. A 2-inch sticker is drawn at 2 inches.

So the layout you make is the one you'll actually stick on.
```

Media: screenshot of /editor with a MacBook selected and a sticker selected (the size label, e.g. "50.8 x 50.8 mm", visible).

**3/**

```
Search 665 developer logos, hit Enter, it lands on your lid. Light and dark variants, drag, rotate, layer them like real vinyl.

Stuck? Press S and it shuffles. Lock the ones you like.
```

Media: screen recording of search -> Enter -> drag, then S to shuffle.

**4/**

```
Each sticker can be die-cut, circle or square. The die-cut outline is computed from the logo itself, so it hugs the shape instead of being a box.
```

Media: screenshot or short loop of the "Shapes" demo on the home page ("The small stuff, done right"), toggling Die-cut / Circle / Square.

**5/**

```
Done? Export PNG for a post, SVG for Figma or a Cricut, or a PDF at true size with cut lines for a print shop.

No account. Designs save in your browser.
```

Media: screenshot of the Export dialog, or the /docs/print page with the formats table.

**6/**

```
Hit share and your design gets a link anyone can open. It also shows up on the Community page, where you can remix other people's stacks.
```

Media: screenshot of /community with a few designs, or one /designs/<id> page.

**7/**

```
It's open source (MIT). The logo library started from svgl by @pheralb, go star it too.

Repo: https://github.com/PaoloJN/stickerz

Share your stack, I want to see what's on your laptop.
```

Media: none, or the Community page.

---

## 2. Show HN

**Title** (under 80 chars):

```
Show HN: Stickerz – Lay out your tech stack as die-cut laptop stickers
```

**URL:** https://stickerz.dev

**First comment** (about 220 words):

```
Hi HN, I'm Paolo. Stickerz is a small web tool where you drop the logos of your tech stack onto a true-scale laptop lid as die-cut stickers, then share the design, remix someone else's, or export a print-ready sheet (PNG, SVG, or PDF with cut lines).

I wanted stickers for my own laptop and couldn't tell whether anything would actually fit. So the canvas is the real lid in millimeters, and a 2-inch sticker is drawn at 2 inches.

The die-cut outline is computed from each logo's alpha channel, so the cut line follows the shape of the logo. You can also switch a sticker to a circle or square.

No account. Designs are saved per browser. If you hit share, you get a link and the design shows up on the Community page.

Built with SvelteKit (Svelte 5), Tailwind, Neon Postgres, hosted on Vercel. The logo library started from svgl by pheralb. It's MIT: https://github.com/PaoloJN/stickerz

What's rough: the library is 665 logos and yours might be missing (there's a request button), some logos have odd cut outlines, and I've only tested printing on a few setups. The laptop list is MacBooks for now.

Feedback I'd like: does the print export work on your printer or cutter, which logos have bad outlines, and which laptops or other devices you'd want added.
```

---

## 3. r/SideProject (or r/webdev)

**Title:**

```
I made a tool to lay out my tech stack's logos as stickers on a true-scale laptop lid
```

**Body** (about 160 words):

```
I wanted stickers for my laptop but kept guessing at sizes, so I built Stickerz (https://stickerz.dev).

You pick a MacBook, and the canvas becomes its lid in real millimeters. Then you search the logo library, drag stickers on, rotate and layer them, and see roughly what it'll look like before spending anything. Each sticker can be die-cut, circle or square, and there's a shuffle button (S) for when you're stuck.

When you're happy you can export a PNG, SVG, or a PDF at true size with cut lines for a print shop. You can also share a link, which puts the design on a Community page where others can remix it. No account needed, designs are saved in your browser.

It's built with SvelteKit, Tailwind, Neon and Vercel, and the logo library started from svgl, pheralb's open logo collection. Open source, MIT: https://github.com/PaoloJN/stickerz

It's a beta. I'd love to hear what breaks, which logos look off, and whether the print export works for you. And post your stack if you make one.
```

---

## 4. LinkedIn

About 110 words, one link:

```
I made a small thing: Stickerz.

It lets you lay out the logos of your tech stack as die-cut stickers on a laptop lid drawn at real size. You can share the design, remix someone else's, or export a print-ready sheet (PNG, SVG, or PDF with cut lines) and get actual stickers made.

No account, nothing to install. Designs are saved in your browser, and if you share one it shows up on a public Community page.

It's open source. The logo library started from svgl, pheralb's open logo collection.

If you try it, I'd like to see your stack.

https://stickerz.dev
```

---

## 5. Product Hunt

**Tagline** (60 chars max):

```
Your stack, on your laptop.
```

(27 chars. Alternate: `Lay out your tech stack as die-cut laptop stickers` is 50.)

**Description** (260 chars max):

```
Lay out your tech stack's logos as die-cut stickers on a true-scale laptop lid. Share it, remix others' designs, or export a print-ready sheet (PNG, SVG, PDF with cut lines). No account. Open source, built on svgl.
```

(about 215 chars)

---

## 6. Bio and OG description

**X profile bio (1 line):**

```
Building Stickerz, put your tech stack on your laptop (stickerz.dev). Open source.
```

**Site OG description, 3 alternatives:**

1. `Lay out your tech stack's logos as die-cut stickers on a true-scale laptop lid. Share it or print it.`
2. `Pick your laptop, drag on your stack's logos, then post the picture or print the sheet. No account needed.`
3. `Your stack, on your laptop. Design die-cut stickers at real size, remix the community's, export PNG, SVG or PDF with cut lines.`
