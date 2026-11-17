"use client";

import { useCallback, useState } from "react";
import { useOptionalDevice } from "@/components/players/device";
import { useSlots } from "@/components/slots/registry";
import { Skeleton } from "@/components/ui/skeleton";
import { liveApi, type LiveView } from "@/lib/live";
import { cx } from "@/lib/ui";
import { DemoFrame } from "./demo-frame";
import { LIVE_RENDERERS } from "./renderers";
import type { ActiveLiveView, LiveRenderer } from "./types";
import { useLive } from "./use-live";

/** A captain's action: pick who's up, or make a move. */
export type LiveAct = (
  a: { action: "pick"; who: string } | { action: "move"; move: unknown },
) => Promise<void>;

/** The captain's who's-up list: teammates who've had a turn are greyed out (S24-AC2). */
export function WhosUp({
  view,
  onPick,
  busy,
}: {
  view: ActiveLiveView;
  onPick: (id: string) => void;
  busy: boolean;
}) {
  const you = view.you;
  const mine = view.teams.find((t) => t.id === you?.teamId);
  if (!you) return null;
  return (
    <section aria-label="Who's up" className="grid gap-3">
      <h3 className="m-0 font-gm-display text-2xl font-bold">Who&apos;s up?</h3>
      <p className="m-0 text-gm-text-muted">
        Tap who plays this round, then hand them your phone. Greyed out: they&apos;ve had a turn.
      </p>
      <ul className="m-0 grid list-none gap-2 p-0">
        {you.pickable.map((p) => {
          const chosen = mine?.up?.id === p.id;
          return (
            <li key={p.id}>
              <button
                type="button"
                aria-pressed={chosen}
                disabled={busy || !p.available}
                onClick={() => {
                  onPick(p.id);
                }}
                className={cx(
                  "flex min-h-14 w-full items-center justify-between rounded-gm border-2 px-4 text-left text-lg font-bold",
                  chosen
                    ? "border-gm-accent bg-gm-accent text-gm-text-on-accent"
                    : "border-gm-border bg-gm-surface text-gm-text",
                  !p.available && "opacity-40",
                )}
              >
                {p.nickname}
                {chosen && <span aria-hidden="true">✓</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Not the captain: watch the TV, with your team's player and points (S24-AC3). */
export function WatchTheTv({ view }: { view: ActiveLiveView }) {
  const mine = view.teams.find((t) => t.id === view.you?.teamId);
  return (
    <section aria-label="Watch the TV" className="grid gap-3 text-center">
      <p className="m-0 font-gm-display text-3xl font-bold">Watch the TV!</p>
      {view.session.step === "intro" && <p className="m-0 text-lg">{view.demo}</p>}
      {mine ? (
        <div className="grid gap-1 rounded-gm bg-gm-surface p-4 ring-1 ring-gm-border">
          <span className="text-lg font-bold">{mine.name}</span>
          <span className="text-gm-text-muted">
            {mine.up ? `Up now: ${mine.up.nickname}` : "Your captain picks who's up."}
          </span>
          <span className="font-gm-display text-3xl font-bold tabular-nums">{mine.score}</span>
        </div>
      ) : (
        <p className="m-0 text-gm-text-muted">Join a team to play the next one.</p>
      )}
    </section>
  );
}

/** A live game on a phone: the captain's controller, or Watch the TV (specs 11, 24). */
export function LivePanel({
  view,
  serverNow,
  act,
  busy,
  error,
  renderers = LIVE_RENDERERS,
}: {
  view: LiveView;
  serverNow: () => number;
  act: LiveAct;
  busy: boolean;
  error: string | null;
  renderers?: Readonly<Record<string, LiveRenderer>>;
}) {
  const { Panel } = useSlots();
  if (!view.active)
    return (
      <Panel label="No live game">
        <p className="m-0 text-lg">No live game right now. The host starts them on the TV.</p>
      </Panel>
    );
  const renderer = renderers[view.session.type];
  const { step } = view.session;
  const you = view.you;
  const captain = you?.captain === true;
  const pickNow = captain && you.canPick && step === "pick";
  const controller = captain && (step === "play" || step === "results") && renderer;
  return (
    <Panel label={view.session.title}>
      <div className="grid gap-4">
        <p className="m-0 font-bold text-gm-text-muted">
          {view.session.round > 0 && step !== "final"
            ? `Round ${String(view.session.round)} of ${String(view.session.rounds)}`
            : view.session.title}
        </p>
        {error && (
          <p role="alert" className="m-0 font-bold text-gm-danger">
            {error}
          </p>
        )}
        {captain && step === "intro" && (
          <DemoFrame renderer={undefined} line={view.demo} size="phone" />
        )}
        {pickNow && (
          <WhosUp
            view={view}
            busy={busy}
            onPick={(who) => {
              void act({ action: "pick", who });
            }}
          />
        )}
        {controller && (
          <>
            {/* In a turn game the captain can swap who's up during their team's turn (S24-AC2). */}
            {you.canPick && step === "play" && (
              <WhosUp
                view={view}
                busy={busy}
                onPick={(who) => {
                  void act({ action: "pick", who });
                }}
              />
            )}
            <renderer.Controller
              view={view}
              game={view.game}
              serverNow={serverNow}
              revealed={step === "results"}
              busy={busy}
              send={(move) => act({ action: "move", move })}
            />
          </>
        )}
        {!captain && <WatchTheTv view={view} />}
        {captain && step === "final" && <WatchTheTv view={view} />}
      </div>
    </Panel>
  );
}

/**
 * The phone's live page (spec 11): follows the session for this phone's
 * player, and sends the captain's picks and moves for the current round.
 */
export function LivePhone({
  renderers = LIVE_RENDERERS,
}: {
  renderers?: Readonly<Record<string, LiveRenderer>>;
}) {
  const device = useOptionalDevice();
  const slug = device?.slug ?? "";
  const playerId = device?.active?.id ?? null;
  const token = device?.token;
  const load = useCallback(
    async () => liveApi.view(slug, token ? await token() : "", playerId),
    [slug, token, playerId],
  );
  const { view, error, show, serverNow } = useLive(load);
  const [busy, setBusy] = useState(false);
  const [refused, setRefused] = useState<string | null>(null);
  const act: LiveAct = async (a) => {
    if (!view?.active || !playerId || !token) return;
    setBusy(true);
    setRefused(null);
    const t = await token();
    const round = view.session.round;
    const res =
      a.action === "pick"
        ? await liveApi.pick(slug, t, playerId, round, a.who)
        : await liveApi.move(slug, t, playerId, round, a.move);
    setBusy(false);
    if (res.ok) show(res.data);
    else setRefused(res.message);
  };
  if (!view) return <Skeleton label="Loading the live game" className="h-40 w-full" />;
  return (
    <LivePanel
      view={view}
      serverNow={serverNow}
      act={act}
      busy={busy}
      error={refused ?? error}
      renderers={renderers}
    />
  );
}
