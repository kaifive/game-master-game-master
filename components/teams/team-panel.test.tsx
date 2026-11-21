import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { PackRoot } from "@/components/packs/judges-table/root";
import { holiday2026 } from "@/content/events/holiday-2026";
import { TeamNudge, TeamPanel } from "./team-panel";

const device = vi.hoisted(() => ({
  state: {
    active: { id: "p3", nickname: "Lan" },
    token: () => Promise.resolve("dev:phone"),
    total: 0,
    refreshPlays: () => Promise.resolve(),
  },
}));
vi.mock("@/components/players/device", () => ({ useOptionalDevice: () => device.state }));
// jsdom can't decode photos: shrinking hands back the file as it is (spec 31's selfie).
vi.mock("@/components/games/photo/shrink", () => ({
  shrinkPhoto: (f: Blob) => Promise.resolve(f),
}));

const team = (id: string, name: string, extra: Record<string, unknown> = {}) => ({
  id,
  name,
  named: true,
  color: 1,
  captain: { id: `cap-${id}`, nickname: `Cap ${id}` },
  members: [{ id: `cap-${id}`, nickname: `Cap ${id}` }],
  room: 3,
  ...extra,
});

let posts: unknown[] = [];
function serve(get: unknown, post: unknown = get) {
  posts = [];
  vi.stubGlobal(
    "fetch",
    vi.fn((_url: string, init?: RequestInit) => {
      if (init?.method === "POST") posts.push(JSON.parse(init.body as string));
      return Promise.resolve(Response.json(init?.method === "POST" ? post : get));
    }),
  );
}

const panel = () =>
  render(
    <PackRoot styleRef={holiday2026.style}>
      <TeamPanel slug="holiday-2026" />
    </PackRoot>,
  );

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("TeamPanel", () => {
  test("S03-AC3: in the team phase, a player without a team picks one, with a confirm", async () => {
    const view = {
      phase: "team",
      maxTeamSize: 4,
      teams: [team("t1", "Dragons"), team("t2", "Cranes", { room: 0 })],
      mine: null,
    };
    serve(view, { ...view, mine: { teamId: "t1", isCaptain: false, named: true } });
    panel();
    expect(await screen.findByRole("heading", { name: "Pick your team" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Join Cranes" })).toBeDisabled();
    expect(screen.getByText("Full")).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Join Dragons" }));
    expect(screen.getByRole("alertdialog", { name: "Join Dragons?" })).toHaveTextContent(
      "You can't switch later.",
    );
    await user.click(screen.getByRole("button", { name: "Join Dragons" }));
    expect(posts).toEqual([{ action: "join", playerId: "p3", teamId: "t1" }]);
    expect(await screen.findByText("Dragons")).toBeInTheDocument();
    expect(screen.getByText(/on the team/)).toBeInTheDocument();
  });

  test("S03-AC1: before the team phase, players without a team see nothing", async () => {
    serve({ phase: "individual", maxTeamSize: 4, teams: [team("t1", "Dragons")], mine: null });
    const { container } = panel();
    await new Promise((r) => setTimeout(r, 20));
    expect(container.querySelector("[aria-label='Pick your team']")).toBeNull();
  });

  test("S03-AC2: a captain names their team; bad names are caught as they're typed", async () => {
    const unnamed = team("t1", "Team Lan", {
      named: false,
      captain: { id: "p3", nickname: "Lan" },
    });
    const view = {
      phase: "individual",
      maxTeamSize: 4,
      teams: [unnamed],
      mine: { teamId: "t1", isCaptain: true, named: false },
    };
    serve(view, {
      ...view,
      teams: [{ ...unnamed, name: "Lanterns", named: true }],
      mine: { ...view.mine, named: true },
    });
    panel();
    const user = userEvent.setup();
    const box = await screen.findByLabelText(/Name your team/);
    await user.type(box, "sh1t");
    expect(screen.getByRole("alert")).toHaveTextContent("Pick another name.");
    await user.clear(box);
    await user.type(box, "Lanterns");
    await user.click(screen.getByRole("button", { name: "Name the team" }));
    // The team's own color goes with the name (S29-AC1).
    expect(posts).toEqual([{ action: "name", playerId: "p3", name: "Lanterns", color: 1 }]);
    expect(await screen.findByText("Lanterns")).toBeInTheDocument();
    expect(screen.queryByLabelText(/Name your team/)).toBeNull();
  });

  test("S29-AC1: the captain picks a named color when naming the team; colors other teams hold are taken", async () => {
    const unnamed = team("t1", "Team Lan", {
      named: false,
      color: 3,
      captain: { id: "p3", nickname: "Lan" },
    });
    const view = {
      phase: "individual",
      maxTeamSize: 4,
      teams: [unnamed, team("t2", "Dragons", { color: 6 })],
      mine: { teamId: "t1", isCaptain: true, named: false },
    };
    serve(view, { ...view, mine: { ...view.mine, named: true } });
    panel();
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/Name your team/), "Lanterns");
    // The team's color to begin with, and Teal held by Dragons.
    expect(screen.getByRole("button", { name: "Gold" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Teal, taken by Dragons" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Purple" }));
    expect(screen.getByRole("button", { name: "Purple" })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "Name the team" }));
    expect(posts).toEqual([{ action: "name", playerId: "p3", name: "Lanterns", color: 5 }]);
  });

  test("S31-AC1: the captain takes the team selfie on the naming screen; it's sent at once with its size", async () => {
    const unnamed = team("t1", "Team Lan", {
      named: false,
      captain: { id: "p3", nickname: "Lan" },
    });
    const view = {
      phase: "individual",
      maxTeamSize: 4,
      teams: [unnamed],
      mine: { teamId: "t1", isCaptain: true, named: false },
    };
    const sent: FormData[] = [];
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(() => Promise.resolve({ width: 1200, height: 900, close: vi.fn() })),
    );
    vi.stubGlobal(
      "URL",
      Object.assign(URL, { createObjectURL: () => "blob:x", revokeObjectURL: vi.fn() }),
    );
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string, init?: RequestInit) => {
        if (url.endsWith("/teams/selfie")) {
          sent.push(init?.body as FormData);
          return Promise.resolve(Response.json({ selfie: true }));
        }
        return Promise.resolve(Response.json(view));
      }),
    );
    panel();
    const user = userEvent.setup();
    await screen.findByLabelText(/Name your team/);
    const photo = new File([new Uint8Array(10)], "me.jpg", { type: "image/jpeg" });
    await user.upload(screen.getByLabelText("Take the team selfie"), photo);
    expect(await screen.findByText("Got it! Tap the photo to retake it.")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Your team selfie" })).toBeInTheDocument();
    expect(sent[0]?.get("playerId")).toBe("p3");
    expect(sent[0]?.get("width")).toBe("1200");
    expect(sent[0]?.get("height")).toBe("900");
  });

  test("S03-AC6: a player gives some of their points to any team, with a confirm", async () => {
    device.state.total = 40;
    const view = {
      phase: "team",
      maxTeamSize: 4,
      teams: [team("t1", "Dragons"), team("t2", "Cranes")],
      mine: { teamId: "t1", isCaptain: false, named: true },
    };
    serve(view);
    panel();
    const user = userEvent.setup();
    const amount = await screen.findByLabelText("Points to give");
    await user.selectOptions(screen.getByLabelText("Team"), "t2");
    await user.type(amount, "50");
    expect(screen.getByRole("alert")).toHaveTextContent("You have 40 points to give.");
    expect(screen.getByRole("button", { name: "Give points" })).toBeDisabled();
    await user.clear(amount);
    await user.type(amount, "25");
    await user.click(screen.getByRole("button", { name: "Give points" }));
    expect(screen.getByRole("alertdialog", { name: "Give points?" })).toHaveTextContent(
      "Give 25 of your points to Cranes? Your score goes down by 25. You can't undo this.",
    );
    await user.click(screen.getByRole("button", { name: "Yes, give 25" }));
    expect(posts).toEqual([{ action: "donate", playerId: "p3", teamId: "t2", points: 25 }]);
    expect(await screen.findByRole("status")).toHaveTextContent("You gave 25 to Cranes.");
    device.state.total = 0;
  });

  test("S03-AC6: the team's score card shows the new total after a donation", async () => {
    device.state.total = 40;
    const view = {
      phase: "team",
      maxTeamSize: 4,
      teams: [team("t1", "Dragons")],
      mine: { teamId: "t1", isCaptain: false, named: true },
    };
    serve(view, { ...view, donated: { teamId: "t1", player: 15, team: 25 } });
    panel();
    expect(
      await screen.findByRole("img", { name: "Dragons team score: not played yet" }),
    ).toBeVisible();
    expect(screen.getByRole("img", { name: "Your points: 40 points" })).toBeVisible();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Points to give"), "25");
    await user.click(screen.getByRole("button", { name: "Give points" }));
    await user.click(screen.getByRole("button", { name: "Yes, give 25" }));
    expect(await screen.findByRole("img", { name: "Dragons team score: 25 points" })).toBeVisible();
    device.state.total = 0;
  });

  test("S03-AC6: with no points, there's nothing to give", async () => {
    serve({
      phase: "team",
      maxTeamSize: 4,
      teams: [team("t1", "Dragons")],
      mine: { teamId: "t1", isCaptain: false, named: true },
    });
    panel();
    expect(await screen.findByText(/on the team/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Points to give")).toBeNull();
  });

  test("S03-AC3: the games list nudges to the Team tab once teams open, or a captain must name one", async () => {
    serve({ phase: "team", maxTeamSize: 4, teams: [team("t1", "Dragons")], mine: null });
    const { unmount } = render(
      <PackRoot styleRef={holiday2026.style}>
        <TeamNudge slug="holiday-2026" />
      </PackRoot>,
    );
    expect(await screen.findByRole("link", { name: /Pick your team/ })).toHaveAttribute(
      "href",
      "/holiday-2026/team",
    );
    unmount();
    serve({
      phase: "individual",
      maxTeamSize: 4,
      teams: [team("t1", "Team Lan", { named: false })],
      mine: { teamId: "t1", isCaptain: true, named: false },
    });
    render(
      <PackRoot styleRef={holiday2026.style}>
        <TeamNudge slug="holiday-2026" />
      </PackRoot>,
    );
    expect(await screen.findByRole("link", { name: /Name your team/ })).toBeInTheDocument();
  });
});
