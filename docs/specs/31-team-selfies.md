# 31: Team selfies, dressed up with stickers for the finale

**Status:** Draft (agreed with Khai 2026-11-19; marked Ready in the PR that builds it, since check:ac makes Ready mean its tests exist)
**Backlog:** M4
**Depends on:** 03, 14, 20, 29

## Summary

When a captain names the team and picks its color (spec 29), they also take a
team selfie. Before the end, the host dresses up each selfie in Controls with
funny stickers: Santa hats, crowns, antlers, mustaches, glasses. At the finale
the winning team's dressed-up selfie is revealed on the TV. Selfies show
nowhere else, so the stickers stay a surprise (Khai, 2026-11-19).

## User stories

- As a captain, I want to take our team's selfie when we set up, so we're part of the finale.
- As the host, I want to put silly hats and mustaches on the teams, so the winners' reveal gets a laugh.
- As the room, I want to see the winning team, dressed up, on the big screen.

## Behavior

### Taking the selfie

1. Naming the team (S03-AC2) now takes three things, in order on one screen: the
   name, the color (spec 29), then the **team selfie**. The selfie is required:
   Save stays off until there's a photo (Khai, 2026-11-19).
2. "Take the selfie" opens the phone's front camera (`capture="user"`); the captain
   can also pick a photo already taken. The phone shows it back with Retake and
   Use this. Before upload the phone shrinks it to at most 1600 px on the long
   side, as a JPEG, so it fits Spot and Snipe's limits (spec 20: at most 3 MB).
3. Once saved, the selfie is fixed, like the name and color. If a captain's phone
   can't take or send one (no camera, upload keeps failing), the host can add or
   replace the team's selfie from Controls.
4. Selfies are kept in Vercel Blob under `events/{slug}/teams/` with a random suffix
   (ADR-034), only for this event, and are backed up and cleared with the photos
   after it (`runbooks/event-checklist.md`).

### Dressing it up (host)

5. Controls has a **Team selfies** card: each team's selfie, its name and color, and
   "Dress up". Teams still setting up show "No selfie yet".
6. Dress up opens the selfie large with a tray of **stickers**: Santa hat, elf hat,
   crown, reindeer antlers, mustache, beard, glasses, bow tie, red nose and a
   holly sprig. Tapping one drops it in the middle; the host drags it into place,
   pinches or uses the + and − buttons to size it, and turns it with a rotate
   handle or buttons. A sticker can be flipped (for a hat leaning the other way),
   brought to the front, or removed. Any number of stickers per selfie.
7. Changes save as they're made, so nothing is lost if Controls closes. Stickers
   are stored as positions on the photo (shares of its width and height, size and
   angle), never baked into the image, so they can be moved later.
8. The host can dress up every team before the end, since the winner isn't known
   until then.

### The finale

9. When the event ends and the TV shows the final standings (spec 05, spec 14
   "Final standings"), after the podium reveal the winning team's dressed-up
   selfie comes up big, held up like a judge's card in the team's color, with the
   team's name, "Champions!" and their points. Stickers pop on one by one, then
   snow drifts (spec 14). With reduced motion, it's all there at once.
10. A tie for first shows each tied team's selfie side by side.
11. The host can show it again or skip it from Controls.
12. Selfies show nowhere else: not on the Team tab, the board, showdowns or phones.
    Phones show the finale's words, not the photo.

## Data

- `events/{slug}/teams/{teamId}`: `selfie: { url, path, width, height } | null` and
  `stickers: { id, kind, x, y, size, angle, flip }[]`, where `x` and `y` are the
  sticker's center as shares of the photo (0 to 1), `size` its width as a share of
  the photo's width, and `angle` in degrees. The teams summary phones poll never
  carries either.
- Blob: `events/{slug}/teams/{teamId}-<random>.jpg`. At most 6 a party, well within
  the free tier (`reference/free-tier-budget.md`).
- Stickers are drawn as inline SVG in the event's style (no emoji), one component
  per sticker in `components/stickers/`.

## Routes and real-time

- `POST /api/events/[slug]/teams/[teamId]/selfie` (captain's device token, or the
  host's session): form data `photo` → the team. 400 for a wrong type or size,
  403 for anyone but that team's captain or the host, 409 once a selfie is saved
  (captains only), 503 with no Blob store connected.
- `PUT /api/admin/events/[slug]/teams/[teamId]/stickers` (host): the full sticker
  list → saved. Validated: known kinds, positions 0 to 1, at most 30 stickers.
- The TV gets the winners' selfies and stickers only in the final-standings view.

## UI

- **Captain's phone:** under the name and colors, a large frame in the team's color
  with "Take the team selfie" (at least 56 px); then the photo with Retake and Use
  this; Save names everything at once.
- **Controls, Dress up:** the selfie fills the width; the sticker tray is a
  scrolling row of drawn stickers (each at least 56 px) under it; the picked
  sticker gets a ring with drag, size and rotate handles, and a small toolbar
  (bigger, smaller, turn, flip, to front, remove). Works by mouse and by touch on
  a phone or tablet.
- **TV finale:** see Behavior 9. The photo fits the screen without scrolling.

## Edge cases

- The captain leaves mid-setup: the next captain (spec 03) takes the selfie.
- A team is removed: its selfie and stickers are deleted.
- Clearing test data deletes the selfie files too.
- A photo turned sideways by the camera: the phone applies its orientation before
  shrinking it.

## Acceptance criteria

- [ ] AC-1: Naming a team requires a selfie from the camera or the photo library, shrunk on the phone and kept in Blob; once saved it's fixed, and only the host can add or replace one after.
- [ ] AC-2: In Controls the host can add any number of stickers to each team's selfie, from the set in Behavior 6, and move, size, turn, flip, layer and remove them; changes save as made.
- [ ] AC-3: At the finale the TV shows the winning team's selfie with its stickers (each tied winner's, side by side), with its name and points; reduced motion shows it at once.
- [ ] AC-4: Selfies and stickers show nowhere else and never reach phones.
- [ ] AC-5: Selfies are deleted with the team, with test data and in the post-event cleanup.

## Tests

- Unit: sticker validation; who may upload when; the summary never carries selfies.
- Component: the naming screen's selfie step; the Dress up editor (add, drag, size, turn, flip, remove) with mocked layout; the finale reveal and a tie.
- E2E: a captain names a team with a selfie (a fixture image), the host adds a hat and a mustache, the event ends, and the TV shows the selfie with both.

## Out of scope

- Finding faces automatically to place stickers.
- Stickers drawn or uploaded by the host.
- Showing selfies anywhere but the finale.

## Open questions

- Q34 in `OPEN_QUESTIONS.md`: who places the stickers.
