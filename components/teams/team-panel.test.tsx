import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { PackRoot } from "@/components/packs/judges-table/root";
import { holiday2026 } from "@/content/events/holiday-2026";
import { TeamPanel } from "./team-panel";

const device = vi.hoisted(() => ({
  state: {
    active: { id: "p3", nickname: "Lan" },
    token: () => Promise.resolve("dev:phone"),
    total: 0,
    refreshPlays: () => Promise.resolve(),
  },
}));
vi.mock("@/components/players/device", () => ({ useOptionalDevice: () => device.state }));

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
    expect(posts).toEqual([{ action: "name", playerId: "p3", name: "Lanterns" }]);
    expect(await screen.findByText("Lanterns")).toBeInTheDocument();
    expect(screen.queryByLabelText(/Name your team/)).toBeNull();
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
});
