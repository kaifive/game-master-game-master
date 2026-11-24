---
name: Game Master
description: Party games scored like a taolu competition; Judges' Table winter look on phones and the TV, a fixed calm admin theme for Controls.
colors:
  bg: "#0b1418"
  surface: "#12222a"
  surface-raised: "#182c35"
  border: "#22333a"
  text: "#eef4f6"
  text-muted: "#9fb1b8"
  text-on-accent: "#ffffff"
  accent: "#c41e3c"
  accent-hover: "#a3172f"
  accent-ink: "#f5607a"
  success: "#3fbf86"
  warning: "#e5a93a"
  danger: "#ff6b81"
  band: "#c41e3c"
  band-ink: "#ffffff"
  gold: "#e5b553"
  gold-line: "#c48f22"
  rank-silver: "#c9d4da"
  rank-bronze: "#d9955a"
  card: "#ffffff"
  card-ink: "#111111"
  card-back: "#263840"
  card-back-ink: "#9fb1b8"
  handle-a: "#c41e3c"
  handle-b: "#ffffff"
  snow: "rgba(255, 255, 255, 0.22)"
  tile-correct: "#e5b553"
  tile-correct-ink: "#1d1300"
  tile-present: "#ffffff"
  tile-present-ink: "#111111"
  tile-absent: "#263840"
  tile-absent-ink: "#9fb1b8"
  team-1: "#ff4d5e"
  team-2: "#5b8cff"
  team-3: "#e5b553"
  team-4: "#3fbf86"
  team-5: "#b77ce8"
  team-6: "#34c3d1"
  team-7: "#ff8a3d"
  team-8: "#9aa9b1"
  winter-day-bg: "#edf2f5"
  winter-day-text: "#10181c"
  winter-day-accent: "#b3122e"
  admin-bg: "#f4f5f8"
  admin-surface: "#ffffff"
  admin-border: "#d8dce3"
  admin-text: "#161a22"
  admin-text-muted: "#535b69"
  admin-accent: "#3446d8"
  admin-accent-hover: "#2a39b3"
  admin-danger: "#c4203a"
typography:
  display-board:
    fontFamily: "Oswald, 'Arial Narrow', sans-serif"
    fontSize: "6rem"
    fontWeight: 700
    lineHeight: 1
  band-title:
    fontFamily: "Oswald, 'Arial Narrow', sans-serif"
    fontSize: "1rem"
    fontWeight: 500
    letterSpacing: "0.1em"
  headline:
    fontFamily: "Oswald, 'Arial Narrow', sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.33
  score:
    fontFamily: "Oswald, 'Arial Narrow', sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1
    fontFeature: "tnum"
  title:
    fontFamily: "'Atkinson Hyperlegible', system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
  body:
    fontFamily: "'Atkinson Hyperlegible', system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "'Atkinson Hyperlegible', system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 700
  admin-body:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
rounded:
  handle: "2px"
  card: "4px"
  gm: "5px"
  admin: "6px"
  pill: "9999px"
spacing:
  pip: "4px"
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "20px"
  tv: "32px"
  tv-column: "40px"
components:
  banner:
    backgroundColor: "{colors.band}"
    textColor: "{colors.band-ink}"
    typography: "{typography.band-title}"
    padding: "12px 16px 16px"
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.text-on-accent}"
    rounded: "{rounded.gm}"
    padding: "0 20px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.gm}"
    height: "44px"
  score-card-scored:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-ink}"
    typography: "{typography.score}"
    rounded: "{rounded.card}"
    size: "72px x 56px"
  score-card-blank:
    backgroundColor: "{colors.card-back}"
    textColor: "{colors.card-back-ink}"
    rounded: "{rounded.card}"
  score-card-highlight:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.tile-correct-ink}"
    rounded: "{rounded.card}"
  tile-correct:
    backgroundColor: "{colors.tile-correct}"
    textColor: "{colors.tile-correct-ink}"
    rounded: "{rounded.gm}"
    size: "44px"
  tile-absent:
    backgroundColor: "{colors.tile-absent}"
    textColor: "{colors.tile-absent-ink}"
    rounded: "{rounded.gm}"
    size: "44px"
  tab:
    textColor: "{colors.text-muted}"
    typography: "{typography.label}"
    rounded: "{rounded.gm}"
    height: "56px"
  tab-active:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text}"
  panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.gm}"
    padding: "16px"
  admin-button-primary:
    backgroundColor: "{colors.admin-accent}"
    textColor: "{colors.admin-surface}"
    rounded: "{rounded.admin}"
    height: "44px"
---

# Design System: Game Master

## Overview

**Creative North Star: "The Judges' Table on a Snowy Night"**

The party is scored like a taolu competition. Every result is a judge's score card held up on a handle; the phone hub is the judges' sheet (up for grabs, scored, coming up); the TV is the results board under a cranberry judges' band with a gold rule and a holly sprig. The winter variant sets the whole thing on a winter-night ground with two layers of slow falling snow. It refuses the party-app default of bright pills and bubbly type: the fun comes from the ritual of the card flipping up, not from decoration.

Two layers, never mixed (ADR-021). The **event layer** (player phones and TV) wears the event's style pack; for the Wushu Holiday Party that is Judges' Table, variant winter, dark mode, which is the primary system recorded here. The **admin layer** (Controls, library, sign-in) wears one fixed, calm, slate-and-indigo theme that never changes per event. Both are driven by the same `--gm-*` token contract, so every pack, and the admin theme, is a set of values for the same names.

Density follows the surface: phones are one-thumb, few words, 44 px minimum targets, vertical scroll only; the TV is 1920 x 1080, readable at five metres, never scrolls; Controls is dense and quiet.

**Key Characteristics:**

- Cranberry judges' band with a gold rule along its foot and a holly sprig at its end.
- White score cards with black Oswald numerals on candy-striped handles; frosted card backs with "–" for unplayed and "???" for a score still to come.
- Oswald for headings and numerals, Atkinson Hyperlegible for reading.
- Places in gold, silver and bronze; everyone else in quiet muted ink.
- Snow falls on every event screen; motion is transform and opacity only, and always optional.
- Every look is tokens: components never write a raw color.

## Colors

A cold winter-night ground, one warm cranberry voice, gold for winning, and white cards that carry every score.

### Primary

- **Judges' Cranberry** (`accent`, `band`): the band across the top of hub, games and TV, primary button fills, the buzzer, the red corner flag on a misplaced letter, and the red stripe in the score-card handle. Always a fill, carrying `text-on-accent` / `band-ink` white.
- **Lifted Cranberry** (`accent-ink`): the accent when it has to be read on the dark grounds: "Play" / "Again" row actions (with the drawn arrow icon), the TV join code, links, the How-to-play rule under the dialog title, and the focus ring. Cranberry itself reads under 3:1 on the winter night; `accent-ink` clears 4.5:1 on `bg`, `surface` and `surface-raised`.

### Secondary

- **Medal Gold** (`gold`): first place numerals, the highlight score card in celebrations, the value chip in each toast, correct letter tiles, and the rule under the band.
- **Gold Line** (`gold-line`): thin gold where fill gold would be too loud: done progress pips and the light-mode handle stripe.
- **Silver and Bronze** (`rank-silver`, `rank-bronze`): second and third place numerals on the results board.

### Tertiary

- **Team Colors** (`team-1` to `team-8`): one square swatch per team beside its name on the board, team panel and toasts. Always paired with the team's name.

### Neutral

- **Winter Night** (`bg`): the page ground under the snow.
- **Deep Spruce** (`surface`) and **Raised Spruce** (`surface-raised`): panels, the tab bar, dialogs, the highlighted own row, the active tab.
- **Frost Line** (`border`): row dividers and panel outlines.
- **Snow Ink** (`text`) and **Frosted Ink** (`text-muted`): reading text and notes ("Team phase", "Locked", "1 of 2").
- **Card White / Card Ink** (`card`, `card-ink`): score-card faces and on-screen keys; the same in every mode, because a judge's card is white.
- **Frosted Card Back** (`card-back`, `card-back-ink`): unscored cards, their plain handles, missed letters, undone pips.
- **Snow** (`snow`): the flake mask color and the snowbank glow at the foot of the page.
- **Winter Day** (`winter-day-*`): the light mode of the same variant (frost-white ground, dark ink, darker cranberry `#b3122e` where accent and accent-ink are the same). Selected live from Controls to match the room.

### Admin theme

Controls run on a fixed theme (`lib/themes/admin.ts`): cool slate ground (`admin-bg`), white cards with a gray header strip, slate ink, one indigo accent (`admin-accent`) for actions, red only for destructive actions. Same token names, its own values; it ignores the event's pack.

### Named Rules

**The Fill and Ink Rule.** `accent` is for fills under white text; `accent-ink` is for the accent as text, lines and focus rings on the page grounds. Never set text in `accent` on `bg` or `surface`.

**The Contract Rule.** Every pack defines every core token (`bg` through `team-8`, `radius`, both fonts, six motion tokens) for light and dark, and passes the shared contrast pairs: `text` and `text-muted` on `bg` and `surface` at 4.5:1, `text` on `surface-raised`, `text-on-accent` on `accent`, `accent-ink` on `bg` / `surface` / `surface-raised` at 4.5:1; tile inks on their tiles and `buzzer-ink` on `buzzer` at 3:1 (large bold text). Packs add pairs for their extras: Judges' Table checks `card-ink` on `card` (4.5:1), `card-back-ink` on `card-back` (3:1) and `band-ink` on `band` (4.5:1).

**The Tokens-Not-Colors Rule.** Components use `--gm-*` tokens through Tailwind (`bg-gm-surface`, `text-gm-accent-ink`) or `var(--gm-card)`; hex values live only in `lib/themes/`.

## Typography

**Display Font:** Oswald 500 / 700 (with 'Arial Narrow', sans-serif)
**Body Font:** Atkinson Hyperlegible (with system-ui, sans-serif)
**Admin Font:** the system stack (system-ui, -apple-system, Segoe UI, Roboto)

**Character:** Oswald is the condensed scoreboard face: tall numerals that read across a room and pack into a card. Atkinson Hyperlegible carries every sentence and name, chosen for grandparents reading in a dim hall.

### Hierarchy

- **Board numerals** (Oswald 700, 3.75 to 6rem on the TV, 2.25rem on phones, line-height 1): places and score cards on the results board, the extra-large celebration card.
- **Band title** (Oswald 500, 1rem on phones / 2.25rem on the TV, uppercase, 0.1em tracking): the event name in the band. The only uppercase tracked text in the system besides the LIVE chip.
- **Headline** (Oswald 700, 1.5rem on phones, 2.25rem on the TV): "Team standings", "Scan to join", dialog titles (1.875rem).
- **Score** (Oswald 700, tabular numerals, 1.125 / 1.875 / 3rem / 6rem for sm / md / lg / xl cards): every number on a card.
- **Title** (Atkinson 700, 1.125rem): game names in hub rows; player names on the board (1.5rem phone, 2.25rem TV).
- **Body** (Atkinson 400, 1rem minimum on phones, 1.125rem in dialogs and the TV aside): sentences, empty states.
- **Label** (Atkinson 700, 13px to 14px): tab labels, progress counts, row notes.

### Named Rules

**The Two Faces Rule.** Oswald for numerals and headings, Atkinson Hyperlegible for anything read as a sentence or a name. No third face on event surfaces.

**The Room Size Rule.** Body text is at least 16 px on phones and 1.125rem on the TV (about 26 px on a 1080p screen, read from across the room); display components use display sizes, never player sizes. Bigger isn't better on the TV: everything must fit one screen (Khai, 2026-11-10: the board was too big and cut off).

## Layout

Phones design for 375 px: a single column, `max-w-xl` centered, 16 px side padding, 20 px between blocks. The band sits flush at the top; the bottom tab bar is fixed, 56 px tall tabs with a safe-area inset, and a 96 px spacer keeps content clear of it. Hub rows are at least 64 px tall, divided by a 1 px `border` line, with the game name and its note left and the row's own score card right. Scored games fold away past three. Pages scroll vertically only.

The TV is a grid that never scrolls and never cuts off: the root size scales with the smaller of the screen's width and height (`clamp(11px, min(1.2vw, 2.1vh), 32px)`), so a laptop, a browser with toolbars or a TV that crops its edges shows the same layout as a 1080p screen. Band across the top, then a padded area with the results board(s) left (`2fr 1fr` for team standings and top players) and a 22rem aside right holding the join panel (a 10rem QR, short URL, code) and the latest-points toast chain. Each board puts its top three on the podium and the rest in two columns of dense `tv` rows, reading down then across. Columns are 40 px apart.

Controls design for 1024 px and up: a `max-w-3xl` column of stacked cards with gray header strips, 16 px gaps, dense lists.

Rhythm runs 4 / 8 / 12 / 16 / 20 px on phones (pip gap, row padding, inline gaps, page padding, block gaps) and 32 / 40 px on the TV.

## Elevation & Depth

Mostly flat: the night ground, spruce panels and frost lines do the layering. Shadow is reserved for things that are physically held up: score cards, toasts and dialogs. The band's depth is drawn, not cast: an inset gold rule over a darker cranberry line along its foot.

### Shadow Vocabulary

- **Card lift** (`box-shadow: 0 4px 7px -4px var(--gm-shadow), 0 0 0 1px var(--gm-border)`): score cards, unused keys, present tiles, toasts. A short drop plus a hairline so white cards sit on both grounds.
- **Band rule** (`box-shadow: inset 0 -5px 0 var(--gm-gold), inset 0 -7px 0 color-mix(in srgb, var(--gm-band) 70%, black)`): the gold rule under the band.
- **Overlay** (Tailwind `shadow-2xl` with a 1 px `border` ring): dialogs, the celebration card, the TV join panel (`shadow-xl`).

### Named Rules

**The Held-Up Rule.** Only things a judge could hold up cast a shadow. Rows, groups and pages stay flat.

## Shapes

Small, crisp corners: the pack radius is 5px (`--gm-radius`) for tiles, keys, buttons, panels and tabs; score cards are slightly sharper at 4px, like card stock; handles round only their bottom 2px. Full rounds are kept for the LIVE chip, the total-score pill in the band, and the numbered steps in How to play. Team swatches are 3px-rounded squares. The score card is the system's silhouette: a card on a thin striped handle, used for every score from a 36 px hub card to the 160 px celebration card. A misplaced letter carries a 14 px triangular corner flag in cranberry. The admin theme uses 6px.

## Components

### Player strip

The top of the Games tab, under the band: the player's name in Oswald (3xl) and their team (swatch and name) on the left, their total on the right in large `accent-ink` Oswald numerals beside the points icon. On that page the band carries no total pill; every other page keeps the pill in the band. The total appears only once it has loaded, so it never counts up from 0.

### Banner (judges' band)

The top of every event screen.

- **Fill:** `band` with `band-ink` text, gold rule along the foot (see Elevation).
- **Content:** event name in the band title style; on the hub, the player's total in a darker pill with a holly sprig at the right. With the winter variant a holly sprig sits at the end; it steps aside once the total (which has its own holly) shows.
- **LIVE:** a full-round `band-ink` chip with `band` text, bold, widely tracked.

### Score Card

The signature. A white card with black Oswald numerals on a candy-striped handle (`handle-a` / `handle-b` at 2px stripes, -45 degrees).

- **Scored:** `card` / `card-ink`, card lift shadow.
- **Blank (not played):** `card-back` / `card-back-ink` with "–", plain handle in `card-back`.
- **Pending (played, the host scores it later):** the same frosted back with "???" (a jar before the reveal, an unrated photo). Revealing the score flips the card.
- **Miss (a score of 0):** held up on the same frosted `card-back`, still reading "0", never as a white card.
- **Highlight:** `gold` with `tile-correct-ink`, for celebrations.
- **Sizes:** sm 48 x 36 px (hub rows), md 72 x 56, lg 128 x 96, xl 160 px tall (celebrations).
- **Motion:** the flip, `jt-flip` (rotateX from -80 degrees with a 400px perspective, 420 ms, `cubic-bezier(0.16, 1, 0.3, 1)`), behind `motion-safe`, only when a score lands: a fresh result or a score that changed since the card was last seen. Seeing the same score again never flips it, and neither does a blank card filling in while the page loads.
- Always carries an accessible name ("Holiday Trivia: 20 points" / "not scored yet").

### Podium (TV)

The TV's top three stand on the judges' podium: 2 left, 1 in the middle, 3 right. Each holds up a score card that grows with its score (the leader's on `gold` with `tile-correct-ink`, the others white), their name below, then a flat `surface-raised` step carrying the place numeral in its medal ink with a 4 px medal rule along its top. Steps are 5.5rem, 4rem and 3rem tall and four-fifths of the spot wide. It is the `podium` variant of the Leaderboard Row slot, so each pack draws its own.

### Leaderboard Row (results-board row)

Place, name, score card. Grid of `3.5rem 1fr auto` on phones (`md`), `2.75rem 1fr auto` for the TV's dense `tv` rows under the podium (rank 1.875rem, name 1.25rem, card 1.5rem), 1 px `border` divider. Place numerals in `gold`, `rank-silver`, `rank-bronze` for 1 to 3, `text-muted` after. Team rows lead the name with the team swatch. Long names wrap (balanced) rather than truncate. The viewer's own row is highlighted on `surface` with the pack radius. The row's card flips when its score changes.

### Buttons

- **Shape:** pack radius (5px), minimum 44 px tall; the main action on a screen uses `size="lg"`, at least 56 px and full width.
- **Primary:** `accent` fill, `text-on-accent`, Oswald 700 at 1.125rem; hover `accent-hover`.
- **Secondary:** `surface` fill with a 2 px `accent-ink` border and `accent-ink` text.
- **Focus:** every focusable thing gets a 3px `accent-ink` outline at 2px offset.
- **Disabled:** 50% opacity, not-allowed cursor.
- **Game answers:** at least 80 px tall, Oswald 700 1.5rem, 2 px ring; press scales to 0.97 behind `motion-safe`; right / wrong also carry a mark and an accessible "(Right answer)" label.

### Navigation (bottom tab bar)

Fixed to the bottom on phones: Games, Leaderboard, Team (events with teams) and You. Each tab is at least 56 px tall with a 24 px drawn one-stroke SVG icon (a score card on its handle, a podium, two people, one person) over a 13px bold label. Idle tabs are `text-muted`; the current tab sits on `surface-raised` with `text`. The bar is solid `surface` (no blur) with a 1 px top `border`. "You" opens the player sheet rather than navigating.

### Tiles and Keys

Letter games use score-card letters: 44 px tiles at the pack radius. Correct is `gold` with a check mark; present is a white card with a cranberry corner flag; absent is frosted `tile-absent`; typed is a white card ringed in `text`; empty is an inset `border` outline. Keys are 40 px tall white cards; a present key gets a 4 px cranberry underline.

### Progress (pips)

One pip per game up to 16 (8 px tall, 4 px apart, 2px corners), `gold-line` when done and `card-back` when not, with "1 of 2" and "1 to go" / "All scored" above in the label style. Past 16 games it becomes one bar. Games are never numbered as an order of play.

### Toast

A `surface` strip with card lift: a gold value chip (Oswald, `tile-correct-ink`) then a bold line ("Lan gave to Snow Dragons", "Kim · Holiday Trivia"). On the TV they stack, at most four, newest on top.

### Cards / Containers

- **Panel:** `surface`, 1 px `border`, pack radius, 16 px padding. The TV join panel adds an overlay shadow.
- **Dialogs (How to play, player sheet):** `surface` card, pack radius, overlay shadow, bottom sheet on phones and centered from `sm` up; the title sits over a 4 px `accent-ink` rule; numbered steps in round `surface-raised` chips with `accent-ink` numerals.

### Inputs / Fields

At least 44 px tall, 2 px `border` stroke on `surface`, pack radius, 1.125rem text; the label above in bold `text-muted` at 14px; errors as a bold `danger` line with `role="alert"`.

### Celebration

Big moments play one at a time. Flip moments show a highlight score card with an Oswald uppercase caption and a gold-and-white confetti burst; snow-drift moments add a falling-snow overlay; wrong answers shake; points and rank changes pop in. Every one sits behind `motion-safe` and confetti skips for reduced motion.

### Admin Controls

The fixed admin theme: white cards with a gray header strip ("Event", "Teams (2)"), indigo primary buttons, white secondary buttons with a slate border, red-outlined destructive actions that confirm (type CLEAR), dense player rows with bold tabular scores on the right, small uppercase status pill beside the event name.

### Showdown screens (specs 24, 25)

Showdowns use only core tokens, so any event's pack skins them.

- **TV:** one moment fills the screen at a time: a giant "get ready" count in `accent-ink` Oswald, then the game (presents in gift wrap flying across, a falling snowflake with its sum, ornaments flashing, a white clock card), then "How many presents?" with a gold draining bar and a lock-in row (team swatch, name, a drawn check and "In", or "Thinking"; never the answer). The reveal holds every team up in one row of up to 6: name and swatch, its answer in big Oswald (or "No answer" in muted ink), a note ("Exactly right!", "One off", "+0.04 off"), its round points on a `lg` Score Card, and its showdown total.
- **Clock card:** white (`tile-present`) with Oswald numerals at up to 20rem; Last Second turns it `accent` with a pop each second for the last 3 seconds; Blind Stop swaps the numerals for a "?" after 3 seconds.
- **Presents (Fly-by Count):** three kinds, each with a mark besides its color: cranberry with a gold bow, white with a cranberry ribbon, green with white diagonal stripes; the question shows the present beside its name.
- **Captain phone:** a white number card over a 3 x 3 pad of white keys (64 px tall), a drawn rub-out key, a minus key where totals can go negative, and a full-width `accent` Lock in that names the number. Stop games get one round `buzzer` button, 20rem across, that fires on press, not release; Blind Stop's phone never shows the clock.
- **Nerve games (spec 26):** Auction holds the prize up on a gold `highlight` Score Card over a board of every team's numbers 1 to 10 as white chips, spent ones frosted and struck through. Stocking Stuffer gives each team a column with a drawn stocking (cranberry, white cuff; frosted grey for coal) showing its find, its pot in big Oswald, and Banked, Out or Thinking. Share or Snatch sets each matchup as a face-off row around the pot on a gold card, Share in gold and Snatch in `accent-ink`. Phones get two big full-width choices (Open / Bank, Share / Snatch) or a 5 x 2 pad of numbers with a Bid button.
- **Turn games (spec 27):** a turn banner (team swatch and name in big Oswald, "is up" / "is crossing" / "picks", over a gold draining bar) and a turn-order strip with the current team ringed in gold. Snowball to 21 is a big white snowball holding the count over a 1-to-21 track; Memory Path a grid of frosted squares, gold where lit, the crossing team's color where it's right so far, cranberry with a drawn cross on a miss; Present Shuffle the gift-wrapped presents sliding along arcs between slots, then opening to white value tags with the picker's swatch; Land Mass the shared board in team colors beside the tray drawn as white pieces and each team's square count. Phones get +1/+2/+3 keys, the tappable grid, the tappable presents, or a tray, a board with a green or red placement preview, Turn it and Place it.
- **Perception games (spec 28):** each game's scene is an SVG on a night `surface` panel, shared by the solo phone, the TV and the captain's phone: snowflakes drawn as white six-spoked strokes; a gold staff with cranberry grip bands pivoting on a muted floor line; a cranberry sleigh with gold runners flying into a scalloped `surface-raised` cloud whose far edge is a dashed `accent-ink` line; a cranberry lion drum with gold studs whose head turns gold on the beat; a cranberry ribbon with gold edges and no marks. Answers are white (a pick on the cloud's edge, the scissors on the ribbon); at the reveal the right answer is drawn in gold and each team's in its color, with the Reveal row under it naming each team's answer and how close it was ("92% close"). Solo holds up how close each answer was on a `lg` Score Card. Phones get the number pad (Snow Pile), a drag-or-nudge staff dial with no number shown (Staff Angle), a tappable sky (Sleigh Run), the drum as a press-to-fire button with beat pips (Lion Drum), or a tappable ribbon (Cut the Ribbon), each with a full-width Lock in.
- **Second modes (spec 30):** the Color Matcher showdown holds the color up on the TV as a paint chip (the color framed in a thick `tile-present` border, card lift), then at the reveal the color's chip beside a smaller chip per team, each captioned with the team's swatch and name; the captain's phone gets solo Color Matcher's wheel, slider and swatch. Solo Fly-by Count, Snow Sum and Color Count reuse their showdown pictures (the flying presents, the falling snowflake, the flashing ornaments) sized for the phone, then the number pad.
- **Buzzer round (spec 12):** the question in big Oswald on the TV over a full-width bar: `danger` with a drawn lock and "Wait…", then `success` with "Buzz now!" (ink in `bg`, which reads on both modes' red and green). Then the team that's up, huge, with its swatch, over a row of everyone who buzzed (place, swatch, name, "+0.42 s"), wrong ones struck through with a drawn cross. At Right, the answer in gold Oswald and the team's points on a gold `highlight` Score Card. The captain's buzzer is the 20rem round button: red with a lock and "Wait…" (it shakes and says "Too early!" when pressed red), green "BUZZ!" when open, then a white card ringed in the team's color holding its place ("2nd"). Controls' panel holds the question with its answer in a raised box, a green Open buzzers, the order with Right (green) and Wrong (red) on the team that's up, and Reopen buzzers, Reveal the answer and Undo.
- **Team selfies (spec 31):** the captain's naming screen adds a 4 × 2 grid of named team-color swatches (spec 29) and a 4:3 selfie frame dashed in the picked color with a drawn camera. Stickers are inline SVG props in their own fixed palette (`lib/themes/stickers.ts`: Santa red, fur white, gold, holly green, antler brown, ink), the same in every theme. The TV finale replaces the board once the event ends: "Champions!" in gold Oswald, the selfie held up framed in the team's color with an overlay shadow, its stickers popping on in turn, the team name, and the points on a gold `highlight` Score Card.
- **Showdown menu (TV, between showdowns):** "Showdowns" over a grid of plain `surface` cards, 3 to 5 across so every game fits one screen: the name in Oswald and a muted hint ("Like T-Timer"); beside it a small Teams list (place, swatch, name, points). On a TV signed in as the host the cards are buttons (hover ring in `accent-ink`, "Start" in `accent-ink`), a reason shared by every game (no teams yet) is said once under the heading, and a small blurred bar in the bottom-right corner holds Next (`accent`), End early and Leaderboard/Showdowns.
- **Demo room:** the intro's demo plays on a drawn TV (`surface` with a thick `border` ring), the game's name centered and large above it; under it three drawn people in team colors, one with a white speech bubble calling out an answer ("7!", "Stop!").
- **Standings update:** the final step's team bars, old order first, then the points roll on and teams slide to their places, with a gold chip and drawn up-arrow for each team that rose.

## Do's and Don'ts

### Do:

- **Do** use `accent-ink` for any accent-colored text, line or focus ring on `bg`, `surface` or `surface-raised`, and keep `accent` for fills under `text-on-accent`.
- **Do** show every score on a Score Card slot, and flip it only when a score lands (a fresh result or a changed value), never on a re-render or revisit.
- **Do** put motion only behind `motion-safe` / `prefers-reduced-motion`, animate only transform and opacity, and take durations from `--gm-motion-*` (150 / 300 / 600 / 1400 ms) and `--gm-ease-*`.
- **Do** give every color state a second signal: a check on correct tiles, a corner flag on present ones, "–" and "???" on blank and pending cards, a mark and label on trivia answers, the team name beside its swatch, the place number beside its medal color.
- **Do** make every tappable thing at least 44 px (tabs 56 px, main action 56 px full width, game answers 80 px).
- **Do** ask for slots (`useSlots()`) instead of importing a pack's component, and use `--gm-*` tokens instead of colors.
- **Do** draw icons as inline one-stroke SVG resolved by semantic name (the holly sprig is the winter `points` icon).
- **Do** keep a new pack inside the contract: every core token for light and dark, passing the shared contrast pairs plus its own.

### Don't:

- **Don't** put eyebrow labels or kickers above headings; headings stand alone.
- **Don't** use emoji as icons.
- **Don't** set text in `accent` (cranberry) on the dark grounds; it reads under 3:1.
- **Don't** let color be the only signal for any state.
- **Don't** number games or call the list an order of play; games are played in any order.
- **Don't** let the admin theme take on the event's pack, or an event surface fall back to the admin look.
- **Don't** add a third typeface, bright pills or bubbly type on event surfaces.
- **Don't** let the TV scroll or the phone scroll sideways.
