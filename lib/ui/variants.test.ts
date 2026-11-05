import { describe, expect, test } from "vitest";
import { cx, variants } from "./variants";

describe("cx", () => {
  test("joins class names and skips empty values", () => {
    expect(cx("a", false, null, undefined, "", "b")).toBe("a b");
  });
});

describe("variants", () => {
  const button = variants({
    base: "btn",
    variants: {
      size: { sm: "btn-sm", lg: "btn-lg" },
      tone: { accent: "btn-accent", danger: "btn-danger" },
    },
    defaults: { size: "sm", tone: "accent" },
  });

  test("uses the defaults", () => {
    expect(button()).toBe("btn btn-sm btn-accent");
  });

  test("applies chosen variants", () => {
    expect(button({ size: "lg", tone: "danger" })).toBe("btn btn-lg btn-danger");
  });

  test("appends extra classes last", () => {
    expect(button({ className: "w-full" })).toBe("btn btn-sm btn-accent w-full");
  });
});
