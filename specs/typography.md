# Typography

All type values live in `lib/tokens.ts` as `fontSize` and `fontFamily`.

## Font Scale

| Token | Value (px) | NativeWind class | Typical use |
|---|---|---|---|
| `xs` | 11 | `text-xs` | Captions, badges, timestamps |
| `sm` | 12 | `text-sm` | Labels, secondary text, avatar fallback |
| `base` | 13 | `text-base` | Body text, button text (md) |
| `md` | 14 | `text-md` | Default body, input text, tab labels |
| `lg` | 15 | `text-lg` | Button text (lg), emphasized body |
| `xl` | 17 | `text-xl` | Section headings, modal titles |
| `2xl` | 20 | `text-2xl` | Screen headings |
| `3xl` | 24 | `text-3xl` | Hero numbers |
| `4xl` | 28 | `text-4xl` | Large hero text |
| `5xl` | 34 | `text-5xl` | Balance display |

## Weight-to-Family Mapping

| Weight | Value | Family constant | NativeWind class |
|---|---|---|---|
| Regular | 400 | `Inter_400Regular` | `font-sans` |
| Medium | 500 | `Inter_500Medium` | `font-sans-medium` |
| SemiBold | 600 | `Inter_600SemiBold` | `font-sans-semibold` |
| Bold | 700 | `Inter_700Bold` | `font-sans-bold` |

Access via `fontFamily.regular`, `fontFamily.medium`, `fontFamily.semibold`, `fontFamily.bold`.

## Line Height Conventions

- General body text: 1.4x-1.5x font size
- Tight (headings): 1.2x-1.3x font size
- Relaxed (paragraphs): 1.5x-1.6x font size

React Native uses absolute `lineHeight` values, not multipliers. Common pairings:

| Font size | Recommended lineHeight |
|---|---|
| 11 (xs) | 16 |
| 12 (sm) | 17 |
| 13 (base) | 18-19 |
| 14 (md) | 20 |
| 15 (lg) | 21 |
| 17 (xl) | 24 |
| 20 (2xl) | 28 |
| 24 (3xl) | 32 |

## Usage Guidance

- Use `className` with NativeWind font classes for static text: `className="text-base font-sans-medium"`
- Use `fontFamily.*` and `fontSize.*` in `StyleSheet.create` or inline styles when className is not available (e.g., Reanimated animated text, computed styles)
- Never use raw font family strings like `"Inter_500Medium"` directly -- always go through `fontFamily.medium`
