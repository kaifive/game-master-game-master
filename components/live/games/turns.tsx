"use client";

import { useState } from "react";
import { CrossIcon } from "@/components/icons/game";
import { Present } from "./flyby";
import { rotate, type Cell } from "@/lib/games";
import type { LandView, PathView, ShuffleView, Square, To21View } from "@/lib/live";
import { cx } from "@/lib/ui";
import type { ActiveLiveView, LiveControllerProps, LiveRenderer, LiveTvProps } from "../types";
import {
  GetReady,
  PhoneNote,
  PhoneResult,
  Reveal,
  Swatch,
  TimeLeft,
  TurnBanner,
  useServerTime,
} from "./shared";

/** Memory Path, Present Shuffle, Snowball to 21 and Land Mass (spec 27): teams take turns. */

const nameOf = (view: ActiveLiveView, id: string | null) =>
  view.teams.find((t) => t.id === id)?.name ?? "";
const colorOf = (view: ActiveLiveView, id: string | null) =>
  view.teams.find((t) => t.id === id)?.color ?? 8;
const team = (color: number) => `var(--gm-team-${String(color)})`;
const bigButton =
  "min-h-20 rounded-gm font-gm-display text-4xl font-bold motion-safe:active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40";

/** Who goes in what order this round, the current team picked out. */
function Order({
  view,
  order,
  current,
  note,
}: {
  view: ActiveLiveView;
  order: string[];
  current: string | null;
  note?: (id: string) => string | null;
}) {
  return (
    <ol
      aria-label="Turn order"
      className="m-0 flex list-none flex-wrap justify-center gap-[1vw] p-0"
    >
      {order.map((id) => (
        <li
          key={id}
          aria-current={id === current ? "step" : undefined}
          className={cx(
            "flex items-center gap-2 rounded-gm px-3 py-[0.8vh] text-[clamp(0.9rem,2.2vh,1.6rem)] font-bold ring-1",
            id === current
              ? "bg-gm-surface-raised ring-gm-tile-correct"
              : "bg-gm-surface ring-gm-border",
          )}
        >
          <Swatch color={colorOf(view, id)} />
          {nameOf(view, id)}
          {note?.(id) && <span className="text-gm-text-muted">· {note(id)}</span>}
        </li>
      ))}
    </ol>
  );
}

// ---- Snowball to 21

function To21Tv({ view, game, serverNow, revealed }: LiveTvProps) {
  const g = game as To21View | null;
  const now = useServerTime(serverNow, !revealed);
  if (!g) return null;
  if (now < g.startsAt && !revealed)
    return (
      <GetReady
        startsAt={g.startsAt}
        now={now}
        line={`${nameOf(view, g.order[0] ?? null)} starts!`}
      />
    );
  return (
    <div className="grid gap-[2.4vh]">
      {revealed || g.winner ? (
        <p className="m-0 text-center font-gm-display text-[clamp(2rem,6vh,4.5rem)] font-bold">
          {g.winner
            ? `${nameOf(view, g.winner)} made ${String(g.target)}!`
            : "Nobody made it this time"}
        </p>
      ) : (
        <TurnBanner
          view={view}
          team={g.turn}
          endsAt={g.turnEndsAt}
          total={g.turnMs}
          now={now}
          doing="is up"
        />
      )}
      <div className="flex items-center justify-center gap-[4vw]">
        <div
          aria-label={`The snowball is at ${String(g.count)}`}
          className={cx(
            revealed
              ? "size-[18vh] text-[clamp(3rem,10vh,7rem)]"
              : "size-[34vh] text-[clamp(5rem,20vh,14rem)]",
            "grid place-items-center rounded-full bg-gm-tile-present font-gm-display leading-none font-bold text-gm-tile-present-ink tabular-nums shadow-xl",
          )}
        >
          {g.count}
        </div>
        {!revealed && (
          <ol aria-label="Last turns" className="m-0 grid list-none gap-[0.8vh] p-0">
            {g.history.slice(-6).map((h, i) => (
              <li
                key={i}
                className="flex items-center gap-2 text-[clamp(1rem,2.8vh,2rem)] font-bold"
              >
                <Swatch color={colorOf(view, h.teamId)} />
                {nameOf(view, h.teamId)}
                <span className="font-gm-display text-gm-accent-ink">+{h.add}</span>
                {h.auto && <span className="text-gm-text-muted">(too slow)</span>}
              </li>
            ))}
          </ol>
        )}
      </div>
      {!revealed && (
        <div
          aria-hidden="true"
          className="grid gap-[0.4vw]"
          style={{ gridTemplateColumns: `repeat(${String(g.target)}, 1fr)` }}
        >
          {Array.from({ length: g.target }, (_, i) => (
            <span
              key={i}
              className={cx(
                "grid h-[4vh] place-items-center rounded-full font-gm-display text-[clamp(0.7rem,1.8vh,1.3rem)] font-bold",
                i < g.count
                  ? "bg-gm-tile-present text-gm-tile-present-ink"
                  : "bg-gm-tile-absent text-gm-tile-absent-ink",
                i === g.target - 1 && "ring-4 ring-gm-tile-correct",
              )}
            >
              {i + 1}
            </span>
          ))}
        </div>
      )}
      {revealed && <Reveal view={view} />}
      {!revealed && <Order view={view} order={g.order} current={g.turn} />}
    </div>
  );
}

function To21Controller({ view, game, serverNow, revealed, send, busy }: LiveControllerProps) {
  const g = game as To21View | null;
  const now = useServerTime(serverNow, !revealed);
  if (!g) return null;
  if (revealed || g.winner) return <PhoneResult view={view} />;
  if (!g.myTurn)
    return (
      <PhoneNote title={`The snowball is at ${String(g.count)}`}>
        {now < g.startsAt ? "Get ready…" : `${nameOf(view, g.turn)} is up.`}
      </PhoneNote>
    );
  return (
    <section aria-label="Your turn" className="grid gap-4">
      <p className="m-0 text-center text-xl font-bold">
        Your turn! The snowball is at <span className="font-gm-display text-5xl">{g.count}</span>
      </p>
      <TimeLeft closesAt={g.turnEndsAt} now={now} total={g.turnMs} />
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((n) => (
          <button
            key={n}
            type="button"
            disabled={busy || g.count + n > g.target}
            onClick={() => void send({ add: n })}
            className={cx(bigButton, "bg-gm-tile-present text-gm-tile-present-ink shadow-md")}
          >
            +{n}
          </button>
        ))}
      </div>
      <p className="m-0 text-center text-gm-text-muted">
        Make it exactly {g.target} to win. Too slow adds 1.
      </p>
    </section>
  );
}

function To21Demo({ still }: { still: boolean }) {
  return (
    <div className="grid h-full w-full place-items-center">
      <div className="flex items-center gap-[1.4em] font-gm-display text-[clamp(1.6rem,7vh,4rem)] font-bold">
        <span className="grid size-[2.4em] place-items-center rounded-full bg-gm-tile-present text-gm-tile-present-ink shadow-md">
          18
        </span>
        <span
          className={cx(
            "text-gm-accent-ink",
            !still && "motion-safe:animate-[gm-demo-answer_5s_linear_infinite]",
          )}
        >
          +3 = 21!
        </span>
      </div>
    </div>
  );
}

export const to21Renderer: LiveRenderer = {
  Tv: To21Tv,
  Controller: To21Controller,
  Demo: To21Demo,
};

// ---- Memory Path

const has = (list: Square[], c: number, r: number) => list.some((q) => q[0] === c && q[1] === r);

/** The path grid: shown, lit, right-so-far and missed squares, bottom row first to cross. */
function PathGrid({
  g,
  view,
  onTap,
  size,
}: {
  g: PathView;
  view: ActiveLiveView;
  onTap?: (square: Square) => void;
  size: "tv" | "phone";
}) {
  const crossingColor = colorOf(view, g.crossing);
  return (
    <div
      role={onTap ? "group" : "img"}
      aria-label={onTap ? "The path grid" : `The path: ${String(g.lit.length)} squares lit`}
      className={cx("mx-auto grid gap-[3px]", size === "tv" ? "h-[60vh]" : "w-full")}
      style={{
        gridTemplateColumns: `repeat(${String(g.cols)}, 1fr)`,
        aspectRatio: `${String(g.cols)} / ${String(g.rows)}`,
      }}
    >
      {Array.from({ length: g.rows }, (_, r) =>
        Array.from({ length: g.cols }, (_, c) => {
          const shown = has(g.shown, c, r);
          // The crossing team's right squares, in its color; once the round is over, the path is all gold.
          const mine = g.crossing !== null && has(g.progress, c, r);
          const lit = has(g.lit, c, r);
          const miss = g.lastMiss && g.lastMiss.square[0] === c && g.lastMiss.square[1] === r;
          const look = cx(
            "relative grid place-items-center rounded-[4px] font-gm-display font-bold",
            mine
              ? ""
              : shown || lit
                ? "bg-gm-tile-correct text-gm-tile-correct-ink"
                : "bg-gm-tile-absent",
            miss && "bg-gm-accent text-gm-text-on-accent",
          );
          const style = mine ? { background: team(crossingColor) } : undefined;

          return onTap ? (
            <button
              key={`${String(c)}-${String(r)}`}
              type="button"
              aria-label={`Row ${String(g.rows - r)}, column ${String(c + 1)}${lit ? ", lit" : ""}${mine ? ", done" : ""}`}
              onClick={() => {
                onTap([c, r]);
              }}
              className={cx(look, "min-h-11")}
              style={style}
            />
          ) : (
            <span
              key={`${String(c)}-${String(r)}`}
              aria-hidden="true"
              className={look}
              style={style}
            >
              {miss && <CrossIcon size={28} />}
            </span>
          );
        }),
      )}
    </div>
  );
}

function PathTv({ view, game, serverNow, revealed }: LiveTvProps) {
  const g = game as PathView | null;
  const now = useServerTime(serverNow, !revealed);
  if (!g) return null;
  if (now < g.startsAt && !revealed)
    return <GetReady startsAt={g.startsAt} now={now} line="Watch the path!" />;
  const showing = now < g.showEndsAt && !revealed;
  return (
    <div className="grid grid-cols-[auto_1fr] items-center gap-[3vw]">
      <PathGrid g={g} view={view} size="tv" />
      <div className="grid content-center gap-[2.4vh]">
        {revealed ? (
          <>
            <p className="m-0 font-gm-display text-[clamp(2rem,6vh,4.5rem)] font-bold">
              {g.winner ? `${nameOf(view, g.winner)} made it across!` : "Nobody made it across"}
            </p>
            <Reveal
              view={view}
              note={(t) => {
                const res = g.results[t];
                if (!res) return "Didn't get a turn";
                return res.crossed
                  ? "Crossed!"
                  : `${String(res.reached)} of ${String(g.length)} squares`;
              }}
            />
          </>
        ) : showing ? (
          <p className="m-0 font-gm-display text-[clamp(2rem,6vh,4.5rem)] font-bold">
            Remember the path…
          </p>
        ) : (
          <>
            <TurnBanner
              view={view}
              team={g.crossing}
              endsAt={g.stepEndsAt}
              total={g.stepMs}
              now={now}
              doing="is crossing"
            />
            <p className="m-0 text-center font-gm-display text-[clamp(1.4rem,4vh,3rem)] font-bold text-gm-text-muted">
              {g.progress.length} of {g.length} squares
            </p>
          </>
        )}
        {!revealed && (
          <Order
            view={view}
            order={g.order}
            current={showing ? null : g.crossing}
            note={(id) => {
              const res = g.results[id];
              return res ? (res.crossed ? "across" : `out at ${String(res.reached)}`) : null;
            }}
          />
        )}
      </div>
    </div>
  );
}

function PathController({ view, game, serverNow, revealed, send, busy }: LiveControllerProps) {
  const g = game as PathView | null;
  const now = useServerTime(serverNow, !revealed);
  if (!g) return null;
  if (revealed) return <PhoneResult view={view} />;
  if (now < g.showEndsAt)
    return <PhoneNote title="Watch the TV!">Remember the path as it lights up.</PhoneNote>;
  const me = view.you?.teamId ?? "";
  const res = g.results[me];
  if (res)
    return (
      <PhoneNote title={res.crossed ? "You made it!" : `Out at ${String(res.reached)}`}>
        Watch the others.
      </PhoneNote>
    );
  if (!g.myTurn)
    return (
      <PhoneNote title={`${nameOf(view, g.crossing)} is crossing`}>
        Watch the TV: their right squares stay lit for you.
      </PhoneNote>
    );
  return (
    <section aria-label="Your crossing" className="grid gap-3">
      <p className="m-0 text-center text-xl font-bold">
        Your turn! Start on the bottom row. {g.progress.length} of {g.length}
      </p>
      <TimeLeft closesAt={g.stepEndsAt} now={now} total={g.stepMs} />
      <div className={cx(busy && "pointer-events-none opacity-80")}>
        <PathGrid g={g} view={view} size="phone" onTap={(square) => void send({ square })} />
      </div>
    </section>
  );
}

function PathDemo({ still }: { still: boolean }) {
  const lit = [12, 7, 8, 3];
  return (
    <div className="grid h-full w-full place-items-center">
      <div className="grid h-[70%] grid-cols-5 gap-[4px]" style={{ aspectRatio: "5 / 3" }}>
        {Array.from({ length: 15 }, (_, i) => (
          <span
            key={i}
            className={cx(
              "rounded-[3px]",
              lit.includes(i) ? "bg-gm-tile-correct" : "bg-gm-tile-absent",
              lit.includes(i) && !still && "motion-safe:animate-[gm-demo-flash_5s_linear_infinite]",
            )}
            style={
              lit.includes(i) ? { animationDelay: `${String(lit.indexOf(i) * 0.5)}s` } : undefined
            }
          />
        ))}
      </div>
    </div>
  );
}

export const pathRenderer: LiveRenderer = {
  Tv: PathTv,
  Controller: PathController,
  Demo: PathDemo,
};

// ---- Present Shuffle

const gridCols = (n: number) => Math.ceil(Math.sqrt(n));

/** Where each present is at this moment: slot positions, sliding along each swap in turn. */
function positions(g: ShuffleView, now: number) {
  const n = g.count;
  const pos = Array.from({ length: n }, (_, i) => i);
  const xy = (slot: number) => [slot % gridCols(n), Math.floor(slot / gridCols(n))];
  const at = (present: number) => xy(pos.indexOf(present));
  if (!g.swaps || now < g.showEndsAt) return Array.from({ length: n }, (_, p) => at(p));
  const each = (g.shuffleEndsAt - g.showEndsAt) / g.swaps.length;
  const t = now - g.showEndsAt;
  const done = Math.min(g.swaps.length, Math.floor(t / each));
  for (const [a, b] of g.swaps.slice(0, done)) [pos[a], pos[b]] = [pos[b] ?? 0, pos[a] ?? 0];
  const out = Array.from({ length: n }, (_, p) => at(p));
  const moving = g.swaps[done];
  if (moving) {
    const k = (t - done * each) / each;
    const [a, b] = moving;
    const pa = pos[a] ?? 0;
    const pb = pos[b] ?? 0;
    const [ax, ay] = xy(a);
    const [bx, by] = xy(b);
    const ease = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
    out[pa] = [
      (ax ?? 0) + ((bx ?? 0) - (ax ?? 0)) * ease,
      (ay ?? 0) + ((by ?? 0) - (ay ?? 0)) * ease - Math.sin(k * Math.PI) * 0.35,
    ];
    out[pb] = [
      (bx ?? 0) + ((ax ?? 0) - (bx ?? 0)) * ease,
      (by ?? 0) + ((ay ?? 0) - (by ?? 0)) * ease + Math.sin(k * Math.PI) * 0.35,
    ];
  }
  return out;
}

/** The presents on the TV, laid out on a grid of slots. */
function PresentBoard({ g, view, now }: { g: ShuffleView; view: ActiveLiveView; now: number }) {
  const n = g.count;
  const cols = gridCols(n);
  const rows = Math.ceil(n / cols);
  const pickBySlot = new Map(
    Object.entries(g.picks).flatMap(([t, p]) =>
      p ? [[p.slot, { t, value: p.value }] as const] : [],
    ),
  );
  const settled = !g.swaps;
  return (
    <div
      aria-label="The presents"
      role="img"
      className="relative mx-auto h-[58vh]"
      style={{ aspectRatio: `${String(cols)} / ${String(rows)}` }}
    >
      {settled
        ? Array.from({ length: n }, (_, slot) => {
            const pick = pickBySlot.get(slot);
            const value =
              pick?.value ?? (g.shown && g.final ? g.shown[g.final[slot] ?? 0] : undefined);
            return (
              <PresentAt
                key={slot}
                x={slot % cols}
                y={Math.floor(slot / cols)}
                cols={cols}
                rows={rows}
                i={slot}
                value={value}
                owner={pick ? colorOf(view, pick.t) : null}
              />
            );
          })
        : positions(g, now).map(([x, y], p) => (
            <PresentAt
              key={p}
              x={x ?? 0}
              y={y ?? 0}
              cols={cols}
              rows={rows}
              i={p}
              value={now < g.showEndsAt ? g.shown?.[p] : undefined}
              owner={null}
            />
          ))}
    </div>
  );
}

function PresentAt({
  x,
  y,
  cols,
  rows,
  i,
  value,
  owner,
}: {
  x: number;
  y: number;
  cols: number;
  rows: number;
  i: number;
  value: number | undefined;
  owner: number | null;
}) {
  return (
    <span
      className="absolute grid place-items-center p-[3%] will-change-transform"
      style={{
        width: `${String(100 / cols)}%`,
        height: `${String(100 / rows)}%`,
        left: 0,
        top: 0,
        transform: `translate(${String(x * 100)}%, ${String(y * 100)}%)`,
      }}
    >
      <span className="relative block aspect-square h-full">
        <Present i={i} className={cx("h-full", value !== undefined && "opacity-40")} />
        {value !== undefined && (
          <span className="absolute inset-[18%] grid place-items-center rounded-gm bg-gm-tile-present font-gm-display text-[clamp(1.4rem,5vh,3.6rem)] font-bold text-gm-tile-present-ink shadow-md">
            {value}
          </span>
        )}
        {owner !== null && (
          <span
            className="absolute top-[4%] right-[4%] size-[22%] rounded-[3px] ring-2 ring-gm-tile-present"
            style={{ background: team(owner) }}
          />
        )}
      </span>
    </span>
  );
}

function ShuffleTv({ view, game, serverNow, revealed }: LiveTvProps) {
  const g = game as ShuffleView | null;
  const now = useServerTime(serverNow, !revealed);
  if (!g) return null;
  if (now < g.startsAt && !revealed)
    return <GetReady startsAt={g.startsAt} now={now} line="Watch the big ones!" />;
  return (
    <div className="grid grid-cols-[auto_1fr] items-center gap-[3vw]">
      <PresentBoard g={g} view={view} now={now} />
      <div className="grid content-center gap-[2.4vh]">
        {revealed ? (
          <Reveal
            view={view}
            answer={(t) => (g.picks[t] ? String(g.picks[t].value) : null)}
            note={(t) => (g.picks[t] === null ? "Too slow" : null)}
          />
        ) : now < g.showEndsAt ? (
          <p className="m-0 font-gm-display text-[clamp(2rem,6vh,4.5rem)] font-bold">
            Remember where they are…
          </p>
        ) : now < g.shuffleEndsAt ? (
          <p className="m-0 font-gm-display text-[clamp(2rem,6vh,4.5rem)] font-bold">
            Follow them!
          </p>
        ) : (
          <TurnBanner
            view={view}
            team={g.turn}
            endsAt={g.turnEndsAt}
            total={g.pickMs}
            now={now}
            doing="picks"
          />
        )}
        {!revealed && (
          <Order
            view={view}
            order={g.order}
            current={g.turn}
            note={(id) =>
              g.picks[id]
                ? `+${String(g.picks[id].value)}`
                : g.picks[id] === null
                  ? "too slow"
                  : null
            }
          />
        )}
      </div>
    </div>
  );
}

function ShuffleController({ view, game, serverNow, revealed, send, busy }: LiveControllerProps) {
  const g = game as ShuffleView | null;
  const now = useServerTime(serverNow, !revealed);
  if (!g) return null;
  if (revealed) return <PhoneResult view={view} />;
  const me = view.you?.teamId ?? "";
  if (now < g.shuffleEndsAt)
    return <PhoneNote title="Watch the TV!">Follow the big presents as they shuffle.</PhoneNote>;
  if (me in g.picks)
    return (
      <PhoneNote title={g.picks[me] ? `You got ${String(g.picks[me].value)}` : "Too slow"}>
        Watch the others pick.
      </PhoneNote>
    );
  if (!g.myTurn)
    return <PhoneNote title={`${nameOf(view, g.turn)} is picking`}>Your turn is coming.</PhoneNote>;
  const cols = gridCols(g.count);
  const gone = new Map(
    Object.values(g.picks).flatMap((p) => (p ? [[p.slot, p.value] as const] : [])),
  );
  return (
    <section aria-label="Your pick" className="grid gap-3">
      <p className="m-0 text-center text-xl font-bold">Your pick! Tap the present you followed.</p>
      <TimeLeft closesAt={g.turnEndsAt} now={now} total={g.pickMs} />
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${String(cols)}, 1fr)` }}>
        {Array.from({ length: g.count }, (_, slot) => {
          const value = gone.get(slot);
          return (
            <button
              key={slot}
              type="button"
              disabled={busy || value !== undefined}
              aria-label={
                value !== undefined ? `Taken: ${String(value)}` : `Present ${String(slot + 1)}`
              }
              onClick={() => void send({ slot })}
              className="relative aspect-square disabled:opacity-40"
            >
              <Present i={slot} className="h-full w-full" />
              {value !== undefined && (
                <span className="absolute inset-[20%] grid place-items-center rounded-gm bg-gm-tile-present font-gm-display text-2xl font-bold text-gm-tile-present-ink">
                  {value}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function ShuffleDemo({ still }: { still: boolean }) {
  return (
    <div className="flex h-full w-full items-center justify-center gap-[6%] text-[clamp(1.6rem,8vh,4rem)]">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={cx(
            "relative w-[1.6em]",
            i === 1 &&
              !still &&
              "motion-safe:animate-[gm-demo-fall_5s_var(--gm-ease-out)_infinite]",
          )}
        >
          <Present i={i} />
          {i === 1 && (
            <span className="absolute inset-[22%] grid place-items-center rounded-[4px] bg-gm-tile-present font-gm-display text-[0.5em] font-bold text-gm-tile-present-ink">
              100
            </span>
          )}
        </span>
      ))}
    </div>
  );
}

export const shuffleRenderer: LiveRenderer = {
  Tv: ShuffleTv,
  Controller: ShuffleController,
  Demo: ShuffleDemo,
};

// ---- Land Mass

/** The shared board: each team's squares in its color. */
function LandBoard({
  g,
  view,
  ghost,
  ghostFits,
  onTap,
  size,
}: {
  g: LandView;
  view: ActiveLiveView;
  ghost?: Set<number>;
  ghostFits?: boolean;
  onTap?: (row: number, col: number) => void;
  size: "tv" | "phone";
}) {
  return (
    <div
      role={onTap ? "group" : "img"}
      aria-label={onTap ? "The board: tap where the piece goes" : "The board"}
      className={cx(
        "mx-auto grid gap-px rounded-[4px] bg-gm-border p-px",
        size === "tv" ? "h-[62vh]" : "w-full",
      )}
      style={{
        gridTemplateColumns: `repeat(${String(g.cols)}, 1fr)`,
        aspectRatio: `${String(g.cols)} / ${String(g.rows)}`,
      }}
    >
      {g.board.map((owner, i) => {
        const inGhost = ghost?.has(i) ?? false;
        const style = owner ? { background: team(colorOf(view, owner)) } : undefined;
        const look = cx(
          "block",
          !owner && "bg-gm-bg",
          inGhost && (ghostFits ? "bg-gm-tile-correct" : "bg-gm-accent"),
        );
        return onTap ? (
          <button
            key={i}
            type="button"
            aria-label={`Row ${String(Math.floor(i / g.cols) + 1)}, column ${String((i % g.cols) + 1)}`}
            onClick={() => {
              onTap(Math.floor(i / g.cols), i % g.cols);
            }}
            className={look}
            style={inGhost ? undefined : style}
          />
        ) : (
          <span key={i} aria-hidden="true" className={look} style={style} />
        );
      })}
    </div>
  );
}

/** A piece drawn as its squares. */
function PieceShape({
  cells,
  className,
  fill = "var(--gm-tile-present)",
}: {
  cells: Cell[];
  className?: string;
  fill?: string;
}) {
  const rows = Math.max(...cells.map((c) => c[0])) + 1;
  const cols = Math.max(...cells.map((c) => c[1])) + 1;
  return (
    <span
      aria-hidden="true"
      className={cx("inline-grid gap-[2px]", className)}
      style={{
        gridTemplateColumns: `repeat(${String(cols)}, 1fr)`,
        aspectRatio: `${String(cols)} / ${String(rows)}`,
      }}
    >
      {Array.from({ length: rows * cols }, (_, i) => {
        const on = cells.some(([r, c]) => r === Math.floor(i / cols) && c === i % cols);
        return (
          <span key={i} className="rounded-[2px]" style={on ? { background: fill } : undefined} />
        );
      })}
    </span>
  );
}

function LandTv({ view, game, serverNow, revealed }: LiveTvProps) {
  const g = game as LandView | null;
  const now = useServerTime(serverNow, !revealed);
  if (!g) return null;
  if (now < g.startsAt && !revealed)
    return <GetReady startsAt={g.startsAt} now={now} line="Claim the most land!" />;
  return (
    <div className="grid grid-cols-[auto_1fr] items-center gap-[3vw]">
      <LandBoard g={g} view={view} size="tv" />
      <div className="grid content-center gap-[2.4vh]">
        {revealed ? (
          <Reveal view={view} answer={(t) => String(g.squares[t] ?? 0)} note={() => "squares"} />
        ) : g.ended ? (
          <p className="m-0 font-gm-display text-[clamp(2rem,6vh,4.5rem)] font-bold">
            Nothing fits: the board is done!
          </p>
        ) : (
          <>
            <TurnBanner
              view={view}
              team={g.turn}
              endsAt={g.turnEndsAt}
              total={g.turnMs}
              now={now}
              doing="is up"
            />
            <div aria-label="The tray" className="flex items-end justify-center gap-[2vw]">
              {g.tray.map((p, i) => (
                <PieceShape key={i} cells={p} className="h-[9vh]" />
              ))}
            </div>
          </>
        )}
        {!revealed && (
          <ul aria-label="Squares held" className="m-0 grid list-none grid-cols-2 gap-[1vh] p-0">
            {view.teams.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-2 rounded-gm bg-gm-surface px-3 py-[0.8vh] text-[clamp(1rem,2.4vh,1.8rem)] font-bold ring-1 ring-gm-border"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Swatch color={t.color} />
                  <span className="truncate">{t.name}</span>
                </span>
                <span className="font-gm-display tabular-nums">{g.squares[t.id] ?? 0}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function LandController({ view, game, serverNow, revealed, send, busy }: LiveControllerProps) {
  const g = game as LandView | null;
  const now = useServerTime(serverNow, !revealed);
  const [piece, setPiece] = useState(0);
  const [turns, setTurns] = useState(0);
  const [at, setAt] = useState<[number, number] | null>(null);
  if (!g) return null;
  if (revealed || g.ended) return <PhoneResult view={view} />;
  if (!g.myTurn)
    return (
      <PhoneNote title={now < g.startsAt ? "Get ready…" : `${nameOf(view, g.turn)} is up`}>
        Hand the phone to whoever goes next for your team.
      </PhoneNote>
    );
  const cells = g.tray[piece] ?? g.tray[0] ?? [];
  const shape = rotate(cells, turns);
  const squares = at ? shape.map(([r, c]) => [at[0] + r, at[1] + c] as const) : [];
  const inside = squares.every(([r, c]) => r >= 0 && c >= 0 && r < g.rows && c < g.cols);
  const ghost = new Set(
    squares.filter(([r, c]) => r < g.rows && c < g.cols).map(([r, c]) => r * g.cols + c),
  );
  const fits = at !== null && inside && [...ghost].every((i) => g.board[i] === null);
  const myColor = team(colorOf(view, view.you?.teamId ?? null));
  return (
    <section aria-label="Your turn" className="grid gap-3">
      <p className="m-0 text-center text-xl font-bold">
        Your turn! Pick a piece, then tap where it goes.
      </p>
      <TimeLeft closesAt={g.turnEndsAt} now={now} total={g.turnMs} />
      <div role="group" aria-label="The tray" className="flex items-end justify-center gap-3">
        {g.tray.map((p, i) => (
          <button
            key={i}
            type="button"
            aria-pressed={i === piece}
            aria-label={`Piece ${String(i + 1)}, ${String(p.length)} squares`}
            onClick={() => {
              setPiece(i);
              setTurns(0);
            }}
            className={cx(
              "grid min-h-14 min-w-14 place-items-center rounded-gm p-2 ring-2",
              i === piece
                ? "bg-gm-surface-raised ring-gm-tile-correct"
                : "bg-gm-surface ring-gm-border",
            )}
          >
            <PieceShape
              cells={p}
              className="h-10"
              fill={i === piece ? myColor : "var(--gm-tile-present)"}
            />
          </button>
        ))}
      </div>
      <LandBoard
        g={g}
        view={view}
        size="phone"
        ghost={ghost}
        ghostFits={fits}
        onTap={(r, c) => {
          setAt([r, c]);
        }}
      />
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => {
            setTurns((t) => (t + 1) % 4);
          }}
          className="min-h-14 rounded-gm border-2 border-gm-accent-ink bg-gm-surface font-gm-display text-xl font-bold text-gm-accent-ink"
        >
          Turn it
        </button>
        <button
          type="button"
          disabled={busy || !fits || !at}
          onClick={() => {
            if (at) void send({ piece, turns, row: at[0], col: at[1] });
            setAt(null);
            setTurns(0);
          }}
          className="min-h-14 rounded-gm bg-gm-accent font-gm-display text-xl font-bold text-gm-text-on-accent disabled:opacity-40"
        >
          Place it
        </button>
      </div>
      {at && !fits && (
        <p className="m-0 text-center font-bold text-gm-danger">It doesn&apos;t fit there.</p>
      )}
    </section>
  );
}

function LandDemo({ still }: { still: boolean }) {
  return (
    <div className="grid h-full w-full place-items-center">
      <div
        className="grid h-[70%] grid-cols-6 gap-px bg-gm-border p-px"
        style={{ aspectRatio: "6 / 4" }}
      >
        {Array.from({ length: 24 }, (_, i) => {
          const owner = [0, 1, 6].includes(i)
            ? 1
            : [16, 17, 22, 23].includes(i)
              ? 2
              : [9, 10, 11].includes(i) && !still
                ? 3
                : 0;
          return (
            <span
              key={i}
              className={cx(
                "block",
                owner === 0 && "bg-gm-bg",
                owner === 3 && "motion-safe:animate-[gm-demo-answer_5s_linear_infinite]",
              )}
              style={owner ? { background: team(owner) } : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}

export const landmassRenderer: LiveRenderer = {
  Tv: LandTv,
  Controller: LandController,
  Demo: LandDemo,
};
