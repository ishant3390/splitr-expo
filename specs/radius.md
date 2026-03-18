# Border Radius

All radius values live in `lib/tokens.ts` as `radius`.

## Scale

| Token | Value (px) | NativeWind class |
|---|---|---|
| `none` | 0 | `rounded-none` |
| `sm` | 6 | `rounded-sm` |
| `md` | 8 | `rounded-md` / `rounded-lg` |
| `DEFAULT` | 12 | `rounded-xl` |
| `lg` | 16 | `rounded-2xl` |
| `xl` | 20 | `rounded-[20px]` |
| `2xl` | 24 | `rounded-3xl` |
| `full` | 9999 | `rounded-full` |

## Component-to-Radius Mapping

| Component | Radius token | Value | Notes |
|---|---|---|---|
| Cards | `radius.DEFAULT` or `radius.lg` | 12 or 16 | Cards use `rounded-2xl` (16) by default |
| Buttons (sm) | `radius.md` | 8 | `rounded-lg` |
| Buttons (md/lg) | `radius.DEFAULT` | 12 | `rounded-xl` |
| Badges / Pills | `radius.full` | 9999 | Fully rounded |
| Inputs | `radius.DEFAULT` | 12 | `rounded-xl` |
| Avatars | `radius.full` | 9999 | Always circular |
| Bottom sheets | `radius["2xl"]` | 24 | Top corners only |
| Modals (center) | `radius.xl` | 20 | ConfirmModal uses `radius.xl` |
| Tabs (container) | `radius.DEFAULT` | 12 | `rounded-xl` |
| Tabs (individual) | `radius.md` | 8 | Active tab pill |
| Toast | `radius.lg` | 16 | Rounded with left accent border |
| Skeleton items | `radius.md` | 8 | Default `borderRadius` for shimmer blocks |
| FAB | `radius["2xl"]` | 24 | Rounded square, not circular |
| Swipe actions | `radius.DEFAULT` | 12 | Rounded on outer edges only |

## Usage Guidance

- Use NativeWind `rounded-*` classes for static border radius
- Use `radius.*` tokens in `StyleSheet.create` or inline styles
- Always pair with `borderCurve: "continuous"` on iOS for smooth squircle corners (Card, ConfirmModal)
