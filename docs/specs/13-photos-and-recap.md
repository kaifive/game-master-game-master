# 13: Photos, triage, votes and recap

**Status:** Draft
**Backlog:** M2
**Depends on:** 02, 03, 04, 07, 08

## Summary

> The photo challenge itself shipped first as spec 20 (Spot and Snipe: photos rated by the host with a slider, uploads through our route per ADR-034). This spec keeps triage, votes, the slideshow and the recap, and can adopt spec 20's photos.

Players take photos as part of games. Every photo is saved (files in Vercel Blob, records in Firestore, ADR-008). Photos only reach other people at moments the admin starts, after a quick swipe triage (ADR-010). Approved photos can go to a player vote and the display slideshow. The recap is admin only. Photos are backed up and cleared after each event (ADR-012).

## In scope (first pass)

- Shared upload flow any game type can use: camera or library pick, shrink to 1600 px JPEG on the phone, one-time token from `/api/[event]/photos/upload`, direct upload, record written as `pending`
- Limits: `image/jpeg`, 2 MB per file, a cap per player per prompt
- No deleting by players; once sent, a photo belongs to the admin
- `photo-challenge` game type: prompts for players or for teams (the captain submits for the team); points on approval, once per prompt
- Triage at `/admin/[event]/photos`: one photo at a time, full screen; swipe right approve, left hide; buttons too; undo the last swipe; filter by prompt
- Photo vote: admin opens a vote on a prompt; approved photos go to every player at `/[event]/vote/[game]`; one vote each, not their own or their team's; admin closes it; winner gets bonus points; results on the display
- Display slideshow of approved photos
- Recap at `/admin/[event]/recap`: final standings and all approved photos
- Scripts: `photos:export` (zip + CSV of all photos) and `photos:prune` (delete blobs, mark records archived)
- Upload on flaky Wi-Fi: retry, and a clear "not sent" state

## Open questions

- Q17: can players vote for their own team's photo? Default no.
- Q18: automatic AI screening later?
- Q19: where do backups go? Default a Google Drive folder.

## Acceptance criteria

To be written when this spec moves to `Ready`.
