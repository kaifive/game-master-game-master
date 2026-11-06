import { render } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { PackRoot } from "@/components/packs/judges-table/root";
import { PointsIcon } from "./points";

const iconIn = (variant?: string) =>
  render(
    <PackRoot
      styleRef={{ pack: "judges-table", colorMode: "dark", ...(variant ? { variant } : {}) }}
    >
      <PointsIcon />
    </PackRoot>,
  ).container.querySelector("[data-icon]");

describe("PointsIcon", () => {
  test("S09-AC13: the winter party's points are mistletoe; otherwise a star", () => {
    expect(iconIn("winter")).toHaveAttribute("data-icon", "mistletoe");
    expect(iconIn()).toHaveAttribute("data-icon", "star");
    const { container } = render(<PointsIcon />);
    expect(container.querySelector("[data-icon]")).toHaveAttribute("data-icon", "star");
  });

  test("an unknown icon name falls back to the star, and it's hidden from screen readers", () => {
    const { container } = render(<PointsIcon name="snowman" />);
    const icon = container.querySelector("[data-icon]");
    expect(icon).toHaveAttribute("data-icon", "star");
    expect(icon).toHaveAttribute("aria-hidden", "true");
  });
});
