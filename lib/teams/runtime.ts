import "server-only";
import { backend } from "@/lib/backend";
import type { TeamRepo, TeamSummaryRepo } from "./repo";
import { firebaseTeams, firebaseTeamSummary } from "./repo.firebase";
import { MemoryTeamRepo, MemoryTeamSummaryRepo } from "./repo.memory";

const shared = globalThis as typeof globalThis & {
  __gmMemoryTeams?: MemoryTeamRepo;
  __gmMemoryTeamSummary?: MemoryTeamSummaryRepo;
};

/** Where teams live: Firestore, or one in-memory store per server process. */
export const teamRepo = (): TeamRepo =>
  backend() === "firebase" ? firebaseTeams() : (shared.__gmMemoryTeams ??= new MemoryTeamRepo());

/** Where the teams summary lives: the Realtime Database, or memory. */
export const teamSummary = (): TeamSummaryRepo =>
  backend() === "firebase"
    ? firebaseTeamSummary()
    : (shared.__gmMemoryTeamSummary ??= new MemoryTeamSummaryRepo());
