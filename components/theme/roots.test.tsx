import { render } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { ADMIN_THEME, PACKS, resolveTheme } from "@/lib/themes";
import { AdminRoot, StyleRoot } from ".";

const winter = { pack: "judges-table", variant: "winter", colorMode: "light" } as const;
const tokens = (el: Element | null) => (el as HTMLElement).style;

describe("S09-AC7: event pages use the event's pack; admin pages always use the admin theme", () => {
  test("StyleRoot applies the event's pack, variant and mode", () => {
    const { container } = render(<StyleRoot styleRef={winter}>hi</StyleRoot>);
    const root = container.querySelector("[data-theme-root]");
    const expected = resolveTheme(PACKS["judges-table"]!, "winter", "light").tokens;
    expect(root).toHaveAttribute("data-pack", "judges-table");
    expect(root).toHaveAttribute("data-color-mode", "light");
    expect(tokens(root).getPropertyValue("--gm-bg")).toBe(expected.bg);
    expect(tokens(root).getPropertyValue("--gm-snow")).toBe(expected.snow);
  });

  test("AdminRoot uses the admin theme even inside an event's pack", () => {
    const { container } = render(
      <StyleRoot styleRef={{ ...winter, colorMode: "dark" }}>
        <AdminRoot colorMode="dark">controls</AdminRoot>
      </StyleRoot>,
    );
    const admin = container.querySelector('[data-theme-root="admin"]');
    expect(tokens(admin).getPropertyValue("--gm-bg")).toBe(ADMIN_THEME.dark.bg);
    expect(tokens(admin).getPropertyValue("--gm-accent")).toBe(ADMIN_THEME.dark.accent);
    expect(tokens(admin).getPropertyValue("--gm-snow")).toBe("");
  });
});

describe("S09-AC8: the live color mode switches the theme without a reload", () => {
  test("changing the live mode updates the same root in place", () => {
    const { container, rerender } = render(<StyleRoot styleRef={winter}>hi</StyleRoot>);
    const before = container.querySelector("[data-theme-root]");
    rerender(
      <StyleRoot styleRef={winter} liveColorMode="dark">
        hi
      </StyleRoot>,
    );
    const after = container.querySelector("[data-theme-root]");
    expect(after).toBe(before);
    expect(after).toHaveAttribute("data-color-mode", "dark");
    expect(tokens(after).getPropertyValue("--gm-bg")).toBe(
      resolveTheme(PACKS["judges-table"]!, "winter", "dark").tokens.bg,
    );
  });
});
