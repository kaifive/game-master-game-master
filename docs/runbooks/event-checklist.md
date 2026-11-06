# Event checklist

Run this before and after every event. Agents: remind Khai of the "Before"
list whenever a new event file is added.

## Two weeks before

- [ ] Event file in `content/events/<slug>.ts` merged: dates, theme,
      scoring mode, join policy, games and content.
- [ ] **Blob has room.** The last event's photos are backed up and cleared
      (see "After"). Vercel Blob usage is under 100 MB. If not, back up
      and clear now.
- [ ] Firebase usage dashboard: nothing left over from the last event that
      is still reading or writing.
- [ ] Re-check free-tier limits (`reference/free-tier-budget.md`) against
      the Firebase and Vercel pricing pages.

## The week before

- [ ] Production deploy with Khai's go-ahead.
- [ ] `ADMIN_PASSPHRASE` set (change it if it was shared at the last event).
- [ ] Join code generated; QR poster printed (URL + code, large).
- [ ] Display tested on the venue's TV or projector, at full screen.
- [ ] Join and play tested on one iPhone and one Android.
- [ ] Load test passes for the expected head count plus 20%.
- [ ] Name filter reviewed for this crowd (add club or local words).
- [ ] The event's `replayable` and each game's `alwaysOpen` decided. Games left
      `alwaysOpen` for testing let people play (and score) before the start.
- [ ] Test players and plays from before the party cleared with **Clear test
      data** in Controls (it deletes them for good).

## On the day

- [ ] Open Controls on your phone and the display on the TV before doors.
- [ ] Glance at "new since you last looked" between activities.
- [ ] Triage photos right before each photo vote or slideshow.

## After (within a week)

- [ ] Set the event to `ended`.
- [ ] Export photos: `npm run photos:export -- <slug>` makes a zip of every
      photo (approved and not) with a CSV of who, when, prompt, status.
- [ ] Save the zip to the backup location (Google Drive folder
      `Game Master/<slug>`) and check the photo count matches.
- [ ] Clear photos: `npm run photos:prune -- <slug>` deletes the files from
      Blob and marks each record `archived` with the backup location.
- [ ] Confirm Blob usage dropped.
