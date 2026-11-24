"use client";

import { SkeletonList } from "@/components/ui/skeleton";
import Link from "next/link";
import { ArrowIcon } from "@/components/icons/nav";
import { useCallback, useEffect, useId, useState, type ReactNode } from "react";
import { shrinkPhoto } from "@/components/games/photo/shrink";
import { usePoll } from "@/components/leaderboard/use-poll";
import { useOptionalDevice } from "@/components/players/device";
import { CheckIcon } from "@/components/icons/game";
import { useSlots } from "@/components/slots/registry";
import { useTheme } from "@/components/theme/context";
import { standingsApi } from "@/lib/points";
import { checkTeamName, teamsApi, type TeamsView, type TeamView } from "@/lib/teams";
import { cx } from "@/lib/ui";

export const TEAMS_POLL_MS = 15_000;

const Swatch = ({ color }: { color: number }) => (
  <span
    aria-hidden="true"
    className="inline-block size-4 shrink-0 rounded-full ring-2 ring-white/40"
    style={{ background: `var(--gm-team-${String(color)})` }}
  />
);

/** Every team color as a named swatch; ones other teams hold are taken (S29-AC1). */
function ColorPicker({
  color,
  onColor,
  teams,
  mine,
}: {
  color: number;
  onColor: (color: number) => void;
  teams: readonly TeamView[];
  mine: string;
}) {
  const names = useTheme()?.teamColorNames ?? [];
  return (
    <fieldset className="m-0 grid gap-2 border-0 p-0">
      <legend className="mb-2 text-sm font-bold text-gm-text-muted">Team color</legend>
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 8 }, (_, i) => i + 1).map((c) => {
          const holder = teams.find((t) => t.id !== mine && t.color === c);
          const label = names[c - 1] ?? `Color ${String(c)}`;
          const picked = c === color;
          return (
            <button
              key={c}
              type="button"
              disabled={holder !== undefined}
              aria-pressed={picked}
              aria-label={holder ? `${label}, taken by ${holder.name}` : label}
              onClick={() => {
                onColor(c);
              }}
              className={cx(
                "grid min-h-16 content-center justify-items-center gap-1 rounded-gm p-1 text-xs font-bold ring-1 ring-gm-border",
                picked && "ring-4 ring-gm-text",
                holder && "opacity-40",
              )}
            >
              <span
                aria-hidden="true"
                className="grid size-8 place-items-center rounded-full text-white"
                style={{ background: `var(--gm-team-${String(c)})` }}
              >
                {picked && <CheckIcon size={18} />}
              </span>
              <span className="max-w-full truncate">{holder ? holder.name : label}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/**
 * The team selfie (spec 31): the phone's front camera, or a photo already
 * taken, shrunk and sent at once; the captain can retake it until the team is
 * named. It's for the finale, so it isn't shown anywhere else.
 */
function TeamSelfie({
  color,
  onSend,
}: {
  color: number;
  onSend: (photo: Blob, size: { width: number; height: number }) => Promise<string | null>;
}) {
  const id = useId();
  const [preview, setPreview] = useState<string | null>(null);
  const [state, setState] = useState<"none" | "sending" | "sent">("none");
  const [error, setError] = useState<string | null>(null);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  const choose = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    try {
      const blob = await shrinkPhoto(file);
      const bitmap = await createImageBitmap(blob);
      const size = { width: bitmap.width, height: bitmap.height };
      bitmap.close();
      setPreview(URL.createObjectURL(blob));
      setState("sending");
      const failed = await onSend(blob, size);
      setState(failed ? "none" : "sent");
      setError(failed);
    } catch {
      setState("none");
      setError("We couldn't open that photo. Try another one.");
    }
  };
  return (
    <div className="grid gap-2">
      <label
        htmlFor={id}
        className="relative grid aspect-[4/3] w-full cursor-pointer place-items-center overflow-hidden rounded-gm border-4 border-dashed bg-gm-surface text-center font-gm-display text-xl font-bold"
        style={{ borderColor: `var(--gm-team-${String(color)})` }}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- the team's own photo, before it's sent
          <img
            src={preview}
            alt="Your team selfie"
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          <span className="grid justify-items-center gap-2 px-4">
            <CameraIcon />
            Take the team selfie
          </span>
        )}
        <input
          id={id}
          type="file"
          accept="image/*"
          capture="user"
          className="sr-only"
          onChange={(e) => {
            void choose(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </label>
      <p className="m-0 text-sm text-gm-text-muted" aria-live="polite">
        {state === "sending"
          ? "Sending the selfie…"
          : state === "sent"
            ? "Got it! Tap the photo to retake it."
            : null}
      </p>
      {error && (
        <p role="alert" className="m-0 text-sm font-bold text-gm-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function CameraIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 8h3l2-3h6l2 3h3v11H4Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="3.5" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function NameTeam({
  onName,
  onSelfie,
  teams,
  mine,
}: {
  onName: (name: string, color: number) => Promise<string | null>;
  onSelfie: (photo: Blob, size: { width: number; height: number }) => Promise<string | null>;
  teams: readonly TeamView[];
  mine: TeamView;
}) {
  const { Button } = useSlots();
  const id = useId();
  const [color, setColor] = useState(mine.color);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const check = name.trim() ? checkTeamName(name) : null;
  return (
    <form
      className="grid gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!check?.ok) {
          setError(check?.message ?? "Give your team a name.");
          return;
        }
        setBusy(true);
        void onName(check.nickname, color).then((failed) => {
          setBusy(false);
          setError(failed);
        });
      }}
    >
      <label htmlFor={id} className="text-sm font-bold text-gm-text-muted">
        You&apos;re a captain! Name your team
      </label>
      <input
        id={id}
        value={name}
        maxLength={28}
        autoComplete="off"
        onChange={(e) => {
          setName(e.target.value);
          setError(null);
        }}
        className="min-h-11 w-full min-w-0 rounded-gm border-2 border-gm-border bg-gm-surface px-3 text-lg text-gm-text"
      />
      <ColorPicker color={color} onColor={setColor} teams={teams} mine={mine.id} />
      <TeamSelfie color={color} onSend={onSelfie} />
      {(error ?? (check && !check.ok ? check.message : null)) && (
        <p role="alert" className="m-0 text-sm font-bold text-gm-danger">
          {error ?? (check && !check.ok ? check.message : "")}
        </p>
      )}
      <Button size="lg" type="submit" disabled={busy}>
        {busy ? "Saving…" : "Name the team"}
      </Button>
    </form>
  );
}

function TeamRow({ team, onJoin }: { team: TeamView; onJoin?: (() => void) | undefined }) {
  const { Button } = useSlots();
  return (
    <li className="grid gap-2 border-t border-gm-border py-3">
      <div className="flex items-center gap-2">
        <Swatch color={team.color} />
        <span className="min-w-0 flex-1 truncate font-gm-display text-xl font-bold">
          {team.name}
        </span>
        <span className="text-sm text-gm-text-muted">
          {team.room > 0 ? `${String(team.room)} spot${team.room === 1 ? "" : "s"} left` : "Full"}
        </span>
      </div>
      <p className="m-0 text-sm text-gm-text-muted">
        {team.captain ? `Captain ${team.captain.nickname}` : "Needs a captain"}
        {team.members.length > 1 && ` · ${team.members.map((m) => m.nickname).join(", ")}`}
      </p>
      {onJoin && (
        <Button tone="secondary" disabled={team.room === 0} onClick={onJoin}>
          Join {team.name}
        </Button>
      )}
    </li>
  );
}

const field =
  "min-h-11 w-full min-w-0 rounded-gm border-2 border-gm-border bg-gm-surface px-3 text-lg text-gm-text";

/**
 * Give some of your own points to any team, with a confirm (S03-AC6). Your
 * score goes down by the same amount, and there's no undo.
 */
export function Donate({
  teams,
  mine,
  has,
  onGive,
}: {
  teams: TeamView[];
  mine: string | null;
  has: number;
  onGive: (teamId: string, points: number) => Promise<string | null>;
}) {
  const { Button, ScoreCard } = useSlots();
  const id = useId();
  const [teamId, setTeamId] = useState(mine ?? teams[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const team = teams.find((t) => t.id === teamId) ?? teams[0];
  const points = Number(amount);
  const valid = Number.isInteger(points) && points >= 1 && points <= has;
  if (!team || has < 1) return null;

  if (asking)
    return (
      <div role="alertdialog" aria-label="Give points?" className="grid gap-3">
        <p className="m-0 text-lg">
          Give <strong>{points}</strong> of your points to <strong>{team.name}</strong>? Your score
          goes down by {points}. You can&apos;t undo this.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void onGive(team.id, points).then((failed) => {
                setBusy(false);
                setAsking(false);
                setAmount("");
                setNote(
                  failed
                    ? { ok: false, text: failed }
                    : { ok: true, text: `You gave ${String(points)} to ${team.name}.` },
                );
              });
            }}
          >
            {busy ? "Giving…" : `Yes, give ${String(points)}`}
          </Button>
          <Button
            tone="secondary"
            onClick={() => {
              setAsking(false);
            }}
          >
            Not now
          </Button>
        </div>
      </div>
    );

  return (
    <form
      className="grid gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) setAsking(true);
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="grid gap-1">
          <h3 className="m-0 font-gm-display text-lg font-bold">Give points to a team</h3>
          <p className="m-0 text-base text-gm-text-muted">
            You have {has}. What you give comes off your own score.
          </p>
        </div>
        <ScoreCard label="Your points" value={has} state="scored" size="sm" />
      </div>
      <div className="grid grid-cols-[1fr_6rem] gap-2">
        <label className="sr-only" htmlFor={`${id}-team`}>
          Team
        </label>
        <select
          id={`${id}-team`}
          value={team.id}
          onChange={(e) => {
            setTeamId(e.target.value);
          }}
          className={field}
        >
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor={`${id}-points`}>
          Points to give
        </label>
        <input
          id={`${id}-points`}
          inputMode="numeric"
          placeholder="Points"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value.replace(/\D/g, ""));
            setNote(null);
          }}
          className={field}
        />
      </div>
      {amount !== "" && points > has && (
        <p role="alert" className="m-0 text-sm font-bold text-gm-danger">
          {`You have ${String(has)} points to give.`}
        </p>
      )}
      {note && (
        <p
          role={note.ok ? "status" : "alert"}
          className={`m-0 text-sm font-bold ${note.ok ? "text-gm-success" : "text-gm-danger"}`}
        >
          {note.text}
        </p>
      )}
      <Button tone="secondary" type="submit" disabled={!valid}>
        Give points
      </Button>
    </form>
  );
}

/** The latest view: a reply to this phone's own action until the next poll arrives. */
export function useTeams(slug: string, playerId: string | null) {
  const load = useCallback(async () => {
    if (!slug) return null;
    const res = await teamsApi.view(slug, playerId);
    return res.ok ? res.data : null;
  }, [slug, playerId]);
  const polled = usePoll(load, TEAMS_POLL_MS);
  const [local, setLocal] = useState<{ view: TeamsView; over: TeamsView | null } | null>(null);
  const data = local && local.over === polled ? local.view : (polled ?? local?.view ?? null);
  const set = useCallback(
    (view: TeamsView) => {
      setLocal({ view, over: polled });
    },
    [polled],
  );
  return [data, set] as const;
}

/** Teams on the party page: pick your team, name it as captain, see yours, and donate (spec 03). */
export function TeamPanel({
  slug,
  fallback = null,
  donations = true,
}: {
  slug: string;
  fallback?: ReactNode;
  /** Whether this event lets players give points to a team (S03-AC6). */
  donations?: boolean;
}) {
  const { Panel, Button, ScoreCard } = useSlots();
  const device = useOptionalDevice();
  const playerId = device?.active?.id ?? null;
  const [data, setView] = useTeams(slug, playerId);
  // The team's score, from the leaderboard; a donation's reply updates it at once.
  const loadScore = useCallback(async () => {
    const res = await standingsApi.phone(slug, playerId);
    return res.ok ? res.data.myTeam : null;
  }, [slug, playerId]);
  const polledScore = usePoll(loadScore, TEAMS_POLL_MS);
  const [given, setGiven] = useState<{ teamId: string; team: number } | null>(null);
  const [confirm, setConfirm] = useState<TeamView | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (!device || !playerId) return null;
  if (!data) return <SkeletonList label="Loading teams" rows={3} />;

  const mineTeam = data.mine ? data.teams.find((t) => t.id === data.mine?.teamId) : undefined;
  const teamScore = (teamId: string): number | null =>
    given?.teamId === teamId ? given.team : polledScore?.id === teamId ? polledScore.points : null;
  // Giving points has its own card, apart from your team's (Khai, 2026-11-24).
  const donate =
    donations && data.phase === "team" && data.teams.length > 0 ? (
      <Panel label="Give points to a team">
        <Donate
          teams={data.teams}
          mine={mineTeam?.id ?? null}
          has={device.total}
          onGive={async (teamId, points) => {
            const res = await teamsApi.donate(slug, await device.token(), playerId, teamId, points);
            await device.refreshPlays();
            if (!res.ok) return res.message;
            setView(res.data);
            if (res.data.donated) setGiven(res.data.donated);
            return null;
          }}
        />
      </Panel>
    ) : null;

  if (mineTeam && data.mine) {
    const { isCaptain, named } = data.mine;
    const yours = (
      <Panel label="Your team">
        <div className="grid gap-3">
          <div className="flex items-center justify-between gap-3">
            <p className="m-0 flex min-w-0 items-center gap-2 text-lg">
              <Swatch color={mineTeam.color} />
              <span className="min-w-0 break-words">
                You&apos;re on <strong className="font-gm-display text-2xl">{mineTeam.name}</strong>
              </span>
            </p>
            {/* The team's score card; it flips up when a donation or a team game lands. */}
            <ScoreCard
              label={`${mineTeam.name} team score`}
              {...(teamScore(mineTeam.id) !== null
                ? { value: teamScore(mineTeam.id) ?? 0, state: "scored" as const }
                : { state: "blank" as const })}
            />
          </div>
          {isCaptain && !named && (
            <NameTeam
              teams={data.teams}
              mine={mineTeam}
              onSelfie={async (photo, size) => {
                const res = await teamsApi.selfie(
                  slug,
                  await device.token(),
                  playerId,
                  photo,
                  size,
                );
                return res.ok ? null : res.message;
              }}
              onName={async (name, color) => {
                const res = await teamsApi.name(slug, await device.token(), playerId, name, color);
                if (!res.ok) return res.message;
                setView(res.data);
                return null;
              }}
            />
          )}
        </div>
      </Panel>
    );
    return (
      <>
        {yours}
        {donate}
      </>
    );
  }

  if (data.phase !== "team" || data.teams.length === 0) return fallback;

  const picker = (
    <Panel label="Pick your team">
      <div className="grid gap-2">
        <h2 className="m-0 font-gm-display text-2xl font-bold">Pick your team</h2>
        {confirm ? (
          <div role="alertdialog" aria-label={`Join ${confirm.name}?`} className="grid gap-3">
            <p className="m-0 text-lg">
              Join <strong>{confirm.name}</strong>? You can&apos;t switch later.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => {
                  void (async () => {
                    const res = await teamsApi.join(
                      slug,
                      await device.token(),
                      playerId,
                      confirm.id,
                    );
                    setConfirm(null);
                    if (res.ok) setView(res.data);
                    else setError(res.message);
                  })();
                }}
              >
                Join {confirm.name}
              </Button>
              <Button
                tone="secondary"
                onClick={() => {
                  setConfirm(null);
                }}
              >
                Not yet
              </Button>
            </div>
          </div>
        ) : (
          <ul aria-label="Teams" className="m-0 list-none p-0">
            {data.teams.map((t) => (
              <TeamRow
                key={t.id}
                team={t}
                onJoin={() => {
                  setError(null);
                  setConfirm(t);
                }}
              />
            ))}
          </ul>
        )}
        {error && (
          <p role="alert" className="m-0 text-sm font-bold text-gm-danger">
            {error}
          </p>
        )}
      </div>
    </Panel>
  );
  return (
    <>
      {picker}
      {!confirm && donate}
    </>
  );
}

/**
 * On the games list, a nudge to the Team tab when there's something to do
 * there: teams just opened, or a new captain's team needs a name (spec 03).
 */
export function TeamNudge({ slug }: { slug: string }) {
  const { Panel } = useSlots();
  const device = useOptionalDevice();
  const [data] = useTeams(slug, device?.active?.id ?? null);
  if (!data || !device?.active) return null;
  const naming = data.mine?.isCaptain === true && !data.mine.named;
  const picking = !data.mine && data.phase === "team" && data.teams.length > 0;
  if (!naming && !picking) return null;
  return (
    <Panel label="Teams">
      <Link
        href={`/${slug}/team`}
        className="flex min-h-11 items-center justify-between gap-3 text-lg font-bold text-gm-text no-underline"
      >
        {naming ? "You're a captain! Name your team" : "Teams are open! Pick your team"}
        <span className="inline-flex items-center gap-1 text-gm-accent-ink">
          Go
          <ArrowIcon />
        </span>
      </Link>
    </Panel>
  );
}
