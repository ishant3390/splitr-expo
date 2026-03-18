# Spacing

All spacing values live in `lib/tokens.ts` as `spacing`. Based on a 4px grid with 2px and 6px for fine-tuning.

## Scale

| Token | Value (px) | Tailwind equivalent |
|---|---|---|
| `0` | 0 | `p-0` / `m-0` |
| `0.5` | 2 | `p-0.5` / `m-0.5` |
| `1` | 4 | `p-1` / `m-1` |
| `1.5` | 6 | `p-1.5` / `m-1.5` |
| `2` | 8 | `p-2` / `m-2` |
| `2.5` | 10 | `p-2.5` / `m-2.5` |
| `3` | 12 | `p-3` / `m-3` |
| `3.5` | 14 | `p-3.5` / `m-3.5` |
| `4` | 16 | `p-4` / `m-4` |
| `5` | 20 | `p-5` / `m-5` |
| `6` | 24 | `p-6` / `m-6` |
| `7` | 28 | `p-7` / `m-7` |
| `8` | 32 | `p-8` / `m-8` |
| `10` | 40 | `p-10` / `m-10` |
| `12` | 48 | `p-12` / `m-12` |
| `16` | 64 | `p-16` / `m-16` |

## When to Use Tailwind Classes vs `spacing.*`

| Situation | Approach | Example |
|---|---|---|
| Static padding/margin | NativeWind `className` | `className="p-4 mb-2"` |
| Gap between items | NativeWind `className` | `className="gap-3"` |
| Dynamic/conditional spacing | Inline `spacing.*` | `style={{ marginTop: spacing[2] }}` |
| Computed layout values | Inline `spacing.*` | `style={{ padding: isCompact ? spacing[2] : spacing[4] }}` |
| Animation targets | Inline `spacing.*` | `translateY: withSpring(spacing[1])` |

**Key rule:** Same as colors -- use `className` for static layout, `spacing.*` for dynamic or computed values.

## Common Patterns

- **Card internal padding:** `p-4` (16px) or `p-5` (20px)
- **Section gaps:** `gap-3` (12px) or `gap-4` (16px)
- **Screen horizontal padding:** `px-4` (16px) or `px-6` (24px)
- **List item vertical padding:** `py-3` (12px) or `py-4` (16px)
- **Tight grouping (label + value):** `gap-1` (4px) or `gap-1.5` (6px)
- **Between sections:** `mb-6` (24px) or `mb-8` (32px)
