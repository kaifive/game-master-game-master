import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { PackRoot } from "@/components/packs/judges-table/root";
import { holiday2026 } from "@/content/events/holiday-2026";
import { isAppError } from "@/lib/errors";
import { checkNickname, codeMatches, MemoryPlayerRepo, MESSAGES } from "@/lib/players";
import { DeviceProvider, useDevice } from "./device";
import { forfeitMessage, PlayerHub } from "./hub";
import { PlayerSheet } from "./player-sheet";

/** Stands in for the footer: shows who's playing. */
function Who() {
  const { active } = useDevice();
  return active ? <p>Playing as {active.nickname}</p> : null;
}

vi.mock("@/components/motion/confetti", () => ({ fireConfetti: vi.fn() }));
const search = vi.hoisted(() => ({ params: new URLSearchParams() }));
vi.mock("next/navigation", () => ({ useSearchParams: () => search.params }));

const SLUG = holiday2026.slug;
const RESTARTS = 1;

/** A stand-in for the player routes, backed by the memory repo. */
function fakeServer(banned: string[] = []) {
  const repo = new MemoryPlayerRepo({ banned: banned.map((uid) => ({ slug: SLUG, uid })) });
  const reply = (status: number, body: unknown) => Promise.resolve(Response.json(body, { status }));
  const fetch = vi.fn(async (url: string, init: RequestInit = {}) => {
    const uid = new Headers(init.headers).get("authorization")?.replace("Bearer dev:", "") ?? "";
    if (url.includes("/plays")) return reply(200, { plays: {}, total: 0 });
    const d = await repo.device(SLUG, uid);
    if (url.endsWith("/device"))
      return reply(200, {
        banned: d.banned,
        player: d.player,
        restartsLeft: RESTARTS - d.restarts,
      });
    const body = JSON.parse(init.body as string) as {
      nickname: string;
      code?: string;
      restart?: boolean;
    };
    const name = checkNickname(body.nickname);
    if (!name.ok) return reply(400, { error: name.message });
    if (!body.restart && !d.player && !codeMatches(body.code, holiday2026.joinCode))
      return reply(403, { error: MESSAGES.wrongCode });
    const player = { nickname: name.nickname, key: name.key };
    try {
      return await reply(201, {
        player: body.restart
          ? await repo.restart(SLUG, uid, player, RESTARTS)
          : await repo.join(SLUG, uid, player),
      });
    } catch (err) {
      return reply(isAppError(err) ? err.status : 500, {
        error: isAppError(err) ? err.message : "?",
      });
    }
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

const hub = (props: { code?: string; sheet?: boolean } = {}) => {
  search.params = new URLSearchParams(props.code ? { code: props.code } : {});
  return render(
    <PackRoot styleRef={holiday2026.style}>
      <DeviceProvider slug={SLUG} identity="dev">
        <PlayerHub />
        <Who />
        {props.sheet && <PlayerSheet hasTeams={false} onClose={() => undefined} />}
      </DeviceProvider>
    </PackRoot>,
  );
};

async function joinAs(name: string, code?: string) {
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText("Your name"), name);
  if (code) await user.type(screen.getByLabelText("Party code"), code);
  await user.click(screen.getByRole("button", { name: "Join" }));
  return user;
}

beforeEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe("PlayerHub", () => {
  test("S02-AC2: a code from the URL hides the code box; joining shows 'Playing as'", async () => {
    fakeServer();
    hub({ code: "WUSH7" });
    expect(await screen.findByRole("heading", { name: "Join the party" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Party code")).toBeNull();
    await joinAs("Mai");
    expect(await screen.findByText("Playing as Mai")).toBeInTheDocument();
    // Once joined, the party page shows no player card; the footer has the player.
    expect(screen.queryByRole("region", { name: /Join the party|Your player/ })).toBeNull();
  });

  test("S02-AC2: a wrong code shows its message", async () => {
    fakeServer();
    hub();
    await joinAs("Mai", "ZZZZZ");
    expect(await screen.findByRole("alert")).toHaveTextContent(MESSAGES.wrongCode);
  });

  test("S02-AC3: a too-short name is caught on Join, without calling the server", async () => {
    const fetch = fakeServer();
    hub({ code: "WUSH7" });
    await joinAs("M");
    expect(await screen.findByRole("alert")).toHaveTextContent(MESSAGES.tooShort);
    expect(fetch.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(0);
  });

  test("S02-AC5: a blocked name is flagged while typing and Join is disabled", async () => {
    fakeServer();
    hub({ code: "WUSH7" });
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText("Your name"), "sh1t");
    expect(screen.getByRole("alert")).toHaveTextContent(MESSAGES.blocked);
    expect(screen.getByRole("button", { name: "Join" })).toBeDisabled();
  });

  test("S02-AC4: a taken name shows its message", async () => {
    fakeServer();
    localStorage.setItem("gm.device", "otherphone1");
    const first = hub({ code: "WUSH7" });
    await joinAs("Mai");
    await screen.findByText(/^Playing as /);
    first.unmount();
    localStorage.clear();
    hub({ code: "WUSH7" });
    await joinAs("mai");
    expect(await screen.findByRole("alert")).toHaveTextContent(MESSAGES.taken);
  });

  test("S02-AC6: one player per phone: no Add player or Switch player", async () => {
    fakeServer();
    hub({ code: "WUSH7" });
    await joinAs("Mai");
    await screen.findByText(/^Playing as /);
    expect(screen.queryByRole("button", { name: /Add player|Switch player/ })).toBeNull();
  });

  test("S02-AC7: starting over warns about the points, then makes a new player", async () => {
    fakeServer();
    hub({ code: "WUSH7", sheet: true });
    const user = await joinAs("Mai");
    const sheet = await screen.findByRole("dialog", { name: "Mai" });
    expect(sheet).toHaveTextContent("0 points");
    await user.click(screen.getByRole("button", { name: "Not you? Start over" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Mai's 0 points will be lost. This phone can only start over once",
    );
    await user.click(screen.getByRole("button", { name: "Start over" }));
    expect(screen.getByRole("heading", { name: "Start over" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Party code")).toBeNull();
    await joinAs("Bao");
    expect(await screen.findByText("Playing as Bao")).toBeInTheDocument();
    // The limit is used up, so the option is gone.
    expect(screen.queryByRole("button", { name: "Not you? Start over" })).toBeNull();
  });

  test("S02-AC7: the warning mentions donations only when the event has teams", () => {
    expect(forfeitMessage("Mai", 140, true, 1)).toBe(
      "Mai's 140 points will be lost, including any given to teams. This phone can only start over once at this party.",
    );
    expect(forfeitMessage("Mai", 140, false, 2)).toBe(
      "Mai's 140 points will be lost. This phone can only start over 2 times at this party.",
    );
  });

  test("S02-AC1 S02-AC8: reopening on the same phone shows its player", async () => {
    fakeServer();
    const first = hub({ code: "WUSH7" });
    await joinAs("Mai");
    await screen.findByText(/^Playing as /);
    first.unmount();
    hub();
    expect(await screen.findByText("Playing as Mai")).toBeInTheDocument();
  });

  test("S02-AC9: a banned phone sees why it can't join", async () => {
    localStorage.setItem("gm.device", "bannedphone1");
    fakeServer(["bannedphone1"]);
    hub();
    expect(await screen.findByText(MESSAGES.banned)).toBeInTheDocument();
    expect(screen.queryByLabelText("Your name")).toBeNull();
  });

  test("shows a retry when the server can't be reached", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("offline"))),
    );
    hub();
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't reach the server/);
    fakeServer();
    await userEvent.setup().click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("heading", { name: "Join the party" })).toBeInTheDocument();
  });
});
