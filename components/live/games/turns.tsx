"use client";

import { CrossIcon } from "@/components/icons/game";
import { Present } from "./flyby";
import type { PathView, ShuffleView, Square, To21View } from "@/lib/live";
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
  onTap,
  size,
}: {
  g: PathView;
  onTap?: (square: Square) => void;
  size: "tv" | "small" | "phone";
}) {
  return (
    <div
      role={onTap ? "group" : "img"}
      aria-label={onTap ? "The path grid" : `The path: ${String(g.lit.length)} squares lit`}
      className={cx(
        "mx-auto grid gap-[3px]",
        size === "tv" ? "h-[72vh]" : size === "small" ? "h-[22vh]" : "w-full",
      )}
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
              ? "bg-gm-tile-present text-gm-tile-present-ink"
              : shown || lit
                ? "bg-gm-tile-correct text-gm-tile-correct-ink"
                : "bg-gm-tile-absent",
            miss && "bg-gm-accent text-gm-text-on-accent",
          );
          // Right so far: white with a check, never a team color that could pass for the gold path.
          const style = undefined;

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
    <div
      className={cx(
        "grid items-center gap-[3vh_3vw]",
        revealed ? "grid-cols-1" : "grid-cols-[auto_1fr]",
      )}
    >
      <PathGrid g={g} size={revealed ? "small" : "tv"} />
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
              {g.progress.length} of {g.length} squares · 5 seconds a step
            </p>
            {g.lit.length > 0 && (
              <p className="m-0 text-center text-[clamp(1rem,2.6vh,2rem)] text-gm-text-muted">
                Gold: squares an earlier team got right. White: right so far.
              </p>
            )}
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
      <p className="m-0 text-center text-gm-text-muted">
        Tap the next square within 5 seconds.
        {g.lit.length > 0 ? " Gold squares are what an earlier team got right." : ""}
      </p>
      <TimeLeft closesAt={g.stepEndsAt} now={now} total={g.stepMs} />
      <div className={cx(busy && "pointer-events-none opacity-80")}>
        <PathGrid g={g} size="phone" onTap={(square) => void send({ square })} />
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
function PresentBoard({
  g,
  view,
  now,
  small = false,
}: {
  g: ShuffleView;
  view: ActiveLiveView;
  now: number;
  small?: boolean;
}) {
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
      className={cx("relative mx-auto", small ? "h-[22vh]" : "h-[58vh]")}
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
    return <GetReady startsAt={g.startsAt} now={now} line="Find the 100-point present!" />;
  return (
    <div
      className={cx(
        "grid items-center gap-[3vh_3vw]",
        revealed ? "grid-cols-1" : "grid-cols-[auto_1fr]",
      )}
    >
      <PresentBoard g={g} view={view} now={now} small={revealed} />
      <div className="grid content-center gap-[2.4vh]">
        {revealed ? (
          <Reveal view={view} note={(t) => (g.picks[t] === null ? "Too slow" : null)} />
        ) : now < g.showEndsAt ? (
          <p className="m-0 font-gm-display text-[clamp(2rem,6vh,4.5rem)] font-bold">
            Find the 100-point present…
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
              className="relative aspect-square"
            >
              <Present
                i={slot}
                className={cx("h-full w-full", value !== undefined && "opacity-30")}
              />
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
