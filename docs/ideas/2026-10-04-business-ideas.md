# Business ideas (parked)

Status: **parked** until the product is live and has users. Captured 2026-10-04 so nothing gets lost.

## The bet

Most developers put stickers on their laptop, and the stickers are mostly their stack. The editor lets anyone design
that lid at true scale. The money is less in selling stickers to developers and more in the companies that already
spend devrel budget to get their logo onto developer laptops.

## Ways to make money, best first

1. **Brand partnerships (biggest upside).** Devtool companies hand out thousands of stickers at conferences.
   - "Official" stickers in the library: the brand opts in, which also removes the trademark problem.
   - Brand-funded free stickers: "Get the official Supabase sticker, shipped free." The brand pays per sticker sent,
     roughly what a conference booth costs per dev, but these devs chose the tool themselves.
   - Featured or sponsored placement, plus usage data ("your logo went on 4,000 lids this month").
   - Only works once there is traffic. This is the destination, not the start.
2. **Printing custom stickers (first revenue).** Real die-cut vinyl of text stickers, uploads and our own designs, via
   a print-on-demand partner (no inventory). Per sticker, or a full "lid kit" sheet around $15–25. The editor already
   produces vector cut paths and a print PDF.
3. **Team and event kits.** Startups, bootcamps and hackathons ordering a lid kit with their own logo plus their stack.
   Bigger orders, fewer customers.
4. **Paid extras (small).** High-resolution or print exports, more fonts, unlimited uploads, saved stacks. A $5–9
   one-time unlock. A nice extra, not a business on its own.

## What we can and can't sell

Nearly every logo in svgl is a trademark, and svgl notes the logos belong to their owners.

- **Not safe to sell:** company brands (Vercel, NVIDIA, Docker, Stripe…) without a license.
- **Check one by one:** open-source logos. Many projects have trademark policies; some restrict selling merch without
  permission. Get permission in writing before selling any of them.
- **Safe:** text stickers, user uploads (terms say the user must own the rights), our own original designs, and
  logos we've licensed.
- **Print at home:** a **free**, personal-use print-ready PDF of the whole lid, close to what svgl already does by
  sharing the SVGs. Charging for a PDF of trademarked logos brings the risk back.

Not legal advice: get a quick legal check before selling anything with third-party logos.

## Suggested order

1. **Growth first:** "show your stack" share images, public stack pages, good link previews on X/LinkedIn. Every
   shared lid is free marketing.
2. **Test demand before building fulfillment:** an "Order this as real stickers" button leading to a priced pre-order
   or waitlist. Build printing only if people sign up.
3. **Custom printing** for text and uploads through a print-on-demand partner.
4. **Pitch brands** with real numbers (lids designed, devs using their logo). Start with friendly devtool companies
   that already do swag.

## Naming notes

- **stickerz.dev: no.** stickers.dev is taken by a live sticker shop. A name one letter away sends them our traffic,
  looks like a knockoff, and is a trademark risk.
- Prefer a name that carries the "stack" idea. Candidates (availability not checked yet): `stickstack.dev`,
  `lidstack.dev`, `slapstack.dev`, `peelstack.dev`, `stackstickers.dev`.

## Open questions

- Which print-on-demand partner takes an SVG/PDF with a cut path, and at what unit cost?
- Which popular open-source logos allow selling stickers? Survey their trademark policies.
- Pricing for single stickers vs. lid kits.
- Final name and domain.

---

## Support page (built 2026-10-05) and research

The `/support` page, a labeled Sponsored row in the logo picker, Official badges, print links and an ad slot are built.
All links live in `src/lib/support.ts` (brand sponsors in `src/lib/stickers/sponsors.ts`). A `null` link hides that
item in production and shows it tagged "not set up" in dev.

### To go live (sign-ups only you can do)

- [ ] **GitHub Sponsors** for `PaoloJN` (Stripe Connect; bank country must match residence). Then the Sponsor link and
      `.github/FUNDING.yml` button work.
- [ ] **Ko-fi** account, then set `DONATE.kofi` and `ko_fi:` in FUNDING.yml.
- [ ] **Sticker Mule Commissions** (no approval, needs Stripe), then swap the Sticker Mule link for your referral link.
- [ ] **Silhouette** (US-based affiliates only), **Cricut** (Impact, wants an audience), **Amazon Associates** (only once
      traffic can make 3 sales in 180 days) for the home-printing list. Set `AMAZON_LINKS = true` when Amazon links exist.
- [ ] **Open Collective** via Open Source Collective once companies want invoices.
- [ ] **EthicalAds** once past ~50k pageviews/month; set `ETHICAL_ADS_PUBLISHER`.
- [ ] A short **logo license template** for brands (limited, revocable, approved assets, brand guidelines, removal on
      termination, indemnity) before granting any Official badge.
- [ ] Rewrite README and LICENSE for this project, keeping svgl's MIT notice.

### Donation platforms

| Platform | Fees | Notes |
|---|---|---|
| GitHub Sponsors | 0% from personal accounts; orgs 3% + card fee | One-time + monthly, company invoices from $5k. Matching fund ended. [fees](https://docs.github.com/en/sponsors/sponsoring-open-source-contributors/about-sponsorships-fees-and-taxes) |
| Ko-fi | 0% one-time, 5% monthly (or $12/mo Gold) + Stripe/PayPal | Pays straight to your Stripe/PayPal. [fees](https://help.ko-fi.com/hc/en-us/articles/360002506494-Does-Ko-fi-take-a-fee) |
| Open Collective (OSC) | 10% host fee + processing | Invoices, public budget, logo-wall widgets. [fees](https://docs.oscollective.org/welcome-and-introduction-to-osc/fees) |
| Buy Me a Coffee | 5% + processing | Skip, Ko-fi is cheaper. |
| Polar.sh | n/a | Donations and sponsorships are now prohibited. [AUP](https://polar.sh/docs/merchant-of-record/acceptable-use) |

Common tier pattern (Vue, Vite, Biome, ESLint): under ~$100/mo gets a name, $100–500 a README/site logo, $1k+ homepage
placement.

### Brand sponsorship

- Comparable prices: Vue $100–5,000/mo, Vite up to $500/mo, ESLint $200–5,000/mo, Tailwind partners $2.5–5k/mo.
  svgl itself has no company tiers, so the "official logo" slot is open. [Vue OC](https://opencollective.com/vuejs) ·
  [ESLint OC](https://opencollective.com/eslint)
- Our tiers: Verified $49/mo, Featured $299/mo, Partner $1,500/mo, with two months free on yearly plans and Partner
  capped at 3–5 brands.
- FTC: label paid placement "Sponsored" or "Ad" before the user engages, keep it visually separate from organic items,
  and never boost sponsors in search. [FTC native ads](https://www.ftc.gov/business-guidance/resources/native-advertising-guide-businesses)
- Trademark: "Official" implies endorsement, so only with a written license from the brand.

### Printing and affiliates

| Program | Commission | Notes |
|---|---|---|
| Sticker Mule Commissions | 5–10% of a referral's orders for 12 months | No approval; accepts PDF/SVG die-cuts; no ordering API. [terms](https://www.stickermule.com/legal/commissions) |
| Silhouette America | 10% | US affiliates only, $50 min payout. [terms](https://www.silhouetteamerica.com/affiliate-conditions) |
| Cricut | up to 12% (4% machines), 5-day cookie | Impact network, wants an audience. [partners](https://cricut.com/en-us/partners) |
| Printful | 10% for 12 months | API exists, but stickers need PNG at 300 DPI, not a cut path. |
| Amazon Associates | ~2–3%, rates cut in 2026 | 3 sales in 180 days or the account closes; exact disclosure sentence required. |
| StickerApp | none | No affiliate program. |

For one-click ordering later, print APIs like Sticker it, Diginate and Prodigi could take our cut-line files on a
reseller margin. FTC: put the disclosure right next to the links in plain words ("paid links"); a footer alone is not
enough. [FTC FAQ](https://www.ftc.gov/business-guidance/resources/ftcs-endorsement-guides-what-people-are-asking)

### Ads

EthicalAds: 50k+ pageviews/month, 70% revenue share (~$2.50 per 1,000 views), no tracking. Carbon is invite-only and
exclusive, which would block our own Sponsored row, so prefer EthicalAds.
