# Foundations by Endurance Logistics — Site Teardown & Paid Asset Plan

Reverse-engineering of terminal-industries.com (what it's actually made of),
and a purchase list of rights-cleared paid assets to build an identical-caliber
site for **Foundations**, the Endurance Logistics TMS platform.

---

## Part 1 — Reverse engineering: what their site actually is

**Stack (extracted from their production HTML):**
| Layer | What they use | Our equivalent (already built) |
|---|---|---|
| Framework | Nuxt (Vue SSR) | Static HTML (same output; simpler) |
| CMS | Storyblok (all media served from a.storyblok.com) | Git repo |
| Smooth scroll | Lenis | Lenis ✓ |
| Scroll choreography | Scroll-driven video swaps + reveals | GSAP ScrollTrigger ✓ |
| Type | Suisse Intl (licensed) + Geist Mono | Instrument Serif + Figtree + JetBrains Mono (brand) |
| Palette | #052424 dark green / #ABFF02 lime / #FB6B3C orange / #F0F0F0 | Endurance ink/bone/gold (brand) |

**The critical finding — the "wow" is media, not code.** Their homepage plays
~15 pre-rendered MP4s (site.webm hero + vid_3-1…3-5 + vid_4-x + vid_5-x
product loops): 3D-rendered yard scenes, wireframe-overlay trucks, and product
UI flythroughs, produced in a 3D pipeline (Blender/C4D-class) and baked to
video. The page itself mostly *plays and swaps* these files as you scroll.

**Section map (already replicated 1:1 on our page):** statement hero →
client logo wall → numbered 01–06 scrollytelling with sticky media panel →
benefit statements → built-by/investors → testimonial → how-it-works CTA →
same-day contact form → oversized closing → mono footer. Signature elements:
floating pill nav with "Ask" input ✓, scroll-to-explore cue ✓, kinetic
type moments ✓, hide-on-scroll nav ✓, giant counter ✓.

**What we already have running that they don't:** a live Three.js WebGL
scene (procedural night yard + hologram truck + cinematic camera scrub) —
theirs is baked video; ours is realtime. The gap left is purely **asset
quality**: our 3D geometry is primitive-built, our footage is free stock.

---

## Part 2 — Paid assets to close the gap (ranked by impact per dollar)

### Tier 1 — 3D models for the live WebGL scene  ⭐ biggest visual jump
Buy pro GLTF/FBX models and I swap them into the existing Three.js hero
(replaces my box-primitive truck with a photoreal model that still gets the
wireframe-hologram treatment — this is exactly the reference look).

| Source | What to buy | Typical price | License notes |
|---|---|---|---|
| **Sketchfab Store** | "Semi truck / truck with trailer" GLTF, low-mid poly (≤150k tris) | $15–80/model | Standard license = commercial web use ✓; GLTF native |
| **TurboSquid** | Semi trailer truck (CheckMate certified), warehouse/dock kit | $20–300/model | Standard license covers web; huge selection |
| **CGTrader** | Same categories, often cheaper | $10–200 | Royalty-free commercial |
| **KitBash3D** | "Logistics/industrial" environment kit (yards, containers, docks) | ~$99–299/kit | One kit dresses the whole scene |

**Shopping list v1 (~$150–400 total):** 1 hero semi truck (GLTF, PBR
textures), 1 container/warehouse environment kit, 1 forklift or yard tractor.
Requirements I need in the listing: GLTF or FBX format, PBR materials,
≤150k triangles for the truck (web performance), unbranded or brand-removable.

### Tier 2 — Cinematic stock footage subscriptions (video panels)
Replaces the free Pexels placeholders in the benefit panels and photo bands.

| Source | Price (verified 2026) | Strength |
|---|---|---|
| **Envato Elements** | from ~$16.50/mo, unlimited downloads, perpetual license per project | Broadest: footage + AE templates + 3D + mockups; best first buy |
| **Artgrid** | from ~$23.25/mo (annual, ~$239/yr) | Cinema-grade logistics/industrial footage, perpetual universal license |
| **Storyblocks** | ~$20–30/mo unlimited | Solid mid-tier alternative |
| **Adobe Stock / Getty** | ~$60–200 per clip | Only for one-off hero-grade shots |

### Tier 3 — Product UI motion (the TMS "product" shots)
Terminal's product loops show THEIR software. Foundations needs its own:
- **Envato/Motion Array After Effects HUD & dashboard templates** ($15–40 or
  included in Elements) — I storyboard Foundations TMS screens (load board,
  lane map, ETA feed) and the template gets re-skinned in Endurance tokens.
- Or pure code: I can build the TMS UI vignettes as live HTML/SVG animations
  (like the six Live-View scenes) — $0, already the house style.

### Tier 4 — AI-generated hero footage (paid subscriptions)
The FOOTAGE-BRIEF.md prompts are ready to run on paid tiers:
- **Google AI Pro (Veo 3)** ~$20/mo (Ultra ~$250/mo for more generations)
- **Runway** Standard ~$12–35/mo (Gen-4)
Both output footage you own for commercial use — cheapest path to
"pre-rendered 3D flythrough" shots that no stock library stocks.

### Tier 5 — Commissioned renders (the Terminal-exact route)
- Freelance 3D artist (Fiverr Pro/Upwork): $150–1,500 for 3–5 bespoke loops
- Studio-grade production: $5–15k — this is literally what Terminal did.

---

## Recommended package for Foundations (≈$200 + $17/mo)

1. **Sketchfab/TurboSquid truck + KitBash-style yard kit (~$150–300 one-time)**
   → I integrate into the live WebGL hero same-day via GLTFLoader.
2. **Envato Elements 1 seat (~$16.50/mo)** → benefit panels, photo bands,
   AE dashboard template for TMS product loops.
3. **Google AI Pro (~$20/mo, cancel anytime)** → run the footage brief for
   the 2–3 hero/closing shots stock can't provide.

Total: under $350 to start, and every asset is owned/licensed for commercial
use by Endurance. Once purchased, drop files in `assets/` (or give me the
downloads) and the integration is my job.

---

## Rebrand note
The built site currently says "Endurance Logistics." Renaming the product to
**Foundations by Endurance Logistics** is a single copy pass (nav chip, hero
tag, OS references "Foundations TMS", footer) — say the word and I'll run it.
