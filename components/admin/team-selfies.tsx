"use client";

import { useEffect, useRef, useState } from "react";
import { AdminButton, Card } from "@/components/admin/ui";
import { shrinkPhoto } from "@/components/games/photo/shrink";
import {
  DressedSelfie,
  placeSticker,
  STICKER_ORDER,
  STICKERS,
  StickerArt,
} from "@/components/stickers/stickers";
import {
  adminSelfiesApi,
  type AdminSelfies,
  type AdminSticker,
  type AdminTeamSelfie,
} from "@/lib/teams";
import { cx } from "@/lib/ui";

/**
 * Team selfies in Controls (spec 31): every team's selfie, a way to add or
 * replace one, and Dress up, where the host puts stickers on it for the
 * finale. Loaded on request, like donations, so Controls doesn't read them
 * on every refresh.
 */

const SAVE_DELAY_MS = 500;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Reads a photo the host picks: shrunk like a phone's, with its size. */
async function readPhoto(file: File) {
  const blob = await shrinkPhoto(file);
  const bitmap = await createImageBitmap(blob);
  const size = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return { blob, size };
}

function Editor({
  slug,
  team,
  onClose,
}: {
  slug: string;
  team: AdminTeamSelfie & { selfie: NonNullable<AdminTeamSelfie["selfie"]> };
  onClose: (stickers: AdminSticker[]) => void;
}) {
  const [stickers, setStickers] = useState<AdminSticker[]>(team.stickers);
  const [picked, setPicked] = useState<string | null>(null);
  const [saving, setSaving] = useState<"saved" | "saving" | "failed">("saved");
  const frame = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const saved = useRef(JSON.stringify(team.stickers));

  // Saves a moment after the last change, so dragging doesn't send every step (S31-AC2).
  useEffect(() => {
    const now = JSON.stringify(stickers);
    if (now === saved.current) return;
    setSaving("saving");
    const t = setTimeout(() => {
      void adminSelfiesApi.stickers(slug, team.teamId, stickers).then((res) => {
        if (res.ok) saved.current = now;
        setSaving(res.ok ? "saved" : "failed");
      });
    }, SAVE_DELAY_MS);
    return () => {
      clearTimeout(t);
    };
  }, [slug, team.teamId, stickers]);

  const change = (id: string, patch: (s: AdminSticker) => Partial<AdminSticker>) => {
    setStickers((all) => all.map((s) => (s.id === id ? { ...s, ...patch(s) } : s)));
  };
  const add = (kind: string) => {
    // The first id not in use: s1, s2, ...
    let n = stickers.length + 1;
    while (stickers.some((s) => s.id === `s${String(n)}`)) n++;
    const id = `s${String(n)}`;
    setStickers([...stickers, { id, kind, x: 0.5, y: 0.35, size: 0.3, angle: 0, flip: false }]);
    setPicked(id);
  };
  const at = (e: React.PointerEvent) => {
    const box = frame.current?.getBoundingClientRect();
    if (!box) return null;
    return { x: (e.clientX - box.left) / box.width, y: (e.clientY - box.top) / box.height };
  };
  const chosen = stickers.find((s) => s.id === picked);
  const tool =
    "min-h-11 rounded-gm border border-gm-border bg-gm-surface px-3 text-sm font-bold disabled:opacity-50";

  return (
    <section aria-label={`Dress up ${team.name}`} className="grid gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="m-0 font-bold">{team.name}</p>
        <span className="text-sm text-gm-text-muted" aria-live="polite">
          {saving === "saving"
            ? "Saving…"
            : saving === "failed"
              ? "Didn't save. Try a change again."
              : "Saved"}
        </span>
      </div>
      <div ref={frame} className="touch-none select-none">
        <DressedSelfie
          url={team.selfie.url}
          width={team.selfie.width}
          height={team.selfie.height}
          stickers={[]}
          alt={`${team.name}'s team selfie`}
          className="rounded-gm ring-1 ring-gm-border"
        >
          {stickers.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-label={`${STICKERS[s.kind]?.name ?? s.kind}${s.id === picked ? ", picked" : ""}`}
              aria-pressed={s.id === picked}
              className={cx(
                "absolute cursor-grab rounded-sm active:cursor-grabbing",
                s.id === picked &&
                  "outline-2 outline-offset-2 outline-gm-accent-ink outline-dashed",
              )}
              style={placeSticker(s)}
              onPointerDown={(e) => {
                const p = at(e);
                if (!p) return;
                e.currentTarget.setPointerCapture(e.pointerId);
                setPicked(s.id);
                drag.current = { id: s.id, dx: p.x - s.x, dy: p.y - s.y };
              }}
              onPointerMove={(e) => {
                const d = drag.current;
                const p = at(e);
                if (!d || !p || d.id !== s.id) return;
                change(s.id, () => ({ x: clamp(p.x - d.dx, 0, 1), y: clamp(p.y - d.dy, 0, 1) }));
              }}
              onPointerUp={() => {
                drag.current = null;
              }}
            >
              <StickerArt kind={s.kind} />
            </button>
          ))}
        </DressedSelfie>
      </div>
      {chosen && (
        <div role="toolbar" aria-label="Change the sticker" className="flex flex-wrap gap-2">
          <button
            type="button"
            className={tool}
            onClick={() => {
              change(chosen.id, (s) => ({ size: clamp(s.size * 1.15, 0.05, 1.5) }));
            }}
          >
            Bigger
          </button>
          <button
            type="button"
            className={tool}
            onClick={() => {
              change(chosen.id, (s) => ({ size: clamp(s.size / 1.15, 0.05, 1.5) }));
            }}
          >
            Smaller
          </button>
          <button
            type="button"
            className={tool}
            onClick={() => {
              change(chosen.id, (s) => ({ angle: clamp(s.angle - 15, -360, 360) }));
            }}
          >
            Turn left
          </button>
          <button
            type="button"
            className={tool}
            onClick={() => {
              change(chosen.id, (s) => ({ angle: clamp(s.angle + 15, -360, 360) }));
            }}
          >
            Turn right
          </button>
          <button
            type="button"
            className={tool}
            onClick={() => {
              change(chosen.id, (s) => ({ flip: !s.flip }));
            }}
          >
            Flip
          </button>
          <button
            type="button"
            className={tool}
            onClick={() => {
              setStickers((all) => [...all.filter((s) => s.id !== chosen.id), chosen]);
            }}
          >
            To front
          </button>
          <button
            type="button"
            className={cx(tool, "text-gm-danger")}
            onClick={() => {
              setStickers((all) => all.filter((s) => s.id !== chosen.id));
              setPicked(null);
            }}
          >
            Remove
          </button>
        </div>
      )}
      <ul aria-label="Stickers" className="m-0 flex list-none gap-2 overflow-x-auto p-0 pb-1">
        {STICKER_ORDER.map((kind) => (
          <li key={kind}>
            <button
              type="button"
              aria-label={`Add ${STICKERS[kind]?.name ?? kind}`}
              disabled={stickers.length >= 30}
              onClick={() => {
                add(kind);
              }}
              className="grid size-16 place-items-center rounded-gm border border-gm-border bg-gm-bg p-2 disabled:opacity-50"
            >
              <StickerArt kind={kind} />
            </button>
          </li>
        ))}
      </ul>
      <p className="m-0 text-sm text-gm-text-muted">
        Tap a sticker to add it, drag it into place, then size and turn it. Changes save as you go.
      </p>
      <AdminButton
        tone="secondary"
        onClick={() => {
          onClose(stickers);
        }}
      >
        Done
      </AdminButton>
    </section>
  );
}

function TeamRow({
  slug,
  team,
  onEdit,
  onLoaded,
}: {
  slug: string;
  team: AdminTeamSelfie;
  onEdit: () => void;
  onLoaded: (all: AdminSelfies) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <li className="grid gap-2 rounded-gm border border-gm-border p-2">
      <p className="m-0 flex items-center gap-2 font-bold">
        <span
          aria-hidden="true"
          className="inline-block size-3 shrink-0 rounded-full"
          style={{ background: `var(--gm-team-${String(team.color)})` }}
        />
        {team.name}
      </p>
      {team.selfie ? (
        <DressedSelfie
          url={team.selfie.url}
          width={team.selfie.width}
          height={team.selfie.height}
          stickers={team.stickers}
          alt={`${team.name}'s team selfie`}
          className="rounded-gm"
        />
      ) : (
        <p className="m-0 grid aspect-[4/3] place-items-center rounded-gm bg-gm-bg text-sm text-gm-text-muted">
          No selfie yet
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {team.selfie && <AdminButton onClick={onEdit}>Dress up</AdminButton>}
        <label className="inline-flex min-h-11 cursor-pointer items-center rounded-gm border border-gm-border px-3 text-sm font-bold">
          {busy ? "Sending…" : team.selfie ? "Replace selfie" : "Add a selfie"}
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              setBusy(true);
              setError(null);
              void readPhoto(file)
                .then(({ blob, size }) => adminSelfiesApi.upload(slug, team.teamId, blob, size))
                .then((res) => {
                  if (res.ok) onLoaded(res.data);
                  else setError(res.message);
                })
                .catch(() => {
                  setError("We couldn't open that photo. Try another one.");
                })
                .finally(() => {
                  setBusy(false);
                });
            }}
          />
        </label>
      </div>
      {error && (
        <p role="alert" className="m-0 text-sm font-bold text-gm-danger">
          {error}
        </p>
      )}
    </li>
  );
}

/** The Team selfies card (S31-AC2). */
export function TeamSelfiesCard({ slug }: { slug: string }) {
  const [data, setData] = useState<AdminSelfies | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = () => {
    setError(null);
    void adminSelfiesApi.list(slug).then((res) => {
      if (res.ok) setData(res.data);
      else setError(res.message);
    });
  };
  const team = data?.teams.find((t) => t.teamId === editing);
  return (
    <Card
      title="Team selfies"
      actions={
        !data && (
          <AdminButton tone="secondary" onClick={load}>
            Show
          </AdminButton>
        )
      }
    >
      {error && (
        <p role="alert" className="m-0 text-sm font-bold text-gm-danger">
          {error}
        </p>
      )}
      {!data ? (
        <p className="m-0 text-sm text-gm-text-muted">
          Dress up each team&apos;s selfie with stickers before the finale. The winners&apos; shows
          on the TV when the event ends.
        </p>
      ) : team?.selfie ? (
        <Editor
          slug={slug}
          team={{ ...team, selfie: team.selfie }}
          onClose={(stickers) => {
            setData({
              ...data,
              teams: data.teams.map((t) => (t.teamId === team.teamId ? { ...t, stickers } : t)),
            });
            setEditing(null);
          }}
        />
      ) : data.teams.length === 0 ? (
        <p className="m-0 text-sm text-gm-text-muted">No teams yet.</p>
      ) : (
        <ul
          aria-label="Team selfies"
          className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2"
        >
          {data.teams.map((t) => (
            <TeamRow
              key={t.teamId}
              slug={slug}
              team={t}
              onEdit={() => {
                setEditing(t.teamId);
              }}
              onLoaded={setData}
            />
          ))}
        </ul>
      )}
    </Card>
  );
}
