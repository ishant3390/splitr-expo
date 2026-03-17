# Payment Integration Research: US, UK, India

**Date:** 2026-03-17
**Purpose:** R&D for adding real payment support to Splitr's settle-up flow
**Current state:** Payment method *selection* exists (Cash, Venmo, Zelle, PayPal, Bank Transfer, Other) but no actual payment processing — just a "Coming Soon" page at `/payment-methods`

---

## Executive Summary

| Market | Best Approach | Effort | Cost to Splitr | Approval Needed |
|--------|--------------|--------|----------------|-----------------|
| **US** | Deep links (Venmo, PayPal.me, Cash App) | Low | Zero | None |
| **India** | UPI deep links (`upi://pay`) | Low | Zero | None |
| **UK** | Open Banking PIS (TrueLayer SDK) | Medium | ~0.3-1.5%/txn | Agent registration (4-6 weeks) |

**Key insight:** Deep links are the industry standard for P2P payment integration. Splitwise, Tricount, and every other expense app use deep links — not full API integrations. Since Splitr never holds or transmits money, **no money transmitter license is needed in any market**.

---

## Competitive Landscape

### How Splitwise Does It
- **Venmo (US):** Deep link `venmo://paycharge?txn=pay&recipients=USERNAME&amount=10&note=...` — opens Venmo app, user confirms, returns to Splitwise
- **PayPal (US):** Similar redirect flow
- **Paytm (India):** Wallet-to-wallet via Paytm merchant SDK (2017, outdated approach)
- **Tink Pay by Bank (UK):** Open Banking account-to-account payments, growing 150% since early 2025
- **Splitwise Pay (US only):** Own ACH rail via linked bank accounts — most ambitious but most complex

### Splitwise's Gaps (Our Opportunity)
1. **No UPI support** — despite years of user demand, Splitwise still doesn't support India's dominant payment method
2. **No Zelle/Cash App** — US coverage limited to Venmo + PayPal
3. **No batch settlement** — settling with 4 people = 4 separate flows
4. **Free tier degradation** — 3-4 expense daily limit driving users away

### Other Competitors
- **Tricount (bunq):** Deep bunq banking integration, PayPal settlements — advantage limited to bunq customers
- **Settle Up / Splid:** No payment integration at all — calculation only

---

## US Market

### Venmo (Priority 1)
- **Integration:** Undocumented but stable deep links (Splitwise has used them since 2013)
- **Deep link:** `venmo://paycharge?txn=pay&recipients={USERNAME}&amount={AMOUNT}&note={NOTE}`
- **Web fallback:** `https://venmo.com/{USERNAME}?txn=pay&note={NOTE}&amount={AMOUNT}`
- **Amount prefill:** Yes
- **Callback/confirmation:** None — user must manually confirm payment happened
- **Cost:** Zero to Splitr. Free for P2P (debit/balance); 3% if user pays via credit card (Venmo charges them)
- **Approval:** None needed
- **Limitation:** Sender-initiated only (cannot request payments). App must be installed for native deep link.
- **Expo implementation:**
  ```typescript
  import { Linking } from 'react-native';
  const url = `venmo://paycharge?txn=pay&recipients=${username}&amount=${amount}&note=${encodeURIComponent('Splitr settlement')}`;
  const canOpen = await Linking.canOpenURL(url);
  if (canOpen) await Linking.openURL(url);
  else await Linking.openURL(`https://venmo.com/${username}?txn=pay&amount=${amount}&note=...`);
  ```

### PayPal (Priority 2)
- **Integration:** PayPal.me links
- **Deep link:** `https://paypal.me/{USERNAME}/{AMOUNT}{CURRENCY}` (e.g., `https://paypal.me/john/25USD`)
- **Amount prefill:** Yes (with currency)
- **Note prefill:** No
- **Cost:** Zero to Splitr. Free P2P (balance/bank); 2.99% card-funded
- **Approval:** None needed

### Cash App (Priority 3)
- **Integration:** $Cashtag URL
- **Deep link:** `https://cash.app/${CASHTAG}`
- **Amount prefill:** No (user enters manually)
- **Cost:** Zero
- **Limitation:** No amount prefill makes it less useful than Venmo/PayPal

### Zelle (Priority 4 — Manual Only)
- **Integration:** NOT POSSIBLE — bank-only network, no public API, no deep links
- **Best approach:** Copy recipient's email/phone to clipboard + instructional text ("Open your banking app and send via Zelle")
- **How Splitwise handles it:** They don't. Users pay manually.
- **Cost:** Zero

### Apple Pay / Google Pay
- **Verdict:** NOT VIABLE for P2P from third-party apps
- Apple Cash is iMessage-only, no public API
- Google Pay discontinued P2P in 2024

---

## India Market

### UPI Deep Links (Priority 1 — THE answer for India)
- **Integration:** Standard UPI deep link scheme defined by NPCI
- **Deep link:** `upi://pay?pa={VPA}&pn={NAME}&am={AMOUNT}&tn={NOTE}&cu=INR`
- **Parameters:**

  | Param | Description | Required |
  |-------|-------------|----------|
  | `pa` | Payee VPA (e.g., `ajay@okicici`) | Yes |
  | `pn` | Payee display name | Yes |
  | `am` | Amount in INR (decimal) | No (editable if omitted) |
  | `tn` | Transaction note | No |
  | `cu` | Currency (always `INR`) | No |
  | `tr` | Transaction reference ID | No |

- **How it works:** Opens device's UPI app chooser (GPay, PhonePe, Paytm, BHIM, CRED, etc.). User picks their app, authenticates, confirms. Done.
- **Amount prefill:** Yes
- **Cost:** ZERO — UPI P2P has no MDR charges. Confirmed by Finance Ministry in 2025.
- **Approval:** None — you're generating a URL, not processing payments
- **Callback:** `Linking.openURL()` returns only boolean. No transaction status. User must confirm manually.
- **Web:** `upi://` doesn't work in desktop browsers — show a QR code encoding the same URI (scannable by any UPI app)
- **Expo implementation:**
  ```typescript
  const upiUrl = `upi://pay?pa=${vpa}&pn=${encodeURIComponent(name)}&am=${amount}&tn=${encodeURIComponent('Splitr settlement')}&cu=INR`;
  await Linking.openURL(upiUrl);
  ```

- **App-specific deep links** (optional, for targeting a specific app):
  - Google Pay: `gpay://upi/pay?...`
  - PhonePe: `phonepe://pay?...`
  - Paytm: `paytm://upi/pay?...`
  - BHIM: `bhim://upi/pay?...`

### Regulatory Notes (India)
- **P2P Collect requests banned** from Oct 1, 2025 (NPCI mandate) — only push/pay works. This is fine for settle-up (debtor initiates payment).
- **Transaction limit:** 1 lakh INR per transaction
- **No RBI license needed** for deep links — you never touch funds
- **If processing through servers:** Would need Payment Aggregator license (25 crore INR net worth) — NOT recommended

### PhonePe / Google Pay / Paytm / BHIM / WhatsApp Pay
- All covered by the generic `upi://pay` deep link — they appear in the system app chooser
- No individual SDK integration needed
- **WhatsApp Pay:** Closed ecosystem, no third-party integration possible

### Why This Is a Competitive Advantage
Splitwise has NO native UPI support despite years of user demand. Their only India option is a 2017 Paytm wallet integration. Supporting `upi://pay` deep links would instantly make Splitr the better choice for Indian users.

---

## UK Market

### Open Banking PIS via TrueLayer (Priority 1)
- **Integration:** TrueLayer has an official React Native SDK (`truelayer-react-native-sdk`)
- **How it works:**
  1. User taps "Settle Up" in Splitr
  2. Splitr backend calls TrueLayer API to create a payment (amount, creditor account, reference)
  3. TrueLayer returns an authorization URL
  4. User sees bank selection screen (via TrueLayer SDK)
  5. User redirects to their banking app, authenticates (SCA), confirms
  6. Redirected back to Splitr
  7. Webhook confirms payment status — auto-mark as settled
- **Bank coverage:** 98% of UK banks (Monzo, Starling, Revolut, all high street banks)
- **Payment confirmation:** YES — webhooks provide actual payment status (unlike deep links)
- **Cost:** ~0.3-1.5% per transaction (negotiate based on volume)
- **Approval:** Agent registration under TrueLayer's FCA license (~4-6 weeks). NOT a full FCA PISP license (which takes 12 months + EUR 50,000 capital).

### Provider Comparison

| Provider | RN SDK | UK Coverage | Pricing | Notes |
|----------|--------|-------------|---------|-------|
| **TrueLayer** | Yes (official) | 98% UK banks | ~0.3-1.5%/txn | Best RN support, recommended |
| **Tink** (Visa) | No RN SDK | 509+ institutions | Custom | Used by Splitwise, needs RN wrapper |
| **Yapily** | No RN SDK | 2000+ banks | Tiered | API-only, you build UI |
| **Plaid** | Yes (RN SDK) | Good UK coverage | Custom | Better if you want one provider for US+UK |
| **GoCardless** | No RN SDK | ~99% UK consumer | Per-txn | Historically Direct Debit focused |

### Redirect/Link Options (Low Effort Additions)
- **PayPal.me:** `https://paypal.me/{username}/{amount}` — works in UK
- **Revolut.me:** `https://revolut.me/{username}` — no amount prefill
- **Monzo.me:** `https://monzo.me/{username}` — works for non-Monzo users too
- **Manual bank transfer:** Display sort code + account number with copy button

### Not Viable for UK
- **Apple Cash:** US-only, not available in UK
- **Google Pay P2P:** Discontinued globally in 2024
- **Direct Revolut/Monzo/Starling APIs:** No public P2P endpoints

---

## Implementation Plan

### Phase 1: Deep Links (All Markets) — LOW EFFORT, HIGH IMPACT

**Estimated effort:** 1-2 weeks frontend, minimal backend changes

#### What to Build

**Backend changes:**
- Add optional payment identity fields to user profile: `PATCH /v1/users/me`
  ```json
  {
    "paymentMethods": {
      "venmoUsername": "ajay-w",
      "paypalUsername": "ajaywadhara",
      "cashAppTag": "$ajay",
      "upiVpa": "ajay@okicici",
      "revolutTag": "ajay123",
      "monzoMe": "ajaywadhara"
    }
  }
  ```
- Store these securely (PII but not highly sensitive)

**Frontend changes:**
1. **Payment methods settings screen** (replace "Coming Soon" at `/payment-methods`):
   - Let users add/edit their Venmo username, PayPal.me, $Cashtag, UPI VPA, etc.
   - Validate format (e.g., UPI VPA must contain `@`)

2. **Settle-up screen enhancement:**
   - When recording a settlement, if the **creditor** has payment methods configured, show "Pay Now" buttons
   - Detect user's region to show relevant options:
     - US: Venmo, PayPal, Cash App, Zelle (copy)
     - India: UPI (primary), PayPal
     - UK: PayPal, Revolut.me, Monzo.me
   - Tapping a button opens the deep link with amount + note prefilled
   - After returning from payment app, prompt: "Did you complete the payment?" → auto-record settlement

3. **QR code for UPI (web):**
   - On web, `upi://` links don't work — render a QR code encoding the UPI URI
   - Use `react-native-qrcode-svg` or similar

#### Deep Link Reference

| Method | URL Pattern | Amount | Note | Platform |
|--------|-------------|--------|------|----------|
| Venmo (native) | `venmo://paycharge?txn=pay&recipients={user}&amount={amt}&note={note}` | Yes | Yes | iOS/Android |
| Venmo (web) | `https://venmo.com/{user}?txn=pay&amount={amt}&note={note}` | Yes | Yes | Web |
| PayPal | `https://paypal.me/{user}/{amt}{currency}` | Yes | No | All |
| Cash App | `https://cash.app/${tag}` | No | No | All |
| UPI (generic) | `upi://pay?pa={vpa}&pn={name}&am={amt}&tn={note}&cu=INR` | Yes | Yes | iOS/Android |
| UPI (GPay) | `gpay://upi/pay?pa={vpa}&pn={name}&am={amt}&tn={note}&cu=INR` | Yes | Yes | Android |
| Revolut | `https://revolut.me/{user}` | No | No | All |
| Monzo | `https://monzo.me/{user}` | No | No | All |
| Zelle | N/A — copy email/phone to clipboard | N/A | N/A | Manual |

### Phase 2: Open Banking (UK) — MEDIUM EFFORT

**Estimated effort:** 3-4 weeks (backend + frontend + TrueLayer onboarding)

#### What to Build
1. **TrueLayer integration (backend):**
   - Register as TrueLayer agent (~4-6 weeks approval, start early)
   - `POST /v1/settlements/{id}/initiate-payment` — creates TrueLayer payment
   - Webhook endpoint to receive payment confirmation
   - Store TrueLayer payment ID linked to settlement

2. **TrueLayer SDK (frontend):**
   - Install `truelayer-react-native-sdk`
   - Bank selection + authentication flow in settle-up screen
   - Payment status polling/webhook UI updates
   - Auto-mark settlement as paid on success

3. **Key advantage over Phase 1:**
   - **Actual payment confirmation** via webhooks (no "Did you pay?" prompt)
   - Covers ALL UK banks (not just those with .me links)
   - Professional feel — bank-grade authentication

### Phase 3: Enhanced Features (Post-Launch)

- **Batch settlement:** "Pay all debts" button that chains multiple deep links
- **Payment reminders with deep links:** Nudge notification includes "Pay Now" button
- **Smart method detection:** Auto-suggest payment method based on both users' configured methods
- **Wise integration:** For cross-currency settlements (e.g., GBP member pays USD member)
- **Transaction verification (Android):** Use `react-native-upi-payment` native module for UPI callback (requires custom dev client)

---

## Complexity Assessment

| Component | Complexity | Notes |
|-----------|-----------|-------|
| User payment method storage (backend) | Low | New fields on user profile |
| Payment methods settings screen | Low | Form with validation |
| Deep link generation + opening | Low | `Linking.openURL()` + URL construction |
| Region detection for showing relevant methods | Low | Based on user's currency or locale |
| "Did you pay?" confirmation flow | Low | Modal after return from payment app |
| QR code for UPI on web | Low | QR library + upi:// URI |
| Zelle copy-to-clipboard flow | Low | Clipboard API + toast |
| TrueLayer backend integration | Medium | REST API + webhooks + payment state machine |
| TrueLayer RN SDK integration | Medium | SDK setup + bank selection UI |
| TrueLayer agent registration | Medium | 4-6 weeks, paperwork |
| Batch settlement | Medium | Chain multiple payment flows sequentially |
| Wise cross-currency API | High | Full API integration, business account, fund handling |

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Venmo deep links are undocumented | Medium — could break | Web fallback URL, monitor for changes, same risk Splitwise takes |
| No payment confirmation from deep links | Low — UX inconvenience | "Did you pay?" prompt + manual settlement recording |
| TrueLayer costs eat into margins | Low for now | Only applies to UK Open Banking; Phase 1 deep links are free |
| Users don't configure payment methods | Medium | Prompt during onboarding, show setup nudge on first settle-up |
| UPI VPA validation | Low | Regex validation (`^[a-zA-Z0-9._-]+@[a-zA-Z]+$`) |
| P2P Collect ban in India | None | Our flow is push/pay (debtor initiates), not collect |

---

## Regulatory Summary

| Market | License Needed? | Why |
|--------|----------------|-----|
| **US** | No | Deep links only — Splitr never touches money |
| **India** | No | UPI deep links only — payment processed by NPCI/banks |
| **UK (Phase 1)** | No | PayPal/Revolut/Monzo redirect links only |
| **UK (Phase 2)** | Agent registration | Under TrueLayer's FCA PISP license (~4-6 weeks) |

---

## Sources

### US
- [Venmo Deep Linking - Vox Silva](https://blog.alexbeals.com/posts/venmo-deeplinking)
- [Venmo Web Deep Linking - Gabe O'Leary](https://goleary.com/posts/2020-07-29-venmo-deeplinking-including-from-web-apps)
- [Splitwise + Venmo Blog (2013)](https://blog.splitwise.com/2013/09/11/introducing-settle-up-with-splitwise-and-venmo/)
- [PayPal.me FAQs](https://www.paypal.com/us/cshelp/article/paypalme-frequently-asked-questions-help432)
- [Cash App $Cashtag](https://cash.app/help/us/en-us/3123-cashtags)
- [Zelle Partner Network](https://www.zelle.com/join-zelle-network/partners)

### India
- [NPCI UPI Deep Linking Spec v1.6](https://www.labnol.org/files/linking.pdf)
- [UPI Deep Links in React Native (DEV)](https://dev.to/suyashdev/how-to-open-upi-apps-in-react-native-upi-integration-with-react-native-1f5a)
- [NPCI P2P Collect Ban (Oct 2025)](https://www.medianama.com/2025/08/223-npci-p2p-collect-payments-oct-1-what-it-means/)
- [UPI Zero MDR Confirmed (Razorpay)](https://razorpay.com/learn/upi-transaction-charges/)
- [Splitwise UPI Feature Request (unfulfilled)](https://feedback.splitwise.com/forums/162446-general/suggestions/15872739)

### UK
- [TrueLayer React Native SDK](https://docs.truelayer.com/docs/react-native-sdk)
- [TrueLayer RN SDK (GitHub)](https://github.com/TrueLayer/truelayer-react-native-sdk)
- [Splitwise + Tink Partnership](https://tink.com/press/splitwise-tink-partner/)
- [FCA Payment Institution Requirements](https://www.fca.org.uk/firms/apply-emoney-payment-institution/pi)
- [UK Open Banking Regulation (TrueLayer)](https://truelayer.com/reports/open-banking-guide/open-banking-regulation-in-the-uk/)

### Competitor Analysis
- [Splitwise Pay](https://www.splitwise.com/pay)
- [Venmo Groups (CNN)](https://www.cnn.com/2023/11/14/business/venmo-group-payment-feature)
- [Tricount + bunq Integration](https://help.tricount.com/articles/link-your-bunq-account-in-tricount)
- [Splitwise Reviews (ComplaintsBoard)](https://www.complaintsboard.com/splitwise-b149630)
