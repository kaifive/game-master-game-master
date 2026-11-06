import { contentErrors } from "@/lib/games";
import { normalizeCode, validateStyleRef } from "@/lib/themes";
import {
  CODE_PATTERN,
  EventConfig,
  type EventStatus,
  type GameConfig,
  type PublicEvent,
} from "./model";
import type { FinalStandings, Standing } from "./repo";

/** Slugs that clash with the app's own routes. */
export const RESERVED_SLUGS = ["admin", "api", "_next", "join", "dev"] as const;

const validTimeZone = (tz: string) => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

const parse = (iso: string) => (/^\d{4}-\d{2}-\d{2}T/.test(iso) ? Date.parse(iso) : NaN);

/** Every problem with one event file, each naming the file and field (S01-AC1). */
export function validateEvent(file: string, value: unknown): string[] {
  const at = `content/events/${file}.ts`;
  const parsed = EventConfig.safeParse(value);
  if (!parsed.success) {
    return parsed.error.issues.map((i) => `${at}: ${i.path.join(".") || "(root)"}: ${i.message}`);
  }
  const e = parsed.data;
  const errors: string[] = [];
  const add = (field: string, msg: string) => errors.push(`${at}: ${field}: ${msg}`);
  if ((RESERVED_SLUGS as readonly string[]).includes(e.slug))
    add("slug", `"${e.slug}" is reserved for the app's own pages.`);
  if (e.slug !== file) add("slug", `"${e.slug}" must match the file name "${file}".`);
  if (!validTimeZone(e.timeZone)) add("timeZone", `"${e.timeZone}" isn't an IANA time zone.`);
  const start = parse(e.schedule.start);
  if (Number.isNaN(start))
    add("schedule.start", "use an ISO date-time with offset, e.g. 2026-12-19T16:30:00-05:00.");
  if (e.schedule.end !== undefined) {
    const end = parse(e.schedule.end);
    if (Number.isNaN(end) || end <= start)
      add("schedule.end", "must be a date-time after schedule.start.");
  }
  const style = validateStyleRef(e.style);
  if (!style.ok) add("style", style.error);
  if (!CODE_PATTERN.test(e.joinCode))
    add("joinCode", "use 5 characters from A–Z and 2–9, without 0, O, 1, I or L.");
  const seen = new Set<string>();
  for (const g of e.games) {
    if (seen.has(g.id)) add("games", `game id "${g.id}" is used twice.`);
    seen.add(g.id);
    if (g.mode === "solo" && g.scoring.points !== undefined)
      add(`games.${g.id}.scoring.points`, "solo games all use soloGamePoints; remove this.");
    for (const problem of contentErrors(g.type, g.content))
      add(
        `games.${g.id}.content.${problem.split(": ")[0] ?? ""}`,
        problem.split(": ").slice(1).join(": "),
      );
  }
  if (e.kind === "quick" && e.games.length !== 1)
    add("games", "a quick event has exactly one game.");
  return errors;
}

/** Status is whatever the admin last set; nothing stored means upcoming (ADR-024). */
export function eventStatus(stored: unknown): EventStatus {
  return stored === "live" || stored === "ended" ? stored : "upcoming";
}

/** "Saturday, Dec 19 · 4:30 PM EST", in the event's own time zone. */
export function formatSchedule(e: Pick<EventConfig, "schedule" | "timeZone">): string {
  const d = new Date(e.schedule.start);
  const day = new Intl.DateTimeFormat("en-US", {
    timeZone: e.timeZone,
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(d);
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: e.timeZone,
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(d);
  return `${day} · ${time}`;
}

export function findByJoinCode(
  raw: string,
  events: Record<string, EventConfig>,
): EventConfig | undefined {
  const code = normalizeCode(raw);
  return Object.values(events).find((e) => e.joinCode === code);
}

/** Strips codes and game content, so nothing secret reaches a page (S01-AC10). */
export function toPublicEvent(e: EventConfig): PublicEvent {
  // An allowlist, so a secret field added later never leaks by default.
  return {
    slug: e.slug,
    name: e.name,
    timeZone: e.timeZone,
    schedule: e.schedule,
    style: e.style,
    kind: e.kind,
    joinPolicy: e.joinPolicy,
    scoring: e.scoring,
    maxPlayersPerDevice: e.maxPlayersPerDevice,
    soloGamePoints: e.soloGamePoints,
    games: e.games.map((g) => ({
      id: g.id,
      type: g.type,
      title: g.title,
      mode: g.mode,
      visibility: g.visibility,
      scoring: g.scoring,
      ...(g.phase ? { phase: g.phase } : {}),
      ...(g.style ? { style: g.style } : {}),
    })),
  };
}

const record = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" ? (v as Record<string, unknown>) : {};

/**
 * Reads the leaderboard summary (leaderboard/{slug}) into ranked lists,
 * skipping anything malformed rather than breaking the page.
 */
export function parseLeaderboard(raw: unknown): FinalStandings | null {
  if (!raw || typeof raw !== "object") return null;
  const { teams, players } = record(raw);
  const rows = (
    group: unknown,
    nameKey: "name" | "nickname",
    teamOf: (v: Record<string, unknown>) => unknown,
  ) =>
    Object.entries(record(group))
      .flatMap(([id, value]): Standing[] => {
        const v = record(value);
        const name = v[nameKey];
        const points = v.points;
        if (typeof name !== "string" || typeof points !== "number") return [];
        const team = teamOf(v);
        return [{ id, name, points, ...(typeof team === "number" ? { team } : {}) }];
      })
      .sort((a, b) => b.points - a.points);
  return {
    teams: rows(teams, "name", (v) => v.color),
    players: rows(players, "nickname", () => undefined),
  };
}

export type JoinTarget = { kind: "event"; href: string } | { kind: "unknown"; href: string };

/** Where /join?code= sends a player (S01-AC9). Game codes join with spec 08. */
export function resolveJoin(
  raw: string | undefined,
  events: Record<string, EventConfig>,
): JoinTarget {
  const code = normalizeCode(raw ?? "");
  const event = code ? findByJoinCode(code, events) : undefined;
  return event
    ? { kind: "event", href: `/${event.slug}?code=${encodeURIComponent(code)}` }
    : { kind: "unknown", href: "/?error=code" };
}

/** What a game is worth: the event's soloGamePoints for solo games, else its own (S08-AC10). */
export const pointsFor = (
  e: Pick<EventConfig, "soloGamePoints">,
  g: Pick<GameConfig, "mode" | "scoring">,
): number => (g.mode === "solo" ? e.soloGamePoints : (g.scoring.points ?? 0));
