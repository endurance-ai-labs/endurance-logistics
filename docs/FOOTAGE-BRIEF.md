# Endurance Logistics — AI Footage Production Brief

Every video slot on endurancelabs.ai/logistics/new, with a ready-to-paste
generation prompt per shot. Written for **Veo 3** (Google Flow / Gemini API)
or **Runway Gen-4**. All footage generated from these prompts is owned by
Endurance — it replaces the temporary Pexels placeholders.

## Global style contract (applies to every shot)

- **Look:** pre-rendered 3D CGI, physically-based rendering, clean geometry,
  cinematic depth of field. NOT live-action, NOT cartoon.
- **Palette (Endurance brand):** deep ink-navy darkness `#0A0F1C`, warm gold
  sodium-vapor lighting `#C7A76C`, bone-white highlights `#F4F2ED`. No neon
  green, no cyan, no red branding on any vehicle or building.
- **Logos:** all trucks, trailers, and buildings UNBRANDED — blank white or
  dark trailers, no readable text anywhere.
- **Camera:** slow, locked or single-axis moves only (dolly, crane, orbit ≤15°).
  No cuts within a clip. No people in frame closer than silhouette distance.
- **Length/format:** 8 seconds, 16:9, 1080p, mp4. Generate 2–3 takes per shot
  and keep the one with the least motion at the first/last frames (easier looping).
- **Loop strategy:** I'll wire A/B crossfade looping in the player, so clips do
  NOT need to loop perfectly — but avoid shots where something big exits frame.

Negative prompt (append to every generation): `text, watermark, logo, people
close-up, daylight blue sky, neon colors, glitch, cartoon, low detail`

---

## SHOT 01 — Hero night scene
**Replaces:** `assets/video/hero-port-night.mp4` · full-viewport backdrop

> Cinematic 3D rendered aerial shot, slowly descending crane move over a vast
> logistics yard at night. Rows of unbranded semi trailers parked in precise
> grids, warm gold sodium lights on tall poles casting pools of amber light on
> dark asphalt, deep ink-navy darkness beyond the yard edges. A single white
> semi truck drives slowly between trailer rows, headlights on. Subtle golden
> particles of dust in the light beams. Photorealistic CGI, physically-based
> rendering, anamorphic depth of field, moody and premium, color palette of
> deep navy black and warm gold.

## SHOT 02 — Hero alternate / closing CTA backdrop
**New file:** `assets/video/closing-network.mp4` (optional, closing section)

> 3D rendered night scene viewed from high above: a dark continental landscape
> with glowing warm-gold routes connecting city nodes, thin lines of light
> pulsing along highways between logistics hubs, like a living circuit board
> made of freight lanes. Deep ink-navy background, gold light trails, slow
> majestic drift forward through the clouds. Premium fintech-grade motion
> graphics aesthetic, photorealistic CGI render.

## SHOT 03 — Benefit 01: automated throughput (gate)
**Replaces:** `assets/video/benefit-terminal.mp4`

> Cinematic 3D rendered shot at a logistics facility gate at dusk. An unbranded
> white semi truck rolls slowly through an automated security gate, a thin
> plane of warm gold scanning light sweeps across the trailer as it passes,
> delicate glowing wireframe outlines briefly trace the trailer's edges as it
> is scanned, then fade. Gold status lights on the gate arm. Dark navy dusk
> sky, warm pools of light, shallow depth of field, photorealistic CGI,
> premium and calm.

## SHOT 04 — Benefit 02: scalable operation (yard grid)
**Replaces:** `assets/video/benefit-warehouse.mp4`

> Slow 3D rendered top-down aerial rising straight up at night over a logistics
> yard: dozens of unbranded trailers in perfect rows, each parking slot subtly
> outlined by a faint glowing warm-gold rectangle like a digital twin overlay,
> a few slots gently pulsing as trucks glide in and park themselves. Deep navy
> darkness, amber yard lighting, orderly and calm, photorealistic CGI with a
> subtle holographic data layer.

## SHOT 05 — Benefit 03: repeatable ROI (dock flow)
**Replaces:** `assets/video/benefit-forklift.mp4`

> Cinematic 3D rendered tracking shot along a row of warehouse dock doors at
> night, unbranded trailers backed into every bay, warm gold light spilling
> from the open dock doors onto wet asphalt, subtle streams of glowing golden
> dots flowing from each dock door upward like data leaving the building.
> Deep ink-navy night, gold highlights, slow constant lateral dolly,
> photorealistic CGI, premium and rhythmic.

## SHOT 06 (optional) — Wireframe truck signature shot
**New file:** `assets/video/wireframe-truck.mp4` (system section upgrade)

> 3D rendered night shot of a single unbranded semi truck driving slowly through
> a dark logistics yard, rendered as a hybrid of solid dark geometry and glowing
> bone-white wireframe: the trailer's internal structure visible as thin luminous
> wireframe lines with tiny points of light at the vertices, revealing pallets
> and cargo inside as ghostly outlines. Warm gold ambient yard lighting, deep
> navy darkness, slow side-tracking camera, photorealistic CGI with holographic
> wireframe overlay, elegant and technical.

---

## Delivery + wiring

1. Generate at 1080p, download mp4s, drop into `assets/video/` with the exact
   filenames above (or hand them to Claude and I'll place, compress-check, and
   wire the A/B crossfade looping).
2. Shots 01/03/04/05 are drop-in replacements — the page already plays those
   slots. Shots 02/06 are upgrades I'll wire on arrival.
3. If you give me a Gemini API key with Veo access (or Runway API), I can run
   the generations, pick takes, and wire everything end-to-end myself.
