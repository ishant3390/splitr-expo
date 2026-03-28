# BottomSheetModal

- **Category:** Layout
- **Status:** Stable
- **Source:** `components/ui/bottom-sheet-modal.tsx`

## Overview

Bottom sheet overlay built on native `Modal` with a stable, reliability-first layout. Used for forms, selection lists, and detail views.

**When to use:** Secondary flows (add member, share group, select category), detail views that don't warrant a full screen.
**When not to use:** Simple yes/no confirmations (use ConfirmModal), full-screen workflows.

## Anatomy

1. **Modal** -- Native `Modal` with `transparent` and `animationType="fade"` for backdrop
2. **Dark mode wrapper** -- View with `dark` class for NativeWind CSS variable resolution
3. **Backdrop** -- Pressable with `rgba(0,0,0,0.4)` background, dismisses on tap
4. **Content container** -- bounded `View` container with min/max height, card background, top radius
5. **Drag handle** -- Decorative pill (40x5px) at top
6. **Children** -- Consumer-provided content

## Tokens Used

| Token | Usage |
|---|---|
| `radius["2xl"]` (24) | Top-left and top-right border radius |
| `colors(isDark).card` | Content background color |
| `SHADOWS.elevated` equivalent | Inline shadow (shadowRadius 24, opacity 0.1) |

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `visible` | `boolean` | required | Controls visibility |
| `onClose` | `() => void` | required | Called on backdrop tap or Android back |
| `children` | `ReactNode` | required | Sheet content |
| `keyboardAvoiding` | `boolean` | `false` | Wraps content in KeyboardAvoidingView |

## Animation

| Phase | Config |
|---|---|
| Backdrop + sheet | Native Modal `fade` animation |

## Layout

- Padding: 24px horizontal, 24px top, 36px bottom (iOS) / 24px bottom (Android)
- Gap between children: 16px
- Drag handle: centered, 40x5px, `borderRadius: 2.5`
- Handle color: `#475569` (dark) / `#d1d5db` (light)

## States

| State | Behavior |
|---|---|
| Visible | Appears with native fade, anchored to bottom |
| Backdrop tap | Calls `onClose` |
| Android back | Calls `onClose` via `onRequestClose` |
| Keyboard open | If `keyboardAvoiding`, content pushes up with keyboard |

## Code Example

```tsx
<BottomSheetModal
  visible={showSheet}
  onClose={() => setShowSheet(false)}
  keyboardAvoiding
>
  <Text className="text-xl font-sans-bold text-foreground">Add Member</Text>
  <Input label="Name" value={name} onChangeText={setName} />
  <Button onPress={handleAdd}>Add</Button>
</BottomSheetModal>
```

## Cross-references

- [ConfirmModal](./confirm-modal.md) -- centered dialog alternative
- [Input](./input.md) -- commonly used inside sheets with `keyboardAvoiding`
