import { PACKS, type StyleRef } from "@/lib/themes";

/** Every pack × (base + variants) × color mode, for the /dev/ui gallery (S09-AC10). */
export function galleryCombos(): { title: string; styleRef: StyleRef }[] {
  return Object.values(PACKS).flatMap((pack) =>
    [undefined, ...Object.keys(pack.variants)].flatMap((variant) =>
      (["light", "dark"] as const).map((colorMode) => ({
        title: [
          pack.name,
          variant ? (pack.variants[variant]?.name ?? variant) : "Base",
          colorMode === "dark" ? "Dark" : "Light",
        ].join(" · "),
        styleRef: variant ? { pack: pack.id, variant, colorMode } : { pack: pack.id, colorMode },
      })),
    ),
  );
}
