# Design reference notes

Working notes captured from the reference material the owner supplied for
`realworldtradingplatform.com`. The app in `src/` is built to match these
notes; when new screenshots/recordings arrive, update this file first, then
adjust the components.

## Screenshot 1 — mobile home page (2026-09-05, 720 px-wide capture)

### Layout, top to bottom
1. **Market ticker strip** — full-width black bar above the header with
   horizontally scrolling index quotes: `…500 Index  7,708.0  −33.1 (−0.43%)`,
   `US 100 C…`. Index name in white, price in white, change in **red** when
   negative (assume green when positive). Small type (~13 px), one line,
   edge-to-edge scroll. → implement as a demo ticker with synthetic values.
2. **Header** — black, ~64 px tall: logo slot at far left (their own live site
   shows a broken `<img>` there, i.e. a plain image slot — ours stays EMPTY by
   instruction), orange **Login** button, then a hamburger (three-line) icon at
   the far right. No nav links visible on mobile.
3. **Hero** — black background, left-aligned, generous vertical padding:
   - Headline, extra-bold white, ~44 px on mobile, tight leading, two lines:
     "Get more freedom in the financial market."
   - Sub-copy in light grey/white, ~20 px: "Trade Cryptocurrencies, Stock,
     Indices, Commodities and Forex from a single account."
   - CTA stack (mobile): small orange **Login** button, then a wide orange
     **Join Real World Trading Platform** button. Both left-aligned, not
     centred, not pill-shaped.
   - Risk line in small grey text below the CTAs: "Trading in Forex/ CFDs is
     highly speculative and carries a high level of risk."
4. **Video** — YouTube embed below the hero, near-full content width, 16:9,
   standard YouTube chrome (their clip runs 05:13). Sits on plain black with
   breathing room above.
5. **Floating language chip** bottom-left (white pill, globe icon + "EN").
   Cosmetic; low priority.

### Visual language
- Background is **pure black** (#000), not near-black; sections separated by
  spacing rather than cards on the marketing page.
- Accent is a **sandy orange/gold** (sample ≈ #F0A24B / #EFA547), used only for
  buttons and brand moments. Button text is white, medium weight.
- Button corners are **slightly rounded (~4–6 px)** — NOT pill/rounded-full.
  (Current build uses rounded-pill buttons on marketing CTAs; needs a pass.)
- Typography: geometric sans (Poppins/Montserrat family), very heavy headline
  weight, white; body copy regular weight, soft white/grey.
- Negative numbers red (#E5484D-ish), used in the ticker.
- Their brand mark (seen inside the video only): orange-ringed globe with a
  black chess knight. **Do not reproduce** — logo slots stay empty per the
  owner's instruction; this is context only.

### Copy to reuse verbatim on the marketing page
- H1: "Get more freedom in the financial market."
- Sub: "Trade Cryptocurrencies, Stock, Indices, Commodities and Forex from a
  single account."
- Primary CTA: "Join Real World Trading Platform"
- Secondary CTA: "Login"
- Risk: "Trading in Forex/ CFDs is highly speculative and carries a high level
  of risk."

## Open questions for the owner
- Desktop layout of the same page (nav links? ticker position?).
- Dashboard / admin visuals (only described in words so far).
- Exact orange hex + font file if they have brand assets.
- Whether the ticker should show real instrument names or demo placeholders.

## Collage 2 — full mobile home page, sliced two-column (2026-09-05)

Section order implemented in `src/app/(site)/page.tsx`:

1. Ticker bar (now site-wide, above the header — `marketing/TickerBar.tsx`)
2. Header (logo slot · Login · hamburger)
3. Hero — left-aligned H1/sub/CTAs/risk line, video below at max-w-2xl
4. Instrument pillars — 5 pastel duotone icons, 2-up on mobile / 5-up desktop:
   Wide Range of Trading Instruments · Unparalleled Trading Conditions ·
   Globally Licensed & Regulated · Committed to Forex Education ·
   Regular Contests & Promotions
5. "Experience more than Trading." — centred, 3px orange underline bar,
   grey paragraph, orange chevron-down scroll cue
6. "Less Commission" — orange gradient panel (light gold top-left → deep
   bronze bottom-right), white 2-line heading, five BLACK circles with orange
   glyphs + white labels: Forex € · Crypto ₿ · Indexes chart · Stocks doc ·
   Energy droplet
7. "Market analysis and trade inspiration" — cream lightbulb icon, white bold
   heading, grey paragraph, media card with red YouTube-style play button
8. Learn / Invest — two cards, 1px orange border, ~10px radius, black fill:
   title + tiny grey uppercase sub + orange ✓ checklist + "Open Account"
   button whose orange fades to black toward the right
   Learn: FREE Demo Account / Step-by step tutorials & articles / Online
   webinars / Your own Account Manager
   Invest: No need to be experienced / Large number of strategies / Profit
   whenever Managers earn / Full control of your Investment
9. "Economic Analysis" media card — rounded, dark photo wash, vertical orange
   bar left of two-line violet label ("Economic" bold / "Analysis" light),
   round orange play launcher bottom-right
10. Floating chat widget — white bubble "Customer Service / Hi, how can we
    help?" with avatar + green dot + ×; round orange launcher with white
    speech-bubble icon, fixed bottom-right  → ours opens /support
    (`marketing/SupportLauncher.tsx`, dismissible per session)

### Design-token changes made for this pass
- New `brand` sandy-orange ramp (#eda143 core) alongside the old `flare`.
- All buttons: pill → `rounded-md` (6px), matching the live site.
- Card radii tightened: card 14px, card-lg 20px.
- Added `.btn-brand`, `.btn-fade` (orange→black), `.panel-brand` gradient.

### Still outstanding from the owner
- Desktop screenshots (hero/section alignment at ≥1024px is inferred).
- Dashboard / admin visuals.
- Brand font file + exact hex values if available.
- Their YouTube video ID for `NEXT_PUBLIC_YOUTUBE_VIDEO_ID`.

## Screens 3–10 — remaining home sections (2026-09-05, second upload batch)

Implemented in `src/components/marketing/showcase.tsx`, composed in
`src/app/(site)/page.tsx` in this order:

1. `MobileAppCard` — WHITE rounded card: Play Store / App Store badges (dark
   grey, two-line labels), hairline, "Trade on a world class platform without
   a doubt." with red link-styled phrase, red line "Mobile App Coming Soon
   For all Platform."
2. `ProfitCounter` — orange circle w/ chart-line icon + giant white
   "324,978,126" + grey uppercase "TRADES OPENED AT PROFIT"; hairline; centred
   "Trade & Invest in Stocks, Currencies, Indices, and Commodities (CFDs)."
3. `CommittedSection` — photo-wash band (CSS gradients only, no photos):
   "We are committed to meeting your CFD and FX trading needs" + paragraph +
   "89+" countries stat.
4. `AccountTiers` — four orange-bordered cards, uppercase titles, grey sub,
   orange ✓ rows, fade button: Starter ($500–$999, 48 Hours, Get Started),
   Classic ($1,000–$4,999, 72 Hours, Open Account), third card title was cut
   off in the capture — rendered as **Advanced Account** ($5,000–$9,999,
   7 Days, Get Started) — CONFIRM WITH OWNER, Platinum ($10,000–$50,000,
   2 Weeks, Open Account). All tiers carry "Personal Account Manager" and
   "Financial Plan". Sandbox disclaimer line added under the grid.
5. `AnchorBand` — black strip: Less Commission · Globally licensed ·
   Fund security (anchor links).
6. `ThreeSteps` — full-bleed orange gradient: "Start trading with Real World
   Trading Platform." + "Fast account opening in 3 simple steps" + orange
   circles Register / Fund / Trade. Trade body copy was cut off → inferred
   "Trade the global markets from a single dashboard."
7. `PlatformByTraders` — CSS laptop mockup (no brand artwork), heading,
   "Seize your opportunity, with technology built designed to ensure that
   your deal goes through." (sic, verbatim), store badges.
8. `AnnouncingSection` — NAVY (#0c1a3a): orange pill ANNOUNCING, huge
   "$4.95 online stocks, currencies & commodities trades", paragraph (sic
   "Comissions"), white Get Started button; inner steel-blue card
   "New to investing? Start here." + orange Join button.
9. `MarketTableSection` — dark Name/Value/Change table: INDICES (S&P 500
   7,708.0 −33.1 · US 100 Cash CFD 29,486.5 28.4 · Dow 53,226.4 −423.6 ·
   Nikkei 225 65,020.94 806.46 · DAX 26,046.40 43.08 · FTSE 100 10,832.2
   −1.7) with coloured chip circles; FUTURES rows (S&P 500, Euro, Gold) with
   alert icons and no values; then "Live Fx & Stock Prices" heading +
   "Trade 180 FX spot pairs and 140 forwards across majors, minors, exotics
   and metals." + orange ✓ list. Marked "Simulated quotes".
10. `Testimonials` — orange-bordered centred quote cards w/ initials avatars
    (NO real photos reproduced): Hunter Hamilton (US), Charlotte (ZA).
    Third card in the capture was cut mid-sentence and is omitted.
    Illustrative-content disclaimer under the grid.

### Notes / inferences to confirm with the owner
- Third account-tier title (rendered "Advanced Account").
- Completions of cut-off sentences (Committed paragraph tail, 89+ line tail,
  Trade step body, "Live Fx & Stock Prices" heading).
- Testimonial profit claims are the owner's existing copy; kept verbatim but
  framed by sandbox disclaimers — review before any production use.
