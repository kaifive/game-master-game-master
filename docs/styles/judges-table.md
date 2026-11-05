# Judges' Table

**Status:** chosen for the Wushu Holiday Party (variant: winter). Built in M0.
**Mockup:** https://claude.ai/artifact/13AtXvXkS99XL8SqDTJoQt
**Impeccable direction contract:** `.impeccable/surfaces/app-event.md`

## World

The party scored like a taolu competition. Every finished game holds up a
judge's score card; the hub lists what's up for grabs, what's scored and
what's coming up; the TV is the competition results board under a red and
gold judges' band.

## Winter variant

Cranberry band with a gold rule and holly, snow falling on every screen,
candy-striped ribbon on score-card handles. Light mode is a snowy day
(frost-white ground), dark mode a winter night.

## Tokens (starting values; finalized in the build)

| Token | Light | Dark |
|-------|-------|------|
| ground | `#edf2f5` frost | `#0b1418` winter night |
| snow | `#d3dfe6` | `rgba(255,255,255,0.22)` |
| ink | `#10181c` | `#eef4f6` |
| soft ink | `#4a5960` | `#9fb1b8` |
| accent (band, totals) | `#b3122e` cranberry | `#d92a48` |
| gold | `#e5b553` (`#c48f22` for lines) | same |
| holly | `#1f5c45` | same |
| card / card ink | `#ffffff` / `#111111` | same |
| card back (unscored, misses) | `#c9d4da` | `#263840` |

## Type

Oswald for numerals and headings; Atkinson Hyperlegible for reading.

## Slots this pack provides

`Surface` (snow), `Banner` (judges' band), `ScoreCard` (paddle on a
handle; blank when unscored), `Tile` and `Key` (score-card letters: gold
with a check when right, red corner flag in the wrong spot, frosted when
missing), `Toast` (mini score card + text), `LeaderboardRow` (results-board
row), `Progress` (pips). Everything else uses the defaults.

## Motion

The flip: score cards flip up on their handles when a score lands. On the
TV, snow drifts when big moments land, with a gong.

## Rules from the review

- Games can be played in any order: never number games or call it an
  order of play.
- Scores scale by living on each game's row; scored games fold away past
  three.
