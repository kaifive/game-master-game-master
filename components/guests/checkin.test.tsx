import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { PackRoot } from "@/components/packs/judges-table/root";
import { holiday2026 } from "@/content/events/holiday-2026";
import {
  adminGuestAction,
  checkinAction,
  guestsView,
  MemoryGuestRepo,
  type CheckinAct,
  type GuestDeps,
} from "@/lib/guests";
import { codeMatches } from "@/lib/players";
import { CheckinPage } from "./checkin";

let deps: GuestDeps;
let n = 0;

/** A stand-in for the guest routes: the join code opens them, as on the server. */
function fakeServer() {
  const reply = (status: number, body: unknown) => Promise.resolve(Response.json(body, { status }));
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init: RequestInit = {}) => {
      const code = new Headers(init.headers).get("x-checkin-code") ?? undefined;
      if (!codeMatches(code, holiday2026.joinCode))
        return reply(401, { error: "That check-in code isn't right." });
      if (init.method === "POST")
        return reply(
          200,
          await checkinAction(deps, holiday2026, JSON.parse(init.body as string) as CheckinAct),
        );
      return reply(200, await guestsView(deps, holiday2026));
    }),
  );
}

beforeEach(async () => {
  n = 0;
  localStorage.clear();
  deps = { guests: new MemoryGuestRepo(), now: () => 1, id: () => `g${String(++n)}` };
  await adminGuestAction(deps, holiday2026, {
    action: "upload",
    csv: "Nguyen,Khai\nNguyen,Mai\nTran,Bao\n,Lan",
  });
  fakeServer();
});

const show = () =>
  render(
    <PackRoot styleRef={holiday2026.style}>
      <CheckinPage slug={holiday2026.slug} />
    </PackRoot>,
  );

async function openWithCode() {
  const user = userEvent.setup();
  show();
  await user.type(await screen.findByLabelText(/Check-in code/), "nope");
  await user.click(screen.getByRole("button", { name: "Open check-in" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("That check-in code isn't right.");
  await user.clear(screen.getByLabelText(/Check-in code/));
  await user.type(screen.getByLabelText(/Check-in code/), holiday2026.joinCode.toLowerCase());
  await user.click(screen.getByRole("button", { name: "Open check-in" }));
  await screen.findByText("0 of 4 here");
  return user;
}

describe("the check-in page (spec 32)", () => {
  test("S32-AC5: the party code opens check-in; a wrong one doesn't, and the phone remembers the right one", async () => {
    await openWithCode();
    expect(localStorage.getItem(`gm-checkin-code:${holiday2026.slug}`)).toBe(
      holiday2026.joinCode.toLowerCase(),
    );
  });

  test("S32-AC3: Check in all checks in a family; a tick checks one person out; search finds a family", async () => {
    const user = await openWithCode();
    const nguyen = screen.getByRole("list", { name: "Nguyen" }).parentElement as HTMLElement;
    await user.click(within(nguyen).getByRole("button", { name: "Check in all" }));
    await screen.findByText("2 of 4 here");
    expect(within(nguyen).getByRole("button", { name: "All here" })).toBeDisabled();
    await user.click(screen.getByRole("checkbox", { name: /Mai/ }));
    await screen.findByText("1 of 4 here");
    expect(screen.getByRole("checkbox", { name: /Mai/ })).toHaveAttribute("aria-checked", "false");
    await user.type(screen.getByRole("searchbox"), "tra");
    const groups = within(screen.getByRole("list", { name: "Guests" }));
    expect(groups.getByText("Bao")).toBeInTheDocument();
    expect(groups.queryByText("Khai")).toBeNull();
  });

  test("S32-AC4: Add someone adds a checked-in walk-in; a name already there is checked in instead", async () => {
    const user = await openWithCode();
    const form = within(screen.getByRole("form", { name: "Add someone" }));
    await user.type(form.getByLabelText("Name"), "Hoa");
    await user.click(form.getByRole("button", { name: "Add" }));
    await screen.findByText("1 of 5 here");
    expect(screen.getByText("Added at the door")).toBeInTheDocument();
    await user.type(form.getByLabelText("Name"), "bao");
    await user.type(form.getByLabelText("Family (optional)"), "TRAN");
    await user.click(form.getByRole("button", { name: "Add" }));
    expect(await screen.findByText("Already on the list: checked in.")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("2 of 5 here")).toBeInTheDocument();
    });
  });
});
