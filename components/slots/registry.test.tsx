import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import type { SlotComponents } from "@/lib/themes";
import { DEFAULT_SLOTS } from "./defaults";
import { SlotsProvider, resolveSlots, useSlots } from "./registry";

describe("S09-AC2: slots resolve to the pack's component, or the default", () => {
  const Custom: SlotComponents["Toast"] = ({ text }) => <p>custom: {text}</p>;

  test("an override replaces only its own slot", () => {
    const slots = resolveSlots({ Toast: Custom });
    expect(slots.Toast).toBe(Custom);
    expect(slots.Tile).toBe(DEFAULT_SLOTS.Tile);
  });

  test("with no overrides, every slot is the default", () => {
    expect(resolveSlots({})).toEqual(DEFAULT_SLOTS);
  });

  test("useSlots gives components the resolved slots", () => {
    function Uses() {
      const { Toast } = useSlots();
      return <Toast text="hello" />;
    }
    render(
      <SlotsProvider overrides={{ Toast: Custom }}>
        <Uses />
      </SlotsProvider>,
    );
    expect(screen.getByText("custom: hello")).toBeInTheDocument();
  });

  test("outside a provider, components get the defaults", () => {
    function Uses() {
      const { Toast } = useSlots();
      return <Toast text="plain" />;
    }
    render(<Uses />);
    expect(screen.getByText("plain")).toBeInTheDocument();
  });
});
