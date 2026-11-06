import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { AdminRoot } from "@/components/theme";
import { Controls } from "./controls";
import { EventLibrary } from "./library";
import { AdminSignIn, SignOutButton } from "./sign-in";

const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

type Body = Record<string, unknown>;
const players = [
  { id: "p1", nickname: "Mai", points: 60, restarts: 1, joinedAt: Date.now() - 5 * 60_000 },
  { id: "p2", nickname: "Bao", points: 40, restarts: 0, joinedAt: Date.now() },
];

let sent: Body[] = [];
function server(reply: (body: Body) => { status: number; json: unknown }) {
  sent = [];
  vi.stubGlobal(
    "fetch",
    vi.fn((_url: string, init?: RequestInit) => {
      const body = init?.body ? (JSON.parse(init.body as string) as Body) : {};
      if (init?.method === "POST") sent.push(body);
      const r = reply(body);
      return Promise.resolve(Response.json(r.json, { status: r.status }));
    }),
  );
}

const controls = (status: "upcoming" | "live" | "ended" = "upcoming") =>
  render(
    <AdminRoot>
      <Controls
        slug="holiday-2026"
        name="Nova Wushu Holiday Party"
        games={[{ id: "trivia", title: "Holiday Trivia" }]}
        initial={{ status, players }}
      />
    </AdminRoot>,
  );

beforeEach(() => {
  router.push.mockClear();
  router.refresh.mockClear();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Controls", () => {
  test("S07-AC2: Start sends the action and shows the new status", async () => {
    server(() => ({ status: 200, json: { status: "live", players } }));
    controls();
    await userEvent.setup().click(screen.getByRole("button", { name: "Start the event" }));
    expect(sent).toEqual([{ action: "start" }]);
    expect(await screen.findByText("live")).toBeInTheDocument();
  });

  test("S07-AC2: End and Reopen ask first", async () => {
    server(() => ({ status: 200, json: { status: "ended", players } }));
    controls("live");
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "End the event" }));
    expect(sent).toEqual([]);
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await user.click(screen.getByRole("button", { name: "End the event" }));
    await user.click(screen.getByRole("button", { name: "Yes, end it" }));
    expect(sent).toEqual([{ action: "end" }]);
    await user.click(await screen.findByRole("button", { name: "Reopen" }));
    await user.click(screen.getByRole("button", { name: "Yes, reopen it" }));
    expect(sent.at(-1)).toEqual({ action: "reopen" });
  });

  test("S07-AC3: lists players with points and restarts, and finds them by name", async () => {
    server(() => ({ status: 200, json: { status: "upcoming", players } }));
    controls();
    const list = screen.getByRole("list", { name: "Players" });
    expect(within(list).getByText("Mai")).toBeInTheDocument();
    expect(list).toHaveTextContent("started over 1×");
    expect(list).toHaveTextContent("5 min ago");
    await userEvent.setup().type(screen.getByPlaceholderText("Find a player"), "ba");
    expect(within(list).queryByText("Mai")).toBeNull();
    expect(within(list).getByText("Bao")).toBeInTheDocument();
  });

  test("S07-AC4 S07-AC5 S07-AC6 S07-AC7: each fix-up sends its action", async () => {
    server(() => ({ status: 200, json: { status: "upcoming", players } }));
    controls();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Mai/ }));
    await user.type(screen.getByPlaceholderText("+50 or -20"), "-20");
    await user.type(screen.getByPlaceholderText(/Reason/), "Oops");
    await user.click(screen.getByRole("button", { name: "Change points" }));
    await user.click(screen.getByRole("button", { name: "Give another restart" }));
    await user.click(screen.getByRole("button", { name: "Reset game" }));
    await user.click(screen.getByRole("button", { name: "Reset it" }));
    await user.click(screen.getByRole("button", { name: "Ban phone" }));
    await user.click(screen.getByRole("button", { name: "Ban this phone" }));
    await user.click(screen.getByRole("button", { name: "Remove" }));
    await user.click(screen.getByRole("button", { name: "Remove Mai" }));
    expect(sent).toEqual([
      { action: "adjust", playerId: "p1", points: -20, reason: "Oops" },
      { action: "restart", playerId: "p1" },
      { action: "reset", playerId: "p1", gameId: "trivia" },
      { action: "ban", playerId: "p1" },
      { action: "remove", playerId: "p1" },
    ]);
  });

  test("S07-AC8 S07-AC9: rebuild, and clear only after typing CLEAR; errors show", async () => {
    server((body) =>
      body.action === "clear"
        ? { status: 409, json: { error: "Test data can only be cleared before the event starts." } }
        : { status: 200, json: { status: "upcoming", players } },
    );
    controls();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Rebuild points" }));
    const clear = screen.getByRole("button", { name: "Clear test data" });
    expect(clear).toBeDisabled();
    await user.type(screen.getByLabelText("Type CLEAR"), "CLEAR");
    await user.click(clear);
    expect(sent).toEqual([{ action: "rebuild" }, { action: "clear", confirm: "CLEAR" }]);
    expect(await screen.findByRole("alert")).toHaveTextContent("only be cleared before");
  });

  test("S07-AC9: clear test data isn't offered once the event is live", () => {
    server(() => ({ status: 200, json: {} }));
    controls("live");
    expect(screen.queryByRole("button", { name: "Clear test data" })).toBeNull();
  });
});

describe("Admin sign-in and library", () => {
  test("S06-AC1: a wrong passphrase shows why; the right one refreshes into the library", async () => {
    let ok = false;
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          ok
            ? new Response(null, { status: 204 })
            : Response.json({ error: "That passphrase isn't right." }, { status: 401 }),
        ),
      ),
    );
    render(<AdminSignIn />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Passphrase"), "nope");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("That passphrase isn't right.");
    ok = true;
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    await vi.waitFor(() => {
      expect(router.refresh).toHaveBeenCalled();
    });
  });

  test("S06-AC5 S07-AC1: the library lists events with status; sign out goes back", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response(null, { status: 204 }))),
    );
    render(
      <EventLibrary
        events={[{ slug: "holiday-2026", name: "Nova Wushu Holiday Party", status: "live" }]}
      />,
    );
    expect(screen.getByRole("link", { name: /Nova Wushu Holiday Party/ })).toHaveAttribute(
      "href",
      "/admin/holiday-2026",
    );
    expect(screen.getByText("live")).toBeInTheDocument();
    render(<SignOutButton />);
    await userEvent
      .setup()
      .click(screen.getAllByRole("button", { name: "Sign out" })[0] as HTMLElement);
    await vi.waitFor(() => {
      expect(router.push).toHaveBeenCalledWith("/admin");
    });
  });
});
