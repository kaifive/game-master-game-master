import { describe, expect, it } from "vitest";
import { photo, photoShare, PhotoContent, withPhoto, withRating } from "./logic";

const c = PhotoContent.parse({ prompt: "Snipe a photo of Coach.", maxPhotos: 2 });
const at = { now: 0 };

describe("Photo challenge", () => {
  it("S20-AC1: a prompt and up to 10 photos; the instructions come from it", () => {
    expect(PhotoContent.safeParse({ prompt: "x", maxPhotos: 11 }).success).toBe(false);
    expect(PhotoContent.safeParse({}).success).toBe(false);
    // One photo by default: one chance, so make it count.
    const one = PhotoContent.parse({ prompt: "x" });
    expect(photo.create(one, 1, at).max).toBe(1);
    expect(photo.instructions(one).lines.join(" ")).toMatch(/just one photo, so make it count/);
    const lines = photo.instructions(c).lines.join(" ");
    expect(lines).toMatch(/Snipe a photo of Coach/);
    expect(lines).toMatch(/up to 2 photos/);
    expect(photo.once).toBe(true);
  });

  it("S20-AC2: a phone can't add a photo as a move; the upload route adds it", () => {
    const s = photo.create(c, 1, at);
    expect(photo.move(s, c, { type: "photo", url: "https://evil.example/x.jpg" }, at).ok).toBe(
      false,
    );
    const one = withPhoto(s, { id: "a", url: "https://blob/a.jpg", at: 5 });
    expect(photo.view(one, c, at)).toEqual({
      kind: "snapping",
      prompt: "Snipe a photo of Coach.",
      max: 2,
      photos: [{ id: "a", url: "https://blob/a.jpg", rating: null }],
    });
    expect(photo.step(one)).toBe(1);
  });

  it("S20-AC4 S20-AC5: the best rating sets the score; the play ends at the most photos and waits for ratings", () => {
    let s = withPhoto(photo.create(c, 1, at), { id: "a", url: "u1", at: 1 });
    expect(photo.isOver(s)).toBe(false);
    s = withPhoto(s, { id: "b", url: "u2", at: 2 });
    expect(photo.isOver(s)).toBe(true);
    expect(photo.view(s, c, at).kind).toBe("done");
    expect(photo.waiting?.(s)).toBe(true);
    s = withRating(s, "a", 40);
    expect(photo.waiting?.(s)).toBe(true);
    s = withRating(s, "b", 85);
    expect(photo.waiting?.(s)).toBe(false);
    expect(photoShare(s)).toBe(0.85);
    expect(photo.score(s, 100)).toBe(85);
    expect(photo.score(withRating(s, "b", 10), 100)).toBe(40);
  });
});
