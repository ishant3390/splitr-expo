# Motion / Animation

Duration constants live in `lib/tokens.ts` as `duration`. Spring configs are defined inline per component using `react-native-reanimated`.

## Duration Scale

| Token | Value (ms) | Use case |
|---|---|---|
| `fast` | 150 | Micro-interactions: icon crossfade, opacity toggle |
| `normal` | 250 | Standard transitions: toast enter, tab indicator |
| `slow` | 350 | Deliberate transitions: screen enter, modal backdrop |

## Spring Presets

These are not exported as named constants but are used consistently across components.

### Bouncy (tab bar icon bounce, indicator stretch)

```ts
{ damping: 10, stiffness: 200, mass: 0.6 }
```

Quick, playful overshoot. Used for tab icon selection bounce.

### Smooth (tab bar settle, label scale)

```ts
{ damping: 14, stiffness: 150, mass: 0.8 }
```

Controlled settle with minimal overshoot. Used for position animations that should feel precise.

### Button press

```ts
// Press in: quick response
{ damping: 10, stiffness: 200 }

// Press out: softer return
{ damping: 8, stiffness: 150 }
```

Subtle scale (0.97) on press for tactile feedback.

### Bottom sheet enter/exit

Bottom sheets now prioritize reliability on iOS and use native `Modal` fade presentation rather than custom spring slide transitions.

### FAB bounce

```ts
// Press: quick compress
{ damping: 8, stiffness: 200 }

// Release: controlled return
{ damping: 10, stiffness: 150 }
```

## Timing Curves

Used with `withTiming` for non-spring animations:

| Usage | Duration | Easing |
|---|---|---|
| Toast enter | 250ms | `Easing.out(Easing.cubic)` |
| Toast exit | 180ms | `Easing.out(Easing.cubic)` |
| Tab icon crossfade (in) | 150ms | Linear (withTiming default) |
| Tab icon crossfade (out) | 200ms | Linear |
| Skeleton shimmer cycle | 850ms | `Easing.inOut(Easing.ease)` |

## Reduced Motion

- Not currently handled at the token level
- Components using Reanimated respect the system `reduceMotion` preference when configured
- Future: Add a `reduceMotion` flag to duration/spring config that falls back to `withTiming(value, { duration: 0 })`

## Opacity Presets

Related to motion/interaction states, exported from `lib/tokens.ts` as `opacity`:

| Token | Value | Use case |
|---|---|---|
| `disabled` | 0.5 | Disabled buttons/inputs |
| `hover` | 0.08 | Hover overlay (web) |
| `pressed` | 0.12 | Press overlay |
| `overlay` | 0.5 | Modal backdrop |
| `watermark` | 0.08 | Background watermark decorations |
