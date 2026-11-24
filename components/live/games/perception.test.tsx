import { fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { exitY, type SleighTask, type SnowPileTask } from "@/lib/games";
import type { PerceptionState } from "@/lib/live";
import { cap, round, show, T0, tv } from "./showdown-kit.test.helpers";

const rect = Object.getOwnPropertyDescriptor(Element.prototype, "getBoundingClientRect");
beforeEach(() => {
  // jsdom has no layout: every element is 200 x 100 at the origin.
  Element.prototype.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 200, height: 100, right: 200, bottom: 100, x: 0, y: 0 }) as DOMRect;
  Element.prototype.setPointerCapture = () => undefined;
});
afterEach(() => {
  if (rect) Object.defineProperty(Element.prototype, "getBoundingClientRect", rect);
});

const timing = (state: unknown) => state as PerceptionState<unknown, unknown>;

describe("perception showdowns on the phone and TV (spec 28)", () => {
  test("S28-AC3: Snow Pile shows the flakes on the TV while the phone says to watch; then the phone takes a number", async () => {
    const user = userEvent.setup();
    const r = round("snowpile");
    const s = timing(r.state);
    show("snowpile", r.view(tv, T0 + 300), T0 + 300, "tv");
    expect(screen.getByRole("img", { name: "Snowflakes" })).toBeInTheDocument();
    show("snowpile", r.view(cap("t1"), T0 + 300), T0 + 300);
    expect(screen.getByText("Watch the TV!")).toBeInTheDocument();
    const at = s.showEndsAt + 500;
    const send = show("snowpile", r.view(cap("t2"), at), at);
    await user.click(screen.getByRole("button", { name: "2" }));
    await user.click(screen.getByRole("button", { name: "4" }));
    await user.click(screen.getByRole("button", { name: "Lock in 24" }));
    expect(send).toHaveBeenCalledWith({ answer: 24 });
  });

  test("S28-AC4: while teams answer the TV shows who's in but no flakes; the reveal shows the count and how close each team was", () => {
    const r0 = round("snowpile");
    const s = timing(r0.state);
    const count = (s.task as SnowPileTask).count;
    const at = s.showEndsAt + 500;
    const r = round("snowpile", [
      ["t1", { answer: count }, at],
      ["t2", { answer: count + 2 }, at],
    ]);
    show("snowpile", r.view(tv, at + 100), at + 100, "tv");
    expect(screen.queryByRole("img", { name: /snowflakes/i })).toBeNull();
    const locked = screen.getByRole("list", { name: "Locked in" });
    expect(within(locked).getAllByText("In")).toHaveLength(2);
    show("snowpile", r.view(tv, at + 200, true), at + 200, "tv");
    expect(
      screen.getByText(`${String(count)} snowflakes`, { selector: "span" }),
    ).toBeInTheDocument();
    expect(screen.getByText("100% close")).toBeInTheDocument();
    expect(screen.getByText(String(count + 2))).toBeInTheDocument();
  });

  test("S28-AC4: a view fetched before the start keeps the TV and phone on Get ready, not a crash, once the start passes", () => {
    const r = round("staffangle");
    const s = timing(r.state);
    const early = r.view(tv, s.startsAt - 100);
    show("staffangle", early, s.startsAt + 300, "tv");
    expect(screen.getByText("Get your eye in!")).toBeInTheDocument();
    show("staffangle", r.view(cap("t1"), s.startsAt - 100), s.startsAt + 300);
    expect(screen.getByText("Get ready!")).toBeInTheDocument();
  });

  test("S28-AC4: the captain's phone says it's locked in, and nothing more, until the reveal", () => {
    const r = round("staffangle", [["t1", { answer: 40 }, T0 + 500]]);
    show("staffangle", r.view(cap("t1"), T0 + 600), T0 + 600);
    expect(screen.getByText("Locked in")).toBeInTheDocument();
    expect(screen.queryByText(/40/)).toBeNull();
  });

  test("S28-AC3: Staff Angle turns the staff with the nudge keys, with no number shown, and locks in the angle", async () => {
    const user = userEvent.setup();
    const r = round("staffangle");
    const send = show("staffangle", r.view(cap("t1"), T0 + 500), T0 + 500);
    expect(screen.getByRole("slider", { name: /staff/ })).toHaveAttribute("aria-valuenow", "0");
    await user.click(screen.getByRole("button", { name: "Turn left 5 degrees" }));
    await user.click(screen.getByRole("button", { name: "Turn left 5 degrees" }));
    await user.click(screen.getByRole("button", { name: "Turn left 1 degree" }));
    await user.click(screen.getByRole("button", { name: "Turn right 5 degrees" }));
    await user.click(screen.getByRole("button", { name: "Lock in" }));
    expect(send).toHaveBeenCalledWith({ answer: 6 });
  });

  test("S28-AC3: Sleigh Run takes a tap on the sky as the height on the far edge; the reveal draws the real path", async () => {
    const user = userEvent.setup();
    const r = round("sleighrun");
    const s = timing(r.state);
    const at = s.showEndsAt + 300;
    const send = show("sleighrun", r.view(cap("t1"), at), at);
    expect(screen.getByRole("button", { name: "Lock in" })).toBeDisabled();
    fireEvent.pointerDown(screen.getByRole("button", { name: /Tap where the sleigh/ }), {
      clientX: 150,
      clientY: 25,
    });
    await user.click(screen.getByRole("button", { name: "Lock in" }));
    expect(send).toHaveBeenCalledWith({ answer: 0.25 });
    const truth = exitY(s.task as SleighTask);
    const done = round("sleighrun", [["t1", { answer: truth }, at]]);
    show("sleighrun", done.view(tv, at + 100, true), at + 100, "tv");
    expect(screen.getAllByText(`${String(Math.round((1 - truth) * 100))}% up`).length).toBe(2);
  });

  test("S28-AC3: Cut the Ribbon puts the scissors where tapped, moves them by key, and locks in the spot", async () => {
    const user = userEvent.setup();
    const r = round("ribbon");
    const send = show("ribbon", r.view(cap("t1"), T0 + 500), T0 + 500);
    const ribbon = screen.getByRole("slider", { name: /ribbon/ });
    // The ribbon runs from 4% to 96% of the drawing; 100 px of 200 is halfway.
    fireEvent.pointerDown(ribbon, { pointerId: 1, clientX: 100, clientY: 20 });
    fireEvent.pointerUp(ribbon, { pointerId: 1 });
    ribbon.focus();
    await user.keyboard("{ArrowRight}");
    await user.click(screen.getByRole("button", { name: "Lock in" }));
    expect(send).toHaveBeenCalledWith({ answer: 0.51 });
  });

  test("S24-AC4: every perception game has a demo for the TV intro", async () => {
    const { LIVE_RENDERERS } = await import("../renderers");
    for (const type of ["snowpile", "staffangle", "sleighrun", "liondrum", "ribbon"])
      expect(LIVE_RENDERERS[type]?.Demo).toBeDefined();
  });
});

describe("Color Matcher as a showdown on the phone and TV (spec 30)", () => {
  test("S30-AC1: the TV holds the color up during the show while the phone says to watch; then the phone's wheel locks in a color", async () => {
    const user = userEvent.setup();
    const r = round("color");
    const s = timing(r.state);
    show("color", r.view(tv, T0 + 300), T0 + 300, "tv");
    expect(screen.getByText("Remember this color!")).toBeInTheDocument();
    show("color", r.view(cap("t1"), T0 + 300), T0 + 300);
    expect(screen.getByText("Watch the TV!")).toBeInTheDocument();
    const at = s.showEndsAt + 500;
    const send = show("color", r.view(cap("t2"), at), at);
    expect(screen.getByText("Match the color!")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Lock in this color" }));
    const [[sent]] = send.mock.calls as unknown as [[{ answer: string }]];
    expect(sent.answer).toMatch(/^#[0-9A-F]{6}$/);
  });

  test("S30-AC1: the reveal shows the color beside each team's, named, with how well it matched", () => {
    const r0 = round("color");
    const s = timing(r0.state);
    const target = (s.task as { target: string }).target;
    const at = s.showEndsAt + 500;
    const r = round("color", [["t1", { answer: target }, at]]);
    show("color", r.view(tv, at + 100, true), at + 100, "tv");
    expect(screen.getByRole("img", { name: "The color" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Picked by Reds" })).toBeInTheDocument();
    expect(screen.getAllByText("100% match").length).toBeGreaterThan(0);
  });
});
