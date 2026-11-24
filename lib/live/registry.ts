import {
  auction,
  blindstop,
  flyby,
  landmass,
  buzzer,
  lastsecond,
  path,
  shuffle,
  snatch,
  snowsum,
  stockings,
  to21,
} from "./games";
import { PERCEPTION_CORES, SHOWDOWN_ONLY_CORES } from "@/lib/games";
import { perceptionShowdown } from "./games/perception";
import type { AnyShowdown } from "./model";

/**
 * Every showdown type the server can run (specs 25 to 27). Each game's
 * module adds itself here; a type missing from this list can't be started.
 */
const SHOWDOWNS: Record<string, AnyShowdown> = {
  flyby,
  snowsum,
  blindstop,
  lastsecond,
  auction,
  stockings,
  snatch,
  path,
  shuffle,
  to21,
  landmass,
  buzzer,
  // Perception games (spec 28): showdown versions; their solo versions are in lib/games.
  ...Object.fromEntries(
    [...PERCEPTION_CORES, ...SHOWDOWN_ONLY_CORES].map((core) => [
      core.type,
      perceptionShowdown(core as never),
    ]),
  ),
};

export const showdownFor = (type: string): AnyShowdown | undefined => SHOWDOWNS[type];

/** The showdown types that exist, for validating event files. */
export const showdownTypes = (): string[] => Object.keys(SHOWDOWNS);

/** What's wrong with a showdown's content in an event file, field by field (ADR-040). */
export function showdownContentErrors(type: string, content: unknown): string[] {
  const parsed = showdownFor(type)?.content.safeParse(content);
  return !parsed || parsed.success
    ? []
    : parsed.error.issues.map((i) => `${i.path.join(".") || "(content)"}: ${i.message}`);
}
