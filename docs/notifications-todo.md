# Push Notifications — Setup TODO

Hand this to the developer with Apple Developer account access 

## Context

TestFlight builds of Splitr currently do not deliver push notifications. The iOS entitlement `aps-environment: production` is missing from the built `.ipa` because no **APNs Auth Key** has been registered on the EAS project. This document walks through the fix end-to-end.

**Required context:**
- Apple Developer account: `ishant3390@outlook.com`
- Apple Team ID: `R7LH97Q3UB` (from `eas.json:32`)
- App bundle ID: `com.splitrtest.ai` (from `app.json`)
- EAS project ID: `51e5bbb4-f40e-4420-ab54-6bcd761ac6f6`

---

## Step 1 — Generate APNs Auth Key on Apple Developer

1. Go to https://developer.apple.com/account and sign in
2. Left nav → **Certificates, Identifiers & Profiles**
3. Left sidebar → **Keys**
4. Click **➕** (top-right) to register a new key
5. **Key Name:** `Splitr APNs Key`
6. Check the box **Apple Push Notifications service (APNs)**
7. Click **Continue** → **Register**
8. **Download the `.p8` file** — one-time download. Save to password manager / Vault.
9. **Record these values** from the confirmation page:
   - **Key ID** (10-character string, e.g. `ABC1234DEF`)
   - **Team ID**: `R7LH97Q3UB`

> ⚠️ The `.p8` file + Key ID + Team ID are the three artifacts EAS needs. Without all three, Step 2 fails.

---

## Step 2 — Upload the Key to EAS

```bash
cd /path/to/splitr-expo
npx eas-cli credentials
```

Interactive prompts:
1. **Select platform** → `iOS`
2. **Which build profile** → `production`
3. **Do you want to log in to your Apple account?** → `Y`
   - Apple ID: `ishant3390@outlook.com`
   - Password: _ask Ajay_
   - 2FA code: check the iPhone linked to the Apple ID
4. From the menu, select **Push Notifications: Manage your Apple Push Notifications Key**
5. Select **Set up a Push Key** → **Upload a Push Key**
6. Paste:
   - Path to `.p8` file (drag-and-drop works)
   - Key ID (from Step 1.9)
   - Team ID: `R7LH97Q3UB`

EAS validates the key with Apple and stores it. Success shows **Push Notifications Key: configured**.

---

## Step 3 — Rebuild iOS for TestFlight

```bash
npx eas-cli build --platform ios --profile production
```

- Takes 15–30 min on EAS servers
- Once done:
  - Either `npx eas-cli submit --platform ios --profile production` to push to TestFlight, or
  - Download the `.ipa` and upload via Transporter.app

---

## Step 4 — Verify Entitlement Before Distributing

Optional but recommended — download the built `.ipa` from the EAS build page, then:

```bash
unzip -o ~/Downloads/splitr.ipa -d /tmp/splitr-ipa
codesign -d --entitlements :- /tmp/splitr-ipa/Payload/Splitr.app 2>/dev/null | grep -A1 aps-environment
```

**Expected output:**
```xml
<key>aps-environment</key>
<string>production</string>
```

If missing, EAS did not inject the key. Retry Step 2.

---

## Step 5 — Test on TestFlight

1. Install the new TestFlight build on a physical iPhone (must be a real device, not simulator)
2. Sign in → grant notification permission when prompted
3. Plug iPhone into Mac → open **Console.app**, select the device, filter text `[push]`
4. Launch the app
5. **Success signal:** no `[push] registerPushToken failed` warning appears. Silent is success.
6. From a second test user (or second account on another device), add an expense to a shared group
7. **Expected:** push notification arrives on iPhone within ~5 seconds

---

## Step 6 — If Step 5 Still Fails After Step 2 Succeeded

The bug is server-side. Verify:

```bash
# Replace <jwt> with the Clerk JWT from an iPhone session
curl -H "Authorization: Bearer <jwt>" \
  https://api-dev.splitr.ai/api/v1/users/me/push-tokens
```

| Response | Meaning | Action |
|----------|---------|--------|
| `[]` (empty array) | FE never registered a token | Check Console.app for `[push]` warnings; likely permission denied or APNs entitlement still missing |
| Has a token entry | BE is not sending pushes on expense events | File a `pipeline-be.md` entry — BE team checks Railway logs for Expo Push API send attempts on `expense_created` |

---

## Known FE-Side Improvements Already Shipped

- `lib/notifications.ts:188, 207` — `console.warn` now surfaces register/unregister errors in dev logs (previously silent)
- `app/notification-settings.tsx:97-99` — explicit Platform.OS branch so `Linking.openURL("app-settings:")` never fires on web

---

## Known FE-Side Issues Still Open (defer if not blocking launch)

| Issue | File | Severity | Notes |
|-------|------|----------|-------|
| `unregisterPushToken` contract mismatch | `lib/api.ts:191-192` vs `components/NotificationProvider.tsx:81` | Medium | FE sends raw Expo token as `tokenId` path param; BE likely expects the internal UUID. Needs BE clarification before fixing. |
| Category preferences stored locally only | `app/notification-settings.tsx:68-88` | Medium | User loses category prefs on reinstall / new device. Needs BE endpoint to persist per-user category toggles. |
| Per-group toggle load doesn't reconcile with global toggle | `app/group-settings.tsx:178-187` | Low | Confusing UX if user has global=off but per-group=on. Foreground handler is authoritative. |

---

## Success Criteria

- [ ] Step 4 verification shows `aps-environment: production` in the `.ipa`
- [ ] Step 5: push arrives within 5s of an expense being created by another group member
- [ ] Console.app shows no `[push] registerPushToken failed` warnings during normal use
- [ ] `GET /v1/users/me/push-tokens` returns a non-empty array for the test user

---

## Budget Estimate

- Active developer time: 30–60 min
- EAS build wait: 15–30 min
- Total: ~1–1.5 hours end-to-end
