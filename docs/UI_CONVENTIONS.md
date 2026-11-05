# UI conventions

Two design layers (ADR-021):

- **Admin layer** (library, sign-in, controls, photo triage, recap): one
  standard, calm, SaaS-style look for every event. Never changes per event.
- **Event layer** (player client and TV display): each event picks a
  **style pack**, such as Sticker Book or One-Hour Photo, plus an optional
  variant (holiday) and a color mode. The phones and the TV always share
  the event's style.

## Design direction

**Event styles: fun, with a point of view. Never generic.** Each style pack
should feel like a game show and a party, not a SaaS dashboard. Style packs
are documented in `docs/styles/<pack>.md`; `DESIGN.md` at the repo root
records the admin look and the style-pack contract.

**Admin: standard and quiet.** System font stack, cool neutrals, one accent,
dense lists, clear states. Familiar on purpose, so Khai can run the night
without thinking about the interface.

Design work uses the **Impeccable** skill (`.claude/skills/impeccable`,
ADR-017). It reads `PRODUCT.md` and `DESIGN.md`. Impeccable's mode for
each surface:

| Surface | Mode | What that means |
|---------|------|-----------------|
| Display | Experience | A stage. Big, bold, animated, made to be watched. |
| Solo games, buzzer, photo vote | Experience | The game is the screen. Play and feedback lead. |
| Player hub, join | Operate, with personality | Fast and obvious, but still part of the party. |
| Controls, library, triage | Operate | Standard SaaS. Dense, calm, precise, same for every event. |

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

The admin layer uses one fixed neutral theme. **Player and display
surfaces both use the event's style pack**, through the same tokens, so a
style or a holiday variant reskins the TV as fully as the phones.

## Style packs

A style pack is everything that makes an event look like itself, and
nothing that changes behavior (ADR-021):

| Part | What it sets |
|------|--------------|
| Tokens | Every `--gm-*` value above, for light and dark |
| Fonts | Display and data faces (body text stays Atkinson Hyperlegible for legibility) |
| Components | Its own version of any **slot** (below), or nothing, to use the default |
| Icons | The semantic icon set (`correct`, `present`, `trophy`, ...) |
| Motion | Which celebration each moment plays (the slap, the flash, the burst) and its timing |
| Decorations | Optional ornaments for the display and hub edges |

### Slots: generic components a pack can replace (ADR-022)

Games and pages never import a styled component directly. They ask for a
slot by its generic name, and the event's pack answers with its own
component or the default:

```tsx
const { ScoreCard } = useSlots();      // Judges' Table: a paddle on a handle
<ScoreCard value={150} state="scored" label="Gift Guess" />
```

| Slot | Used for |
|------|----------|
| `Surface` | Screen ground and texture (snow, carpet, grid paper) |
| `Banner` | The event band at the top of hub, games and TV |
| `Button` | Primary and secondary actions |
| `Panel` | A grouped area (join panel, results table frame) |
| `ScoreCard` | One score or result (hub rows, toasts, game end) |
| `Tile` | A letter or piece in a game grid, with its state |
| `Key` | On-screen keyboard key, with its state |
| `Progress` | Games done out of total |
| `Toast` | One item in the toast chain |
| `LeaderboardRow` | One rank row on the TV and hub |
| `Buzzer` | The captain's buzzer |
| `CodeEntry` | Entering a game or event code |

`Celebration` (the animation for a moment) joins this list with spec 14.

Rules:
- Each slot has one **props contract** (a TypeScript type), one
  **default component**, and one **contract test suite**. Every pack's
  version must pass the same suite: same props, roles, states, keyboard
  behavior and reduced-motion handling. A pack changes how a slot looks and
  moves, never what it means or does.
- Packs override only what they need; everything else falls back to the
  default, which is styled entirely by tokens.
- A new slot is added here, with its contract and default, before any pack
  uses it.
- A pack ships light and dark, and its variants (holiday) are token and
  icon overrides on top of it.
- Each pack's CSS and fonts load only for events that use it.
- Every pack appears in the `/dev/ui` gallery and passes the same contrast
  and color-blind checks.
- The color mode is a default in the event file and can be switched live
  from Controls, so the TV can match the room on the night.

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

## Motion and celebrations

Motion is part of the fun, not decoration. Every change a player cares
about should be *seen* happening. Spec 14 has the full list of moments.

**Rules**
- Animate only `transform` and `opacity` (plus canvas for particles).
  60 fps on a mid-range phone.
- Durations and easings come from motion tokens, never ad-hoc values:
  `--gm-motion-fast` (150 ms), `--gm-motion-base` (300 ms),
  `--gm-motion-slow` (600 ms), `--gm-motion-stage` (1200 ms, display only),
  `--gm-ease-out`, `--gm-ease-spring`. Themes may tune them.
- Motion explains change: things move *from* where they were *to* where
  they are. Nothing pops in or out without a transition.
- Reduced motion (`prefers-reduced-motion`): position changes become
  quick fades, counters jump to the final number, no confetti or shaking.
- Celebrations are bigger on the display than on phones. Phones get a
  short burst; the TV gets the full show, but only for big moments.
  Individual achievements on the TV are small toasts in a toast chain
  (spec 14), so a busy night doesn't drown the leaderboard.
- Sound plays on the display only, never on player phones (Q9).

**Shared primitives** (`lib/motion`, `components/motion`): one of each,
used everywhere.

| Primitive | Does |
|-----------|------|
| `useFlip()` | Rows glide to their new rank when order changes (FLIP technique) |
| `<CountUp>` | Numbers roll up to their new value |
| `<BarRace>` | Animated bar chart for leaderboards; bars grow and swap places |
| `<PointsBurst>` | A floating "+100" from where points were earned |
| `<Confetti>` / `celebrate()` | Themed confetti bursts (holiday variant: snowflakes) |
| `<Reveal>` | Staggered entrance for lists, boards and results |
| `<Shake>`, `<Pulse>` | Wrong-answer shake, buzz-in pulse |
| `<ToastChain>` | Stacked, auto-expiring toasts for small moments on the display |

## Components (planned)

`Button`, `Card`, `Sheet` (bottom sheet on phones), `List`, `Badge`,
`TeamChip`, `PointsPill`, `QrCode`, `Buzzer`, `LeaderboardRow`, `Toast`.
Hand-written on Tailwind; no component libraries.
