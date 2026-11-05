import type { ComponentType } from "react";
import type { StyleRootProps } from "@/components/theme";

/**
 * Each pack's root, loaded only when an event uses it (S09-AC9). Add a
 * pack here with a dynamic import(); never import a pack's root statically.
 */
export const PACK_ROOTS: Record<
  string,
  () => Promise<{ PackRoot: ComponentType<StyleRootProps> }>
> = {
  "judges-table": () => import("./judges-table/root"),
};

export async function loadPackRoot(pack: string) {
  const load = PACK_ROOTS[pack];
  if (!load) throw new Error(`No components registered for style pack ${JSON.stringify(pack)}`);
  return (await load()).PackRoot;
}
