# 09: Style packs and theming

**Status:** Draft
**Backlog:** M2
**Depends on:** none

## Summary

Each event picks a style pack (ADR-021) for its player client and TV display: tokens, fonts, slot skins, icons and motion presets, plus a variant (holiday) and a color mode. Games and components are written once against the slots, so a new event can look completely different with no game code changes. The admin layer has its own fixed, standard look.

## In scope (first pass)

- `StylePack` contract: tokens per color mode, fonts, slot skins, icon set, motion presets, decorations (`docs/UI_CONVENTIONS.md` lists the slots)
- First pack for the holiday party (Khai picks from the options), with a `holiday` variant; more packs later
- Event-level style with per-game variant override; light and dark modes
- Color mode switched live from Controls for the TV and phones (Khai's call on site)
- Pack CSS and fonts load only for events using that pack
- Applies to player phones **and the TV display**; the display adds a size and stage layer (`--gm-display-*`, `--gm-stage-*`) per theme
- Game types theme both their player `Renderer` and their `Display` view
- Built on the visual direction in `DESIGN.md` (chosen in M0)
- The admin layer (library, controls, triage, recap) uses one standard SaaS-style theme, never the event's
- Accessibility: contrast checks in tests; color-blind-safe tile states

## Open questions

- Which pack is first, for the holiday party?
- What does its holiday variant change? (colors, motifs, any wushu touches)

## Acceptance criteria

To be written when this spec moves to `Ready`.
