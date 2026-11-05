import { render, screen, within } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { PackRoot } from "@/components/packs/judges-table/root";
import { AdminRoot } from "@/components/theme";
import { PACKS, SLOT_NAMES } from "@/lib/themes";
import { galleryCombos } from "./combos";
import { GallerySlots } from "./gallery";

describe("S09-AC10: the gallery shows every slot in every pack, variant and mode", () => {
  test("lists every pack × (base + each variant) × light and dark", () => {
    const expected = Object.values(PACKS).reduce(
      (n, p) => n + (1 + Object.keys(p.variants).length) * 2,
      0,
    );
    const combos = galleryCombos();
    expect(combos).toHaveLength(expected);
    expect(combos).toContainEqual(
      expect.objectContaining({
        styleRef: { pack: "judges-table", variant: "winter", colorMode: "dark" },
      }),
    );
  });

  test("each section shows every slot, in a pack and in the admin theme", () => {
    for (const wrap of [
      (n: React.ReactNode) => (
        <PackRoot styleRef={{ pack: "judges-table", variant: "winter", colorMode: "light" }}>
          {n}
        </PackRoot>
      ),
      (n: React.ReactNode) => <AdminRoot>{n}</AdminRoot>,
    ]) {
      const { unmount } = render(wrap(<GallerySlots title="Example" />));
      const section = screen.getByRole("region", { name: "Example" });
      for (const name of SLOT_NAMES) {
        expect(within(section).getByRole("heading", { name })).toBeInTheDocument();
      }
      unmount();
    }
  });
});
