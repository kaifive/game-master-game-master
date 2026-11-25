import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { holiday2026 } from "@/content/events/holiday-2026";
import {
  adminGuestAction,
  checkinAction,
  guestsView,
  MemoryGuestRepo,
  type CheckinAct,
  type GuestAdminAct,
  type GuestDeps,
} from "@/lib/guests";
import { AdminRoot } from "@/components/theme";
import { GuestsCard } from "./guests-card";

let deps: GuestDeps;
let n = 0;

beforeEach(() => {
  n = 0;
  deps = { guests: new MemoryGuestRepo(), now: () => 1, id: () => `g${String(++n)}` };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit = {}) => {
      const body = init.body ? (JSON.parse(init.body as string) as unknown) : null;
      const data = url.includes("/api/admin/")
        ? await adminGuestAction(deps, holiday2026, body as GuestAdminAct)
        : body
          ? await checkinAction(deps, holiday2026, body as CheckinAct)
          : await guestsView(deps, holiday2026);
      return Response.json(data);
    }),
  );
});

describe("Controls' Guests card (spec 32)", () => {
  test("S32-AC2 S32-AC7: uploading shows what was added; a + gives a checked-in guest another ticket", async () => {
    const user = userEvent.setup();
    render(
      <AdminRoot>
        <GuestsCard slug={holiday2026.slug} />
      </AdminRoot>,
    );
    const file = new File(["Family,Name\nNguyen,Khai\nNguyen,Mai"], "rsvp.csv", {
      type: "text/csv",
    });
    await user.upload(await screen.findByLabelText(/Upload the RSVP list/), file);
    expect(
      await screen.findByText(/Added 2, already there 0, not in this file 0\./),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: /Khai/ }));
    const tickets = within(await screen.findByLabelText("Khai's tickets"));
    expect(await tickets.findByText("1 ticket")).toBeInTheDocument();
    await user.click(tickets.getByRole("button", { name: "One more ticket" }));
    expect(await tickets.findByText("2 tickets")).toBeInTheDocument();
    expect(screen.getByText("In the raffle: 1 person, 2 tickets")).toBeInTheDocument();
  });
});
