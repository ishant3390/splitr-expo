# E2E Testing on iOS Simulator (Local)

## Prerequisites

- Xcode installed with iOS Simulator
- Backend (Spring Boot) project available locally
- Expo CLI installed (`npx expo`)

---

## Step 1: Start the backend

In a separate terminal, from your backend project directory:

```bash
cd <your-spring-boot-backend>
./mvnw spring-boot:run -Dspring-boot.run.profiles=local
```

Make sure it's running on `0.0.0.0:8085`. Since the simulator uses `localhost`, the current `.env.local` (`http://localhost:8085/api`) works as-is — no IP change needed.

## Step 2: Start Expo dev server

```bash
cd "/Users/ajaywadhara/Ajay Wadhara/code/splitr-expo"
npx expo start --clear
```
Then press **`i`** to launch in the iOS Simulator.

> If you don't have a simulator booted, Expo will prompt you to pick one. Any recent iPhone (15/16) works.

## Step 3: Test the happy path

1. **Sign in** — use your Clerk test account (`ajay.k88+clerk_test@gmail.com`) or any OAuth
2. **Home screen** — verify balance card shows, no pending banner
3. **Create a group** — tap Add → create "Test Group"
4. **Add an expense** — fill in description, amount, submit while online → should succeed with toast

## Step 4: Test offline mode

This is the key flow:

1. **Toggle airplane mode on the simulator**:
   - In the iOS Simulator menu: **Features → Toggle Airplane Mode** (if available)
   - OR, the more reliable way: **disconnect your Mac from WiFi/ethernet** — the simulator shares Mac's network

2. **Verify offline banner** — red "No internet connection" bar should appear at the top of every screen

3. **Add an expense while offline**:
   - Go to Add tab → fill in description "Offline Coffee" → amount $5.00 → Submit
   - Should see teal toast: `"Offline Coffee" saved. It will sync when you're back online.`

4. **Check home screen** — amber "1 expense pending" card should appear below the balance card

5. **Tap the pending card** → opens pending-expenses screen showing your queued item with "Just now" timestamp

6. **Reconnect** — turn WiFi back on / disable airplane mode

7. **Auto-sync** — within a few seconds:
   - Green toast: "1 pending expense synced!"
   - Pending banner disappears from home screen
   - The expense appears in the group's expense list

## Step 5: Test discard flow

1. Go offline again
2. Add another expense
3. Open pending-expenses screen
4. Tap the red trash icon → confirm "Discard"
5. Item should disappear, home screen banner should be gone

## Step 6: Test failed sync

1. Go offline, add an expense to a group
2. While still offline, **stop the backend server**
3. Reconnect WiFi — the sync will attempt but fail (backend is down)
4. Open pending-expenses screen → should show "1 failed attempt" badge with error message
5. Restart the backend → next auto-sync cycle will succeed

---

## Troubleshooting

| Issue | Fix |
|---|---|
| Simulator won't connect to backend | Verify backend is on `0.0.0.0:8085`, not `127.0.0.1` |
| NetInfo doesn't detect offline | Disconnect Mac's network (simulator shares it) |
| Stale cache after reconnect | Pull-to-refresh on home screen |
| "No internet" banner stuck | NetInfo can be slow to detect reconnect; wait 3-5 seconds |
