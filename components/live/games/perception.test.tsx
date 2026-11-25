import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import type { RibbonTask } from "@/lib/games";
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
  test("S28-AC4: while teams answer the TV shows who's in but not where to cut; the reveal shows the spot and how close each team was", () => {
    const r0 = round("ribbon");
    const s = timing(r0.state);
    const right = (s.task as RibbonTask).at;
    const at = s.showEndsAt + 500;
    const r = round("ribbon", [
      ["t1", { answer: right }, at],
      ["t2", { answer: Math.min(1, right + 0.05) }, at],
    ]);
    show("ribbon", r.view(tv, at + 100), at + 100, "tv");
    const locked = screen.getByRole("list", { name: "Locked in" });
    expect(within(locked).getAllByText("In")).toHaveLength(2);
    expect(screen.queryByText(/% along/)).toBeNull();
    show("ribbon", r.view(tv, at + 200, true), at + 200, "tv");
    expect(screen.getAllByText(`${String(Math.round(right * 100))}% along`).length).toBeGreaterThan(
      0,
    );
    expect(screen.getByText("100% close")).toBeInTheDocument();
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

  test("S28-AC4: a reloaded captain's phone shows the staff where it sent it, still turnable, with no number shown", () => {
    const r = round("staffangle", [["t1", { answer: 40 }, T0 + 500]]);
    show("staffangle", r.view(cap("t1"), T0 + 600), T0 + 600);
    expect(screen.getByRole("slider", { name: /staff/ })).toHaveAttribute("aria-valuenow", "40");
    expect(screen.queryByText(/40°/)).toBeNull();
  });

  test("S28-AC3: Staff Angle has no buttons to step the staff and no Lock in; the turned staff goes in as time runs out", async () => {
    const user = userEvent.setup();
    const r = round("staffangle");
    const s = timing(r.state);
    let t = T0 + 500;
    const send = show("staffangle", r.view(cap("t1"), t), () => t);
    const staff = screen.getByRole("slider", { name: /staff/ });
    expect(staff).toHaveAttribute("aria-valuenow", "0");
    expect(screen.queryByRole("button", { name: /Turn/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "Lock in" })).toBeNull();
    staff.focus();
    await user.keyboard("{ArrowLeft}{ArrowLeft}");
    // Each turn is sent a moment later, and again as the time runs out.
    await waitFor(() => {
      expect(send).toHaveBeenCalledWith({ answer: Number(staff.getAttribute("aria-valuenow")) });
    });
    send.mockClear();
    t = s.closesAt - 300;
    await waitFor(() => {
      expect(send).toHaveBeenCalledWith({ answer: Number(staff.getAttribute("aria-valuenow")) });
    });
  });

  test("S28-AC3: Cut the Ribbon puts the scissors where tapped, moves them by key, and sends the spot as time runs out", async () => {
    const user = userEvent.setup();
    const r = round("ribbon");
    const s = timing(r.state);
    let t = T0 + 500;
    const send = show("ribbon", r.view(cap("t1"), t), () => t);
    const ribbon = screen.getByRole("slider", { name: /ribbon/ });
    // The ribbon runs from 4% to 96% of the drawing; 100 px of 200 is halfway.
    fireEvent.pointerDown(ribbon, { pointerId: 1, clientX: 100, clientY: 20 });
    fireEvent.pointerUp(ribbon, { pointerId: 1 });
    ribbon.focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.queryByRole("button", { name: "Lock in" })).toBeNull();
    t = s.closesAt - 300;
    await waitFor(() => {
      expect(send).toHaveBeenCalledWith({ answer: 0.51 });
    });
  });

  test("S24-AC4: every perception game has a demo for the TV intro", async () => {
    const { LIVE_RENDERERS } = await import("../renderers");
    for (const type of ["staffangle", "ribbon"]) expect(LIVE_RENDERERS[type]?.Demo).toBeDefined();
  });
});
