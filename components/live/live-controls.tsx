"use client";

import { useCallback, useId, useState } from "react";
import { AdminButton, Card, field } from "@/components/admin/ui";
import { adminLiveApi, type AdminLiveView } from "@/lib/live";
import { useLive } from "./use-live";

const STEP_NAME: Record<string, string> = {
  intro: "How to play",
  pick: "Who's up",
  play: "Playing",
  results: "Results",
  final: "Final standings",
};

type Act = Parameters<typeof adminLiveApi.act>[1];

/**
 * The Live card in Controls (S11-AC1, S24-AC1): start a live game, step it
 * with Next (labelled with what it'll do), end it, and see each team.
 */
export function LiveCard({
  view,
  act,
  busy,
}: {
  view: AdminLiveView;
  act: (a: Act) => void;
  busy: boolean;
}) {
  const selectId = useId();
  const [gameId, setGameId] = useState("");
  const chosen = gameId || view.games[0]?.id || "";
  if (!view.active)
    return (
      <Card title="Live game">
        {view.games.length === 0 ? (
          <p className="m-0 text-gm-text-muted">This event has no live games.</p>
        ) : (
          <div className="flex flex-wrap items-end gap-3">
            <div className="grid min-w-48 flex-1 gap-1">
              <label htmlFor={selectId} className="text-sm font-bold">
                Game
              </label>
              <select
                id={selectId}
                value={chosen}
                onChange={(e) => {
                  setGameId(e.target.value);
                }}
                className={field}
              >
                {view.games.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
              </select>
            </div>
            <AdminButton
              disabled={busy || !chosen}
              onClick={() => {
                act({ action: "start", gameId: chosen });
              }}
            >
              Start on the TV
            </AdminButton>
          </div>
        )}
      </Card>
    );
  const { step, round, rounds, title } = view.session;
  return (
    <Card title={`Live: ${title}`}>
      <div className="grid gap-4">
        <p className="m-0 font-bold" aria-live="polite">
          {STEP_NAME[step] ?? step}
          {round > 0 && step !== "final" && ` · round ${String(round)} of ${String(rounds)}`}
        </p>
        <div className="flex flex-wrap gap-3">
          {view.next && (
            <AdminButton
              disabled={busy}
              onClick={() => {
                act({ action: "next" });
              }}
            >
              {view.next}
            </AdminButton>
          )}
          <AdminButton
            tone="danger"
            disabled={busy}
            onClick={() => {
              act({ action: "end" });
            }}
          >
            End early
          </AdminButton>
        </div>
        <ul aria-label="Teams in the live game" className="m-0 grid list-none gap-2 p-0">
          {view.teams.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between gap-3 rounded-gm border border-gm-border px-3 py-2"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  aria-hidden="true"
                  className="inline-block size-3 shrink-0 rounded-full"
                  style={{ background: `var(--gm-team-${String(t.color)})` }}
                />
                <span className="truncate font-bold">{t.name}</span>
                <span className="truncate text-sm text-gm-text-muted">
                  {t.up ? t.up.nickname : step === "pick" ? "picking…" : ""}
                </span>
              </span>
              <span className="shrink-0 font-bold tabular-nums">
                {t.roundPoints ? `+${String(t.roundPoints)} · ` : ""}
                {t.score}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

/** The Live card, following the session (S11-AC4) and sending the host's actions. */
export function LiveControls({ slug }: { slug: string }) {
  const load = useCallback(() => adminLiveApi.view(slug), [slug]);
  const { view, error, show } = useLive<AdminLiveView>(load);
  const [busy, setBusy] = useState(false);
  const [refused, setRefused] = useState<string | null>(null);
  if (!view) return null;
  const act = (a: Act) => {
    setBusy(true);
    setRefused(null);
    void adminLiveApi.act(slug, a).then((res) => {
      setBusy(false);
      if (res.ok) show(res.data);
      else setRefused(res.message);
    });
  };
  return (
    <>
      {(refused ?? error) && (
        <p role="alert" className="m-0 text-sm font-bold text-gm-danger">
          {refused ?? error}
        </p>
      )}
      <LiveCard view={view} act={act} busy={busy} />
    </>
  );
}
