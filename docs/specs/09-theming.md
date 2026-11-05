# 09: Theming

**Status:** Draft
**Backlog:** M2
**Depends on:** none

## Summary

Themes set the look of events and games through semantic CSS variables and a semantic icon map, so the same game can have a holiday version or a dark mode with no code changes.

## In scope (first pass)

- `Theme` type: tokens per color mode, icon set, decorations, fonts
- Built-in themes: `classic` and a `holiday` variant for the party
- Event-level theme with per-game override; light and dark modes
- Applies to player phones **and the TV display**; the display adds a size and stage layer (`--gm-display-*`, `--gm-stage-*`) per theme
- Game types theme both their player `Renderer` and their `Display` view
- Built on the visual direction in `DESIGN.md` (chosen in M0)
- Controls always use a neutral admin theme
- Accessibility: contrast checks in tests; color-blind-safe tile states

## Open questions

- What should the holiday look be? (colors, motifs, any wushu touches)

## Acceptance criteria

To be written when this spec moves to `Ready`.
