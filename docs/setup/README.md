# Setup

## Turn on Impeccable's design checker

Claude can't edit its own settings, so this step is done by hand once.

Copy `docs/setup/claude-settings.json` to `.claude/settings.json` and commit
it. On GitHub: **Add file → Create new file**, name it
`.claude/settings.json`, paste the contents, commit to `main`.

It does two things:
- Lets Claude run the Impeccable launcher
  (`.claude/skills/impeccable/scripts/impeccable`) without asking.
- Runs Impeccable's checker at session start, after every file edit (it
  only reports on UI files), and when Claude finishes a turn.

The launcher downloads Impeccable's checker program on first run and
verifies it against `engine-checksums.txt`. To turn it off, delete the
`hooks` block from `.claude/settings.json`.
