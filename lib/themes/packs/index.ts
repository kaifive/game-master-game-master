import type { PackDefinition } from "../model";
import { judgesTable } from "./judges-table/pack";

/** Pack data (tokens and variants). Small and safe to import anywhere. */
export const PACKS: Record<string, PackDefinition> = {
  [judgesTable.id]: judgesTable,
};
