# Elevation / Shadows

Shadow presets live in `lib/shadows.ts` as `SHADOWS`. NativeWind does not support `boxShadow` on native, so shadows must be applied via inline `style` prop.

## Presets

### `SHADOWS.card`

Default card elevation. Subtle, non-distracting.

| Platform | Property | Value |
|---|---|---|
| iOS | `shadowColor` | `#000` |
| iOS | `shadowOffset` | `{ width: 0, height: 2 }` |
| iOS | `shadowOpacity` | `0.06` |
| iOS | `shadowRadius` | `12` |
| Android | `elevation` | `3` |
| Web | Same as iOS | (uses default/iOS path) |

**Used by:** Card (default variant), list items

### `SHADOWS.elevated`

Modals, popovers, floating elements. More pronounced depth.

| Platform | Property | Value |
|---|---|---|
| iOS | `shadowColor` | `#000` |
| iOS | `shadowOffset` | `{ width: 0, height: 8 }` |
| iOS | `shadowOpacity` | `0.1` |
| iOS | `shadowRadius` | `24` |
| Android | `elevation` | `8` |
| Web | Same as iOS | (uses default/iOS path) |

**Used by:** Card (elevated variant), BottomSheetModal, ConfirmModal

### `SHADOWS.glowTeal`

Primary action emphasis. Teal-colored glow for CTAs and the FAB.

| Platform | Property | Value |
|---|---|---|
| iOS | `shadowColor` | `#0d9488` |
| iOS | `shadowOffset` | `{ width: 0, height: 4 }` |
| iOS | `shadowOpacity` | `0.2` |
| iOS | `shadowRadius` | `16` |
| Android | `elevation` | `6` |
| Web | Same as iOS | (uses default/iOS path) |

**Used by:** Button (default variant), FAB

## Usage

```tsx
import { SHADOWS } from "@/lib/shadows";

// Apply via style prop
<View style={[styles.card, SHADOWS.card]}>

// Conditional (e.g., skip in dark mode)
style={[!isDark && SHADOWS.card]}
```

## Notes

- Shadows use `Platform.select` to return the correct type per platform
- Android only supports `elevation` (no color/offset control)
- Dark mode: Card component skips shadow in dark mode and uses a subtle border (`border-white/[0.06]`) instead
- Always spread shadow into the `style` array, never into `className`
