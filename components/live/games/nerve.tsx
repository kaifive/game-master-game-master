"use client";

import { useState } from "react";
import { useAutoSubmit } from "@/components/games/auto-submit";
import { useSlots } from "@/components/slots/registry";
import {
  auctionWinner,
  NUMBERS,
  type AuctionView,
  type Opened,
  type SnatchView,
  type StockingView,
} from "@/lib/live";
import { cx } from "@/lib/ui";
import type { ActiveLiveView, LiveControllerProps, LiveRenderer, LiveTvProps } from "../types";
import {
  GetReady,
  LockedIn,
  PhoneNote,
  PhoneResult,
  Reveal,
  Swatch,
  TimeLeft,
  useServerTime,
} from "./shared";

/** Auction, Stocking Stuffer and Share or Snatch (spec 26): nerve and reading the room. */

const teamName = (view: ActiveLiveView, id: string) =>
  view.teams.find((t) => t.id === id)?.name ?? id;
const teamColor = (view: ActiveLiveView, id: string) =>
  view.teams.find((t) => t.id === id)?.color ?? 1;

const bigButton =
  "min-h-20 w-full rounded-gm font-gm-display text-3xl font-bold motion-safe:active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50";

// ---- Auction

/** Each team's numbers, spent ones struck through: public, part of the strategy. */
function NumbersLeft({ view, left }: { view: ActiveLiveView; left: Record<string, number[]> }) {
  return (
    <ul aria-label="Numbers left" className="m-0 grid list-none gap-[0.9vh] p-0">
      {view.teams.map((t) => {
        const mine = left[t.id] ?? [];
        return (
          <li key={t.id} className="grid grid-cols-[minmax(0,14rem)_1fr] items-center gap-4">
            <span className="flex min-w-0 items-center gap-2 text-[clamp(1rem,2.4vh,1.8rem)] font-bold">
              <Swatch color={t.color} />
              <span className="truncate">{t.name}</span>
            </span>
            <span
              className="grid grid-cols-10 gap-[0.5vw]"
              aria-label={`${t.name} has ${mine.join(", ") || "nothing"} left`}
            >
              {NUMBERS.map((n) => {
                const has = mine.includes(n);
                return (
                  <span
                    key={n}
                    aria-hidden="true"
                    className={cx(
                      "grid h-[4.4vh] place-items-center rounded-[4px] font-gm-display text-[clamp(1rem,2.6vh,2rem)] font-bold tabular-nums",
                      has
                        ? "bg-gm-tile-present text-gm-tile-present-ink"
                        : "bg-gm-tile-absent text-gm-tile-absent-ink line-through opacity-40",
                    )}
                  >
                    {n}
                  </span>
                );
              })}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function AuctionTv({ view, game, serverNow, revealed }: LiveTvProps) {
  const g = game as AuctionView | null;
  const now = useServerTime(serverNow, !revealed);
  const { ScoreCard } = useSlots();
  if (!g) return null;
  if (revealed && g.bids) {
    const bids = g.bids;
    const counts = new Map<number, number>();
    for (const b of Object.values(bids)) counts.set(b, (counts.get(b) ?? 0) + 1);
    const winner = auctionWinner(bids);
    return (
      <div className="grid gap-[3vh]">
        <p className="m-0 text-center font-gm-display text-[clamp(2rem,6vh,4.5rem)] font-bold">
          {winner ? (
            <>
              {teamName(view, winner)} wins <span className="text-gm-tile-correct">{g.prize}</span>
            </>
          ) : (
            "Every bid tied: nobody wins"
          )}
        </p>
        <Reveal
          view={view}
          answer={(t) => (bids[t] === undefined ? null : String(bids[t]))}
          note={(t) => {
            const b = bids[t];
            if (b === undefined) return null;
            if (t === winner) return "Highest bid nobody tied";
            return (counts.get(b) ?? 0) > 1 ? "Tied: cancelled" : null;
          }}
        />
      </div>
    );
  }
  if (now < g.startsAt)
    return <GetReady startsAt={g.startsAt} now={now} line="Get ready to bid!" />;
  return (
    <div className="grid gap-[2.4vh]">
      <div className="flex items-center justify-center gap-[3vw]">
        <p className="m-0 font-gm-display text-[clamp(2rem,6vh,4.5rem)] font-bold">Up for grabs</p>
        <ScoreCard label="The prize" value={g.prize} state="highlight" size="lg" />
      </div>
      <TimeLeft closesAt={g.closesAt} now={now} total={g.closesAt - g.startsAt} />
      <LockedIn view={view} locked={g.lockedIn} />
      <NumbersLeft view={view} left={g.left} />
    </div>
  );
}

function AuctionController({ view, game, serverNow, revealed, send, busy }: LiveControllerProps) {
  const g = game as AuctionView | null;
  const now = useServerTime(serverNow, !revealed);
  const [picked, setPicked] = useState<{ round: number; n: number } | null>(null);
  // A pick belongs to its round: the next round starts with none (QA, 2026-11-25).
  const round = view.session.round;
  const pick = picked?.round === round ? picked.n : null;
  const setPick = (n: number) => {
    setPicked({ round, n });
  };
  // A number picked but not yet bid is sent as the time runs out (Khai, 2026-11-24).
  useAutoSubmit(
    g && !revealed && g.mine === null ? g.closesAt - now : undefined,
    pick !== null && !busy,
    () => {
      if (pick !== null) void send({ bid: pick });
    },
  );
  if (!g) return null;
  if (revealed) return <PhoneResult view={view} />;
  if (g.mine !== null)
    return <PhoneNote title={`You bid ${String(g.mine)}`}>Watch the TV for the bids.</PhoneNote>;
  if (now < g.startsAt)
    return <PhoneNote title="Get ready…">The prize is coming up on the TV.</PhoneNote>;
  if (now > g.closesAt)
    return <PhoneNote title="Time's up">Your lowest number was spent.</PhoneNote>;
  const left = g.left[view.you?.teamId ?? ""] ?? [];
  return (
    <section aria-label="Your bid" className="grid gap-4">
      <p className="m-0 text-center text-xl font-bold">
        Bid for <span className="font-gm-display text-3xl text-gm-tile-correct">{g.prize}</span>{" "}
        points
      </p>
      <TimeLeft closesAt={g.closesAt} now={now} total={g.closesAt - g.startsAt} />
      <div className="grid grid-cols-5 gap-2" role="group" aria-label="Your numbers">
        {NUMBERS.map((n) => {
          const has = left.includes(n);
          return (
            <button
              key={n}
              type="button"
              disabled={!has}
              aria-pressed={pick === n}
              aria-label={has ? String(n) : `${String(n)}, used`}
              onClick={() => {
                setPick(n);
              }}
              className={cx(
                "grid min-h-16 place-items-center rounded-gm font-gm-display text-3xl font-bold",
                !has && "bg-gm-tile-absent text-gm-tile-absent-ink line-through opacity-40",
                has && pick !== n && "bg-gm-tile-present text-gm-tile-present-ink shadow-md",
                pick === n &&
                  "bg-gm-tile-correct text-gm-tile-correct-ink shadow-md ring-4 ring-gm-tile-correct",
              )}
            >
              {n}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        disabled={busy || pick === null}
        onClick={() => {
          if (pick !== null) void send({ bid: pick });
        }}
        className={cx(bigButton, "min-h-14 bg-gm-accent text-gm-text-on-accent")}
      >
        {pick === null ? "Pick a number" : `Bid ${String(pick)}`}
      </button>
    </section>
  );
}

function AuctionDemo({ still }: { still: boolean }) {
  return (
    <div className="grid h-full w-full place-items-center gap-4 text-[clamp(1.4rem,6vh,3.4rem)]">
      <div className="flex gap-[0.4em] font-gm-display font-bold">
        {[7, 9, 7, 4].map((n, i) => (
          <span
            key={i}
            className={cx(
              "grid size-[1.8em] place-items-center rounded-gm bg-gm-tile-present text-gm-tile-present-ink shadow-md",
              n === 7 && !still && "motion-safe:animate-[gm-demo-hide_5s_linear_infinite]",
              n === 9 && "ring-4 ring-gm-tile-correct",
            )}
            style={n === 7 ? { opacity: still ? 0.35 : undefined } : undefined}
          >
            {n}
          </span>
        ))}
      </div>
    </div>
  );
}

export const auctionRenderer: LiveRenderer = {
  Tv: AuctionTv,
  Controller: AuctionController,
  Demo: AuctionDemo,
};

// ---- Stocking Stuffer

/** A stocking, drawn: a sock with a white cuff, holding its find. */
export function Stocking({ found, className }: { found: Opened | null; className?: string }) {
  const coal = found?.kind === "coal";
  return (
    <span className={cx("relative inline-grid place-items-center", className)}>
      <svg
        viewBox="0 0 80 100"
        aria-hidden="true"
        className="col-start-1 row-start-1 h-full w-full"
      >
        <path
          d="M18 18h40v42c0 4 1 6 4 9l8 8c7 7 2 20-8 19H36c-11 0-18-8-18-19z"
          fill={coal ? "var(--gm-tile-absent)" : "var(--gm-accent)"}
        />
        <rect x="14" y="6" width="48" height="16" rx="3" fill="var(--gm-tile-present)" />
      </svg>
      {found && found.kind !== "bank" && (
        <span
          className={cx(
            "relative col-start-1 row-start-1 mt-[30%] ml-[-10%] font-gm-display font-bold",
            coal ? "text-gm-tile-absent-ink" : "text-gm-text-on-accent",
          )}
        >
          {found.kind === "coal" ? "Coal" : `+${String(found.value)}`}
        </span>
      )}
    </span>
  );
}

function StockingTv({ view, game, serverNow, revealed }: LiveTvProps) {
  const g = game as StockingView | null;
  const now = useServerTime(serverNow, !revealed);
  if (!g) return null;
  if (revealed)
    return (
      <div className="grid gap-[3vh]">
        <p className="m-0 text-center font-gm-display text-[clamp(2rem,6vh,4.5rem)] font-bold">
          Banked this round
        </p>
        <Reveal
          view={view}
          answer={(t) =>
            g.status[t] === "coal" ? "Coal" : g.status[t] === "banked" ? "Banked" : null
          }
          note={(t) => {
            const opened = g.history.filter((h) => h[t]?.kind === "stocking").length;
            if (g.status[t] === "coal") return "Lost the lot";
            return `${String(opened)} stocking${opened === 1 ? "" : "s"} opened`;
          }}
        />
      </div>
    );
  if (g.opening === 1 && now < g.startsAt && g.revealUntil === null)
    return <GetReady startsAt={g.startsAt} now={now} line="Open or bank?" />;
  const last = g.revealUntil !== null ? g.history[g.history.length - 1] : undefined;
  return (
    <div className="grid gap-[2.4vh]">
      <p className="m-0 text-center font-gm-display text-[clamp(1.8rem,5vh,3.6rem)] font-bold">
        {last ? `Stocking ${String(g.opening)}` : `Stocking ${String(g.opening)}: open or bank?`}
      </p>
      {!last && <TimeLeft closesAt={g.closesAt} now={now} total={g.closesAt - g.startsAt} />}
      <ul
        aria-label="Teams"
        className="m-0 grid list-none gap-[1.6vh] p-0"
        style={{ gridTemplateColumns: `repeat(${String(view.teams.length)}, minmax(0, 1fr))` }}
      >
        {view.teams.map((t) => {
          const status = g.status[t.id] ?? "in";
          const got = last?.[t.id];
          return (
            <li
              key={t.id}
              className={cx(
                "grid justify-items-center gap-[1vh] rounded-gm px-3 py-[2vh] text-center ring-1",
                status === "in" ? "bg-gm-surface ring-gm-border" : "bg-gm-bg ring-gm-border",
              )}
            >
              <span className="flex max-w-full items-center gap-2 text-[clamp(1rem,2.4vh,1.8rem)] font-bold">
                <Swatch color={t.color} />
                <span className="truncate">{t.name}</span>
              </span>
              <Stocking
                found={got ?? null}
                className={cx(
                  "h-[22vh] text-[clamp(1.2rem,3.6vh,2.6rem)]",
                  got && "motion-safe:animate-[gm-pop_var(--gm-motion-base)_var(--gm-ease-out)]",
                )}
              />
              <span className="font-gm-display text-[clamp(1.8rem,5vh,3.6rem)] leading-none font-bold tabular-nums">
                {g.pots[t.id] ?? 0}
              </span>
              <span className="text-[clamp(0.9rem,2.2vh,1.6rem)] font-bold text-gm-text-muted">
                {status === "banked"
                  ? "Banked"
                  : status === "coal"
                    ? "Out: coal"
                    : got?.kind === "stocking"
                      ? "Still in"
                      : g.lockedIn.includes(t.id)
                        ? "Chosen"
                        : "Thinking"}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function StockingController({ view, game, serverNow, revealed, send, busy }: LiveControllerProps) {
  const g = game as StockingView | null;
  const now = useServerTime(serverNow, !revealed);
  if (!g) return null;
  if (revealed) return <PhoneResult view={view} />;
  const me = view.you?.teamId ?? "";
  const pot = g.pots[me] ?? 0;
  const status = g.status[me] ?? "in";
  if (status === "banked")
    return <PhoneNote title={`Banked ${String(pot)}`}>Watch the others push their luck.</PhoneNote>;
  if (status === "coal")
    return <PhoneNote title="Coal!">You lost this round&apos;s haul. Back next round.</PhoneNote>;
  if (g.revealUntil !== null || now < g.startsAt)
    return <PhoneNote title={`Your pot: ${String(pot)}`}>Watch the TV…</PhoneNote>;
  if (g.mine !== null)
    return (
      <PhoneNote title={g.mine === "open" ? "Opening!" : `Banking ${String(pot)}`}>
        Waiting for the other teams.
      </PhoneNote>
    );
  return (
    <section aria-label="Open or bank" className="grid gap-4">
      <p className="m-0 text-center text-xl font-bold">
        Your pot: <span className="font-gm-display text-4xl">{pot}</span>
      </p>
      <TimeLeft closesAt={g.closesAt} now={now} total={g.closesAt - g.startsAt} />
      <button
        type="button"
        disabled={busy}
        onClick={() => void send({ choice: "open" })}
        className={cx(bigButton, "bg-gm-accent text-gm-text-on-accent")}
      >
        Open a stocking
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => void send({ choice: "bank" })}
        className={cx(bigButton, "bg-gm-tile-correct text-gm-tile-correct-ink")}
      >
        Bank {pot}
      </button>
      <p className="m-0 text-center text-gm-text-muted">Coal empties your pot!</p>
    </section>
  );
}

function StockingDemo({ still }: { still: boolean }) {
  return (
    <div className="flex h-full w-full items-center justify-center gap-[4%] text-[clamp(1rem,4vh,2.4rem)]">
      <Stocking found={{ kind: "stocking", value: 12 }} className="h-[60%]" />
      <Stocking
        found={{ kind: "coal" }}
        className={cx(
          "h-[60%]",
          !still && "motion-safe:animate-[gm-demo-answer_5s_linear_infinite]",
        )}
      />
    </div>
  );
}

export const stockingsRenderer: LiveRenderer = {
  Tv: StockingTv,
  Controller: StockingController,
  Demo: StockingDemo,
};

// ---- Share or Snatch

/** One side of a matchup: the team, and its choice once both are shown. */
function SnatchSide({
  view,
  g,
  team,
  align,
}: {
  view: ActiveLiveView;
  g: SnatchView;
  team: string;
  align: "start" | "end";
}) {
  const choice = g.choices?.[team];
  // Game points this round: they only set the order (spec 26).
  const pts = g.gained?.[team] ?? 0;
  return (
    <span
      className={cx(
        "grid gap-[0.6vh]",
        align === "end" ? "justify-items-end text-right" : "justify-items-start",
      )}
    >
      <span className="flex items-center gap-2 text-[clamp(1.4rem,3.8vh,2.8rem)] font-bold">
        <Swatch color={teamColor(view, team)} />
        {teamName(view, team)}
      </span>
      <span
        className={cx(
          "font-gm-display text-[clamp(2rem,6vh,4.6rem)] leading-none font-bold",
          choice === "snatch" && "text-gm-accent-ink",
          choice === "share" && pts > 0 && "text-gm-tile-correct",
          choice === "share" && pts === 0 && "text-gm-text-muted",
          !choice && "text-gm-text-muted",
        )}
      >
        {choice
          ? `${choice === "share" ? "Share" : "Snatch"} · ${pts < 0 ? "−" : "+"}${String(Math.abs(pts))}`
          : g.lockedIn.includes(team)
            ? "Chosen"
            : "Thinking"}
      </span>
    </span>
  );
}

function SnatchTv({ view, game, serverNow, revealed }: LiveTvProps) {
  const g = game as SnatchView | null;
  const now = useServerTime(serverNow, !revealed);
  const { ScoreCard } = useSlots();
  if (!g) return null;
  if (now < g.startsAt && !revealed)
    return <GetReady startsAt={g.startsAt} now={now} line="Share or snatch?" />;
  return (
    <div className="grid gap-[2.4vh]">
      {!revealed && <TimeLeft closesAt={g.closesAt} now={now} total={g.closesAt - g.startsAt} />}
      {/* Three pairs (six teams) sit tighter, so the points below still fit the TV (layout sweep, 2026-11-25). */}
      <ul
        aria-label="Matchups"
        className={cx("m-0 grid list-none p-0", g.pairs.length > 2 ? "gap-[1.2vh]" : "gap-[2vh]")}
      >
        {g.pairs.map(([a, b]) => (
          <li
            key={`${a}-${b}`}
            className={cx(
              "grid grid-cols-[1fr_auto_1fr] items-center gap-[3vw] rounded-gm bg-gm-surface px-[2vw] ring-1 ring-gm-border",
              g.pairs.length > 2 ? "py-[1.2vh]" : "py-[2.6vh]",
            )}
          >
            <SnatchSide view={view} g={g} team={a} align="end" />
            <ScoreCard
              label="The pot"
              value={g.pot}
              state="highlight"
              size={g.pairs.length > 2 ? "md" : "lg"}
            />
            <SnatchSide view={view} g={g} team={b} align="start" />
          </li>
        ))}
      </ul>
      {g.sitOut && (
        <p className="m-0 text-center text-[clamp(1rem,2.6vh,2rem)] text-gm-text-muted">
          {teamName(view, g.sitOut)} sits this one out.
        </p>
      )}
      <GamePoints view={view} totals={g.totals ?? g.before} />
    </div>
  );
}

/** Each team's points so far in this game, best first (spec 26, ADR-045). */
function GamePoints({ view, totals }: { view: ActiveLiveView; totals: Record<string, number> }) {
  const ranked = [...view.teams].sort((a, b) => (totals[b.id] ?? 0) - (totals[a.id] ?? 0));
  return (
    <section aria-label="Game points" className="grid gap-[1vh]">
      <p className="m-0 text-center font-gm-display text-[clamp(1.2rem,3vh,2.2rem)] font-bold">
        Points so far
      </p>
      <ol className="m-0 flex list-none flex-wrap justify-center gap-[1vw] p-0">
        {ranked.map((t) => (
          <li
            key={t.id}
            className="flex items-center gap-2 rounded-gm bg-gm-surface px-3 py-[0.8vh] text-[clamp(1rem,2.6vh,1.9rem)] font-bold ring-1 ring-gm-border"
          >
            <Swatch color={t.color} />
            {t.name}
            <span className="font-gm-display tabular-nums">{totals[t.id] ?? 0}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function SnatchController({ view, game, serverNow, revealed, send, busy }: LiveControllerProps) {
  const g = game as SnatchView | null;
  const now = useServerTime(serverNow, !revealed);
  if (!g) return null;
  if (revealed) {
    const me = view.you?.teamId ?? "";
    const got = g.gained?.[me] ?? 0;
    return (
      <PhoneNote title={`+${String(Math.max(0, got))} points`}>
        Your team has {g.totals?.[me] ?? 0} points this game. Look at the TV!
      </PhoneNote>
    );
  }
  const me = view.you?.teamId ?? "";
  if (g.sitOut === me) return <PhoneNote title="You sit this one out">Watch the TV.</PhoneNote>;
  const pair = g.pairs.find((p) => p.includes(me));
  const other = pair ? (pair[0] === me ? pair[1] : pair[0]) : null;
  if (g.mine !== null)
    return (
      <PhoneNote title={g.mine === "share" ? "You chose Share" : "You chose Snatch"}>
        Both choices show on the TV at once.
      </PhoneNote>
    );
  if (now < g.startsAt)
    return <PhoneNote title="Get ready…">Your matchup comes up in a moment.</PhoneNote>;
  if (now > g.closesAt) return <PhoneNote title="Time's up">No choice counts as Share.</PhoneNote>;
  return (
    <section aria-label="Share or snatch" className="grid gap-4">
      <p className="m-0 text-center text-xl font-bold text-balance">
        You and {other ? teamName(view, other) : "your rival"}, a pot of{" "}
        <span className="font-gm-display text-3xl text-gm-tile-correct">{g.pot}</span>
      </p>
      <TimeLeft closesAt={g.closesAt} now={now} total={g.closesAt - g.startsAt} />
      <button
        type="button"
        disabled={busy}
        onClick={() => void send({ choice: "share" })}
        className={cx(bigButton, "bg-gm-tile-correct text-gm-tile-correct-ink")}
      >
        Share
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => void send({ choice: "snatch" })}
        className={cx(bigButton, "bg-gm-accent text-gm-text-on-accent")}
      >
        Snatch
      </button>
      <p className="m-0 text-center text-gm-text-muted">
        Share: {g.pot / 2} each. Snatch: all {g.pot}, unless they snatch too.
      </p>
    </section>
  );
}

function SnatchDemo({ still }: { still: boolean }) {
  return (
    <div className="flex h-full w-full items-center justify-center gap-[6%] font-gm-display text-[clamp(1.4rem,6vh,3.4rem)] font-bold">
      <span className="text-gm-tile-correct">Share</span>
      <span className="rounded-gm bg-gm-tile-correct px-[0.4em] text-gm-tile-correct-ink">100</span>
      <span
        className={cx(
          "text-gm-accent-ink",
          !still && "motion-safe:animate-[gm-demo-answer_5s_linear_infinite]",
        )}
      >
        Snatch
      </span>
    </div>
  );
}

export const snatchRenderer: LiveRenderer = {
  Tv: SnatchTv,
  Controller: SnatchController,
  Demo: SnatchDemo,
};
