"use client";

import { useCallback } from "react";
import { MomentsProvider, MomentsStage, ToastChainView, useCelebrate } from "@/components/motion";
import { usePoll } from "@/components/leaderboard/use-poll";
import { useSlots } from "@/components/slots/registry";
import { leadChange, newAwards, standingsApi, type DisplayStandings } from "@/lib/points";
import { cx } from "@/lib/ui";
import { QrCode } from "./qr";

export const DISPLAY_POLL_MS = 3000;

type Props = { slug: string; name: string; joinUrl: string; shortUrl: string; joinCode: string };

/** Spots what changed since the last update: new awards become toasts, a new leader a callout. */
function useAnnouncements() {
  const celebrate = useCelebrate();
  return useCallback(
    (next: DisplayStandings, prior: DisplayStandings | null) => {
      // Nothing to announce while hidden, and nothing old to replay when it comes back.
      if (next.hidden) return;
      const previous = prior?.hidden ? null : prior;
      for (const a of newAwards(previous?.recent ?? null, next.recent))
        celebrate({
          id: a.id,
          kind: "points",
          text: a.from
            ? `${a.from} gave ${String(a.points)} to ${a.nickname}`
            : `${a.nickname} +${String(a.points)} · ${a.reason}`,
          value: a.points,
        });
      const leader = leadChange(
        previous ? (previous.players[0]?.id ?? null) : undefined,
        next.players,
      );
      if (leader)
        celebrate({
          id: `lead-${leader.id}-${String(Date.now())}`,
          kind: "lead-change",
          text: `${leader.nickname} takes the lead!`,
        });
      const team = leadChange(previous ? (previous.teams[0]?.id ?? null) : undefined, next.teams);
      if (team)
        celebrate({
          id: `lead-${team.id}-${String(Date.now())}`,
          kind: "lead-change",
          text: `${team.name} take the lead!`,
        });
    },
    [celebrate],
  );
}

type BoardRow = { id: string; rank: number; name: string; score: number; team?: number };

/**
 * A results board (S05-AC4): the top three on a podium, the rest in
 * `columns` below, every score card flipping when its score lands. Sized so
 * the whole top ten fits any screen without scrolling (Khai, 2026-11-10).
 */
function Results({
  label,
  rows,
  podium = true,
  columns = 2,
}: {
  label: string;
  rows: BoardRow[];
  /** The top three stand on a podium; off for the narrow top-players column. */
  podium?: boolean;
  columns?: 1 | 2;
}) {
  const { LeaderboardRow } = useSlots();
  const top = podium ? rows.slice(0, 3) : [];
  const rest = podium ? rows.slice(3) : rows;
  const row = (r: BoardRow, spot?: 1 | 2 | 3) => (
    <LeaderboardRow
      key={r.id}
      rank={r.rank}
      name={r.name}
      score={r.score}
      size="tv"
      {...(r.team !== undefined ? { team: r.team } : {})}
      {...(spot ? { podium: spot } : {})}
    />
  );
  const list = (name: string, live: boolean) => (
    <ol
      aria-label={name}
      {...(live ? { "aria-live": "polite" as const } : {})}
      // Two columns read down, then across: 4 to 7 on the left, 8 to 10 on the right.
      className={cx("m-0 grid list-none gap-x-10 p-0", columns === 2 && "grid-flow-col")}
      style={
        columns === 2
          ? { gridTemplateRows: `repeat(${String(Math.ceil(rest.length / 2))}, auto)` }
          : undefined
      }
    >
      {rest.map((r) => row(r))}
    </ol>
  );
  return (
    <section aria-labelledby={`${label}-title`} className="grid min-h-0 content-start gap-4">
      <h2 id={`${label}-title`} className="m-0 font-gm-display text-3xl font-bold">
        {label}
      </h2>
      {top.length === 0 ? (
        list(label, true)
      ) : (
        <ol
          aria-label={label}
          aria-live="polite"
          className="m-0 grid list-none grid-cols-3 items-end gap-x-6 gap-y-5 p-0"
        >
          {top.map((r, i) => row(r, (i + 1) as 1 | 2 | 3))}
          {rest.length > 0 && (
            <li className="col-span-3 row-start-2">{list("Places 4 and below", false)}</li>
          )}
        </ol>
      )}
    </section>
  );
}

/**
 * The latest points, kept on screen beside the QR code so the room always
 * sees what just landed; new ones also arrive as toasts (spec 05).
 */
function Latest({ recent }: { recent: DisplayStandings["recent"] }) {
  const { Toast } = useSlots();
  return (
    <section aria-labelledby="latest-title" className="grid content-start gap-3">
      <h2 id="latest-title" className="m-0 font-gm-display text-2xl font-bold">
        Latest points
      </h2>
      {recent.length === 0 ? (
        <p className="m-0 text-lg text-gm-text-muted">Points show here as they land.</p>
      ) : (
        <ul aria-label="Latest points" className="m-0 grid list-none gap-2 p-0 text-lg">
          {recent.slice(0, LATEST).map((a) => (
            <li key={a.id}>
              <Toast
                text={a.from ? `${a.from} gave to ${a.nickname}` : `${a.nickname} · ${a.reason}`}
                value={a.points}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const LATEST = 3;

function Board({ data }: { data: DisplayStandings }) {
  if (data.hidden)
    return (
      <div className="grid h-full content-center justify-items-center gap-4 text-center">
        <p className="m-0 font-gm-display text-6xl font-bold">Scores are secret for now</p>
        <p className="m-0 text-3xl text-gm-text-muted">Keep playing. The judges will reveal all!</p>
      </div>
    );
  const players = data.players.map((p) => ({
    id: p.id,
    rank: p.rank,
    name: p.nickname,
    score: p.points,
  }));
  // The team phase: the teams' board, with the top players beside it (S03-AC8).
  if (data.teams.length > 0)
    return (
      <div className="grid h-full grid-cols-[2fr_1fr] content-start gap-10">
        <Results
          label="Team standings"
          rows={data.teams.map((t) => ({
            id: t.id,
            rank: t.rank,
            name: t.name,
            score: t.points,
            team: t.color,
          }))}
        />
        {players.length > 0 && (
          <Results label="Top players" rows={players} podium={false} columns={1} />
        )}
      </div>
    );
  if (data.players.length === 0)
    return (
      <div className="grid h-full content-center justify-items-center gap-3 text-center">
        <p className="m-0 font-gm-display text-5xl font-bold">No scores yet</p>
        <p className="m-0 text-3xl text-gm-text-muted">Scan the code to join and play!</p>
      </div>
    );
  return <Results label="Leaderboard" rows={players} />;
}

function Screen({ slug, name, joinUrl, shortUrl, joinCode }: Props) {
  const { Banner } = useSlots();
  const announce = useAnnouncements();
  const load = useCallback(async () => {
    const res = await standingsApi.display(slug);
    return res.ok ? res.data : null;
  }, [slug]);
  const data = usePoll(load, DISPLAY_POLL_MS, announce);
  return (
    <div className="grid h-dvh grid-rows-[auto_1fr] overflow-hidden">
      <Banner title={name} size="lg" />
      <div className="grid min-h-0 grid-cols-[1fr_minmax(0,22rem)] gap-10 px-8 py-6">
        <main aria-label="Leaderboard" className="min-h-0 overflow-hidden text-2xl">
          {data && <Board data={data} />}
        </main>
        <aside className="grid min-h-0 grid-rows-[auto_auto_1fr] content-start gap-5 overflow-hidden">
          <section
            aria-label="Join the party"
            className="grid gap-2 rounded-gm bg-gm-surface p-4 text-center shadow-xl ring-1 ring-gm-border"
          >
            <p className="m-0 font-gm-display text-2xl font-bold">Scan to join</p>
            <div className="mx-auto w-full max-w-[10rem]">
              <QrCode value={joinUrl} label={`QR code for ${shortUrl}`} />
            </div>
            <p className="m-0 text-base break-all text-gm-text-muted">{shortUrl}</p>
            <p className="m-0 text-base">
              Code{" "}
              <span className="font-gm-display text-3xl font-bold tracking-[0.2em] text-gm-accent-ink">
                {joinCode}
              </span>
            </p>
          </section>
          <ToastChainView />
          {data && !data.hidden && <Latest recent={data.recent} />}
        </aside>
      </div>
    </div>
  );
}

/** The TV: how to join, the results board, the latest points, and lead changes (spec 05). */
export function DisplayView(props: Props) {
  return (
    <MomentsProvider surface="display">
      {/*
        Scales the whole page with the screen: everything is in rem, so a 1080p
        TV reads from across the room. The height counts too, so a laptop, a
        browser with toolbars or a TV that crops its edges never cuts off the
        board (Khai, 2026-11-10).
      */}
      <style>{"html{font-size:clamp(11px,min(1.2vw,2.1vh),32px)}"}</style>
      <Screen {...props} />
      <MomentsStage />
    </MomentsProvider>
  );
}
