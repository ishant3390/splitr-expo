# Push Notification Integration

## API Endpoints
- **Token registration**: `POST /v1/users/me/push-tokens` with `{ token, deviceId, deviceName, platform }`
- **Token deletion**: `DELETE /v1/users/me/push-tokens/{tokenId}`
- **Notification history**: `GET /v1/users/me/notifications?page=0&limit=20` — paginated, returns `NotificationDto[]`
- **Global toggle**: `PATCH /v1/users/me` with `{ preferences: { notifications: true/false } }` — server-side filtering
- **Per-group toggle**: `PATCH /v1/groups/{groupId}/members/{memberId}` with `{ notificationsEnabled: true/false }`

## Payload Format & Routing
- **Payload**: `data: { type, groupId }` — no `url` field, FE constructs routes:
  - `expense_created/updated/deleted/coalesced_expenses` → `/group/{groupId}`
  - `settlement_created` → `/settle-up?groupId={groupId}`
  - `member_joined_via_invite` → `/group/{groupId}`

## Backend Behavior
- **Rate limiting**: BE-handled (5/hr, 15/day expenses; 20/day total)
- **Coalescing**: BE-handled (first immediate, subsequent batched in 60s window)

## Frontend Behavior
- **Foreground filtering**: `configureForegroundHandler()` reads per-category prefs from AsyncStorage and suppresses display for disabled categories via `getNotificationCategory()` mapping
- **Web platform**: renders passthrough — no expo-notifications on web
- **Per-group toggle**: reads `member.notificationsEnabled`, toggles via `PATCH /v1/groups/{groupId}/members/{memberId}`
