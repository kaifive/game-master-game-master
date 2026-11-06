# 03: Teams, phases and captains

**Status:** Draft
**Backlog:** M1
**Depends on:** 02, 04

## Summary

Events can be individual, team or both (ADR-011). In a `both` event the admin moves from the individual phase to the team phase. The admin promotes players to captains, captains name their teams, and everyone else joins a team in one tap.

## In scope (first pass)

- Event `scoring` from the config; `phase` switched from controls, with a confirm and a message on every phone
- Admin promotes a player to captain; the captain's phone asks for a team name (name filter, unique per event)
- Teams can be any size, including uneven ones; only the captain's phone controls live games (ADR-014)
- Team colors assigned in order from `--gm-team-N`
- Players see the list of teams with members and score, and join in one tap with a confirm ("You can't switch later")
- No self-switching; the admin can move a player or demote a captain
- Captains are mirrored to `live/{slug}/captains` for buzzer rules
- Team-only events start in the team phase

- Captains can't start over (ADR-027); `isCaptain` in the player service is wired here.

## Open questions

- Q16: can a team have only its captain? Is there a max team size?
- What happens to a team if its captain is removed? Default: the admin picks a new captain.

## Acceptance criteria

To be written when this spec moves to `Ready`.
