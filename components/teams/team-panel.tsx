"use client";

import { useCallback, useId, useState } from "react";
import { usePoll } from "@/components/leaderboard/use-poll";
import { useOptionalDevice } from "@/components/players/device";
import { useSlots } from "@/components/slots/registry";
import { checkTeamName, teamsApi, type TeamsView, type TeamView } from "@/lib/teams";

export const TEAMS_POLL_MS = 15_000;

const Swatch = ({ color }: { color: number }) => (
  <span
    aria-hidden="true"
    className="inline-block size-4 shrink-0 rounded-full ring-2 ring-white/40"
    style={{ background: `var(--gm-team-${String(color)})` }}
  />
);

function NameTeam({ onName }: { onName: (name: string) => Promise<string | null> }) {
  const { Button } = useSlots();
  const id = useId();
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
        void onName(check.nickname).then((failed) => {
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
  const { Button } = useSlots();
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
      <h3 className="m-0 font-gm-display text-lg font-bold">Give points to a team</h3>
      <p className="m-0 text-sm text-gm-text-muted">
        You have {has}. What you give comes off your own score.
      </p>
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
          className={`m-0 text-sm font-bold ${note.ok ? "text-gm-accent" : "text-gm-danger"}`}
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
function useTeams(slug: string, playerId: string | null) {
  const load = useCallback(async () => {
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
export function TeamPanel({ slug }: { slug: string }) {
  const { Panel, Button } = useSlots();
  const device = useOptionalDevice();
  const playerId = device?.active?.id ?? null;
  const [data, setView] = useTeams(slug, playerId);
  const [confirm, setConfirm] = useState<TeamView | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (!data || !device || !playerId) return null;

  const mineTeam = data.mine ? data.teams.find((t) => t.id === data.mine?.teamId) : undefined;
  const donate =
    data.phase === "team" && data.teams.length > 0 ? (
      <Donate
        teams={data.teams}
        mine={mineTeam?.id ?? null}
        has={device.total}
        onGive={async (teamId, points) => {
          const res = await teamsApi.donate(slug, await device.token(), playerId, teamId, points);
          await device.refreshPlays();
          if (!res.ok) return res.message;
          setView(res.data);
          return null;
        }}
      />
    ) : null;

  if (mineTeam && data.mine) {
    const { isCaptain, named } = data.mine;
    return (
      <Panel label="Your team">
        <div className="grid gap-3">
          <p className="m-0 flex items-center gap-2 text-lg">
            <Swatch color={mineTeam.color} />
            <span>
              You&apos;re on <strong className="font-gm-display text-2xl">{mineTeam.name}</strong>
            </span>
          </p>
          <p className="m-0 text-sm text-gm-text-muted">
            {isCaptain
              ? "You're the captain: you play the team games for everyone."
              : `Captain: ${mineTeam.captain?.nickname ?? "none yet"}`}
            {` · ${String(mineTeam.members.length)} on the team`}
          </p>
          {isCaptain && !named && (
            <NameTeam
              onName={async (name) => {
                const res = await teamsApi.name(slug, await device.token(), playerId, name);
                if (!res.ok) return res.message;
                setView(res.data);
                return null;
              }}
            />
          )}
          {donate}
        </div>
      </Panel>
    );
  }

  if (data.phase !== "team" || data.teams.length === 0) return null;

  return (
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
        {!confirm && donate}
      </div>
    </Panel>
  );
}
