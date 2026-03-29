# Design Theme — Current State (Pre)

> Snapshot of Splitr's design system as of March 2026.

---

## Overview

Splitr currently uses a **teal-centric, light-mode-primary** design system built on NativeWind (Tailwind CSS) with Inter as the sole typeface. The visual language is clean and functional — closer to a "friendly utility app" than a premium fintech. Components are well-systematized in `lib/tokens.ts` with full light/dark mode support.

**Personality today:** Friendly, approachable, functional. Feels like a well-built student project that got polished — not yet like a product you'd trust with real money at first glance.

---

## Colors

### Palette

| Role | Light | Dark | Hex |
|------|-------|------|-----|
| **Primary** | Teal 600 | Teal 600 | `#0d9488` |
| **Accent** | Teal 500 | Teal 500 | `#14b8a6` |
| **Background** | Custom off-white | Slate 900 | `#f8fafb` / `#0f172a` |
| **Card** | White | Slate 800 | `#ffffff` / `#1e293b` |
| **Muted** | Slate 100 | Slate 700 | `#f1f5f9` / `#334155` |
| **Border** | Slate 200 | Slate 700 | `#e2e8f0` / `#334155` |
| **Text (primary)** | Slate 900 | Slate 100 | `#0f172a` / `#f1f5f9` |
| **Text (secondary)** | Slate 500 | Slate 400 | `#64748b` / `#94a3b8` |
| **Success** | Emerald 500 | Emerald 500 | `#10b981` |
| **Destructive** | Red 500 | Red 500 | `#ef4444` |
| **Warning** | Amber 500 | Amber 500 | `#f59e0b` |

### Gradients
- **Hero sections:** Teal 600 → Cyan 600 (`#0d9488` → `#0891b2`)
- **Dark hero:** Teal 900 → Cyan 900 (`#134e4a` → `#164e63`)
- **Primary button:** Teal 600 → Teal 700 (`#0d9488` → `#0f766e`)
- **Shimmer:** Transparent → white 12% → transparent

### Chart Colors
`#0d9488`, `#10b981`, `#3b82f6`, `#f59e0b`, `#a855f7` (5 colors)

### Observations
- Teal is used everywhere — primary, accent, focus ring, hero gradient, chart[0]. Low differentiation between interactive and decorative elements.
- No semantic coloring for monetary amounts (positive/negative/neutral all same color).
- 5 chart colors is limiting for groups with many members.
- Dark mode background (`#0f172a`) has a strong blue tint — cold feel.
- `surfaceTint` (teal50/teal950) exists but is barely used.

---

## Typography

### Font
**Inter** — 4 weights loaded via Expo Google Fonts:
- Regular (400), Medium (500), SemiBold (600), Bold (700)

### Scale

| Token | Size (px) | Usage |
|-------|-----------|-------|
| `xs` | 11 | Captions, timestamps |
| `sm` | 12 | Labels, secondary text |
| `base` | 13 | Body text, buttons |
| `md` | 14 | Form text, tabs |
| `lg` | 15 | Emphasized body |
| `xl` | 17 | Section headings |
| `2xl` | 20 | Screen headings |
| `3xl` | 24 | Hero numbers |
| `4xl` | 28 | Large hero |
| `5xl` | 34 | Balance display |

### Observations
- Inter is a safe, industry-standard choice — excellent legibility but zero brand differentiation. Every other app uses Inter.
- **No tabular numeral setting** — financial figures can shift width when amounts change (e.g., $9.99 → $10.00 causes layout jitter).
- Font scale is tight (11–34px in 10 steps) — adequate but the jumps between sizes don't create dramatic hierarchy.
- Balance display at 34px feels small for a "hero number" — Revolut uses 36–40px.
- No monospace or display font for amounts — missed opportunity for premium feel.

---

## Components

### Button
- **Default:** Linear gradient (`#0d9488` → `#0f766e`), white text, teal glow shadow
- **Sizes:** sm (6px radius), md/lg (12px radius)
- **Press:** Spring scale to 0.97
- **Variants:** outline, ghost, destructive, accent
- **Observation:** Gradient button with glow shadow is a strong CTA. But 12px radius looks slightly generic — not pill (full radius) like modern fintech, not sharp like enterprise.

### Card
- **Light:** White, 16px radius, subtle shadow (elevation 3)
- **Dark:** Slate 800, no shadow, `border-white/6%` glassmorphic edge
- **Observation:** Dark mode treatment is good (glassmorphic edge). Light mode shadow could be more refined — currently a generic "floating card" look.

### Input
- **Style:** Muted background, 12px radius, no visible border in default state
- **Observation:** Borderless inputs on muted background is clean. Could benefit from a focus ring animation.

### Avatar
- **Sizes:** 32/40/56px, circular
- **Fallback:** Initials on tinted primary background
- **Observation:** Standard approach. No ring/status indicator patterns.

### Toast
- 3px left accent border, type-colored background tint
- **Observation:** Functional but dated pattern. Modern apps use floating pills or Sonner-style toasts.

### Tab Bar
- Airbnb-style bounce animation, sliding indicator, gradient fade
- **Observation:** This is actually well-executed and modern. The bounce + crossfade icon pattern is premium.

### Bottom Sheet
- Spring animation, 24px top radius, drag handle
- **Observation:** Standard implementation. Could benefit from backdrop blur.

### Empty State
- Centered icon in concentric rounded squares, title + subtitle
- **Observation:** Clean but generic. No illustration, no personality.

### Skeleton
- Shimmer gradient animation (850ms cycle)
- **Observation:** Good. Industry standard.

---

## Layout Patterns

### Screen Structure
1. **Gradient hero** (teal/emerald) with optional emoji watermark at 8% opacity
2. Content on plain background below
3. `SafeAreaView` with top edge handling

### Navigation
- 5-slot bottom tab bar (4 tabs + center FAB)
- FAB is primary entry for "Add Expense" (plus icon, teal, 52x52, glow shadow)

### Observations
- Hero gradient is used on almost every screen — creates sameness. Profile, group detail, onboarding, settle-up all look the same from the top.
- No variation in hero treatment (always gradient + emoji watermark).
- Screen transitions use default Expo Router transitions — no custom page animations.

---

## Motion & Animation

| Category | Implementation | Quality |
|----------|---------------|---------|
| Tab bar bounce | Spring (damping 10, stiffness 200) | Good — premium feel |
| Button press | Spring scale 0.97 → 1.0 | Good |
| Bottom sheet | Spring slide in/out | Good |
| Toast | Timing 250ms enter, 180ms exit | Adequate |
| Confetti | 40 reanimated particles | Good — celebratory moment |
| Skeleton | 850ms shimmer cycle | Standard |
| Number transitions | None | **Missing** — amounts should animate |
| Page transitions | Default | **Missing** — no custom screen transitions |
| Stagger animations | None | **Missing** — lists load all-at-once |

---

## Shadows

| Preset | iOS Shadow | Android Elevation |
|--------|-----------|-------------------|
| `card` | offset(0,2), opacity 0.06, radius 12 | 3 |
| `elevated` | offset(0,8), opacity 0.1, radius 24 | 8 |
| `glowTeal` | teal color, offset(0,4), opacity 0.2, radius 16 | 6 |

Dark mode: Shadows disabled, replaced with `border-white/6%`.

---

## Spacing
- 4px base grid (2px for fine-tuning)
- Screen edge: `px-4` (16px) or `px-6` (24px)
- Card padding: `p-4` (16px) or `p-5` (20px)
- Section gaps: 12–16px

---

## Border Radius

| Component | Radius |
|-----------|--------|
| Buttons (sm) | 8px |
| Buttons (md/lg), Inputs | 12px |
| Cards | 16px |
| Confirm modals | 20px |
| Bottom sheets, FAB | 24px |
| Avatars, badges | Full (circular) |

---

## Icons
- **Primary:** lucide-react-native (line-style)
- **Tab bar:** Custom SVG outline/filled pairs
- **Payment brands:** Simple Icons SVGs (7 providers)

---

## Accessibility
- WCAG AA contrast on primary text
- `accessibilityRole="button"` on pressables
- Toast uses `accessibilityRole="alert"`
- Tabs use `accessibilityState={{ selected }}`
- **Missing:** Reduced motion preferences, screen reader testing, color-blind-safe amount indicators

---

## Do's (Current Strengths)
1. Centralized token system (`lib/tokens.ts`) — single source of truth
2. Full dark mode support with semantic color mapping
3. Tab bar animation is premium (Airbnb-inspired bounce)
4. Confetti celebration on settlement — delightful moment
5. Glassmorphic dark mode cards (border-white/6%)
6. Consistent use of teal as brand color
7. Skeleton loaders on all data screens

## Don'ts (Current Weaknesses)
1. **Every screen looks the same** — teal gradient hero + emoji watermark is repetitive
2. **No semantic money colors** — positive/negative amounts aren't green/red
3. **No tabular numerals** — financial figures shift on update
4. **Inter everywhere** — zero typographic brand identity
5. **Toast design is dated** — 3px left border pattern is 2020-era
6. **Empty states are generic** — icon + text, no illustration or personality
7. **No stagger/list animations** — content pops in all at once
8. **No number transition animations** — balances jump, don't animate
9. **Shadow hierarchy is flat** — card vs elevated difference is subtle
10. **Chart palette limited** — 5 colors for potentially 10+ members
