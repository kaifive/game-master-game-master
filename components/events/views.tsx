"use client";

import Link from "next/link";
import { useEffect } from "react";
import { GamePlayer } from "@/components/games/game-player";
import { rendererFor } from "@/components/games/renderers";
import { PhoneLeaderboard } from "@/components/leaderboard/phone-leaderboard";
import { useOptionalDevice } from "@/components/players/device";
import { PlayerHub } from "@/components/players/hub";
import { ArrowIcon, BackIcon } from "@/components/icons/nav";
import { GuardedLink } from "@/components/players/leave-guard";
import { TeamNudge, TeamPanel } from "@/components/teams/team-panel";
import { PlayerStrip } from "@/components/players/player-strip";
import { TotalScore } from "@/components/players/total-score";
import { useSlots } from "@/components/slots/registry";
import { gameOpen, type EventStatus, type FinalStandings, type PublicEvent } from "@/lib/events";
import type { HubPlays, Instructions, Seat } from "@/lib/games";

type Game = PublicEvent["games"][number];

/** The event's banner, with the active player's total where the Live badge was (S08-AC15). */
/** The banner, with the active player's total; a game page names the game instead (S08-AC16). */
function EventBanner({
  event,
  title,
  back,
  total = true,
}: {
  event: PublicEvent;
  title?: string;
  /** A game page's way back to the games, before the title (S08-AC16). */
  back?: boolean;
  /** The games list shows the total large in its player strip instead. */
  total?: boolean;
}) {
  const { Banner } = useSlots();
  return (
    <Banner
      title={title ?? event.name}
      {...(total ? { aside: <TotalScore /> } : {})}
      {...(back
        ? {
            lead: (
              <GuardedLink
                href={`/${event.slug}`}
                label="Back to games"
                className="-my-2 -ml-2 grid size-11 shrink-0 place-items-center rounded-gm text-inherit"
              >
                <BackIcon />
              </GuardedLink>
            ),
          }
        : {})}
    />
  );
}

const Body = ({ children }: { children: React.ReactNode }) => (
  <main className="mx-auto grid w-full max-w-xl gap-5 px-4 py-5">{children}</main>
);

const listed = (event: PublicEvent) => event.games.filter((g) => g.visibility === "listed");

/** The action at the end of an open row (S08-AC7, AC12). */
function playLabel(play: HubPlays[string] | undefined): string {
  if (!play) return "Play";
  return play.status === "playing" ? "Continue" : "Again";
}

/** Why a team game can't be opened from this phone, or null when it can (S03-AC5). */
export function teamGameBlock(
  seat: Seat | null,
  play: HubPlays[string] | undefined,
): string | null {
  if (seat?.phase !== "team") return "Team phase";
  if (!seat.team) return "Join a team";
  if (seat.isCaptain) return null;
  if (play?.status === "finished") return `Team · +${String(play.best)}`;
  return "Captain plays";
}

type Group = "open" | "scored" | "later";
type Row = {
  game: Game;
  group: Group;
  href: string | null;
  note: string;
  best: number | null;
  /** Played, its score still to come from the host: the card reads "???" (Khai, 2026-11-13). */
  pending?: true;
};

/**
 * One row per listed game, in the event file's order: one list, no sections
 * (Khai, 2026-11-10). `group` still feeds the progress pips. A solo game with
 * no phone renderer yet isn't listed at all.
 */
export function hubRows(
  event: PublicEvent,
  status: EventStatus,
  plays: HubPlays,
  seat: Seat | null,
): Row[] {
  const ready = listed(event).filter((g) => g.mode !== "solo" || rendererFor(g.type));
  return ready.map((game) => {
    const play = plays[game.id];
    // A solo team game is the captain's to play (S03-AC5); live team games run from the host.
    const blocked =
      game.phase === "team" && game.mode === "solo" ? teamGameBlock(seat, play) : null;
    // A live game runs from the host and the TV, not from here.
    const wait = game.mode !== "solo" ? "On the TV when the host starts it" : null;
    const open = gameOpen(status, game) && !blocked && !wait;
    const href = open ? `/${event.slug}/play/${game.id}` : null;
    // Played, but the host scores it later (a jar, a photo): "???" until then.
    if (play?.waiting)
      return {
        game,
        group: "scored",
        href: open ? href : null,
        note: "Waiting for the host",
        best: null,
        pending: true,
      };
    if (play?.status === "finished") {
      const again = open && event.replayable && !play.once;
      return {
        game,
        group: "scored",
        href: again ? href : null,
        note: again ? "Again" : (blocked ?? "Done"),
        best: play.best,
      };
    }
    // A game that banks points as it goes shows them on its card while it's open.
    if (open)
      return {
        game,
        group: "open",
        href,
        note: playLabel(play),
        best: play?.best ? play.best : null,
      };
    return {
      game,
      group: "later",
      href: null,
      note: wait ?? (gameOpen(status, game) ? (blocked ?? "Locked") : "Locked"),
      best: null,
    };
  });
}

function GameRow({ row }: { row: Row }) {
  const { ScoreCard } = useSlots();
  const card =
    row.best === null ? (
      <ScoreCard label={row.game.title} state={row.pending ? "pending" : "blank"} size="sm" />
    ) : (
      <ScoreCard label={row.game.title} value={row.best} state="scored" size="sm" />
    );
  const body = (
    <>
      <span className="grid min-w-0 gap-0.5">
        <span className="truncate text-lg font-bold">{row.game.title}</span>
        {row.href ? (
          <span className="inline-flex items-center gap-1 font-bold text-gm-accent-ink">
            {row.note}
            <ArrowIcon />
          </span>
        ) : (
          <span className="text-sm font-bold text-gm-text-muted">{row.note}</span>
        )}
      </span>
      {card}
    </>
  );
  const look = "flex min-h-16 items-center justify-between gap-3 py-2";
  return (
    <li className="border-t border-gm-border first:border-t-0">
      {row.href ? (
        <Link href={row.href} className={`${look} text-gm-text no-underline`}>
          {body}
        </Link>
      ) : (
        <div className={look}>{body}</div>
      )}
    </li>
  );
}

function GameList({ event, status }: { event: PublicEvent; status: EventStatus }) {
  const { Progress } = useSlots();
  const device = useOptionalDevice();
  const plays = device?.plays ?? {};
  const seat = device?.seat ?? null;
  // The device's state outlives page changes; refresh progress whenever the list shows.
  const refresh = device?.refreshPlays;
  useEffect(() => {
    void refresh?.();
  }, [refresh]);
  const rows = hubRows(event, status, plays, seat);
  // The pips count what this phone can score.
  const scorable = rows.filter((r) => r.game.mode === "solo");
  return (
    <section aria-label="Tonight's games" className="grid gap-4">
      {device?.active && scorable.length > 0 && (
        <Progress
          done={scorable.filter((r) => r.group === "scored").length}
          total={scorable.length}
          label="Games scored"
        />
      )}
      <ul aria-label="Games" className="m-0 grid list-none p-0">
        {rows.map((r) => (
          <GameRow key={r.game.id} row={r} />
        ))}
      </ul>
    </section>
  );
}

/**
 * Until this phone has joined, the join form is the whole page: no game
 * names, no leaderboard (spec 02). Without a device (tests), the page shows.
 */
function JoinGate({ children }: { children: React.ReactNode }) {
  const device = useOptionalDevice();
  if (device && !device.active) return <PlayerHub />;
  return <>{children}</>;
}

/** Before the host starts the party (S01-AC5): the games, once joined (spec 02). */
export function UpcomingView({ event }: { event: PublicEvent }) {
  return (
    <>
      <EventBanner event={event} total={false} />
      <Body>
        <JoinGate>
          <PlayerStrip />
          {event.scoring !== "individual" && <TeamNudge slug={event.slug} />}
          <p className="m-0 text-lg">
            {listed(event).some((g) => g.alwaysOpen)
              ? "Some games are open now. The rest open when the host starts them."
              : "Waiting for the host to start the games."}
          </p>
          <GameList event={event} status="upcoming" />
        </JoinGate>
      </Body>
    </>
  );
}

/** While the party is on: the games (specs 02, 03 and 08). */
export function LiveView({ event }: { event: PublicEvent }) {
  return (
    <>
      <EventBanner event={event} total={false} />
      <Body>
        <JoinGate>
          <PlayerStrip />
          {event.scoring !== "individual" && <TeamNudge slug={event.slug} />}
          <GameList event={event} status="live" />
        </JoinGate>
      </Body>
    </>
  );
}

/** The Leaderboard tab: teams in the team phase, then players (S05-AC2, S03-AC8). */
export function LeaderboardView({ event }: { event: PublicEvent }) {
  return (
    <>
      <EventBanner event={event} title="Leaderboard" />
      <Body>
        <JoinGate>
          <PhoneLeaderboard slug={event.slug} />
        </JoinGate>
      </Body>
    </>
  );
}

/** The Team tab: pick or name your team, and give points (spec 03). */
export function TeamView({ event }: { event: PublicEvent }) {
  return (
    <>
      <EventBanner event={event} title="Team" />
      <Body>
        <JoinGate>
          <TeamPanel
            slug={event.slug}
            fallback={
              <p className="m-0 text-lg">
                Teams open when the host starts the team phase. Keep playing until then!
              </p>
            }
          />
        </JoinGate>
      </Body>
    </>
  );
}

function Standings({ title, rows }: { title: string; rows: FinalStandings["teams"] }) {
  const { LeaderboardRow } = useSlots();
  if (rows.length === 0) return null;
  return (
    <section aria-label={title} className="grid gap-2">
      <h3 className="m-0 font-gm-display text-2xl font-bold">{title}</h3>
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
      <EventBanner event={event} title={game.title} back={event.kind === "event"} />
      <Body>
        {gameOpen(status, game) && play ? (
          <GamePlayer
            gameId={game.id}
            title={game.title}
            type={game.type}
            instructions={play.instructions}
            replayable={event.replayable}
          />
        ) : (
          <p className="m-0 text-gm-text-muted">{GAME_STATE[status]}</p>
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
      <Link href="/" className="font-bold text-gm-accent-ink">
        Go to the home page
      </Link>
    </Body>
  );
}
