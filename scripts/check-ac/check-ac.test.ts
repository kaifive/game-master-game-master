import { describe, expect, test } from "vitest";
import { findMissing, parseSpec } from "./check-ac";

const spec = (status: string, criteria: string) => `# 04: Points ledger

**Status:** ${status}
**Backlog:** M1

## Summary

Text that mentions AC-9 outside the criteria section.

## Acceptance criteria

${criteria}

## Tests

More text.
`;

describe("parseSpec", () => {
  test("reads the spec number, status and numbered criteria", () => {
    const parsed = parseSpec(
      "docs/specs/04-points-ledger.md",
      spec("Ready", "- [ ] AC-1: Awards add points.\n- [x] AC-2: Voids subtract them."),
    );
    expect(parsed).toEqual({
      file: "docs/specs/04-points-ledger.md",
      number: "04",
      status: "Ready",
      criteria: ["S04-AC1", "S04-AC2"],
    });
  });

  test("only counts criteria inside the acceptance criteria section", () => {
    expect(parseSpec("docs/specs/04-x.md", spec("Ready", "- [ ] AC-1: x"))!.criteria).toEqual([
      "S04-AC1",
    ]);
  });

  test("returns null for files that aren't numbered specs", () => {
    expect(parseSpec("docs/specs/_template.md", spec("Ready", "- AC-1"))).toBeNull();
    expect(parseSpec("docs/specs/README.md", "# Specs")).toBeNull();
  });
});

describe("findMissing", () => {
  const ready = parseSpec("docs/specs/04-x.md", spec("Ready", "- AC-1: a\n- AC-2: b"))!;
  const draft = parseSpec("docs/specs/05-x.md", spec("Draft", "- AC-1: a"))!;

  test("lists criteria of Ready, Building and Done specs that no test names", () => {
    const tests = ['test("S04-AC1: awards add points", ...)'];
    expect(findMissing([ready, draft], tests)).toEqual([
      { id: "S04-AC2", file: "docs/specs/04-x.md" },
    ]);
  });

  test("ignores Draft specs", () => {
    expect(findMissing([draft], [])).toEqual([]);
  });

  test("passes when every criterion has a test", () => {
    expect(findMissing([ready], ["S04-AC1 and S04-AC2"])).toEqual([]);
  });

  test("does not let S04-AC1 count as S04-AC10", () => {
    const many = parseSpec(
      "docs/specs/04-x.md",
      spec("Done", Array.from({ length: 10 }, (_, i) => `- AC-${i + 1}: x`).join("\n")),
    )!;
    const tests = [Array.from({ length: 9 }, (_, i) => `S04-AC${i + 1}:`).join(" ")];
    expect(findMissing([many], tests)).toEqual([{ id: "S04-AC10", file: "docs/specs/04-x.md" }]);
  });
});
