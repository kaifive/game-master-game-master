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

## Create the Firebase project (free Spark plan)

In the Firebase console (console.firebase.google.com):

1. **Add project**, name it `game-master`. Turn Google Analytics off (not
   needed). It starts on the free Spark plan; don't upgrade.
2. **Build → Authentication → Get started → Sign-in method → Anonymous →
   Enable → Save.**
3. **Build → Firestore Database → Create database.** Pick a US location
   (for example `nam5`), then **Start in production mode** (everything
   locked; the app's own rules replace these later).
4. **Build → Realtime Database → Create database.** Pick **United States**,
   then **Start in locked mode**.
5. **Project settings (gear) → General → Your apps → Web (`</>`).** Name it
   `game-master-web`, leave Hosting unchecked, **Register app**. Copy the
   five values from the config it shows: `apiKey`, `authDomain`,
   `projectId`, `appId`, `databaseURL`. These are public and safe to share
   with Claude.
6. **Project settings → Service accounts → Generate new private key.** It
   downloads a JSON file. This one is secret: don't paste it into chat or
   commit it. It goes into Vercel only (next section).

## Create the Vercel project (free Hobby plan)

At vercel.com:

1. **Add New → Project → Import** `kaifive/game-master-game-master`
   (install the Vercel GitHub app on the repo if asked). Framework: Next.js
   (detected). **Deploy.** This makes the first production deploy of
   `main`; the site has no player screens yet, so that's harmless.
2. **Storage → Create → Blob**, name it `game-master-photos`, and connect it
   to the project. That adds `BLOB_READ_WRITE_TOKEN` by itself.
3. **Project → Settings → Environment Variables**, for **Production** and
   **Preview**:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`,
     `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`,
     `NEXT_PUBLIC_FIREBASE_DATABASE_URL`: the five values from Firebase
     step 5.
   - `FIREBASE_SERVICE_ACCOUNT`: open the downloaded JSON file, copy all of
     it, paste it as the value.
   - `ADMIN_PASSPHRASE`: the passphrase you'll share with helpers.
4. **Deployments → Redeploy** the latest one so it picks up the variables.

From then on, every pull request gets its own preview link.

## Then tell Claude

- The five public Firebase values (or just "they're in Vercel").
- The Vercel project URL.
- That `FIREBASE_SERVICE_ACCOUNT` and `ADMIN_PASSPHRASE` are set (never the
  values themselves).

## Let PRs merge themselves when CI passes

GitHub auto-merge needs two repo settings (Claude can't change them):

1. **Settings → General → Pull Requests → Allow auto-merge** (tick it).
2. **Settings → Rules → Rulesets → New branch ruleset** (or **Branches →
   Add branch protection rule**), target `main`, turn on **Require status
   checks to pass**, add `Verify` and `End-to-end`, and save. Leave
   "require approvals" off so Claude's PRs can merge without a review.

Then Claude turns on auto-merge for each PR it opens.
