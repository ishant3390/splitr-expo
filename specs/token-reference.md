# Token Reference

Master map of every export from `lib/tokens.ts`.

## `palette` (object, `as const`)

Raw color primitives. See [colors.md](./colors.md) for full table.

| Key | Value | Category |
|---|---|---|
| `white` | `#ffffff` | Neutral |
| `black` | `#000000` | Neutral |
| `slate50`..`slate950` | See colors.md | Neutral scale (11 steps) |
| `teal50`..`teal950` | See colors.md | Brand scale (11 steps) |
| `emerald500` | `#10b981` | Accent |
| `emerald600` | `#059669` | Accent |
| `cyan600` | `#0891b2` | Accent |
| `red500` | `#ef4444` | Status |
| `amber500` | `#f59e0b` | Status |
| `blue500` | `#3b82f6` | Chart |
| `purple500` | `#a855f7` | Chart |
| `pink500` | `#ec4899` | Accent |
| `orange500` | `#f97316` | Accent |
| `indigo500` | `#6366f1` | Accent |

## `colors(isDark: boolean)` (function)

Returns a `SemanticColors` object for the given color scheme. 22 semantic tokens. See [colors.md](./colors.md) for the full mapping.

## `useThemeColors()` (hook)

Convenience hook that calls `colors()` with the current NativeWind color scheme. Returns `SemanticColors`.

## `fontSize` (object, `as const`)

| Key | Value |
|---|---|
| `xs` | 11 |
| `sm` | 12 |
| `base` | 13 |
| `md` | 14 |
| `lg` | 15 |
| `xl` | 17 |
| `2xl` | 20 |
| `3xl` | 24 |
| `4xl` | 28 |
| `5xl` | 34 |

## `fontFamily` (object, `as const`)

| Key | Value |
|---|---|
| `regular` | `Inter_400Regular` |
| `medium` | `Inter_500Medium` |
| `semibold` | `Inter_600SemiBold` |
| `bold` | `Inter_700Bold` |

## `spacing` (object, `as const`)

| Key | Value |
|---|---|
| `0` | 0 |
| `0.5` | 2 |
| `1` | 4 |
| `1.5` | 6 |
| `2` | 8 |
| `2.5` | 10 |
| `3` | 12 |
| `3.5` | 14 |
| `4` | 16 |
| `5` | 20 |
| `6` | 24 |
| `7` | 28 |
| `8` | 32 |
| `10` | 40 |
| `12` | 48 |
| `16` | 64 |

## `radius` (object, `as const`)

| Key | Value |
|---|---|
| `none` | 0 |
| `sm` | 6 |
| `md` | 8 |
| `DEFAULT` | 12 |
| `lg` | 16 |
| `xl` | 20 |
| `2xl` | 24 |
| `full` | 9999 |

## `zIndex` (object, `as const`)

| Key | Value | Use case |
|---|---|---|
| `base` | 0 | Default stacking |
| `dropdown` | 10 | Dropdown menus, mention popover |
| `sticky` | 20 | Sticky headers |
| `modal` | 50 | Modal overlays |
| `toast` | 100 | Toast notifications (highest) |

## `duration` (object, `as const`)

| Key | Value (ms) |
|---|---|
| `fast` | 150 |
| `normal` | 250 |
| `slow` | 350 |

## `opacity` (object, `as const`)

| Key | Value | Use case |
|---|---|---|
| `disabled` | 0.5 | Disabled interactive elements |
| `hover` | 0.08 | Hover state overlay |
| `pressed` | 0.12 | Pressed state overlay |
| `overlay` | 0.5 | Modal/sheet backdrop |
| `watermark` | 0.08 | Background watermark decorations |

## `chartColors` (array, `as const`)

Five colors for pie/bar charts:

| Index | Value | Source |
|---|---|---|
| 0 | `#0d9488` | `palette.teal600` |
| 1 | `#10b981` | `palette.emerald500` |
| 2 | `#3b82f6` | `palette.blue500` |
| 3 | `#f59e0b` | `palette.amber500` |
| 4 | `#a855f7` | `palette.purple500` |
