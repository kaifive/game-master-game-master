import { describe, expect, test } from "vitest";
import { EVENTS } from "@/content/events";
import type { EventConfig } from "./model";
import {
  eventStatus,
  findByJoinCode,
  formatSchedule,
  RESERVED_SLUGS,
  resolveJoin,
  toPublicEvent,
  validateEvent,
} from "./rules";

const valid: EventConfig = {
  slug: "test-party",
  name: "Test Party",
  timeZone: "America/New_York",
  schedule: { start: "2026-12-19T16:30:00-05:00" },
  style: { pack: "judges-table", variant: "winter", colorMode: "dark" },
  kind: "event",
  joinCode: "XMAS7",
  joinPolicy: "open",
  scoring: "both",
  maxPlayersPerDevice: 4,
  games: [
    {
      id: "daily-word",
      type: "word-guess",
      title: "Daily Word",
      mode: "solo",
      visibility: "listed",
      content: {},
      scoring: { points: 100, awardTo: "player" },
    },
    {
      id: "jeopardy",
      type: "jeopardy",
      title: "Jeopardy",
      mode: "live",
      visibility: "listed",
      content: {},
      scoring: { points: 0, awardTo: "team" },
    },
  ],
};

describe("S01-AC1: event files are validated", () => {
  test.each(Object.entries(EVENTS))("content/events/%s.ts is valid", (file, config) => {
    expect(validateEvent(file, config)).toEqual([]);
  });

  test("a valid config passes", () => {
    expect(validateEvent("test-party", valid)).toEqual([]);
  });

  test.each([
    ["slug format", { slug: "Test Party" }, /slug/],
    ["reserved slug", { slug: "admin" }, /reserved/],
    ["slug matches file", { slug: "other" }, /file name/],
    [
      "end after start",
      { schedule: { start: "2026-12-19T16:30:00-05:00", end: "2026-12-19T15:00:00-05:00" } },
      /end/,
    ],
    ["unparseable start", { schedule: { start: "Dec 19" } }, /schedule\.start/],
    ["time zone", { timeZone: "Mars/Olympus" }, /timeZone/],
    ["style", { style: { pack: "nope", colorMode: "dark" } }, /style/],
    ["join code format", { joinCode: "AB0" }, /joinCode/],
    ["duplicate game ids", { games: [valid.games[0]!, valid.games[0]!] }, /daily-word/],
    ["unknown game type", { games: [{ ...valid.games[0]!, type: "chess" }] }, /type/],
  ] as const)("rejects a bad %s, naming the file and field", (_name, patch, message) => {
    const file = "slug" in patch && patch.slug !== "other" ? patch.slug : "test-party";
    const errors = validateEvent(file, { ...valid, ...patch });
    expect(errors.join("\n")).toMatch(message);
    expect(errors[0]).toContain(`content/events/${file}.ts`);
  });

  test("reserves the app's own routes", () => {
    expect(RESERVED_SLUGS).toEqual(
      expect.arrayContaining(["admin", "api", "_next", "join", "dev"]),
    );
  });

  test("join codes are unique across events", () => {
    const codes = Object.values(EVENTS).map((e) => e.joinCode);
    expect(new Set(codes).size).toBe(codes.length);
  });
});

describe("S01-AC2: events start and end by hand", () => {
  test("with nothing stored, an event is upcoming", () => {
    expect(eventStatus(undefined)).toBe("upcoming");
    expect(eventStatus(null)).toBe("upcoming");
  });

  test("the stored status is the status", () => {
    expect(eventStatus("live")).toBe("live");
    expect(eventStatus("ended")).toBe("ended");
  });

  test("anything else stored is treated as upcoming", () => {
    expect(eventStatus("paused")).toBe("upcoming");
  });

  test("the schedule never changes the status", () => {
    const past = { ...valid, schedule: { start: "2020-01-01T00:00:00Z" } };
    expect(eventStatus(undefined)).toBe("upcoming");
    expect(validateEvent("test-party", past)).toEqual([]);
  });
});

describe("schedule and codes", () => {
  test("S01-AC4: formats the schedule in the event's time zone", () => {
    expect(formatSchedule(valid)).toBe("Saturday, Dec 19 · 4:30 PM EST");
  });

  test("finds an event by its join code, ignoring case and spaces", () => {
    expect(findByJoinCode(" xmas7 ", { "test-party": valid })?.slug).toBe("test-party");
    expect(findByJoinCode("NOPE1", { "test-party": valid })).toBeUndefined();
  });
});

describe("S01-AC9: /join sends a code to its event", () => {
  const events = { "test-party": valid };
  test("an event's join code goes to the event, keeping the code", () => {
    expect(resolveJoin("xmas7", events)).toEqual({ kind: "event", href: "/test-party?code=XMAS7" });
  });
  test("an unknown or missing code goes back home with an error", () => {
    expect(resolveJoin("ZZZZ9", events)).toEqual({ kind: "unknown", href: "/?error=code" });
    expect(resolveJoin(undefined, events).kind).toBe("unknown");
  });
});

describe("S01-AC10: what pages get never includes codes or game content", () => {
  test("toPublicEvent strips the join code, game codes and game content", () => {
    const withCodes = {
      ...valid,
      games: [
        {
          ...valid.games[0]!,
          codes: [{ code: "HUNT9", action: "unlock" as const }],
          content: { answer: "STAFF" },
        },
      ],
    };
    const text = JSON.stringify(toPublicEvent(withCodes));
    expect(text).not.toContain("XMAS7");
    expect(text).not.toContain("HUNT9");
    expect(text).not.toContain("STAFF");
  });
});
