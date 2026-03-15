# ADR-001: Remove Member Addition from Group Creation Flow

## Status
Accepted

## Date
2026-03-15

## Context

The `create-group.tsx` screen included an optional "Add People" section allowing users to add members (by name and optional email) during group creation. Research into competitor apps and UX best practices revealed that this approach increases friction and drop-off during the creation flow:

- **Splitwise 2019 redesign**: Splitwise moved to a create-first, add-members-later pattern after finding that inline member addition during group creation was a common abandonment point.
- **Tricount pattern**: Tricount lets users create a group with just a name and immediately shows sharing/invite options post-creation.
- **NNGroup progressive disclosure**: The principle of progressive disclosure recommends deferring secondary tasks (adding members) until after the primary task (creating the group) is complete, reducing cognitive load at the moment of commitment.

Splitr's group detail screen already provides robust member management: share sheet with invite link, QR code, Add Member modal (name + email), and email invites. Duplicating member addition in the creation flow added code complexity without meaningful UX benefit.

## Decision

Remove the inline member-adding UI and logic from `create-group.tsx`. Group creation becomes: name the group → select type/emoji/currency → create → share sheet → navigate to group detail.

Members are added exclusively from the group detail screen after creation.

## Consequences

### Positive
- **Reduced friction**: Fewer fields and decisions during group creation → higher completion rate
- **Simpler code**: Removed ~80 lines of member state management, validation, and guest-member API calls from the creation flow
- **Single source of truth**: All member management happens in group detail, eliminating two code paths for the same operation
- **Faster time-to-share**: Users reach the share sheet sooner, which is the actual mechanism for getting people into the group

### Negative
- Users who previously added members during creation now take an extra step (navigate to group detail → add member). Mitigated by the post-creation share sheet which immediately prompts sharing.

## References
- Splitwise 2019 redesign (create-first pattern)
- Nielsen Norman Group: Progressive Disclosure (https://www.nngroup.com/articles/progressive-disclosure/)
- Tricount group creation flow
