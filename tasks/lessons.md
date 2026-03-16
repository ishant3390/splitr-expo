# Lessons Learned

## Activity cards: Don't blindly add UI to all activity types
**Date:** 2026-03-15
**Context:** Added "in {groupName}" subtitle to all activity cards, but group/member lifecycle types (`group_created`, `member_joined`, etc.) already embed the group name in the title via `formatActivityTitle`. This caused redundant display like "Ajay W. created Us / in Us".
**Rule:** When adding cross-cutting UI to activity cards, always check which activity types already contain the relevant info in their title. Gate new UI elements by activity type category (`expense_*`, `settlement_*` vs member/group lifecycle).

## Clerk user ID ≠ backend user ID
**Date:** 2026-03-15
**Context:** `useUser().id` from Clerk returns the Clerk ID (`user_2abc...`), but `actorUserId` on `ActivityLogDto` is the backend's own UUID. Passing Clerk ID to `formatActivityTitle` meant `isYou` was always false — "You" never appeared.
**Rule:** When comparing the current user against backend entities, always use `useUserProfile().data?.id` (backend UUID), not Clerk's `useUser().id`.
