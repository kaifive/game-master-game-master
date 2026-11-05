# 09: Style packs and theming

**Status:** Draft (acceptance criteria proposed, waiting for Khai's yes)
**Backlog:** M0
**Depends on:** none

## Summary

Each event picks a style pack (ADR-021) for its player client and TV display: tokens, fonts, icons, motion presets, and its own versions of any generic component slots, falling back to defaults (ADR-022). Games are written once against the slots, so a new event can look completely different with no game code changes. The admin layer has its own fixed, standard look. The first pack is Judges' Table with a winter variant, for the Wushu Holiday Party (`docs/styles/judges-table.md`).

## Behavior

- An event names `style: { pack, variant?, colorMode }`. Games may override the variant only.
- The theme on screen = pack tokens, then variant overrides, then the color mode.
- Slots resolve through a registry: the pack's component if it has one, else the default.
- Color mode defaults from the event file and can be switched live from Controls (`live/{slug}/settings`).
- Admin pages ignore the event's style.

## Acceptance criteria

- [ ] AC-1: An event config's style names a known pack, a variant that pack has, and a color mode; anything else fails config validation with a message naming the bad value.
- [ ] AC-2: Resolving a slot returns the pack's component when the pack provides one, and the default otherwise.
- [ ] AC-3: Every pack's version of a slot passes that slot's shared contract test suite (same props, roles, states, keyboard and reduced-motion behavior).
- [ ] AC-4: Every token in the contract is defined for light and dark in every pack; a missing token fails the tests.
- [ ] AC-5: A variant changes only tokens, icons and decorations on top of its pack, and pack + variant + mode always resolves to a complete token set.
- [ ] AC-6: In every pack, variant and mode, text meets 4.5:1 contrast against its background (3:1 for large text), checked automatically.
- [ ] AC-7: Player and TV pages render in the event's pack; admin pages render in the admin theme whatever the event.
- [ ] AC-8: Switching the color mode in Controls updates every open phone and the TV within 2 seconds, without a reload.
- [ ] AC-9: A page for an event using one pack never loads another pack's CSS, fonts or components.
- [ ] AC-10: The `/dev/ui` gallery shows every slot in every pack, variant and mode.
- [ ] AC-11: The Judges' Table pack with its winter variant provides `Surface`, `Banner`, `ScoreCard`, `Tile`, `Key`, `Toast`, `LeaderboardRow` and `Progress`; every other slot uses the default.

## Tests

Unit tests for config validation and theme resolution; component tests running each slot's contract suite against the default and every override; an automated contrast test over all token sets; a build test for AC-9; an e2e test for AC-7 and AC-8.

## Out of scope

Additional packs (candidates in `docs/styles/README.md`); an in-app theme editor.
