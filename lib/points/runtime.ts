import "server-only";
import { backend } from "@/lib/backend";
import type { BoardRepo, PointsRepo } from "./repo";
import { firebaseBoard, firebasePoints } from "./repo.firebase";
import { MemoryBoardRepo, MemoryPointsRepo } from "./repo.memory";

const shared = globalThis as typeof globalThis & {
  __gmMemoryPoints?: MemoryPointsRepo;
  __gmMemoryBoard?: MemoryBoardRepo;
};

/** Where points and the leaderboard live: Firebase, or one in-memory store per process. */
export function pointsRuntime(): { points: PointsRepo; board: BoardRepo } {
  if (backend() === "firebase") return { points: firebasePoints(), board: firebaseBoard() };
  return {
    points: (shared.__gmMemoryPoints ??= new MemoryPointsRepo()),
    board: (shared.__gmMemoryBoard ??= new MemoryBoardRepo()),
  };
}
