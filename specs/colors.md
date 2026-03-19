# Colors

All color values live in `lib/tokens.ts`. Never hardcode hex values in components.

## Palette Primitives

Raw color constants exported as `palette`.

| Token | Value | Usage |
|---|---|---|
| `white` | `#ffffff` | Foreground on primary, thumb colors |
| `black` | `#000000` | Shadow base |
| **Slate scale** | | |
| `slate50` | `#f8fafc` | — |
| `slate100` | `#f1f5f9` | Light muted, light secondary, light borderSubtle |
| `slate200` | `#e2e8f0` | Light border, light input |
| `slate300` | `#cbd5e1` | — |
| `slate400` | `#94a3b8` | Dark mutedForeground, inactive icons |
| `slate500` | `#64748b` | Light mutedForeground |
| `slate600` | `#475569` | — |
| `slate700` | `#334155` | Dark muted, dark border, dark input |
| `slate800` | `#1e293b` | Dark card, dark secondary, light secondaryForeground |
| `slate900` | `#0f172a` | Dark background, light foreground/cardForeground |
| `slate950` | `#020617` | — |
| **Teal (Brand)** | | |
| `teal50` | `#f0fdfa` | Light surfaceTint |
| `teal100` | `#ccfbf1` | — |
| `teal200` | `#99f6e4` | — |
| `teal300` | `#5eead4` | — |
| `teal400` | `#2dd4bf` | — |
| `teal500` | `#14b8a6` | Accent |
| `teal600` | `#0d9488` | Primary, ring |
| `teal700` | `#0f766e` | — |
| `teal800` | `#115e59` | — |
| `teal900` | `#134e4a` | — |
| `teal950` | `#042f2e` | Dark surfaceTint |
| **Semantic accents** | | |
| `emerald500` | `#10b981` | Success |
| `emerald600` | `#059669` | — |
| `cyan600` | `#0891b2` | — |
| `red500` | `#ef4444` | Destructive |
| `amber500` | `#f59e0b` | Warning |
| `blue500` | `#3b82f6` | Chart color |
| `purple500` | `#a855f7` | Chart color |
| `pink500` | `#ec4899` | — |
| `orange500` | `#f97316` | — |
| `indigo500` | `#6366f1` | — |

## Semantic Color Mapping

Resolved via `colors(isDark)` or `useThemeColors()`.

| Semantic Token | Light | Dark |
|---|---|---|
| `background` | `#f8fafb` | `#0f172a` (slate900) |
| `foreground` | `#0f172a` (slate900) | `#f1f5f9` (slate100) |
| `card` | `#ffffff` | `#1e293b` (slate800) |
| `cardForeground` | `#0f172a` (slate900) | `#f1f5f9` (slate100) |
| `muted` | `#f1f5f9` (slate100) | `#334155` (slate700) |
| `mutedForeground` | `#64748b` (slate500) | `#94a3b8` (slate400) |
| `border` | `#e2e8f0` (slate200) | `#334155` (slate700) |
| `input` | `#e2e8f0` (slate200) | `#334155` (slate700) |
| `secondary` | `#f1f5f9` (slate100) | `#1e293b` (slate800) |
| `secondaryForeground` | `#1e293b` (slate800) | `#e2e8f0` (slate200) |
| `surfaceTint` | `#f0fdfa` (teal50) | `#042f2e` (teal950) |
| `borderSubtle` | `#f1f5f9` (slate100) | `rgba(255,255,255,0.06)` |
| `primary` | `#0d9488` (teal600) | `#0d9488` (teal600) |
| `primaryForeground` | `#ffffff` | `#ffffff` |
| `accent` | `#14b8a6` (teal500) | `#14b8a6` (teal500) |
| `accentForeground` | `#ffffff` | `#ffffff` |
| `success` | `#10b981` (emerald500) | `#10b981` (emerald500) |
| `successForeground` | `#ffffff` | `#ffffff` |
| `destructive` | `#ef4444` (red500) | `#ef4444` (red500) |
| `destructiveForeground` | `#ffffff` | `#ffffff` |
| `warning` | `#f59e0b` (amber500) | `#f59e0b` (amber500) |
| `warningForeground` | `#1a1a1a` | `#1a1a1a` |
| `ring` | `#0d9488` (teal600) | `#0d9488` (teal600) |

## Chart Colors

Five distinct hues for pie/bar charts, exported as `chartColors`:

| Index | Value | Source |
|---|---|---|
| 0 | `#0d9488` | `palette.teal600` |
| 1 | `#10b981` | `palette.emerald500` |
| 2 | `#3b82f6` | `palette.blue500` |
| 3 | `#f59e0b` | `palette.amber500` |
| 4 | `#a855f7` | `palette.purple500` |

## When to Use `className` vs `colors(isDark)`

| Situation | Approach | Example |
|---|---|---|
| Layout/container styles | NativeWind `className` | `className="bg-card text-foreground"` |
| Icon `color` prop | `colors(isDark)` | `color={c.primary}` |
| Conditional inline styles | `colors(isDark)` | `style={{ borderColor: c.border }}` |
| Dynamic/computed values | `colors(isDark)` | `backgroundColor: isActive ? c.primary : c.muted` |
| `placeholderTextColor` | `colors(isDark)` | `placeholderTextColor={c.placeholder}` |

**Key rule:** Use `className` for static layout/container styling. Use `colors()` for dynamic props that need runtime resolution (icon colors, conditional styles, non-className props like `placeholderTextColor`).
