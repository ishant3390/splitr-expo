# TabBar

- **Category:** Navigation
- **Status:** Stable
- **Source:** `components/TabBar.tsx`

## Overview

Custom bottom tab bar with Airbnb-style animated icons, a sliding active indicator pill, and a central FAB (Floating Action Button) for adding expenses. Replaces React Navigation's default tab bar.

**When to use:** Automatically used as the `tabBar` prop in the `(tabs)` layout.
**When not to use:** Not intended for standalone use outside the tab navigator.

## Anatomy

1. **Gradient fade** -- `LinearGradient` above the bar for smooth edge blending
2. **Container** -- Semi-transparent background (`rgba` with 0.95 opacity)
3. **Sliding indicator** -- Animated teal pill (3px height) at the top, tracks active tab
4. **Tab row** -- Horizontal flex row containing:
   - Tab items (4) -- icon + label, each with bounce/fade animation
   - FAB (center) -- Plus icon on teal background with glow shadow
5. **TabIcon** -- Dual-layer icon (outline + filled) with crossfade and bounce
6. **TabLabel** -- Animated text with opacity and scale

## Tokens Used

| Token | Usage |
|---|---|
| `radius["2xl"]` (24) | FAB border radius |
| `fontSize` (10px inline) | Tab label font size |
| `GRADIENTS.tabBarLight/Dark` | Top fade gradient |
| `ACTIVE_COLOR` `#0d9488` | Active icon/label/indicator color |
| `INACTIVE_COLOR` `#94a3b8` | Inactive icon/label color |

## Sub-components

### TabIcon

Airbnb-style icon with outline-to-filled crossfade on selection.

| Animation | Config |
|---|---|
| Bounce in | Scale: 1 -> 1.08 -> 1.02 (spring, damping 10, stiffness 250) |
| Lift | translateY: 0 -> -3 (spring, smooth) |
| Fill crossfade | Opacity toggle over 150-200ms |

### TabLabel

| Animation | Config |
|---|---|
| Active | opacity: 1, scale: 1 |
| Inactive | opacity: 0.6, scale: 0.95 |
| Font | Active: `Inter_600SemiBold`, Inactive: `Inter_500Medium` |

### FABButton

| Property | Value |
|---|---|
| Size | 52x52px |
| Background | `#0d9488` (teal600) |
| Icon | Plus, 24px, white, strokeWidth 2.5 |
| Shadow | Teal glow (same as `SHADOWS.glowTeal`) |
| Press | Scale 0.95 spring bounce |
| Long press | Opens quick-add mode (`?quick=true`), 400ms delay |
| Haptics | `hapticMedium()` on press and long press |

### Sliding Indicator

| Property | Value |
|---|---|
| Height | 3px |
| Width | 20px (stretches to 28px during movement) |
| Color | `#0d9488` (teal600) |
| Animation | Spring: damping 10, stiffness 200, mass 0.6 |

## Tab Routes

| Route name | Label | Icon component |
|---|---|---|
| `index` | Home | `HomeIcon` |
| `groups` | Groups | `GroupsIcon` |
| `add` | -- | FABButton (center) |
| `activity` | Activity | `ActivityIcon` |
| `profile` | Profile | `ProfileIcon` |

## Layout

- Tab row accounts for the FAB in the center (5 slots, FAB is slot 3)
- Indicator position skips the FAB slot when calculating position
- Bottom padding: `safeAreaInsets.bottom` or 16px fallback
- Background: translucent with backdrop blur effect (via high opacity rgba)

## Haptics

- Tab selection: `hapticSelection()` (light)
- FAB press/long-press: `hapticMedium()` (medium impact)

## Accessibility

- Each tab: `accessibilityRole="button"`, `accessibilityState={{ selected }}`, `accessibilityLabel`
- FAB: `accessibilityLabel="Add Expense"`, `accessibilityRole="button"`

## Code Example

```tsx
// In (tabs)/_layout.tsx
<BottomTabs tabBar={(props) => <TabBar {...props} />}>
  {/* tab screens */}
</BottomTabs>
```

## Cross-references

- [Tabs](./tabs.md) -- in-screen segmented control (different purpose)
- Custom tab icons: `components/icons/tab-icons.tsx`
- Haptics: `lib/haptics.ts`
