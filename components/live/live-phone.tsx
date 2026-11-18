"use client";

import { useCallback, useState } from "react";
import { useOptionalDevice } from "@/components/players/device";
import { useSlots } from "@/components/slots/registry";
import { Skeleton } from "@/components/ui/skeleton";
import { liveApi, type LiveView } from "@/lib/live";
import { LIVE_RENDERERS } from "./renderers";
import type { ActiveLiveView, LiveRenderer } from "./types";
import { useLive } from "./use-live";

/** Not the captain: watch the TV, with your team's points (S24-AC3). */
export function WatchTheTv({ view }: { view: ActiveLiveView }) {
  const mine = view.teams.find((t) => t.id === view.you?.teamId);
  return (
    <section aria-label="Watch the TV" className="grid gap-3 text-center">
      <p className="m-0 font-gm-display text-3xl font-bold">Watch the TV!</p>
      {view.session.step === "intro" && <p className="m-0 text-lg">{view.demo}</p>}
      {mine ? (
        <div className="grid gap-1 rounded-gm bg-gm-surface p-4 ring-1 ring-gm-border">
          <span className="text-lg font-bold">{mine.name}</span>
          <span className="text-gm-text-muted">Your captain&apos;s phone is the controller.</span>
          <span className="font-gm-display text-3xl font-bold tabular-nums">{mine.score}</span>
        </div>
      ) : (
        <p className="m-0 text-gm-text-muted">Teams with a captain play in showdowns.</p>
      )}
    </section>
  );
}

/** A live game on a phone: the captain's controller, or Watch the TV (specs 11, 24). */
export function LivePanel({
  view,
  serverNow,
  send,
  busy,
  error,
  renderers = LIVE_RENDERERS,
}: {
  view: LiveView;
  serverNow: () => number;
  send: (move: unknown) => Promise<void>;
  busy: boolean;
  error: string | null;
  renderers?: Readonly<Record<string, LiveRenderer>>;
}) {
  const { Panel } = useSlots();
  if (!view.active)
    return (
      <Panel label="No live game">
        <p className="m-0 text-lg">No showdown right now. The host starts them on the TV.</p>
      </Panel>
    );
  const renderer = renderers[view.session.type];
  const { step, round, rounds, title } = view.session;
  const captain = view.you?.captain === true;
  const controller = captain && (step === "play" || step === "results") && renderer;
  return (
    <Panel label={title}>
      <div className="grid gap-4">
        <p className="m-0 font-bold text-gm-text-muted">
          {[
            view.teams.find((t) => t.id === view.you?.teamId)?.name,
            round > 0 && step !== "final" ? `Round ${String(round)} of ${String(rounds)}` : title,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {error && (
          <p role="alert" className="m-0 font-bold text-gm-danger">
            {error}
          </p>
        )}
        {captain && step === "intro" && (
          <div className="grid gap-2 text-center">
            <p className="m-0 font-gm-display text-2xl font-bold">You&apos;re the controller</p>
            <p className="m-0 text-lg">{view.demo}</p>
            {view.timeout && <p className="m-0 font-bold text-gm-tile-correct">{view.timeout}</p>}
            <p className="m-0 text-gm-text-muted">Hand this phone to whoever plays each round.</p>
          </div>
        )}
        {controller && (
          <renderer.Controller
            view={view}
            game={view.game}
            serverNow={serverNow}
            revealed={step === "results"}
            busy={busy}
            send={send}
          />
        )}
        {(!captain || step === "final") && <WatchTheTv view={view} />}
      </div>
    </Panel>
  );
}

/**
 * The phone's live page (spec 11): follows the session for this phone's
 * player, and sends the captain's moves for the current round.
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
  const send = async (move: unknown) => {
    if (!view?.active || !playerId || !token) return;
    setBusy(true);
    setRefused(null);
    const res = await liveApi.move(slug, await token(), playerId, view.session.round, move);
    setBusy(false);
    if (res.ok) show(res.data);
    else setRefused(res.message);
  };
  if (!view) return <Skeleton label="Loading the live game" className="h-40 w-full" />;
  return (
    <LivePanel
      view={view}
      serverNow={serverNow}
      send={send}
      busy={busy}
      error={refused ?? error}
      renderers={renderers}
    />
  );
}
