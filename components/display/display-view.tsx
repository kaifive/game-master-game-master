"use client";

import { useCallback } from "react";
import { MomentsProvider, MomentsStage, ToastChainView, useCelebrate } from "@/components/motion";
import { usePoll } from "@/components/leaderboard/use-poll";
import { useSlots } from "@/components/slots/registry";
import { leadChange, newAwards, standingsApi, type DisplayStandings } from "@/lib/points";
import { QrCode } from "./qr";

export const DISPLAY_POLL_MS = 3000;

type Props = { slug: string; name: string; joinUrl: string; shortUrl: string; joinCode: string };

/** Spots what changed since the last update: new awards become toasts, a new leader a callout. */
function useAnnouncements() {
  const celebrate = useCelebrate();
  return useCallback(
    (next: DisplayStandings, previous: DisplayStandings | null) => {
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

/** A results-board column: ranked rows whose score cards flip when a score lands (S05-AC4). */
function Results({ label, rows }: { label: string; rows: BoardRow[] }) {
  const { LeaderboardRow } = useSlots();
  return (
    <section aria-labelledby={`${label}-title`} className="grid min-h-0 content-start gap-2">
      <h2 id={`${label}-title`} className="m-0 font-gm-display text-3xl font-bold">
        {label}
      </h2>
      <ol aria-label={label} aria-live="polite" className="m-0 list-none p-0">
        {rows.map((r) => (
          <LeaderboardRow
            key={r.id}
            rank={r.rank}
            name={r.name}
            score={r.score}
            highlight={r.rank === 1}
            {...(r.team !== undefined ? { team: r.team } : {})}
          />
        ))}
      </ol>
    </section>
  );
}

function Board({ slug }: { slug: string }) {
  const announce = useAnnouncements();
  const load = useCallback(async () => {
    const res = await standingsApi.display(slug);
    return res.ok ? res.data : null;
  }, [slug]);
  const data = usePoll(load, DISPLAY_POLL_MS, announce);
  if (!data) return null;
  const players = data.players.map((p) => ({
    id: p.id,
    rank: p.rank,
    name: p.nickname,
    score: p.points,
  }));
  // The team phase: the teams' board, with the top players beside it (S03-AC8).
  if (data.teams.length > 0)
    return (
      <div className="grid h-full grid-cols-[3fr_2fr] content-start gap-10">
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
        {players.length > 0 && <Results label="Top players" rows={players} />}
      </div>
    );
  if (data.players.length === 0)
    return (
      <p className="m-0 font-gm-display text-4xl text-gm-text-muted">
        No scores yet. Scan the code to join!
      </p>
    );
  return <Results label="Leaderboard" rows={players} />;
}

/** The TV: how to join, and the live leaderboard with toasts and lead changes (spec 05). */
export function DisplayView({ slug, name, joinUrl, shortUrl, joinCode }: Props) {
  const { Banner } = useSlots();
  return (
    <MomentsProvider surface="display">
      {/* Scales the whole page with the screen: everything is in rem, so a 1080p TV reads from across the room. */}
      <style>{"html{font-size:clamp(16px,1.2vw,32px)}"}</style>
      <div className="grid h-dvh grid-rows-[auto_1fr] overflow-hidden">
        <Banner title={name} />
        <div className="grid min-h-0 grid-cols-[1fr_minmax(0,26rem)] gap-8 p-8">
          <section aria-label="Leaderboard" className="min-h-0 overflow-hidden text-2xl">
            <Board slug={slug} />
          </section>
          <aside className="grid min-h-0 content-start gap-6">
            <section
              aria-label="Join the party"
              className="grid gap-3 rounded-gm bg-gm-surface p-5 text-center shadow-xl ring-1 ring-gm-border"
            >
              <p className="m-0 font-gm-display text-3xl font-bold">Scan to join</p>
              <div className="mx-auto w-full max-w-[13rem]">
                <QrCode value={joinUrl} label={`QR code for ${shortUrl}`} />
              </div>
              <p className="m-0 text-lg break-all text-gm-text-muted">{shortUrl}</p>
              <p className="m-0 text-lg">
                Code{" "}
                <span className="font-gm-display text-4xl font-bold tracking-[0.2em] text-gm-accent-ink">
                  {joinCode}
                </span>
              </p>
            </section>
            <ToastChainView />
          </aside>
        </div>
      </div>
      <MomentsStage />
    </MomentsProvider>
  );
}
