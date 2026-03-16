# ADR-002: Group Detail Page Redesign — Settings Separation

**Date**: 2026-03-16
**Status**: Accepted
**Decision makers**: Ajay Wadhara

## Context

The group detail page (`app/(tabs)/groups/[id].tsx`, ~1200 lines) had become a monolithic screen containing everything: group info, member cards with remove buttons, summary stats, settle up CTA, notification toggle, simplify debts toggle, insights/analytics, share/QR modal, archive/delete actions, and the full expense activity feed — all in one scrolling view.

This created cognitive overload. Users opening a group were hit with settings, stats, toggles, and expenses simultaneously. The page tried to answer every possible question at once rather than the primary one: "What do I owe and what happened recently?"

Research was conducted across three axes:
1. Direct competitors (Splitwise, Tricount)
2. Fintech group features (Venmo, Cash App, Revolut)
3. Modern mobile UX best practices (Airbnb, WhatsApp, Notion, Wise)

## Approaches Considered

### Proposal A: "Clean Ledger" (Selected)

**Concept**: Separate the group detail page into two screens — a clean, ledger-first detail page and a dedicated Group Settings page behind a gear icon.

**Group Detail Page (simplified):**
- Header: back button, group name + emoji, gear icon, share icon
- Compact horizontal avatar strip (tap navigates to settings/members)
- Hero balance card (user's net balance + total spent)
- 2 action buttons: Add Expense + Settle Up
- Last 5 recent expenses with "See All"
- Recent non-expense activity (settlements, member joins)

**Group Settings Page (new — behind gear icon):**
- Group Details: name, emoji, type, currency (editable)
- Members: full list with add/remove/invite management
- Preferences: notification toggle, simplify debts toggle
- Insights: by person, by category, monthly spending
- Danger Zone: archive, delete

**Pros:**
- Lowest cognitive load on the primary screen (~4 sections vs ~12)
- Gear icon is universally understood (WhatsApp, Venmo, Revolut all use it)
- Progressive disclosure: "See All" for expenses, settings behind gear
- Clean separation of concerns — detail page ~400 lines, settings page gets the rest
- Web-first friendly (no gesture dependency)
- Avoids Splitwise's anti-pattern of burying settings too deep

**Cons:**
- Notification/simplify debts toggles require an extra tap to reach
- Users must learn the gear icon location

### Proposal B: "Tabbed Detail"

**Concept**: Keep everything on one page but organize content into tabs (Expenses | Balances | Settle), inspired by Tricount's 2024 redesign.

**Structure:**
- Compact header with avatar strip and balance
- Horizontal action row
- Segmented control with 3 tabs
- Each tab has its own scrollable content

**Pros:**
- All content accessible without navigating to a new page
- Tabs create clear mental categories
- Tricount validated this pattern successfully

**Cons:**
- Settings (notifications, simplify debts, archive) still need somewhere to live — likely a gear icon anyway
- Tabs on mobile can feel cramped with 3+ options
- Monthly-grouped expense lists work poorly in tab constraints
- Doesn't actually solve the "too much on one screen" problem for settings

### Proposal C: "WhatsApp-Style Info Page"

**Concept**: Keep the group detail as purely an expense feed with a sticky bottom action bar. Tapping the group name/header area opens a separate "Group Info" page (similar to WhatsApp group info).

**Structure:**
- Group detail = expense feed only, with sticky bottom bar for Add Expense + Settle Up
- Tapping group name in header opens Group Info page
- Group Info contains: identity, members, settings, insights, danger zone

**Pros:**
- Expense feed is maximally clean — no distractions
- WhatsApp has proven this pattern at scale
- Group Info page can be comprehensive without cluttering the feed

**Cons:**
- Discoverable only if users know to tap the header (not obvious for new users)
- Balance summary hidden behind a tap — the most important info isn't immediately visible
- No gear icon visible means users may not discover settings
- The "tap header for info" convention is messaging-specific, less familiar in fintech

## Decision

**Proposal A: "Clean Ledger"** was selected because:

1. **Research consensus**: All three research axes (competitors, fintech, UX best practices) converged on "gear icon → dedicated settings page" as the dominant pattern
2. **Cognitive load reduction**: Reduces the primary screen from ~12 sections to ~4, answering "what do I owe?" in under 1 second
3. **Avoids known anti-patterns**: Splitwise buries simplify debts in settings where users never find it; our Preferences section in settings is prominent, not buried
4. **Implementation cleanliness**: Splits a 1200-line monolithic component into two focused components (~400 + ~600 lines)
5. **Web-first alignment**: Gear icon is universally accessible via click, no gesture knowledge required

## Consequences

- New file: `app/group-settings.tsx` (or similar route)
- `app/(tabs)/groups/[id].tsx` significantly simplified
- Member management (add/remove), share/QR modal, insights, and toggles move to settings
- Gear icon added to header alongside share icon
- Compact avatar strip replaces horizontal scrolling member cards on detail page
- "See All" pattern introduced for expense list (show 5, link to full list)

## References

- Splitwise redesign (2019): horizontal action row, gear icon for settings
- Tricount redesign (2024): member avatars in header, tab-based navigation
- Venmo Groups: ledger-first view, settle up prominent near balance
- Cash App Pools: sticky bottom CTA, minimal design
- Revolut Group Bills: net balance as hero, kebab menu for settings
- WhatsApp group info: hybrid toggle pattern (mute inline, rest behind tap)
- NN/g Progressive Disclosure guidelines
- Material Design Settings patterns
