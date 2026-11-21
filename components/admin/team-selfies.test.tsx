import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { AdminRoot } from "@/components/theme";
import { TeamSelfiesCard } from "./team-selfies";

const list = {
  keeping: true,
  teams: [
    {
      teamId: "t1",
      name: "Snow Dragons",
      color: 6,
      selfie: { url: "https://blob.test/t1.jpg", width: 1200, height: 900 },
      stickers: [],
    },
    { teamId: "t2", name: "Team Bao", color: 2, selfie: null, stickers: [] },
  ],
};

let puts: unknown[] = [];
function serve() {
  puts = [];
  vi.stubGlobal(
    "fetch",
    vi.fn((_url: string, init?: RequestInit) => {
      if (init?.method === "PUT") {
        puts.push(JSON.parse(init.body as string));
        return Promise.resolve(Response.json({ ok: true }));
      }
      return Promise.resolve(Response.json(list));
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Team selfies in Controls (spec 31)", () => {
  test("S31-AC2: the host loads the selfies, dresses one up with stickers, and the stickers save", async () => {
    serve();
    const user = userEvent.setup();
    render(
      <AdminRoot>
        <TeamSelfiesCard slug="holiday-2026" />
      </AdminRoot>,
    );
    await user.click(screen.getByRole("button", { name: "Show" }));
    const teams = await screen.findByRole("list", { name: "Team selfies" });
    expect(within(teams).getByText("No selfie yet")).toBeInTheDocument();
    expect(within(teams).getByText("Add a selfie")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Dress up" }));
    const editor = screen.getByRole("region", { name: "Dress up Snow Dragons" });
    await user.click(within(editor).getByRole("button", { name: "Add Santa hat" }));
    await user.click(within(editor).getByRole("button", { name: "Bigger" }));
    await user.click(within(editor).getByRole("button", { name: "Turn right" }));
    await user.click(within(editor).getByRole("button", { name: "Flip" }));
    await user.click(within(editor).getByRole("button", { name: "Add Mustache" }));
    await user.click(within(editor).getByRole("button", { name: "Remove" }));
    await waitFor(() => {
      expect(puts.at(-1)).toMatchObject({
        teamId: "t1",
        stickers: [{ kind: "santa-hat", angle: 15, flip: true }],
      });
    });
    const [saved] = (puts.at(-1) as { stickers: { size: number }[] }).stickers;
    expect(saved?.size).toBeCloseTo(0.345);
    expect(await within(editor).findByText("Saved")).toBeInTheDocument();
  });
});
