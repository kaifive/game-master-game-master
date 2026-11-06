"use client";

import { useCallback } from "react";
import {
  BarRace,
  MomentsProvider,
  MomentsStage,
  ToastChainView,
  useCelebrate,
} from "@/components/motion";
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
          text: `${a.nickname} +${String(a.points)} · ${a.reason}`,
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
    },
    [celebrate],
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
  if (data.players.length === 0)
    return (
      <p className="m-0 font-gm-display text-4xl text-gm-text-muted">
        No scores yet. Scan the code to join!
      </p>
    );
  return (
    <BarRace
      label="Leaderboard"
      entries={data.players.map((p) => ({
        id: p.id,
        name: p.nickname,
        rank: p.rank,
        score: p.points,
      }))}
    />
  );
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
                <span className="font-gm-display text-4xl font-bold tracking-[0.2em] text-gm-accent">
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
