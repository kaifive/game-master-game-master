# 31: Team selfies, dressed up with stickers for the finale

**Status:** Done (agreed with Khai 2026-11-19)
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
   holly sprig. Tapping one drops it near the top middle; the host drags it into
   place and uses Bigger and Smaller to size it and Turn left and Turn right (15°
   a tap) to turn it. A sticker can be flipped (for a hat leaning the other way),
   brought to the front, or removed. Up to 30 stickers per selfie. Stickers keep
   their own colors (a red Santa hat) in every theme, in Controls and on the TV.
7. Changes save as they're made, so nothing is lost if Controls closes. Stickers
   are stored as positions on the photo (shares of its width and height, size and
   angle), never baked into the image, so they can be moved later.
8. The host can dress up every team before the end, since the winner isn't known
   until then.

### The finale

9. When the host ends the event, the TV's board gives way to the finale: the
   winning team's dressed-up selfie, held up like a judge's card framed in the
   team's color, under "Champions!", with the team's name and its points on a
   gold score card. The stickers pop on one by one. With reduced motion, they're
   all there at once.
10. A tie for first shows each tied team's selfie side by side. A winner with no
    selfie shows its name on a card in its color.
11. The finale stays up while the event is ended; Reopen in Controls brings the
    board back. Hiding the scores on the TV (S07-AC11) hides the finale too.
12. Selfies show nowhere else: not on the Team tab, the board, showdowns or phones.
    Phones show the finale's words, not the photo.

## Data

- `events/{slug}/teams/{teamId}`: `selfie: { url, width, height, archived? } | null`
  and `stickers: { id, kind, x, y, size, angle, flip }[]`, where `x` and `y` are
  the sticker's center as shares of the photo (0 to 1), `size` its width as a
  share of the photo's width, and `angle` in degrees. The teams summary phones
  poll never carries either; it says only `ended`, so the TV knows when to fetch
  the finale without reading the event's status on every poll.
- Blob: `events/{slug}/teams/{teamId}-<random>.jpg`. At most 6 a party, well within
  the free tier (`reference/free-tier-budget.md`).
- Stickers are drawn as inline SVG in the event's style (no emoji), one component
  per sticker in `components/stickers/`.

## Routes and real-time

- `POST /api/events/[slug]/teams/selfie` (captain's device token): form data
  `playerId`, `photo`, `width`, `height`. 400 for a wrong type or size, 403 for
  anyone but a captain, 409 once the team is named, 503 with no Blob store.
- `GET /api/admin/events/[slug]/selfies` (host): every team's selfie and stickers.
  `POST …/selfies?teamId=` adds or replaces one (form data as above);
  `PUT …/selfies` with `{ teamId, stickers }` saves the full sticker list,
  validated: known kinds, positions 0 to 1, at most 30 stickers.
- The TV's `GET /api/events/[slug]/display` carries `finale` (the winners, dressed
  up) only once the event has ended.

## UI

- **Captain's phone:** under the name and colors, a large frame in the team's color
  with "Take the team selfie" (at least 56 px); then the photo with Retake and Use
  this; Save names everything at once.
- **Controls, Team selfies:** loaded on request (Show), each team's selfie with its
  stickers, Dress up, and Add a selfie / Replace selfie. **Dress up:** the selfie
  fills the width; the picked sticker gets a dashed ring and a toolbar (Bigger,
  Smaller, Turn left, Turn right, Flip, To front, Remove); the tray is a scrolling
  row of drawn stickers, 64 px each. Saves itself half a second after a change.
  Works by mouse and by touch.
- **TV finale:** see Behavior 9. The photo fits the screen without scrolling.

## Edge cases

- The captain leaves mid-setup: the next captain (spec 03) takes the selfie.
- A team is removed: its selfie and stickers are deleted.
- Clearing test data deletes the selfie files too.
- A photo turned sideways by the camera: the phone applies its orientation before
  shrinking it.

## Acceptance criteria

- [x] AC-1: Naming a team requires a selfie from the camera or the photo library, shrunk on the phone and kept in Blob; once saved it's fixed, and only the host can add or replace one after.
- [x] AC-2: In Controls the host can add any number of stickers to each team's selfie, from the set in Behavior 6, and move, size, turn, flip, layer and remove them; changes save as made.
- [x] AC-3: At the finale the TV shows the winning team's selfie with its stickers (each tied winner's, side by side), with its name and points; reduced motion shows it at once.
- [x] AC-4: Selfies and stickers show nowhere else and never reach phones.
- [x] AC-5: Selfies are deleted with the team, with test data and in the post-event cleanup.

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
