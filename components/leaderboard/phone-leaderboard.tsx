"use client";

import { useCallback } from "react";
import { useOptionalDevice } from "@/components/players/device";
import { useSlots } from "@/components/slots/registry";
import { standingsApi } from "@/lib/points";
import { usePoll } from "./use-poll";

export const PHONE_POLL_MS = 15_000;

/** The party page's leaderboard: top 10, and your own place below it if you're further down (S05-AC2). */
export function PhoneLeaderboard({ slug }: { slug: string }) {
  const { LeaderboardRow } = useSlots();
  const playerId = useOptionalDevice()?.active?.id ?? null;
  const load = useCallback(async () => {
    const res = await standingsApi.phone(slug, playerId);
    return res.ok ? res.data : null;
  }, [slug, playerId]);
  const standings = usePoll(load, PHONE_POLL_MS);
  if (!standings) return null;
  const { top, me } = standings;
  const inTop = playerId !== null && top.some((r) => r.id === playerId);

  return (
    <section aria-labelledby="board-heading" className="grid gap-2">
      <h2
        id="board-heading"
        className="m-0 font-gm-display text-sm font-medium tracking-[0.12em] text-gm-text-muted uppercase"
      >
        Leaderboard
      </h2>
      {top.length === 0 ? (
        <p className="m-0 text-gm-text-muted">No scores yet. Play a game to get on the board.</p>
      ) : (
        <ol aria-label="Leaderboard" className="m-0 list-none p-0">
          {top.map((r) => (
            <LeaderboardRow
              key={r.id}
              rank={r.rank}
              name={r.nickname}
              score={r.points}
              highlight={r.id === playerId}
            />
          ))}
          {me && !inTop && (
            <>
              <li aria-hidden="true" className="py-1 text-center text-gm-text-muted">
                ⋯
              </li>
              <LeaderboardRow rank={me.rank} name="You" score={me.points} highlight />
            </>
          )}
        </ol>
      )}
    </section>
  );
}
