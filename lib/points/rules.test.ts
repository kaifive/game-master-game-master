import { describe, expect, it } from "vitest";
import type { BoardRow, RecentAward } from "./model";
import { leadChange, newAwards, rank, standingsFor, TOP } from "./rules";

const row = (id: string, nickname: string, points: number): BoardRow => ({
  id,
  nickname,
  teamId: null,
  points,
});
const award = (id: string, at: number): RecentAward => ({
  id,
  playerId: "p1",
  nickname: "Mai",
  points: 10,
  reason: "Holiday Trivia",
  at,
});

describe("rank", () => {
  it("S05-AC1: highest first, ties share a rank", () => {
    expect(
      rank([row("a", "Ann", 50), row("b", "Bao", 90), row("c", "Cy", 50), row("d", "Di", 10)]),
    ).toEqual([
      { id: "b", rank: 1, nickname: "Bao", points: 90 },
      { id: "a", rank: 2, nickname: "Ann", points: 50 },
      { id: "c", rank: 2, nickname: "Cy", points: 50 },
      { id: "d", rank: 4, nickname: "Di", points: 10 },
    ]);
    expect(rank([])).toEqual([]);
  });
});

describe("standingsFor", () => {
  const rows = Array.from({ length: 15 }, (_, i) =>
    row(`p${String(i)}`, `P${String(i).padStart(2, "0")}`, 150 - i * 10),
  );
  it("S05-AC2: the top 10, and the player's own place even outside it", () => {
    const s = standingsFor(rows, "p12");
    expect(s.top).toHaveLength(TOP);
    expect(s.top[0]?.nickname).toBe("P00");
    expect(s.me).toEqual({ rank: 13, points: 30 });
    expect(standingsFor(rows, "p1").me).toEqual({ rank: 2, points: 140 });
    expect(standingsFor(rows, null).me).toBeNull();
    expect(standingsFor(rows, "gone").me).toBeNull();
  });
});

describe("newAwards", () => {
  it("S05-AC5: only awards since the last update, oldest first; none on the first load", () => {
    const first = [award("a2", 2), award("a1", 1)];
    expect(newAwards(null, first)).toEqual([]);
    expect(newAwards(first, [award("a4", 4), award("a3", 3), ...first]).map((a) => a.id)).toEqual([
      "a3",
      "a4",
    ]);
    expect(newAwards(first, first)).toEqual([]);
  });
});

describe("leadChange", () => {
  const ranked = rank([row("a", "Ann", 50), row("b", "Bao", 90)]);
  it("S05-AC6: a new first place is a lead change; the first load and no change aren't", () => {
    expect(leadChange("a", ranked)?.nickname).toBe("Bao");
    expect(leadChange(null, ranked)?.nickname).toBe("Bao");
    expect(leadChange("b", ranked)).toBeNull();
    expect(leadChange(undefined, ranked)).toBeNull();
    expect(leadChange(null, rank([row("a", "Ann", 0)]))).toBeNull();
    expect(leadChange("a", [])).toBeNull();
  });
});
