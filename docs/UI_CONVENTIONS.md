# UI conventions

One look across the player client, controls and display, while letting each
event and game reskin itself through themes (spec 09).

## Design direction

**Fun, with a point of view. Never generic.** Game Master should feel like
a game show and a party, not a SaaS dashboard. The visual direction is
chosen by Khai from options (backlog M0) and recorded in `DESIGN.md` at the
repo root. Until then, no surface gets final styling.

Design work uses the **Impeccable** skill (`.claude/skills/impeccable`,
ADR-017). It reads `PRODUCT.md` and `DESIGN.md`. Impeccable's mode for
each surface:

| Surface | Mode | What that means |
|---------|------|-----------------|
| Display | Experience | A stage. Big, bold, animated, made to be watched. |
| Solo games, buzzer, photo vote | Experience | The game is the screen. Play and feedback lead. |
| Player hub, join | Operate, with personality | Fast and obvious, but still part of the party. |
| Controls | Operate | Dense, calm, precise. Fun lives in small details only. |

Banned "AI slop" tells (Impeccable's detector checks for most of these):
one default sans for everything, purple-to-blue gradients, cards nested in
cards, gray text on colored backgrounds, a rounded icon tile above every
heading, eyebrow labels above headings, emoji used as icons, glassmorphism
by default, centered everything, identical card grids.

## Principles

1. **Phone first for players.** One hand, one thumb, standing in a noisy
   room. Big targets, few words, no tiny text.
2. **Readable across the room on the display.** Assume viewers 5 m away.
3. **Fast for the admin.** Controls favor dense lists and one-tap actions;
   destructive actions confirm.
4. **Tokens, not colors.** Components and renderers use semantic tokens
   only. No hex values or Tailwind palette colors (`bg-red-500`) outside
   `lib/themes/`.
5. **Color is never the only signal.** Every color state also has an icon,
   shape or label (for example word-guess tiles: correct, present, absent).

## Sizes by surface

| | Player | Controls | Display |
|---|--------|----------|---------|
| Width to design for | 375 px | 1024 px and up (works on tablet) | 1920 × 1080 |
| Minimum body text | 16 px | 14 px | 32 px |
| Minimum tap target | 44 px; buzzer fills most of the screen | 40 px | n/a |
| Page scroll | Vertical only, never sideways | Vertical | None: fits one screen |

## Semantic tokens

Defined per theme as CSS variables, mapped into Tailwind as utilities.
Names are stable; values change per theme and color mode.

```
--gm-bg, --gm-surface, --gm-surface-raised, --gm-border
--gm-text, --gm-text-muted, --gm-text-on-accent
--gm-accent, --gm-accent-hover            primary actions
--gm-success, --gm-warning, --gm-danger   right, careful, wrong
--gm-tile-correct, --gm-tile-present, --gm-tile-absent, --gm-tile-empty
--gm-buzzer, --gm-buzzer-pressed, --gm-buzzer-locked
--gm-team-1 ... --gm-team-8               team colors
--gm-radius, --gm-font-display, --gm-font-body
```

Controls use a fixed neutral theme so the admin view never changes with the
event's theme. **Player and display surfaces both use the event's theme**,
through the same tokens, so a holiday variant reskins the TV as fully as
the phones.

The display adds a size layer on top of the theme: `--gm-display-scale`,
display type sizes (`--gm-display-text-*`) and stage tokens
(`--gm-stage-bg`, `--gm-stage-spotlight`, `--gm-stage-confetti-*`) that
each theme and variant can set. Display components never use player sizes.

## Icons

Inline SVG, referenced by semantic name (`correct`, `present`, `buzzer`,
`trophy`, `team`), resolved through the theme's icon set. A holiday variant
can swap `trophy` for a snowflake without code changes.

## States every screen needs

- **Loading:** skeletons, not spinners, for lists.
- **Empty:** says what to do next ("Waiting for the host to start").
- **Offline:** a banner when presence drops; actions queue or disable.
- **Error:** one plain sentence and a retry.

## Motion and sound

- Respect `prefers-reduced-motion`.
- Animate rank changes on the leaderboard so changes are noticeable.
- Sound plays on the display only, never on player phones (see Q9).

## Components (planned)

`Button`, `Card`, `Sheet` (bottom sheet on phones), `List`, `Badge`,
`TeamChip`, `PointsPill`, `QrCode`, `Buzzer`, `LeaderboardRow`, `Toast`.
Hand-written on Tailwind; no component libraries.
