# AI Features (Day 2 — Deferred)

> Backend AI endpoints are disabled. Frontend routes exist but are not linked from navigation.

## AI Chat (Expense via Natural Language)
- **Screen**: `app/chat.tsx` — SSE streaming chat with interactive action cards
- **API**: `POST /v1/chat` with `{ conversationId: string|null, message: string, deterministic?: boolean }` — SSE response
- **Quota**: `GET /v1/chat/quota` — returns `ChatQuotaDto { dailyUsed, dailyLimit, resetsAt, tier }`
- **SSE Event Types**: `text`, `action_required`, `expense_created`, `quota`, `quota_exceeded`, `error`
- **Interactive Cards**:
  - `select_group` — tappable group cards with emoji, members, last activity
  - `confirm_expense` — full breakdown (description, total, splits, payer) with Confirm + Edit buttons
  - `confirm_create_group` — group name + members with Create button
- **Edit button**: Opens `/(tabs)/add` pre-filled with parsed data (amount, description, date, groupId, currency)
- **Quota UX**: Header shows remaining count when ≤5; input disabled + upgrade card when 0
- **Safety**: Unmount cleanup (abort + mountedRef), null token handling, double-send prevention (sendingRef), smart scroll (only auto-scroll when near bottom), React Query invalidation on expense creation
- **Cache invalidation**: `expense_created` → `invalidateAfterExpenseChange(groupId)`
- **Offline**: Detects via `useNetwork()`, disables input + shows offline banner
- **Stop generation**: Abort button shown during active streaming
- **Retry**: Failed messages show "Tap to retry" with stored original text
- **Deterministic**: Confirm/Select sends `{ deterministic: true }` (skips LLM + quota)
- **@mention system**: `lib/mention-utils.ts` + `lib/mention-recency.ts` + `components/ui/mention-dropdown.tsx`
  - `@` triggers contact autocomplete, `#` triggers group autocomplete
  - Wire format: `@[Name](userId:id)`, `#[Group](groupId:id)`
  - Fallback: When contacts API empty, aggregates members from all groups via `useMergedContacts()`
  - Recency: AsyncStorage tracks last 20 mentioned people, shown first in dropdown
- **Polish**: Timestamps, typing indicator, long-press copy, follow-up pills, AsyncStorage persistence, bubble grouping, a11y labels, FlatList optimization, scroll-to-bottom FAB
- **Receipt → Chat**: `receiptMessage` route param auto-sends on mount (B34)
- **Balance queries**: Natural language via 4 LLM tools (`get_user_balance`, `get_balance_with_user`, `get_cross_group_balances`, `get_group_balance`)

## Receipt Scanning
- **Screen**: `app/receipt-scanner.tsx` — camera/gallery capture, sends base64 to backend
- **API**: `POST /v1/receipts/scan` with `{ image: base64String }` — returns `ReceiptScanResponseDto` (wrapper with quota)
- **Response**: `{ receipt: ReceiptScanResultDto, dailyScansUsed, dailyScanLimit }` — merchant, date, currency, subtotalCents, taxCents, tipCents, totalCents, lineItems[], confidence scores
- **UX**: Scan line animation, processing dots, confidence badges (Verify) for <0.9 fields, error/retry, quota display ("X of Y free scans used today")
- **Flow**: Scan → results with line items + totals → "Create Expense" pre-fills Add Expense form (amount, description, date)
- **Split via Chat (B34)**: "Split via Chat" button on results → navigates to `/chat` with `receiptMessage` param containing natural language summary (merchant, amount, date, up to 5 line items). Chat auto-sends on mount.
- **Backend**: Gemini 2.0 Flash for OCR (not GPT-4o — 100x cheaper)

## 3D Touch Quick Actions
- **Package**: `expo-quick-actions` — registered in `_layout.tsx` `RootLayout`
- **Actions**: Add Expense (`/(tabs)/add`), Scan Receipt (`/receipt-scanner`), View Groups (`/(tabs)/groups`)
- **Router**: `useQuickActionRouting()` in `app/(tabs)/_layout.tsx` handles navigation
