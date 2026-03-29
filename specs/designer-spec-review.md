# Critical Review — Designer's "Financial Atelier" Spec

> Reviewed against: Splitr's current implementation, product context (mobile-first expense splitting app), and modern fintech patterns.

---

## Verdict: Strong Vision, Wrong Product Fit

The spec is well-crafted and opinionated — exactly what a design system doc should be. The "Financial Atelier" philosophy (spaciousness as luxury, tonal layering, no-line rule) is genuinely modern. **However, it's designed for a different product.** It reads like a spec for a **web banking dashboard** or a **Stripe-style admin panel**, not a **mobile-first social expense splitting app** used by friends at dinner.

---

## What's Excellent (Keep)

### 1. The "No-Line" Rule
**Verdict: Adopt fully.**
Using tonal shifts instead of 1px borders for sectioning is objectively better. Splitr currently uses `border-slate-200` dividers in many places — replacing them with background color shifts will immediately feel more premium. This is the single best idea in the spec.

### 2. Tonal Surface Hierarchy
**Verdict: Adopt the concept, adjust the values.**
The 3-tier surface system (background → surface_container_low → surface_container_lowest) is a strong mental model. Splitr already has `background` and `card` but lacks a middle tier. Adding a `surfaceLow` between them would improve depth.

### 3. "Aggressive" Padding Philosophy
**Verdict: Adopt.**
Splitr currently uses `p-4` (16px) for cards and `px-4` (16px) screen edges — slightly cramped for fintech. Bumping to 20px aligns with both this spec and Revolut's approach.

### 4. Indigo-Tinted Shadows
**Verdict: Adapt (use teal-tinted instead of indigo-tinted).**
`rgba(70, 72, 212, 0.04)` shadows instead of gray is a brilliant detail. Splitr should use `rgba(13, 148, 136, 0.04)` (teal-tinted) for brand-consistent shadow warmth.

### 5. Ghost Borders for Accessibility
**Verdict: Adopt.**
Using `outline_variant` at 15% opacity as a fallback is smart. Better than Splitr's current `border-white/6%` which is too subtle.

---

## What Needs Significant Pushback

### 1. Indigo Primary (#4648d4) — REJECT
**This is the biggest issue.** The spec replaces teal (`#0d9488`) with indigo (`#4648d4`).

**Why this is wrong for Splitr:**
- Teal is Splitr's **established brand identity** — it's in the app icon, splash screen, every button, the entire codebase
- Teal is **distinctive in fintech** (Revolut=purple, Wise=green, Monzo=coral). Indigo puts us in Revolut's territory
- Teal signals **trust (blue) + freshness (green)** — perfect for an app that makes money feel non-awkward
- Indigo signals **luxury, corporate, premium banking** — wrong vibe for friends splitting pizza
- Migration cost: 100+ files, 50+ components, app store assets, brand materials

**Recommendation:** Keep teal `#0d9488` as primary. If the designer wants more depth, use the gradient concept (teal-600 → teal-700) but keep the hue.

### 2. Manrope Font — REJECT (for now)
**Why:**
- Inter is **industry standard** for fintech (used by Linear, Vercel, countless fintech apps)
- Inter has **superior screen optimization** — hinted for small sizes, variable font support
- Manrope is a fine font but offers no material advantage over Inter for mobile screens
- Switching fonts means re-testing every screen, adjusting line heights, checking truncation
- **Zero users will notice the difference** between Inter and Manrope on a phone screen

**Recommendation:** Keep Inter. If brand differentiation through type is critical later, consider it for marketing/web only — not the mobile app.

### 3. 8px Border Radius — PUSHBACK
The spec uses `DEFAULT: 8px` for buttons and inputs. Current Splitr uses `12px`.

**8px feels enterprise/dashboard.** Modern consumer fintech apps use 12–16px for components and 20–24px for cards:
- Revolut: ~12px buttons, ~16px cards
- Cash App: ~16px everywhere
- Monzo: ~12px buttons, ~20px cards

**Recommendation:** Keep current `12px` for buttons/inputs, consider bumping cards from `16px` to `20px`.

### 4. Light Mode Only — CRITICAL GAP
The spec has **zero dark mode guidance.** Splitr has full dark mode support (shipped, tested, used). The spec's surface hierarchy (`#f8f9fa`, `#f3f4f5`, `#ffffff`) only works in light mode.

**Recommendation:** Any adopted changes must include dark mode equivalents. Cannot ship a light-only system.

### 5. rem Units — NOT APPLICABLE
The spec uses `rem` units (3.5rem, 1.75rem, etc.). React Native uses pixels. Need pixel equivalents:
- 3.5rem = 56px (display-lg) — **way too large for mobile**. Current balance is 42px, which already fills the width
- 1.75rem = 28px (headline-md) — reasonable
- 1.375rem = 22px (title-lg) — reasonable
- 1rem = 16px (body-lg) — good
- 0.75rem = 12px (label-md) — good

### 6. Display-lg at 56px — TOO LARGE
On a 375px-wide iPhone screen, a balance like "₹12,450.00" at 56px would overflow or require tiny text elsewhere to compensate. Current 42px is already at the upper limit.

**Recommendation:** Keep 42px for hero balance. Use the "display" concept for web/tablet only.

### 7. No Motion/Animation Spec — MISSING
The spec has no guidance on:
- Transitions, spring physics, easing curves
- Micro-interactions (press states, loading, success)
- Navigation transitions
- Skeleton loading behavior

Splitr has a mature animation system (springs, shimmer, confetti). The spec's only motion mention is `0.5s` hover transition and `cubic-bezier(0.4, 0, 0.2, 1)` — inadequate for a mobile app.

### 8. No Money Color Semantics — MISSING
A fintech design system with no guidance on:
- Positive amount color (green)
- Negative amount color (red)
- Settled/neutral color
- Amount typography hierarchy

This is the most important visual decision in a money app and it's completely absent.

### 9. "Glassmorphism" Performance on React Native
The spec calls for `80% opacity + 20px backdrop-blur`. On React Native:
- `backdrop-filter: blur()` is **not natively supported** — requires `@react-native-community/blur` or `expo-blur`
- Performance cost is significant on Android (GPU-intensive)
- Only viable for overlays/modals, not general surfaces

**Recommendation:** Use glassmorphism sparingly — bottom sheets and modals only, with `expo-blur` `BlurView`.

### 10. No Mobile-Specific Patterns
The spec doesn't address:
- Bottom tab bar design
- Safe area handling
- Pull-to-refresh
- Swipe gestures
- Haptic feedback
- Platform-specific behaviors (iOS ActionSheet, Android back gesture)
- Keyboard avoidance

---

## Summary Scorecard

| Aspect | Designer's Spec | Verdict |
|--------|----------------|---------|
| Surface hierarchy (no-line rule) | Excellent | **Adopt** |
| Tonal layering philosophy | Excellent | **Adopt concept** |
| Aggressive padding | Good | **Adopt** |
| Indigo-tinted shadows | Excellent detail | **Adapt (use teal tint)** |
| Ghost borders | Good | **Adopt** |
| Indigo primary color | Wrong for Splitr | **Reject** |
| Manrope font | Unnecessary churn | **Reject** |
| 8px border radius | Too enterprise | **Reject** |
| Light mode only | Critical gap | **Incomplete** |
| rem units | Not applicable to RN | **Convert to px** |
| 56px display size | Too large for mobile | **Cap at 42px** |
| No motion spec | Major gap | **Missing** |
| No money colors | Major gap | **Missing** |
| Glassmorphism everywhere | Performance concern | **Limit to overlays** |
| No mobile patterns | Major gap | **Missing** |

---

## Recommended Synthesis

Take the best ideas from the designer's spec and merge them with Splitr's existing strengths:

1. **Adopt the philosophy** — spaciousness, tonal layering, no divider lines
2. **Keep the brand** — teal primary, Inter font, existing animation system
3. **Upgrade surfaces** — add a middle surface tier, increase padding to 20px
4. **Add what's missing** — money colors, dark mode, motion spec, mobile patterns
5. **Apply indigo-tint concept to teal** — teal-tinted shadows, teal ghost borders

See `screenshots/recommended-design.html` for the visual synthesis.
