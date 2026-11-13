# 20: Photo challenge (Spot and Snipe)

**Status:** Done
**Backlog:** M2
**Depends on:** 04, 07, 08, ADR-032, ADR-033

## Summary

A photo game: the event file gives a prompt, players take or pick photos on their phones, and the host rates each one in Controls with a slider. Built generically (any prompt). At the Wushu Holiday Party it's **Spot and Snipe**: one photo of Coach, and the funnier, the more points (Khai, 2026-11-13). This is the photo challenge from spec 13, built first; triage, votes and the slideshow stay in spec 13.

## Behavior

1. Content: `prompt` and `maxPhotos` (1 to 10, default 1: one chance, so make it count; Khai, 2026-11-13). One play per player (not replayable: photos add up inside it), which holds up to `maxPhotos` photos.
2. The phone shows the prompt, the photos sent so far (each "Waiting for a rating" or its rating) and **Take or choose a photo**; with one photo it says "Just one photo, so make it count!". A picked photo is shrunk on the phone (longest side 1600 px, JPEG; ADR-008), shown, and sent with **Send it**. **Pick another** drops it.
3. The server checks the player, that the game is open and has room, the type (JPEG, PNG or WebP) and size (at most 3 MB), then keeps the file in Vercel Blob under `events/{slug}/photos/` with a random suffix (ADR-034) and adds it to the play. Without a Blob store connected, the phone says photos can't be sent yet.
4. In Controls, a card per photo game loads the photos on request (each costs a read), unrated first: the photo, the player and a **0 to 100** slider with **Save**. Saving rates the photo; rating it again changes it.
5. A player's points for the game are their best photo's rating as a share of the game's points (rating 80 at 100 points earns 80). When a rating changes the best, the old award is voided and the new one awarded through the ledger, so the phone and TV update.
6. The play is over once it holds `maxPhotos` photos; it waits for ratings until every photo is rated, and its score card (result and games list) reads "???" until then. A rating shows on the phone at once: no separate release.
7. Clearing test data deletes the photo files too. Photos aren't shown to other players or on the TV yet (spec 13).

## Data

- Play `state`: `photos: [{ id, url, rating (0 to 100 or null), at }]` and the step. No new collections.
- Blob: `events/{slug}/photos/{gameId}/{playerId}-{photoId}-<random>.jpg`.

## Routes

- `POST /api/events/[slug]/games/[gameId]/photo` (device token): form data `playerId` and `photo` (the file) → the play, as `/play` returns it. 400 for a wrong type, size or a full play; 403 when closed or not this phone's player; 503 when no Blob store is connected.
- Controls actions `photos` (load) and `ratePhoto` `{ gameId, playerId, photoId, rating }`.

## Acceptance criteria

- [x] AC-1: Content is a prompt and up to 10 photos; the instructions come from it.
- [x] AC-2: A photo is accepted only for this phone's player, an open game with room, an image type and at most 3 MB; it's kept in Blob and added to the play.
- [x] AC-3: The phone shrinks a photo, shows it, sends it, and lists sent photos with their rating or "Waiting for a rating".
- [x] AC-4: Controls lists the photos, unrated first, and rates each from 0 to 100; the best rating sets the player's points through the ledger, and re-rating voids the old award.
- [x] AC-5: The play ends at `maxPhotos` photos and waits for ratings; clearing test data deletes the files; the party's event file has Spot and Snipe, which plays end to end.

## Out of scope

- Showing photos on the TV, triage, votes, the slideshow (spec 13).
