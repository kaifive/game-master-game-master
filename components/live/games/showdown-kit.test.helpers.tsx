import { render } from "@testing-library/react";
import { vi } from "vitest";
import { PackRoot } from "@/components/packs/judges-table/root";
import { holiday2026 } from "@/content/events/holiday-2026";
import { showdownFor, type Role } from "@/lib/live";
import { LIVE_RENDERERS } from "../renderers";
import type { ActiveLiveView } from "../types";

/** Shared by the showdown screen tests: a real round, a view of it, and a render on the phone or TV. */

export const T0 = 1_000_000;
const TEAMS = ["t1", "t2", "t3"];
export const NAMES: Record<string, string> = { t1: "Reds", t2: "Blues", t3: "Golds" };

/**
 * A real round of a showdown, with moves played, and a view of it. A move by
 * `HOST` is the host's own step (spec 12).
 */
export const HOST = "host";

export function round(
  type: string,
  moves: [string, unknown, number][] = [],
  prev: unknown = null,
  content: unknown = {},
) {
  const game = showdownFor(type);
  if (!game) throw new Error(type);
  const c = game.content.parse(content);
  let state = game.deal(c, { seed: 4, round: prev ? 2 : 1, teams: TEAMS, startsAt: T0, prev });
  for (const [teamId, move, at] of moves) {
    const r =
      teamId === HOST && game.host
        ? game.host(state, c, { action: move, now: at })
        : game.move(state, c, { teamId, move, now: at });
    if (!r.ok) throw new Error(r.message);
    state = r.state;
  }
  const closed = () => (game.close ? game.close(state, c, T0 + 60_000) : state);
  const view = (role: Role, now: number, revealed = false): ActiveLiveView => {
    const s = revealed ? closed() : state;
    const points = revealed ? game.score(s, c, TEAMS) : null;
    return {
      active: true,
      serverNow: now,
      screen: "showdown",
      session: {
        id: "s",
        gameId: type,
        type,
        title: type,
        step: revealed ? "results" : "play",
        round: 1,
        rounds: 3,
        revision: 1,
      },
      demo: game.demo,
      teams: TEAMS.map((id, i) => ({
        id,
        name: NAMES[id] ?? id,
        color: i + 1,
        score: 0,
        roundPoints: points ? (points[id] ?? 0) : null,
      })),
      game: game.view(s, c, { role, revealed, now, teams: TEAMS }),
      you: role.kind === "tv" ? null : { teamId: role.teamId, captain: true },
    };
  };
  return { state, view, closed };
}

export const cap = (teamId: string): Role => ({ kind: "captain", teamId });
export const tv: Role = { kind: "tv" };

/** `now` may be a clock, read every frame, to let a phone's timer run (auto-submit). */
export function show(
  type: string,
  v: ActiveLiveView,
  now: number | (() => number),
  on: "phone" | "tv" = "phone",
) {
  const R = LIVE_RENDERERS[type];
  if (!R) throw new Error(type);
  const send = vi.fn(() => Promise.resolve());
  const revealed = v.session.step === "results";
  render(
    <PackRoot styleRef={holiday2026.style}>
      {on === "phone" ? (
        <R.Controller
          view={v}
          game={v.game}
          serverNow={typeof now === "number" ? () => now : now}
          revealed={revealed}
          send={send}
          busy={false}
        />
      ) : (
        <R.Tv
          view={v}
          game={v.game}
          serverNow={typeof now === "number" ? () => now : now}
          revealed={revealed}
        />
      )}
    </PackRoot>,
  );
  return send;
}
