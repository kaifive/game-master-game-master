import { describe, expect, test } from "vitest";
import { EVENTS } from "@/content/events";
import { holiday2026 } from "@/content/events/holiday-2026";
import type { EventConfig } from "./model";
import {
  eventStatus,
  findByJoinCode,
  pointsFor,
  RESERVED_SLUGS,
  resolveJoin,
  toPublicEvent,
  validateEvent,
} from "./rules";

const valid: EventConfig = {
  slug: "test-party",
  name: "Test Party",
  style: { pack: "judges-table", variant: "winter", colorMode: "dark" },
  kind: "event",
  joinCode: "XMAS7",
  joinPolicy: "open",
  scoring: "both",
  restartsPerDevice: 1,
  soloGamePoints: 100,
  games: [
    {
      id: "quiz",
      type: "trivia",
      title: "Quiz",
      mode: "solo",
      visibility: "listed",
      content: {
        questions: [{ id: "q1", prompt: "2 + 2?", choices: ["4", "5"], answer: 0 }],
        questionsPerPlay: 1,
      },
      scoring: { awardTo: "player" },
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
    ["style", { style: { pack: "nope", colorMode: "dark" } }, /style/],
    ["join code format", { joinCode: "AB0" }, /joinCode/],
    ["duplicate game ids", { games: [valid.games[0]!, valid.games[0]!] }, /"quiz" is used twice/],
    ["unknown game type", { games: [{ ...valid.games[0]!, type: "chess" }] }, /type/],
  ] as const)("rejects a bad %s, naming the file and field", (_name, patch, message) => {
    const file = "slug" in patch && patch.slug !== "other" ? patch.slug : "test-party";
    const errors = validateEvent(file, { ...valid, ...patch });
    expect(errors.join("\n")).toMatch(message);
    expect(errors[0]).toContain(`content/events/${file}.ts`);
  });

  test("S08-AC1: each game's content is checked against its type, naming the game and field", () => {
    const bad = {
      ...valid.games[0]!,
      content: {
        questions: [{ id: "q1", prompt: "?", choices: ["A", "B"], answer: 5 }],
        questionsPerPlay: 1,
      },
    };
    expect(validateEvent("test-party", { ...valid, games: [bad] })).toEqual([
      expect.stringMatching(
        /^content\/events\/test-party\.ts: games\.quiz\.content\.questions\.0\.answer: /,
      ),
    ]);
  });

  test("S08-AC10: solo games share soloGamePoints and can't set their own", () => {
    const own = { ...valid.games[0]!, scoring: { points: 50, awardTo: "player" as const } };
    expect(validateEvent("test-party", { ...valid, games: [own] }).join()).toMatch(
      /games\.quiz\.scoring\.points: solo games all use soloGamePoints/,
    );
    expect(pointsFor(valid, valid.games[0]!)).toBe(100);
    expect(pointsFor(valid, { mode: "live", scoring: { points: 30, awardTo: "team" } })).toBe(30);
    expect(pointsFor(valid, { mode: "live", scoring: { awardTo: "team" } })).toBe(0);
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

  test("ADR-026: event files have no dates; a stray schedule is rejected", () => {
    expect(
      validateEvent("test-party", { ...valid, schedule: { start: "2026-12-19T16:30:00-05:00" } }),
    ).toEqual([expect.stringMatching(/Unrecognized key/)]);
  });
});

describe("codes", () => {
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

describe("S10-AC7: the party has trivia, not word guess", () => {
  test("a trivia game with a pool of placeholder questions", () => {
    const trivia = holiday2026.games.find((g) => g.type === "trivia");
    expect(trivia).toMatchObject({ id: "trivia", mode: "solo" });
    expect((trivia?.content as { questions: unknown[] }).questions.length).toBeGreaterThanOrEqual(
      10,
    );
    expect(holiday2026.games.map((g) => g.type as string)).not.toContain("word-guess");
    expect(holiday2026.soloGamePoints).toBe(100);
  });
});
