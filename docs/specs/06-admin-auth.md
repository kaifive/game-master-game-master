# 06: Admin sign-in

**Status:** Done
**Backlog:** M1
**Depends on:** none

## Summary

One shared passphrase signs the admin in at `/admin`. The server checks it and sets a signed, HTTP-only cookie that every admin page and route checks (ADR-028). It's a convenience gate, not strong security, by Khai's choice (ADR-005).

## Behavior

1. `/admin` shows a passphrase box until signed in, then the event library (spec 07).
2. `POST /api/admin/session` with `{ passphrase }` compares it with `ADMIN_PASSPHRASE` in constant time. Right: sets the cookie and returns `204`. Wrong: `401 "That passphrase isn't right."`.
3. After 5 wrong tries from one IP address within 10 minutes, sign-in is refused for 10 minutes: `429 "Too many tries. Wait a few minutes and try again."`.
4. The cookie (`gm_admin`) holds an expiry and an HMAC-SHA256 signature keyed from the passphrase, so changing `ADMIN_PASSPHRASE` signs everyone out. It's `HttpOnly`, `SameSite=Lax`, `Secure` outside local runs, and lasts **7 days**.
5. Every admin route checks the cookie (`401` without a valid one), and admin pages redirect to `/admin` when signed out.
6. **Sign out** (`DELETE /api/admin/session`) clears the cookie.
7. Without `ADMIN_PASSPHRASE`, sign-in is refused with "Admin sign-in isn't set up on this server." (CI and local runs set one for tests.)

## Acceptance criteria

- [x] AC-1: The right passphrase signs in; a wrong one gets "That passphrase isn't right."; the comparison is constant-time.
- [x] AC-2: Five wrong tries from one IP within 10 minutes lock sign-in from it for 10 minutes.
- [x] AC-3: The session cookie is HTTP-only, SameSite=Lax, Secure outside local runs, signed, and expires after 7 days; a tampered, expired or old-passphrase cookie is refused.
- [x] AC-4: Admin routes refuse requests without a valid session (401), and admin pages send signed-out visitors to the sign-in page.
- [x] AC-5: Sign out clears the session.
- [x] AC-6: With no `ADMIN_PASSPHRASE`, sign-in is refused with a plain message.

## Tests

- Unit: `lib/admin/session.test.ts` (sign, verify, expiry, tamper, rate limit), route tests.
- E2E: sign in, see the library, sign out; a wrong passphrase.

## Out of scope

- Several admins or accounts.

## Open questions

- None open.
