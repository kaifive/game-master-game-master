"use client";

import { exact, fmtSeconds, type BlindView, type LastView } from "@/lib/live";
import { cx } from "@/lib/ui";
import type { LiveControllerProps, LiveRenderer, LiveTvProps } from "../types";
import { GetReady, PhoneNote, PhoneResult, Reveal, StopButton, useServerTime } from "./shared";

/**
 * Blind Stop and Last Second (spec 25): a big clock on the TV, one huge Stop
 * button on each captain's phone, timed by the phone from the shared start.
 */

/** The clock face: big Oswald numerals on a white card, read from across the room. */
function ClockCard({ children, urgent = false }: { children: React.ReactNode; urgent?: boolean }) {
  return (
    <div
      aria-live="off"
      className={cx(
        "mx-auto grid min-w-[40vw] place-items-center rounded-gm px-[4vw] py-[3vh] font-gm-display text-[clamp(6rem,30vh,20rem)] leading-none font-bold tabular-nums shadow-xl ring-1 ring-gm-border",
        urgent
          ? "bg-gm-accent text-gm-text-on-accent"
          : "bg-gm-tile-present text-gm-tile-present-ink",
      )}
    >
      {children}
    </div>
  );
}

const Target = ({ ms }: { ms: number }) => (
  <p className="m-0 flex items-baseline justify-center gap-3 font-gm-display text-[clamp(1.4rem,4vh,3rem)] font-bold">
    <span className="text-gm-text-muted">Stop at</span>
    <span className="text-gm-tile-correct tabular-nums">{fmtSeconds(ms)}</span>
  </p>
);

// ---- Blind Stop

function BlindTv({ view, game, serverNow, revealed }: LiveTvProps) {
  const g = game as BlindView | null;
  const now = useServerTime(serverNow, !revealed);
  if (!g) return null;
  if (revealed)
    return (
      <div className="grid gap-[3vh]">
        <Target ms={g.targetMs} />
        <Reveal
          view={view}
          answer={(t) => (g.stops?.[t] === undefined ? null : fmtSeconds(g.stops[t]))}
          note={(t) => {
            const ms = g.stops?.[t];
            if (ms === undefined) return null;
            if (exact(ms, g.targetMs)) return "Exactly!";
            const off = ms - g.targetMs;
            return `${fmtSeconds(Math.abs(off))} ${off > 0 ? "late" : "early"}`;
          }}
        />
      </div>
    );
  if (now < g.startsAt)
    return (
      <GetReady
        startsAt={g.startsAt}
        now={now}
        line={`Stop the clock at ${fmtSeconds(g.targetMs)}!`}
      />
    );
  const elapsed = now - g.startsAt;
  return (
    <div className="grid gap-[3vh] py-[4vh]">
      <Target ms={g.targetMs} />
      {elapsed < g.showMs ? (
        <ClockCard>{fmtSeconds(elapsed)}</ClockCard>
      ) : elapsed < g.limitMs ? (
        <ClockCard>?</ClockCard>
      ) : (
        <p className="m-0 text-center font-gm-display text-[clamp(2rem,7vh,5rem)] font-bold">
          Clock stopped
        </p>
      )}
    </div>
  );
}

function BlindController({ view, game, serverNow, revealed, send }: LiveControllerProps) {
  const g = game as BlindView | null;
  const now = useServerTime(serverNow, !revealed);
  if (!g) return null;
  if (revealed) return <PhoneResult view={view} />;
  if (g.stopped)
    return <PhoneNote title="Stopped!">Watch the TV for everyone&apos;s times.</PhoneNote>;
  if (now - g.startsAt > g.limitMs)
    return <PhoneNote title="Too late">The clock ran out.</PhoneNote>;
  // No clock here: the phone is blind too, so count in your head.
  return (
    <div className="grid gap-6 py-2">
      <p className="m-0 text-center font-gm-display text-2xl font-bold">
        Tap Stop at exactly {fmtSeconds(g.targetMs)}
      </p>
      {now < g.startsAt ? (
        <PhoneNote title="Get ready…">Watch the TV for the start.</PhoneNote>
      ) : (
        <StopButton startsAt={g.startsAt} serverNow={serverNow} send={send} />
      )}
    </div>
  );
}

/** The clock runs, turns into a "?", and a tap stops it at 10.00 (S24-AC4). */
function BlindDemo({ still }: { still: boolean }) {
  return (
    <div className="grid h-full w-full place-items-center text-[clamp(2rem,10vh,6rem)]">
      <div className="grid place-items-center rounded-gm bg-gm-tile-present px-[0.5em] font-gm-display leading-tight font-bold text-gm-tile-present-ink tabular-nums shadow-md">
        <span className="col-start-1 row-start-1">
          <span className={cx(!still && "motion-safe:animate-[gm-demo-show_5s_linear_infinite]")}>
            {still ? "10.00" : "2.71"}
          </span>
        </span>
        {!still && (
          <span className="col-start-1 row-start-1 opacity-0 motion-safe:animate-[gm-demo-hide_5s_linear_infinite]">
            ?
          </span>
        )}
      </div>
    </div>
  );
}

export const blindstopRenderer: LiveRenderer = {
  Tv: BlindTv,
  Controller: BlindController,
  Demo: BlindDemo,
};

// ---- Last Second

/** The last 3 seconds turn the card cranberry, with a pulse each second. */
const URGENT_MS = 3000;

function LastTv({ view, game, serverNow, revealed }: LiveTvProps) {
  const g = game as LastView | null;
  const now = useServerTime(serverNow, !revealed);
  if (!g) return null;
  if (revealed)
    return (
      <div className="grid gap-[3vh]">
        <p className="m-0 text-center font-gm-display text-[clamp(2rem,6vh,4.5rem)] font-bold">
          Closest to zero scores most
        </p>
        <Reveal
          view={view}
          answer={(t) =>
            g.stops?.[t] === undefined
              ? "Too late"
              : `${fmtSeconds(g.countdownMs - g.stops[t])} left`
          }
          note={(t) => (g.stops?.[t] === undefined ? "Hit zero before stopping" : null)}
        />
      </div>
    );
  if (now < g.startsAt)
    return <GetReady startsAt={g.startsAt} now={now} line="Stop it as late as you dare!" />;
  const left = Math.max(0, g.countdownMs - (now - g.startsAt));
  const urgent = left > 0 && left <= URGENT_MS;
  return (
    <div className="grid gap-[3vh] py-[4vh]">
      <div
        key={urgent ? Math.ceil(left / 1000) : "calm"}
        className={cx(
          urgent && "motion-safe:animate-[gm-pop_var(--gm-motion-base)_var(--gm-ease-out)]",
        )}
      >
        <ClockCard urgent={urgent}>{left > 0 ? fmtSeconds(left) : "0.00"}</ClockCard>
      </div>
      {left === 0 && (
        <p className="m-0 text-center font-gm-display text-[clamp(2rem,7vh,5rem)] font-bold">
          Time!
        </p>
      )}
    </div>
  );
}

function LastController({ view, game, serverNow, revealed, send }: LiveControllerProps) {
  const g = game as LastView | null;
  const now = useServerTime(serverNow, !revealed);
  if (!g) return null;
  if (revealed) return <PhoneResult view={view} />;
  if (g.mine !== null)
    return (
      <PhoneNote title={`Stopped with ${fmtSeconds(g.countdownMs - g.mine)} left`}>
        Watch the TV to see who dared the longest.
      </PhoneNote>
    );
  const left = Math.max(0, g.countdownMs - (now - g.startsAt));
  if (now >= g.startsAt && left === 0)
    return <PhoneNote title="Too late!">The countdown hit zero first.</PhoneNote>;
  return (
    <div className="grid gap-6 py-2">
      <p className="m-0 text-center font-gm-display text-5xl font-bold tabular-nums">
        {now < g.startsAt ? fmtSeconds(g.countdownMs) : fmtSeconds(left)}
      </p>
      {now < g.startsAt ? (
        <PhoneNote title="Get ready…">
          Stop as close to zero as you dare. Hit zero and you get nothing. Your tap counts, timed on
          this phone.
        </PhoneNote>
      ) : (
        <StopButton startsAt={g.startsAt} serverNow={serverNow} send={send} showTime />
      )}
    </div>
  );
}

/** The countdown runs down and stops at 0.12 (S24-AC4). */
function LastDemo({ still }: { still: boolean }) {
  return (
    <div className="grid h-full w-full place-items-center text-[clamp(2rem,10vh,6rem)]">
      <div className="grid place-items-center rounded-gm bg-gm-accent px-[0.5em] font-gm-display leading-tight font-bold text-gm-text-on-accent tabular-nums shadow-md">
        <span
          className={cx(!still && "motion-safe:animate-[gm-pop_1s_var(--gm-ease-out)_infinite]")}
        >
          0.12
        </span>
      </div>
    </div>
  );
}

export const lastsecondRenderer: LiveRenderer = {
  Tv: LastTv,
  Controller: LastController,
  Demo: LastDemo,
};
