# 06: Admin sign-in

**Status:** Draft
**Backlog:** M1
**Depends on:** none

## Summary

One shared passphrase signs the admin in. A route handler checks it and returns a Firebase custom token with an `admin: true` claim, which rules and routes trust (ADR-005).

## In scope (first pass)

- `/admin` sign-in page; `POST /api/admin/session`
- Passphrase in env `ADMIN_PASSPHRASE`; constant-time compare; rate limit by IP
- Admin claim checked in every admin route handler and in rules
- Sign out; session survives reloads

## Open questions

- None yet.

## Acceptance criteria

To be written when this spec moves to `Ready`.
