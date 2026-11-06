"use client";

import Link from "next/link";
import { useEffect } from "react";
import { GamePlayer } from "@/components/games/game-player";
import { useOptionalDevice } from "@/components/players/device";
import { PlayerHub } from "@/components/players/hub";
import { TotalScore } from "@/components/players/total-score";
import { useSlots } from "@/components/slots/registry";
import { gameOpen, type EventStatus, type FinalStandings, type PublicEvent } from "@/lib/events";
import type { HubPlays, Instructions } from "@/lib/games";

type Game = PublicEvent["games"][number];

/** The event's banner, with the active player's total where the Live badge was (S08-AC15). */
function EventBanner({ event }: { event: PublicEvent }) {
  const { Banner } = useSlots();
  return <Banner title={event.name} aside={<TotalScore />} />;
}

const Body = ({ children }: { children: React.ReactNode }) => (
  <div className="mx-auto grid w-full max-w-xl gap-5 px-4 py-5">{children}</div>
);

const listed = (event: PublicEvent) => event.games.filter((g) => g.visibility === "listed");

/** Play, Continue, Done · +N, or Best N · Again for replayable games (S08-AC7, AC12). */
function playLabel(replayable: boolean, play: HubPlays[string] | undefined): string {
  if (!play) return "Play →";
  if (play.status === "playing") return "Continue →";
  return replayable ? `Best ${String(play.best)} · Again →` : `Done · +${String(play.best)}`;
}

function GameList({ event, status }: { event: PublicEvent; status: EventStatus }) {
  const device = useOptionalDevice();
  const plays = device?.plays ?? {};
  // The device's state outlives page changes; refresh progress whenever the list shows.
  const refresh = device?.refreshPlays;
  useEffect(() => {
    void refresh?.();
  }, [refresh]);
  return (
    <section aria-labelledby="games-heading" className="grid gap-2">
      <h2
        id="games-heading"
        className="m-0 font-gm-display text-sm font-medium tracking-[0.12em] text-gm-text-muted uppercase"
      >
        Tonight&apos;s games
      </h2>
      <ul aria-label="Tonight's games" className="m-0 grid list-none p-0">
        {listed(event).map((g) => (
          <li key={g.id} className="border-t border-gm-border">
            {gameOpen(status, g) ? (
              <Link
                href={`/${event.slug}/play/${g.id}`}
                className="flex min-h-13 items-center justify-between gap-3 py-2 font-bold text-gm-text no-underline"
              >
                {g.title}
                <span className="text-gm-accent">{playLabel(event.replayable, plays[g.id])}</span>
              </Link>
            ) : (
              <div className="flex min-h-13 items-center justify-between gap-3 py-2 font-bold">
                {g.title}
                <span className="text-sm text-gm-text-muted">Locked</span>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The player hub, when the page has this phone's players (spec 02). */
function Hub({ event }: { event: PublicEvent }) {
  if (!useOptionalDevice()) return null;
  return (
    <div id="players" className="scroll-mt-4">
      <PlayerHub maxPlayers={event.maxPlayersPerDevice} />
    </div>
  );
}

/** Before the host starts the party (S01-AC5), with the player hub (spec 02). */
export function UpcomingView({ event }: { event: PublicEvent }) {
  return (
    <>
      <EventBanner event={event} />
      <Body>
        <Hub event={event} />
        <p className="m-0 text-lg">
          {listed(event).some((g) => g.alwaysOpen)
            ? "Some games are open now. The rest open when the host starts them."
            : "Waiting for the host to start the games."}
        </p>
        <GameList event={event} status="upcoming" />
      </Body>
    </>
  );
}

/** While the party is on: the hub, filled in by specs 02, 03 and 08. */
export function LiveView({ event }: { event: PublicEvent }) {
  return (
    <>
      <EventBanner event={event} />
      <Body>
        <Hub event={event} />
        <GameList event={event} status="live" />
      </Body>
    </>
  );
}

function Standings({ title, rows }: { title: string; rows: FinalStandings["teams"] }) {
  const { LeaderboardRow } = useSlots();
  if (rows.length === 0) return null;
  return (
    <section aria-label={title} className="grid gap-2">
      <h3 className="m-0 font-gm-display text-sm font-medium tracking-[0.12em] text-gm-text-muted uppercase">
        {title}
      </h3>
      <ul className="m-0 list-none p-0">
        {rows.map((r, i) => (
          <LeaderboardRow
            key={r.id}
            rank={i + 1}
            name={r.name}
            score={r.points}
            highlight={i === 0}
            {...(r.team !== undefined ? { team: r.team } : {})}
          />
        ))}
      </ul>
    </section>
  );
}

const TOP_PLAYERS = 10;

/** After the host ends the party: thanks and final standings (S01-AC6). */
export function EndedView({
  event,
  standings,
}: {
  event: PublicEvent;
  standings: FinalStandings | null;
}) {
  const empty = !standings || (standings.teams.length === 0 && standings.players.length === 0);
  return (
    <>
      <EventBanner event={event} />
      <Body>
        <h2 className="m-0 font-gm-display text-3xl font-bold">Thanks for playing</h2>
        {empty ? (
          <p className="m-0 text-gm-text-muted">No scores were recorded for this event.</p>
        ) : (
          <>
            <Standings title="Teams" rows={standings.teams} />
            <Standings title="Players" rows={standings.players.slice(0, TOP_PLAYERS)} />
          </>
        )}
      </Body>
    </>
  );
}

const GAME_STATE: Record<EventStatus, string> = {
  upcoming: "This game opens when the host starts the party.",
  live: "Get ready to play.",
  ended: "This game has closed.",
};

/** A game's page. Its body arrives with spec 08; until then it shows the game's state. */
export function GameView({
  event,
  game,
  status,
  play,
}: {
  event: PublicEvent;
  game: Game;
  status: EventStatus;
  /** Set for a playable solo game (spec 08). */
  play?: { instructions: Instructions };
}) {
  return (
    <>
      <EventBanner event={event} />
      <Body>
        <h2 className="m-0 font-gm-display text-3xl font-bold">{game.title}</h2>
        {gameOpen(status, game) && play ? (
          <GamePlayer
            gameId={game.id}
            type={game.type}
            instructions={play.instructions}
            replayable={event.replayable}
          />
        ) : (
          <p className="m-0 text-gm-text-muted">{GAME_STATE[status]}</p>
        )}
        {event.kind === "event" && !(gameOpen(status, game) && play) && (
          <Link href={`/${event.slug}`} className="font-bold text-gm-accent">
            All games
          </Link>
        )}
      </Body>
    </>
  );
}

/** A quick event's page is its one game (S01-AC7). */
export function QuickEventView({ event, status }: { event: PublicEvent; status: EventStatus }) {
  const game = event.games[0];
  return game ? (
    <GameView event={event} game={game} status={status} />
  ) : (
    <EventNotFound what="game" />
  );
}

/** Friendly not-found for an unknown event or game (S01-AC3). */
export function EventNotFound({ what }: { what: "event" | "game" }) {
  return (
    <Body>
      <h2 className="m-0 font-gm-display text-3xl font-bold">{`We couldn't find that ${what}`}</h2>
      <p className="m-0 text-gm-text-muted">
        Check the link or the code, or start again from the home page.
      </p>
      <Link href="/" className="font-bold text-gm-accent">
        Go to the home page
      </Link>
    </Body>
  );
}
