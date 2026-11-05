# 13: Photos and recap

**Status:** Draft
**Backlog:** M2
**Depends on:** 02, 04, 07, 08

## Summary

Players can take photos as part of games. Files go to Vercel Blob and
records to Firestore (ADR-008). The admin approves photos before anyone
else sees them. Approved photos play as a slideshow on the display and make
up the event recap, which stays in the library for good.

## In scope (first pass)

- Shared upload flow any game type can use: camera or library pick, shrink
  to 1600 px JPEG on the phone, token from `/api/[event]/photos/upload`,
  direct upload, record written as `pending`
- Limits: `image/jpeg` only, 2 MB per file, a per-player cap per game
- `photo-challenge` game type: a list of prompts; each approved photo earns
  points once per prompt
- Moderation in controls: grid of pending photos, approve, hide, approve all
- Display mode: slideshow of approved photos, newest first
- Recap page `/[event]/recap`: final standings and an approved-photo gallery
- Player's own photo list with delete (Q12)
- Upload works on flaky Wi-Fi: retry, and a clear "not sent" state

## Open questions

- Q10: approval required before anyone sees a photo?
- Q11: who can see the recap?
- Q12: can players delete their own photos?
- Video clips: out of scope for the party unless asked.

## Acceptance criteria

To be written when this spec moves to `Ready`.
