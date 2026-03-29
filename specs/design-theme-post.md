# Design Theme — Recommended (Post)

> Design system evolution for Splitr, informed by Revolut, Wise, Monzo, and modern fintech patterns (2025–2026).

---

## Overview

Evolve Splitr from "friendly utility app" to **"premium social fintech"** — the visual confidence of Revolut with the warmth of Venmo. Users should feel that their money is in capable hands, while the experience remains approachable and never intimidating.

**Target personality:** Confident, warm, trustworthy. Feels like a product backed by a real company — not a side project, not a bank.

**Design philosophy:**
- **Trust through clarity** — financial data presented with precision and confidence
- **Warmth through motion** — purposeful animations that make money feel less stressful
- **Premium through restraint** — fewer elements, more whitespace, every pixel intentional

**Reference spectrum:**
```
Splitwise ←——— AVOID ———→ [Splitr today] ←——— TARGET ———→ Revolut
(cluttered,                  (clean but               (premium,
 dated,                       generic,                  confident,
 cramped)                     "utility")                refined)
```

---

## Colors

### Primary Palette

Keep teal as the brand color — it's distinctive in the fintech space (Revolut = purple-blue, Wise = green, Monzo = coral, Cash App = neon green). Teal signals trust (blue) + freshness (green) without being generic.

| Role | Light | Dark | Hex | Change |
|------|-------|------|-----|--------|
| **Primary** | Teal 600 | Teal 500 | `#0d9488` / `#14b8a6` | **Brighten primary in dark mode** for better contrast |
| **Accent** | Teal 400 | Teal 400 | `#2dd4bf` | Shift accent lighter for hover/focus differentiation |
| **Background** | `#fafafa` | `#121820` | — | **Warmer dark BG** — less blue, more neutral (Revolut-inspired) |
| **Card** | `#ffffff` | `#1a2332` | — | Slightly warmer dark card |
| **Surface Elevated** | `#ffffff` | `#1f2d3d` | — | **New tier** — modals, bottom sheets, popovers |
| **Muted** | Slate 100 | `#1a2332` | `#f1f5f9` / `#1a2332` | Dark muted matches card (less contrast between card layers) |
| **Border** | Slate 200 | `rgba(255,255,255,0.08)` | — | **Increase dark border opacity** from 6% → 8% for clarity |
| **Text (primary)** | `#0f172a` | `#f0f2f5` | — | Slightly warmer dark text |
| **Text (secondary)** | `#64748b` | `#8b95a5` | — | Warmer dark secondary |

### Semantic Money Colors (NEW)

| Context | Color | Hex | Usage |
|---------|-------|-----|-------|
| **You are owed** | Green | `#22c55e` (green-500) | Positive balances, "owes you" |
| **You owe** | Coral/Red | `#f87171` (red-400) | Negative balances, "you owe" |
| **Settled / Neutral** | Muted foreground | `#64748b` | Zero balances, informational |
| **Positive change** | Emerald | `#10b981` | Settlement success, debt reduction |
| **Negative change** | Red | `#ef4444` | New expense, debt increase |

> **Rule:** Color is never the ONLY indicator. Always pair green/red with icons or text labels ("owes you" / "you owe") for accessibility.

### Gradient Evolution

| Current | Recommended | Rationale |
|---------|------------|-----------|
| Hero: teal → cyan everywhere | **Vary by context** (see below) | Reduce sameness |
| Button: teal → teal-700 | **Solid teal** (no gradient) | Cleaner, more confident |
| — | **Subtle radial glow** behind balance number | Hero focal point |

**Hero treatments by screen type:**
- **Home/Dashboard:** Subtle dark gradient (`#121820` → `#1a2332`) with floating teal orb — dark-mode-first hero
- **Group detail:** Banner image (if set) or category-tinted gradient (food = warm, travel = blue, home = green)
- **Profile:** Avatar-centric, no gradient — clean card-based layout
- **Settle-up:** Celebratory gradient only AFTER full settlement (confetti moment)

### Extended Chart Palette (8 colors)

```
#0d9488  #10b981  #3b82f6  #f59e0b  #a855f7  #ec4899  #06b6d4  #f97316
teal     emerald  blue     amber    purple   pink     cyan     orange
```

---

## Typography

### Font Strategy

**Keep Inter** as the primary font — it's the industry standard for fintech with exceptional screen legibility. Don't fight this battle; win on other fronts.

**Add: Tabular numerals** — this is the single highest-impact typography change.

```typescript
// In tokens.ts — add font feature settings
export const fontFeatures = {
  tabularNums: { fontVariant: ['tabular-nums'] as const },
  // For React Native, this ensures all digits are equal width
  // Prevents layout shifts when amounts change ($9.99 → $10.00)
};
```

### Revised Scale

Make the hierarchy more dramatic. Current scale (11–34px) is too compressed.

| Token | Current | Recommended | Usage |
|-------|---------|-------------|-------|
| `xs` | 11 | **11** | Timestamps, badges |
| `sm` | 12 | **12** | Labels, captions |
| `base` | 13 | **14** ↑ | Body text (13 is too small for fintech) |
| `md` | 14 | **15** ↑ | Form text, list items |
| `lg` | 15 | **16** ↑ | Emphasized body |
| `xl` | 17 | **18** ↑ | Section headings |
| `2xl` | 20 | **22** ↑ | Screen titles |
| `3xl` | 24 | **28** ↑ | Hero subheadings |
| `4xl` | 28 | **34** ↑ | Large hero text |
| `5xl` | 34 | **42** ↑ | **Balance display** — the number users came to see |

### Amount Display Hierarchy

```
┌────────────────────────────────┐
│        Total Balance           │  ← label: 12px, medium, muted
│        ₹12,450.00             │  ← amount: 42px, bold, tabular nums
│                                │
│  You're owed  ₹8,200          │  ← 16px, semibold, green
│  You owe      ₹3,750          │  ← 16px, semibold, coral
└────────────────────────────────┘
```

- **Hero amount:** 42px, Bold (700), tabular numerals
- **Currency symbol:** Same size but Medium (500) weight — visually lighter
- **Decimal portion:** Same size but lighter opacity (60%) — emphasize whole number
- **Secondary amounts:** 16px, SemiBold (600), semantic color (green/red)
- **Tertiary amounts:** 14px, Regular (400), muted foreground

---

## Components

### Button — Evolve to Pill

| Aspect | Current | Recommended |
|--------|---------|-------------|
| Shape (primary) | 12px radius | **Full radius (pill)** — modern, confident |
| Shape (secondary) | 12px radius | **12px radius** (keep — differentiation) |
| Background (primary) | Gradient | **Solid teal** — cleaner, loads faster |
| Press animation | Scale 0.97 | Scale 0.97 + **subtle brightness shift** |
| Loading state | ActivityIndicator | **Shimmer across button surface** |

```
Primary:    [════════ Save Changes ════════]   ← pill, solid teal, white text
Secondary:  [   Cancel   ]                      ← rounded rect, outline or ghost
Destructive: [   Delete   ]                     ← rounded rect, red outline (not filled)
```

### Card — Add Surface Hierarchy

Introduce a 3-tier surface system:

| Surface | Light | Dark | Usage |
|---------|-------|------|-------|
| **Base** | `#fafafa` | `#121820` | Screen background |
| **Card** | `#ffffff` | `#1a2332` | Content cards, list items |
| **Elevated** | `#ffffff` | `#1f2d3d` | Modals, bottom sheets, popovers |

- **Light mode cards:** Drop the shadow, use `1px border border-slate-100` instead — cleaner, more modern (Revolut approach)
- **Dark mode cards:** Keep glassmorphic border at 8% opacity, add subtle inner glow for modals
- **Card radius:** Increase from 16px to **20px** — more contemporary, friendlier
- **Card padding:** Increase from 16px to **20px** — more breathing room

### Input — Add Focus Animation

| State | Current | Recommended |
|-------|---------|-------------|
| Default | Muted bg, no border | Muted bg, `1px border-transparent` |
| Focus | No change | **Teal border fade-in** (150ms) + subtle scale 1.01 |
| Error | Red border | Red border + **shake animation** (subtle, 3 oscillations) |
| Filled | No change | **Slightly different bg** to show completion |

### Toast — Modernize to Floating Pill

| Aspect | Current | Recommended |
|--------|---------|-------------|
| Shape | Full-width bar, 3px left border | **Floating pill** (centered, pill-shaped, shadow) |
| Position | Top | Top (keep) |
| Animation | Fade + slide | **Spring in from top** (overshoot) + **spring out** |
| Dismiss | Tap or timeout | **Swipe up to dismiss** + timeout |
| Style | Colored background tint | **Dark pill** with colored icon (works in both themes) |

```
     ┌─────────────────────────────────┐
     │  ✓  Profile photo updated.      │   ← floating pill, dark bg, green icon
     └─────────────────────────────────┘
```

### Avatar — Add Ring & Status

| Enhancement | Description |
|-------------|-------------|
| **Activity ring** | 2px teal ring when user has pending action (owes money) |
| **Online dot** | Small green dot (optional, for real-time features later) |
| **Image quality** | Blur hash placeholder during load (expo-image supports this) |

### Empty State — Add Personality

Replace generic icon-in-circle with:
- **Illustrated empty states** (simple line illustrations, teal-tinted)
- **Contextual messaging** that guides action ("No expenses yet — tap + to add your first one")
- **Subtle animation** on the illustration (gentle float/bob, 3s cycle)

### Skeleton — Add Stagger

- Current: All skeleton items appear simultaneously
- **Recommended:** Stagger entrance by 50ms per item (subtle cascade effect)
- Add subtle pulse (opacity 0.5 → 0.8 → 0.5) in addition to shimmer

---

## Layout & Screens

### Hero Evolution

**Kill the uniform teal gradient hero.** Replace with context-appropriate treatments:

| Screen | Current | Recommended |
|--------|---------|-------------|
| **Home** | Teal gradient + emoji | **Dark card** with balance front-center, subtle teal radial glow behind amount |
| **Group detail** | Teal gradient + emoji watermark | **Banner image** (if uploaded) or **emoji + subtle category-tinted bg** |
| **Profile** | Teal gradient | **Avatar-centric** — large avatar, name below, clean white/dark card |
| **Settle-up** | Teal gradient | **Neutral** — focus on the numbers, celebration only after settlement |
| **Onboarding** | Teal gradient per step | **Full-bleed illustrations** with teal accents |

### Card Grouping — Section Headers

Add lightweight section headers between card groups:

```
  Balances                    ← 12px, semibold, muted, uppercase tracking
  ┌─────────────────────┐
  │  ...                 │
  └─────────────────────┘

  Recent Activity             ← section header
  ┌─────────────────────┐
  │  ...                 │
  └─────────────────────┘
```

### Whitespace

- Increase screen horizontal padding from `px-4/px-6` (16/24px) to **`px-5`** (20px) consistently
- Increase section spacing from `mb-6` (24px) to **`mb-8`** (32px)
- More generous padding inside cards: `p-5` (20px) standard

---

## Motion & Animation

### New Animations to Add

| Animation | Implementation | Impact |
|-----------|---------------|--------|
| **Number roll** | Animated counter for balance changes | High — makes money feel alive |
| **List stagger** | 50ms delay per item on screen load | Medium — premium feel |
| **Card press** | Scale 0.98 + slight shadow reduction | Medium — tactile feedback |
| **Screen transitions** | Shared element transitions (amount → detail) | High — spatial continuity |
| **Pull-to-refresh** | Custom teal spinner (not default) | Low — brand touch |
| **Swipe actions** | Spring-based reveal (archive, delete) | Medium — already exists, refine springs |
| **Success pulse** | Green ring pulse on successful payment | Medium — celebration |

### Animation Principles (Revolut-inspired)

1. **Every animation must earn its place** — if removing it doesn't hurt, remove it
2. **Financial data must feel stable** — don't animate text content, only amounts and charts
3. **Celebrate milestones only** — confetti for full settlement, subtle pulse for partial
4. **Springs > timing** — natural motion everywhere except fade in/out
5. **Respect reduced motion** — check `AccessibilityInfo.isReduceMotionEnabled()`

---

## Do's (Recommended Practices)

1. **Use semantic money colors** — green for positive, red for negative, always with text labels
2. **Tabular numerals everywhere** — `fontVariant: ['tabular-nums']` on all financial figures
3. **Vary hero treatments by context** — not every screen needs a teal gradient
4. **Pill-shaped primary buttons** — modern, confident, differentiated from secondary
5. **3-tier surface hierarchy** — base → card → elevated, especially in dark mode
6. **Animate balance changes** — number roll/count-up when amounts update
7. **Stagger list animations** — cascade entrance for premium feel
8. **Floating pill toasts** — dark, centered, icon-led, swipe-to-dismiss
9. **20px card radius** — friendlier, more contemporary
10. **More whitespace** — let the design breathe; density ≠ quality
11. **Blur hash placeholders** — for all images (avatars, banners, receipts)
12. **Section headers** — lightweight labels between content groups
13. **Reduced motion support** — `AccessibilityInfo` check, disable non-essential animations
14. **Custom pull-to-refresh** — branded spinner, not platform default

## Don'ts (Anti-Patterns to Avoid)

1. **Don't use the same hero gradient on every screen** — creates visual monotony
2. **Don't display amounts without semantic color** — users scan for green/red, not numbers
3. **Don't use proportional numerals for money** — layout shifts destroy trust
4. **Don't use heavy shadows** — 2018-era Material Design; prefer borders or elevation tiers
5. **Don't animate text content** — only amounts, charts, and decorative elements
6. **Don't use left-border accent on toasts** — dated pattern; use floating pills
7. **Don't show generic empty states** — every empty state is an onboarding opportunity
8. **Don't use gradient buttons** — solid colors are cleaner and more confident
9. **Don't over-celebrate** — confetti for full settlement only, not every action
10. **Don't ignore reduced motion preferences** — legal requirement in some regions
11. **Don't use pure black (`#000000`) in dark mode** — always use dark gray (`#121820` or similar)
12. **Don't make every interactive element teal** — reserve teal for primary actions; use gray/muted for secondary

---

## Migration Priority

Ranked by **impact × effort**:

| # | Change | Impact | Effort | Priority |
|---|--------|--------|--------|----------|
| 1 | Semantic money colors (green/red) | Very High | Low | **Do first** |
| 2 | Tabular numerals on amounts | High | Very Low | **Do first** |
| 3 | Increase base font size (13→14) | High | Low | **Do first** |
| 4 | Balance display size (34→42px) | High | Very Low | **Do first** |
| 5 | Warm up dark mode background | High | Low | **Week 1** |
| 6 | Pill-shaped primary buttons | Medium | Low | **Week 1** |
| 7 | Increase card radius (16→20px) | Medium | Low | **Week 1** |
| 8 | Vary hero treatments per screen | High | Medium | **Week 2** |
| 9 | Floating pill toasts | Medium | Medium | **Week 2** |
| 10 | List stagger animations | Medium | Medium | **Week 2** |
| 11 | Number roll animation | High | Medium | **Week 3** |
| 12 | Input focus animation | Low | Low | **Week 3** |
| 13 | Illustrated empty states | Medium | High | **Week 4** |
| 14 | Custom pull-to-refresh | Low | Medium | **Later** |
| 15 | Shared element screen transitions | High | High | **Later** |

---

## Side-by-Side Comparison

| Aspect | Pre (Current) | Post (Recommended) |
|--------|---------------|-------------------|
| **Personality** | Friendly utility | Premium social fintech |
| **Primary color** | Teal 600 (all modes) | Teal 600 light / Teal 500 dark |
| **Dark BG** | `#0f172a` (cold blue) | `#121820` (warm neutral) |
| **Body text** | 13px | 14px |
| **Balance display** | 34px | 42px, tabular nums |
| **Money colors** | None (all same) | Green owed / Red owe |
| **Numerals** | Proportional | Tabular (fixed-width) |
| **Button shape** | 12px radius | Pill (full radius) |
| **Card radius** | 16px | 20px |
| **Card shadow (light)** | Drop shadow | 1px border (cleaner) |
| **Hero treatment** | Same teal gradient everywhere | Context-specific per screen |
| **Toasts** | Left-border bar | Floating dark pill |
| **Empty states** | Icon + text | Illustrated + guided action |
| **List entrance** | All at once | Staggered cascade |
| **Number changes** | Instant jump | Animated roll/count |
| **Reduced motion** | Not supported | Respected |
