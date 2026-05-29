# DESIGN CONSTITUTION
## ColorHarmony Glow — Tropical Botanical System
### Extracted & Codified from "Deep Teal / Jungle Green / Mango Gold" Palette

---

## 01. PHILOSOPHY

**"Lush Precision"** — *Where the jungle meets the jeweler.*

The design language is Tropical Luxe: the density of a rainforest floor compressed into refined, high-contrast interfaces. Dark foliage grounds every composition. Warm gold and amber ignite against it. This is not "nature-inspired" — it is nature *condensed*, structured, and made deliberate.

**Core Tenets:**
- Dark backgrounds are not "dark mode" — they are the forest floor. Required.
- Gold and amber exist to illuminate, not decorate.
- Depth through layering: background, midground, foreground.
- Organic warmth in a structured grid. Tension between wild and precise.
- Sage Mist is the only neutral — used sparingly for breathing room.

---

## 02. COLOR SYSTEM

### Primary Palette

| Token | Hex | Usage |
|---|---|---|
| `--color-forest` | `#0E534A` | Deep Teal. Dominant dark canvas. |
| `--color-jungle` | `#1B6A59` | Jungle Green. Secondary field, midtones. |
| `--color-gold` | `#F2A93B` | Mango Gold. Primary accent, highlights. |
| `--color-ember` | `#E07A2F` | Papaya Orange. Secondary warm accent. |
| `--color-sage` | `#B7C7A3` | Sage Mist. Neutral, muted, breathing space. |
| `--color-night` | `#071F1C` | Near-black. Deepest shadow layer. |
| `--color-cream` | `#F5EDD8` | Off-white. Type on dark fields only. |

### Color Behavior Rules
- **Base canvas:** Always `--color-forest` or `--color-night`. Never light backgrounds.
- **Gold ratio:** Mango Gold used at maximum 20% of composition — it must feel rare.
- **Ember for hierarchy:** Papaya Orange = secondary call-to-action, hover state, supporting accent.
- **Sage for silence:** Used only in tertiary text, inactive states, or spacer elements.
- **Cream for readability:** Body copy and headings on dark fields.
- **Layer depth:** night → forest → jungle → sage → gold/ember (light-to-dark = depth-to-surface)

### Depth Stack
```
Layer 0 (deepest):  --color-night    #071F1C
Layer 1:            --color-forest   #0E534A
Layer 2:            --color-jungle   #1B6A59
Layer 3:            --color-sage     #B7C7A3  (subdued surface)
Layer 4 (surface):  --color-gold     #F2A93B  (illuminated)
Layer 5 (hottest):  --color-ember    #E07A2F  (focus/action)
```

### Ambient Glow Effect
Signature visual device: soft radial emanation of gold/ember behind key elements.
```css
/* Gold glow behind primary elements */
box-shadow: 0 0 60px rgba(242, 169, 59, 0.15), 0 0 120px rgba(242, 169, 59, 0.06);

/* Ember glow for active/hover */
box-shadow: 0 0 40px rgba(224, 122, 47, 0.2);
```
*Use sparingly — maximum one glow element per viewport.*

---

## 03. TYPOGRAPHY

### Typeface Stack

| Role | Family | Weight | Style |
|---|---|---|---|
| **Display** | `Cormorant Garamond` | 700 Bold | Mixed case, luxe editorial |
| **Sub-display** | `Cormorant Garamond` | 400 Italic | Elegant qualifier |
| **Body** | `DM Sans` | 400 Regular | Clean, readable on dark |
| **Label / UI** | `DM Sans` | 500 Medium | Small-caps, letterspaced |
| **Accent / Quote** | `Cormorant Garamond` | 300 Light Italic | Whisper weight |

### Type Scale

```
--text-xs:    0.625rem   (10px) — Micro labels, status
--text-sm:    0.75rem    (12px) — Meta, captions
--text-base:  1rem       (16px) — Body
--text-lg:    1.25rem    (20px) — Lead
--text-xl:    1.75rem    (28px) — Sub-heading
--text-2xl:   2.5rem     (40px) — Section display
--text-3xl:   4rem       (64px) — Hero display
--text-4xl:   clamp(3rem, 8vw, 6rem) — Responsive display
```

### Type Rules
- **Display type:** Cormorant Garamond, mixed case (not all caps), tracking -0.02em.
- **Body:** DM Sans, always cream or sage on dark backgrounds.
- **Gold text:** Used only for the single most important label or number per section.
- **Sage text:** Secondary, tertiary hierarchy. Never primary.
- **No system fonts.** No grotesque sans-serifs beyond DM Sans.
- **Line-height:** 1.6 body, 1.1–1.2 display, 1.5 UI labels.

---

## 04. SPACING SYSTEM

Base unit: **8px**

```
--space-1:   4px
--space-2:   8px
--space-3:   12px
--space-4:   16px
--space-6:   24px
--space-8:   32px
--space-12:  48px
--space-16:  64px
--space-24:  96px
--space-32:  128px
```

**Layout Principle:** Dense but breathable. Dark space reads as lush density, not emptiness. Generous padding makes gold accents feel precious. Vertical scroll = descending deeper into the canopy.

---

## 05. BORDERS, STROKES & RADIUS

- **Borders:** `1px solid rgba(242, 169, 59, 0.2)` — gold at low opacity, jewel-like
- **Active borders:** `1px solid var(--color-gold)` — full gold, sparingly
- **Border-radius:** Allowed here — `4px` for cards, `2px` for inputs, `50%` for badges
- **No harsh corners required.** This system allows gentle radius as organic softness.
- **Dividers:** `1px solid rgba(183, 199, 163, 0.2)` — sage at 20% opacity

### Surface Styles
```css
/* Card surface */
background: var(--color-jungle);
border: 1px solid rgba(242, 169, 59, 0.15);
border-radius: 4px;

/* Elevated card */
background: var(--color-jungle);
border: 1px solid rgba(242, 169, 59, 0.3);
box-shadow: 0 8px 32px rgba(7, 31, 28, 0.5);
```

---

## 06. LAYOUT SYSTEM

### Grid
- Mobile: 4-col, 16px gutter
- Desktop: 12-col, 24px gutter

### Compositional Principles

1. **Dark field first.** Background always deep teal/night. Content layers up from there.
2. **Bokeh depth:** Background elements have slight blur or reduced opacity to simulate depth-of-field.
3. **Organic asymmetry:** Leaf/botanical motifs break strict grid without violating it.
4. **Gold as focal anchor:** Every screen has one gold element that draws the eye first.
5. **Ember as directional:** Orange/ember used on interactive elements to say "go here."

### Section Types

| Zone | Color | Purpose |
|---|---|---|
| `canopy` | --color-night | Hero / deepest background |
| `understory` | --color-forest | Primary content field |
| `mid-layer` | --color-jungle | Card and component backgrounds |
| `sage-gap` | --color-sage (10% opacity) | Breathing space / dividers |
| `gold-surface` | --color-gold | Highlighted values, CTAs |

---

## 07. ICONOGRAPHY & MARKS

- **Icon style:** Thin-stroke, organic forms. 1.5px stroke, rounded line-caps.
- **Botanical motifs:** Leaf silhouettes used as background texture (SVG, 5–8% opacity)
- **Color:** Icons in sage or gold — never cream as icon color.
- **Badge style:** Circular, forest background, gold text.

---

## 08. MOTION (When Applied)

- Easing: `cubic-bezier(0.22, 1, 0.36, 1)` — organic settle
- Duration: `200ms` (micro) / `350ms` (standard) / `700ms` (emergence)
- Gold glow pulse: `opacity 2s ease-in-out infinite alternate` (0.5 → 1.0)
- Entrance: scale (0.96 → 1.0) + opacity (0 → 1) — organic growth metaphor
- Hover: `transform: translateY(-2px)` + gold border at full opacity
- **No mechanical easing.** All motion reads as organic, not robotic.

---

## 09. FORBIDDEN PATTERNS

- ❌ Light or white backgrounds
- ❌ Blue, purple, or indigo anywhere
- ❌ Inter, Roboto, or generic sans-serif stacks (use DM Sans specifically)
- ❌ Flat / non-layered compositions (depth is mandatory)
- ❌ Gold used as a primary fill color for large areas
- ❌ Bright white text (use --color-cream)
- ❌ Hard-edged geometric shapes without organic counterweight
- ❌ Equal visual weight across gold and ember (gold always dominates)
- ❌ Centered layouts without an asymmetric element breaking the axis
- ❌ Generic card shadows (use the defined depth stack instead)

---

## 10. COMPONENT PATTERNS

### Gold Highlight Text
```css
color: var(--color-gold);
font-family: var(--font-display);
text-shadow: 0 0 20px rgba(242, 169, 59, 0.4);
```

### Swatch Card
```
Background: --color-jungle
Border: 1px solid rgba(242, 169, 59, 0.2)
Color sample: full-width strip, 50% card height
Name: Cormorant Garamond Bold, --color-cream
Hex: DM Sans 500, --color-sage
border-radius: 4px
```

### Call to Action Button
```
Background: --color-gold
Color: --color-forest (dark text on gold)
Font: DM Sans 500, letterspaced 0.1em, uppercase
Hover: --color-ember background
border-radius: 2px
```

### Botanical Texture Layer
```
SVG leaf silhouette paths
Fill: --color-jungle or --color-gold
Opacity: 5–10%
Position: absolute, overflow visible
pointer-events: none
Slight rotation for organic feel
```

---

*Constitution version 1.0 — Extracted May 2026*
