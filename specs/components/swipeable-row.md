# SwipeableRow

- **Category:** Navigation
- **Status:** Stable
- **Source:** `components/ui/swipeable-row.tsx`

## Overview

iOS-style swipeable list row that reveals Edit and Delete actions on left swipe. Wraps child content using `react-native-gesture-handler` Swipeable.

**When to use:** List items that support edit and/or delete (expenses, settlements).
**When not to use:** Non-list contexts, items with only a single action (use a visible button instead).

## Anatomy

1. **Swipeable wrapper** -- `Swipeable` from gesture handler with right actions
2. **Children** -- The visible row content
3. **Action buttons** -- Revealed on swipe:
   - Edit button (teal background, Pencil icon) -- left-rounded corners
   - Delete button (red background, Trash2 icon) -- right-rounded corners

## Tokens Used

| Token | Usage |
|---|---|
| `fontSize.xs` (11) | Action button label text |
| `fontFamily.semibold` | Action button label font |
| `palette.teal600` (`#0d9488`) | Edit action background |
| `palette.red500` (`#ef4444`) | Delete action background |
| `palette.white` | Icon and text color |
| `radius.DEFAULT` (12) | Action button corner radius |

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `ReactNode` | required | Row content |
| `onDelete` | `() => void` | -- | Delete action callback; omit to hide delete button |
| `onEdit` | `() => void` | -- | Edit action callback; omit to hide edit button |

## Layout

- Action button width: 72px each
- Edit: rounded top-left and bottom-left (12px)
- Delete: rounded top-right and bottom-right (12px)
- Icons: 18px, white
- Gap between icon and label: 4px

## Swipe Config

- `overshootRight={false}` -- prevents over-scroll past actions
- `friction={2}` -- moderate resistance
- `rightThreshold={40}` -- minimum swipe distance to reveal

## Animation

- Actions enter with `FadeIn.duration(200)` (Reanimated)
- Swipeable auto-closes after action is pressed

## Accessibility

- Both action buttons have `accessibilityRole="button"`
- `accessibilityLabel="Edit"` / `accessibilityLabel="Delete"`

## Code Example

```tsx
<SwipeableRow
  onEdit={() => router.push(`/edit-expense/${expense.id}`)}
  onDelete={() => handleDelete(expense.id)}
>
  <ExpenseRow expense={expense} />
</SwipeableRow>
```

## Cross-references

- [ConfirmModal](./confirm-modal.md) -- typically shown after swipe-to-delete for confirmation
- [Toast](./toast.md) -- shown after delete with undo action
