# Backend Spec: Payment Handles Integration

**Status:** Ready for implementation
**Priority:** High — frontend is built and waiting
**Modules touched:** `common-model`, `common-persistence`, `core-engine`, `api-gateway`
**DB migration:** Required (separate `splitr-db-migrator` repo)

---

## Overview

Add a `payment_handles` JSONB column to the `users` table so users can store their Venmo, PayPal, UPI, etc. handles. Expose these handles in two places:

1. **`GET /v1/users/me`** and **`PATCH /v1/users/me`** — user manages their own handles
2. **`GET /v1/groups/{groupId}/settlements/suggestions`** — creditor's handles shown to debtors so they can deep-link to payment apps

**Privacy constraint (Option B):** Payment handles are NOT exposed on `UserSummaryDto`. They are ONLY returned in settlement suggestions via a dedicated `toUserPaymentHandles` field. Only people who owe the creditor see the creditor's handles.

---

## 1. Database Migration

**Repo:** `splitr-db-migrator`

```sql
-- changeset: add-payment-handles-to-users
-- author: ajay
ALTER TABLE users ADD COLUMN payment_handles JSONB DEFAULT '{}';

COMMENT ON COLUMN users.payment_handles IS 'User payment app handles (venmo, paypal, upi, etc.) for deep link integration';
```

**JSONB shape:**
```json
{
  "venmoUsername": "ajay-w",
  "paypalUsername": "ajaywadhara",
  "cashAppTag": "ajay",
  "upiVpa": "ajay@okicici",
  "revolutTag": "ajay123",
  "monzoMe": "ajaywadhara",
  "zelleContact": "ajay@email.com"
}
```

All fields optional. Empty object `{}` is the default. No indexing needed — this is read by primary key only, never queried.

---

## 2. Entity Changes

### `common-persistence` — `UserEntity`

Add field:

```java
@Column(name = "payment_handles", columnDefinition = "jsonb")
@Convert(converter = PaymentHandlesConverter.class)
private PaymentHandles paymentHandles;
```

### New: `PaymentHandles` value object

```java
// common-model/src/.../model/PaymentHandles.java
public record PaymentHandles(
    String venmoUsername,
    String paypalUsername,
    String cashAppTag,
    String upiVpa,
    String revolutTag,
    String monzoMe,
    String zelleContact
) {
    public static PaymentHandles empty() {
        return new PaymentHandles(null, null, null, null, null, null, null);
    }

    public boolean isEmpty() {
        return venmoUsername == null
            && paypalUsername == null
            && cashAppTag == null
            && upiVpa == null
            && revolutTag == null
            && monzoMe == null
            && zelleContact == null;
    }
}
```

### New: `PaymentHandlesConverter` (JPA AttributeConverter)

```java
// common-persistence/src/.../converter/PaymentHandlesConverter.java
@Converter
public class PaymentHandlesConverter implements AttributeConverter<PaymentHandles, String> {

    private static final ObjectMapper MAPPER = new ObjectMapper()
        .setSerializationInclusion(JsonInclude.Include.NON_NULL);

    @Override
    public String convertToDatabaseColumn(PaymentHandles attribute) {
        if (attribute == null || attribute.isEmpty()) return "{}";
        try {
            return MAPPER.writeValueAsString(attribute);
        } catch (JsonProcessingException e) {
            return "{}";
        }
    }

    @Override
    public PaymentHandles convertToEntityColumn(String dbData) {
        if (dbData == null || dbData.isBlank() || "{}".equals(dbData)) {
            return PaymentHandles.empty();
        }
        try {
            return MAPPER.readValue(dbData, PaymentHandles.class);
        } catch (JsonProcessingException e) {
            return PaymentHandles.empty();
        }
    }
}
```

---

## 3. DTO Changes

### `common-model` — `UserDto`

Add field:

```java
private PaymentHandles paymentHandles;
```

### `common-model` — `UpdateUserRequest`

Add field:

```java
private PaymentHandles paymentHandles;
```

### `common-model` — `SettlementSuggestionDto`

Add field:

```java
private PaymentHandles toUserPaymentHandles;
```

### `UserSummaryDto` — NO CHANGES

`UserSummaryDto` must NOT include `paymentHandles`. Payment handles are private and only exposed in settlement suggestion context.

---

## 4. MapStruct Mapper Changes

### `UserMapper`

Add mapping for `paymentHandles` in `toDto()`:

```java
@Mapping(source = "paymentHandles", target = "paymentHandles")
UserDto toDto(UserEntity entity);
```

If `paymentHandles` is null on the entity, MapStruct will map it as null on the DTO (which is correct — frontend handles `undefined` gracefully).

### `SettlementMapper` (or wherever suggestions are built)

The suggestion builder needs to look up the creditor's `paymentHandles` and set it on the DTO. See Section 5.

---

## 5. Service Changes

### `UserService`

**`updateUser()` — accept `paymentHandles`:**

```java
public UserDto updateUser(String userId, UpdateUserRequest request) {
    UserEntity user = userRepository.findById(userId)
        .orElseThrow(() -> new SplitrException(ErrorCode.USER_NOT_FOUND));

    // ... existing field updates ...

    if (request.getPaymentHandles() != null) {
        user.setPaymentHandles(request.getPaymentHandles());
    }

    return userMapper.toDto(userRepository.save(user));
}
```

No validation needed on the backend — frontend already validates format. The backend just stores what it receives.

### `SettlementService`

**`getSuggestions()` — populate `toUserPaymentHandles`:**

In the method that builds `SettlementSuggestionDto` list, after computing the simplified debts:

```java
public List<SettlementSuggestionDto> getSuggestions(String groupId) {
    // ... existing debt simplification logic ...

    List<SettlementSuggestionDto> suggestions = /* existing code */;

    // Populate creditor payment handles
    Set<String> creditorIds = suggestions.stream()
        .map(s -> s.getToUser() != null ? s.getToUser().getId() : null)
        .filter(Objects::nonNull)
        .collect(Collectors.toSet());

    Map<String, PaymentHandles> handlesMap = userRepository.findAllById(creditorIds)
        .stream()
        .filter(u -> u.getPaymentHandles() != null && !u.getPaymentHandles().isEmpty())
        .collect(Collectors.toMap(UserEntity::getId, UserEntity::getPaymentHandles));

    suggestions.forEach(s -> {
        if (s.getToUser() != null) {
            s.setToUserPaymentHandles(handlesMap.get(s.getToUser().getId()));
        }
    });

    return suggestions;
}
```

**Performance note:** This is a single batch query (`findAllById`) — no N+1. The creditor set is typically 1-3 users per group.

---

## 6. Controller Changes

### `UserController`

No changes needed — `PATCH /v1/users/me` already delegates to `UserService.updateUser()`, which now handles `paymentHandles`.

### `SettlementController`

No changes needed — `GET /v1/groups/{groupId}/settlements/suggestions` already delegates to `SettlementService.getSuggestions()`, which now populates `toUserPaymentHandles`.

---

## 7. Tests

### Unit Tests

**`UserServiceTest`:**
- `updateUser_setsPaymentHandles` — verify handles are persisted
- `updateUser_nullPaymentHandles_doesNotOverwrite` — verify existing handles preserved when field is null in request
- `updateUser_emptyPaymentHandles_clearsExisting` — verify empty object clears handles
- `getUser_returnsPaymentHandles` — verify handles included in UserDto response

**`SettlementServiceTest`:**
- `getSuggestions_populatesToUserPaymentHandles` — verify creditor handles are included
- `getSuggestions_nullHandles_returnsNullField` — verify graceful when creditor has no handles
- `getSuggestions_guestCreditor_noPaymentHandles` — verify guest users don't crash the lookup
- `getSuggestions_multipleCreditors_batchQuery` — verify batch fetch, not N+1

**`PaymentHandlesConverterTest`:**
- `convertToDatabaseColumn_nullInput_returnsEmptyJson`
- `convertToDatabaseColumn_validHandles_returnsJson`
- `convertToEntityColumn_emptyJson_returnsEmpty`
- `convertToEntityColumn_validJson_parsesCorrectly`
- `convertToEntityColumn_malformedJson_returnsEmpty`
- `convertToEntityColumn_unknownFields_ignoredGracefully`

### Controller Tests

**`UserControllerTest`:**
- `patchUser_withPaymentHandles_returns200` — verify round-trip
- `patchUser_withInvalidJson_returns400` — malformed body

**`SettlementControllerTest`:**
- `getSuggestions_includesPaymentHandles` — verify response shape

### Integration Tests (Testcontainers)

- `paymentHandles_fullRoundTrip` — PATCH user → GET user → verify handles → GET suggestions → verify `toUserPaymentHandles`
- `paymentHandles_jsonbStorageAndRetrieval` — verify JSONB column works with Hibernate

---

## 8. API Contract (Frontend ↔ Backend)

### Save payment handles

```
PATCH /v1/users/me
Authorization: Bearer {token}
Content-Type: application/json

{
  "paymentHandles": {
    "venmoUsername": "ajay-w",
    "paypalUsername": "ajaywadhara",
    "upiVpa": "ajay@okicici"
  }
}

→ 200 OK
{
  "id": "usr_abc123",
  "name": "Ajay",
  "email": "ajay@test.com",
  "paymentHandles": {
    "venmoUsername": "ajay-w",
    "paypalUsername": "ajaywadhara",
    "upiVpa": "ajay@okicici"
  },
  ...
}
```

### Get current user (includes handles)

```
GET /v1/users/me
Authorization: Bearer {token}

→ 200 OK
{
  "id": "usr_abc123",
  "paymentHandles": {
    "venmoUsername": "ajay-w",
    "paypalUsername": "ajaywadhara"
  },
  ...
}
```

### Settlement suggestions (includes creditor handles)

```
GET /v1/groups/{groupId}/settlements/suggestions
Authorization: Bearer {token}

→ 200 OK
[
  {
    "fromUser": { "id": "usr_111", "name": "Bob", "email": "bob@test.com" },
    "toUser": { "id": "usr_222", "name": "Ajay", "email": "ajay@test.com" },
    "amount": 5000,
    "currency": "USD",
    "toUserPaymentHandles": {
      "venmoUsername": "ajay-w",
      "paypalUsername": "ajaywadhara"
    }
  }
]
```

**When creditor has no handles:** `toUserPaymentHandles` is `null` (not `{}`). Frontend handles this gracefully — the "Pay Directly" section simply doesn't render.

**When creditor is a guest:** `toUser` is null, `toGuest` is populated, `toUserPaymentHandles` is always `null`. Guests can't have payment handles.

---

## 9. Rollout Notes

- **Zero downtime:** Adding a JSONB column with a default is a non-locking DDL operation in PostgreSQL
- **No data backfill:** Existing users start with `{}` — they configure handles when they visit the Payment Methods screen
- **Frontend graceful degradation:** If the backend hasn't deployed yet, `paymentHandles` and `toUserPaymentHandles` are `undefined` → the "Pay Directly" section and payment methods screen simply don't show provider fields
- **No feature flag needed:** The feature is purely additive. Empty handles = no deep links = existing behavior

---

## 10. Files to Create/Modify

| Module | File | Action |
|--------|------|--------|
| `splitr-db-migrator` | New changeset | Add `payment_handles JSONB` column |
| `common-model` | `PaymentHandles.java` | **New** — record value object |
| `common-model` | `UserDto.java` | Edit — add `paymentHandles` field |
| `common-model` | `UpdateUserRequest.java` | Edit — add `paymentHandles` field |
| `common-model` | `SettlementSuggestionDto.java` | Edit — add `toUserPaymentHandles` field |
| `common-persistence` | `UserEntity.java` | Edit — add `paymentHandles` with converter |
| `common-persistence` | `PaymentHandlesConverter.java` | **New** — JPA JSONB converter |
| `core-engine` | `UserMapper.java` | Edit — map `paymentHandles` |
| `core-engine` | `UserService.java` | Edit — persist handles on update |
| `core-engine` | `SettlementService.java` | Edit — batch-fetch creditor handles for suggestions |
| Tests | 6 test classes | ~20 new tests |
