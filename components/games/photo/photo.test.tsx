import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { PhotoView } from "@/lib/games";
import { PhotoGame, photoSummary } from "./photo";

const api = vi.hoisted(() => ({ photo: vi.fn() }));
vi.mock("@/lib/games", async (original) => ({ ...(await original<object>()), gamesApi: api }));
vi.mock("@/components/players/device", () => ({
  useDevice: () => ({
    slug: "holiday-2026",
    active: { id: "p1", nickname: "Mai" },
    token: () => Promise.resolve("dev:phone"),
  }),
}));
const shrunk = new Blob(["small"], { type: "image/jpeg" });
vi.mock("./shrink", () => ({ shrinkPhoto: vi.fn(() => Promise.resolve(shrunk)) }));

const view = (
  photos: PhotoView["photos"] = [],
  kind: PhotoView["kind"] = "snapping",
): PhotoView => ({
  kind,
  prompt: "Snipe a photo of Coach.",
  max: 3,
  photos,
});

beforeEach(() => {
  vi.clearAllMocks();
  URL.createObjectURL = vi.fn(() => "blob:preview");
  URL.revokeObjectURL = vi.fn();
});

describe("photo challenge screen (spec 20)", () => {
  test("S20-AC3: shrinks a picked photo, shows it, sends it, and shows the play that comes back", async () => {
    const onPlay = vi.fn();
    const back = {
      status: "playing",
      points: 0,
      best: 0,
      step: 1,
      view: view([{ id: "a", url: "u", rating: null }]),
    };
    api.photo.mockResolvedValue({ ok: true, data: back });
    render(
      <PhotoGame
        view={view()}
        gameId="spot-and-snipe"
        onPlay={onPlay}
        onMove={vi.fn()}
        onTimeUp={vi.fn()}
        busy={false}
      />,
    );
    expect(screen.getByText("Snipe a photo of Coach.")).toBeInTheDocument();
    expect(screen.getByText("3 of 3 photos left")).toBeInTheDocument();
    const user = userEvent.setup();
    await user.upload(
      screen.getByLabelText("Take or choose a photo"),
      new File(["big"], "coach.jpg", { type: "image/jpeg" }),
    );
    expect(await screen.findByRole("img", { name: "The photo you picked" })).toHaveAttribute(
      "src",
      "blob:preview",
    );
    await user.click(screen.getByRole("button", { name: "Send it" }));
    expect(api.photo).toHaveBeenCalledWith(
      "holiday-2026",
      "spot-and-snipe",
      "dev:phone",
      "p1",
      shrunk,
    );
    expect(onPlay).toHaveBeenCalledWith(back);
  });

  test("S20-AC1: one photo says so: make it count", () => {
    render(
      <PhotoGame
        view={{ ...view(), max: 1 }}
        gameId="spot-and-snipe"
        onMove={vi.fn()}
        onTimeUp={vi.fn()}
        busy={false}
      />,
    );
    expect(screen.getByText("Just one photo, so make it count!")).toBeInTheDocument();
  });

  test("S20-AC3: sent photos say whether they're rated; an upload error shows", async () => {
    api.photo.mockResolvedValue({ ok: false, message: "Photos can't be sent yet. Tell the host." });
    render(
      <PhotoGame
        view={view([
          { id: "a", url: "u1", rating: null },
          { id: "b", url: "u2", rating: 80 },
        ])}
        gameId="spot-and-snipe"
        onMove={vi.fn()}
        onTimeUp={vi.fn()}
        busy={false}
      />,
    );
    expect(screen.getByText("Waiting for a rating")).toBeInTheDocument();
    expect(screen.getByText("Rated 80")).toBeInTheDocument();
    expect(screen.getByText("1 of 3 photos left")).toBeInTheDocument();
    const user = userEvent.setup();
    await user.upload(
      screen.getByLabelText("Take or choose a photo"),
      new File(["x"], "c.jpg", { type: "image/jpeg" }),
    );
    await user.click(await screen.findByRole("button", { name: "Send it" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Photos can't be sent yet");
    expect(photoSummary(view([{ id: "a", url: "u", rating: null }], "done"))).toBe(
      "Your score shows when the host rates your photo.",
    );
    expect(photoSummary(view([{ id: "a", url: "u", rating: 70 }], "done"))).toBe("Rated 70");
    expect(
      photoSummary(
        view(
          [
            { id: "a", url: "u", rating: 40 },
            { id: "b", url: "u", rating: 85 },
          ],
          "done",
        ),
      ),
    ).toBe("Best rating 85");
  });
});
