import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { PackRoot } from "@/components/packs/judges-table/root";
import { holiday2026 } from "@/content/events/holiday-2026";
import { isAppError } from "@/lib/errors";
import { checkNickname, codeMatches, MemoryPlayerRepo, MESSAGES } from "@/lib/players";
import { DeviceProvider } from "./device";
import { PlayerHub } from "./hub";

vi.mock("@/components/motion/confetti", () => ({ fireConfetti: vi.fn() }));
const search = vi.hoisted(() => ({ params: new URLSearchParams() }));
vi.mock("next/navigation", () => ({ useSearchParams: () => search.params }));

const SLUG = holiday2026.slug;

/** A stand-in for the player routes, backed by the memory repo. */
function fakeServer(banned: string[] = []) {
  const repo = new MemoryPlayerRepo({ banned: banned.map((uid) => ({ slug: SLUG, uid })) });
  const reply = (status: number, body: unknown) => Promise.resolve(Response.json(body, { status }));
  const fetch = vi.fn(async (url: string, init: RequestInit = {}) => {
    const uid = new Headers(init.headers).get("authorization")?.replace("Bearer dev:", "") ?? "";
    if (url.endsWith("/device")) return reply(200, await repo.device(SLUG, uid));
    if (url.includes("/plays")) return reply(200, { plays: {} });
    const body = JSON.parse(init.body as string) as { nickname: string; code?: string };
    const name = checkNickname(body.nickname);
    if (!name.ok) return reply(400, { error: name.message });
    const device = await repo.device(SLUG, uid);
    if (device.players.length === 0 && !codeMatches(body.code, holiday2026.joinCode))
      return reply(403, { error: MESSAGES.wrongCode });
    try {
      const player = await repo.join(SLUG, uid, {
        nickname: name.nickname,
        key: name.key,
        maxPerDevice: 2,
      });
      return await reply(201, { player });
    } catch (err) {
      return reply(isAppError(err) ? err.status : 500, {
        error: isAppError(err) ? err.message : "?",
      });
    }
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

const hub = (props: { code?: string } = {}) => {
  search.params = new URLSearchParams(props.code ? { code: props.code } : {});
  return render(
    <PackRoot styleRef={holiday2026.style}>
      <DeviceProvider slug={SLUG} identity="dev">
        <PlayerHub maxPlayers={2} />
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
    expect(await screen.findByText("Playing as")).toBeInTheDocument();
    expect(screen.getByText("Mai")).toBeInTheDocument();
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
    await screen.findByText("Playing as");
    first.unmount();
    localStorage.clear();
    hub({ code: "WUSH7" });
    await joinAs("mai");
    expect(await screen.findByRole("alert")).toHaveTextContent(MESSAGES.taken);
  });

  test("S02-AC6 S02-AC7: add a second player without a code, switch back, and the limit hides Add", async () => {
    fakeServer();
    hub({ code: "WUSH7" });
    const user = await joinAs("Mai");
    await user.click(await screen.findByRole("button", { name: "Add player" }));
    expect(screen.queryByLabelText("Party code")).toBeNull();
    await joinAs("Bao");
    expect(await screen.findByText("Bao")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add player" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Switch player" }));
    await user.click(screen.getByRole("button", { name: "Mai" }));
    expect(screen.getByText("Mai")).toBeInTheDocument();
    expect(localStorage.getItem(`gm.active.${SLUG}`)).toMatch(/^p/);
  });

  test("S02-AC7: the active player is remembered on this phone", async () => {
    fakeServer();
    const first = hub({ code: "WUSH7" });
    const user = await joinAs("Mai");
    await user.click(await screen.findByRole("button", { name: "Add player" }));
    await joinAs("Bao");
    await screen.findByText("Bao");
    first.unmount();
    hub();
    expect(await screen.findByText("Bao")).toBeInTheDocument();
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
