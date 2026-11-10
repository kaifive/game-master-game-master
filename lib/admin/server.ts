import "server-only";
import { cookies } from "next/headers";
import { z } from "zod";
import { AppError } from "@/lib/errors";
import { requireEvent } from "@/lib/events/server";
import { drawingDeps } from "@/lib/drawings/server";
import { playRepo } from "@/lib/games/server";
import {
  changeCaptain,
  makeCaptain,
  moveToTeam,
  setBoardVisibility,
  setPhase,
  setTeamSize,
} from "@/lib/teams";
import { teamDeps } from "@/lib/teams/server";
import {
  adjustPoints,
  banPlayer,
  changeStatus,
  clearTestData,
  controlsView,
  giveRestart,
  rebuildPoints,
  removePlayer,
  resetGame,
  scoreJar,
  voidPlayerDonation,
  type AdminDeps,
} from "./service";
import {
  passphraseMatches,
  SESSION_COOKIE,
  SESSION_MS,
  signSession,
  SignInLimiter,
  verifySession,
} from "./session";

/** Server-only entry for the admin: sign-in (spec 06) and Controls (spec 07). */

const passphrase = () => process.env.ADMIN_PASSPHRASE?.trim() ?? "";

const shared = globalThis as typeof globalThis & { __gmSignInLimiter?: SignInLimiter };
const limiter = () => (shared.__gmSignInLimiter ??= new SignInLimiter());

const cookieValue = (header: string | null) =>
  header
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1);

/** Route `auth`: the request must carry a valid admin session (S06-AC4). */
export function requireAdmin(request: Request): Promise<true> {
  const secret = passphrase();
  if (!secret || !verifySession(cookieValue(request.headers.get("cookie")), secret, Date.now()))
    return Promise.reject(new AppError("NOT_SIGNED_IN", "Sign in as the host first."));
  return Promise.resolve(true);
}

/** For admin pages: whether this visitor has a valid session (S06-AC4). */
export async function isAdmin(): Promise<boolean> {
  const secret = passphrase();
  return (
    Boolean(secret) &&
    verifySession((await cookies()).get(SESSION_COOKIE)?.value, secret, Date.now())
  );
}

const secure = (request: Request) =>
  request.headers.get("x-forwarded-proto") === "https" ||
  new URL(request.url).protocol === "https:";

const sessionCookie = (request: Request, value: string, maxAgeSeconds: number) =>
  [
    `${SESSION_COOKIE}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${String(maxAgeSeconds)}`,
    ...(secure(request) ? ["Secure"] : []),
  ].join("; ");

export const SignInBody = z.object({ passphrase: z.string().max(200) });

/** POST /api/admin/session (S06-AC1, AC2, AC6). */
export function signIn(request: Request, body: z.infer<typeof SignInBody>): Response {
  const secret = passphrase();
  if (!secret) throw new AppError("FORBIDDEN", "Admin sign-in isn't set up on this server.");
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const now = Date.now();
  if (limiter().locked(ip, now))
    throw new AppError("RATE_LIMITED", "Too many tries. Wait a few minutes and try again.");
  if (!passphraseMatches(body.passphrase, secret)) {
    limiter().fail(ip, now);
    throw new AppError("NOT_SIGNED_IN", "That passphrase isn't right.");
  }
  limiter().succeed(ip);
  return new Response(null, {
    status: 204,
    headers: { "set-cookie": sessionCookie(request, signSession(secret, now), SESSION_MS / 1000) },
  });
}

/** DELETE /api/admin/session (S06-AC5). */
export const signOut = (request: Request) =>
  new Response(null, { status: 204, headers: { "set-cookie": sessionCookie(request, "", 0) } });

const deps = (): AdminDeps => ({ ...teamDeps(), plays: playRepo(), drawings: drawingDeps() });

type Slug = string | string[] | undefined;

export const ControlsAction = z.discriminatedUnion("action", [
  z.object({ action: z.enum(["start", "end", "reopen"]) }),
  z.object({
    action: z.literal("adjust"),
    playerId: z.string().min(1).max(64),
    points: z.number().int(),
    reason: z.string().max(120),
  }),
  z.object({ action: z.enum(["restart", "remove", "ban"]), playerId: z.string().min(1).max(64) }),
  z.object({
    action: z.literal("reset"),
    playerId: z.string().min(1).max(64),
    gameId: z.string().min(1).max(64),
  }),
  z.object({ action: z.literal("rebuild") }),
  z.object({ action: z.literal("phase"), phase: z.enum(["individual", "team"]) }),
  z.object({ action: z.literal("teamSize"), size: z.number().int() }),
  z.object({ action: z.literal("captain"), playerId: z.string().min(1).max(64) }),
  z.object({
    action: z.literal("moveTeam"),
    playerId: z.string().min(1).max(64),
    teamId: z.string().min(1).max(64),
  }),
  z.object({
    action: z.literal("setCaptain"),
    teamId: z.string().min(1).max(64),
    playerId: z.string().min(1).max(64),
  }),
  z.object({ action: z.literal("clear"), confirm: z.string().max(20) }),
  z.object({ action: z.literal("donations") }),
  z.object({ action: z.literal("jars") }),
  z.object({ action: z.literal("drawings") }),
  z.object({
    action: z.literal("scoreJar"),
    gameId: z.string().min(1).max(64),
    actual: z.number().int().min(0).max(1_000_000),
  }),
  z.object({
    action: z.literal("board"),
    phones: z.boolean().optional(),
    tv: z.boolean().optional(),
  }),
  z.object({ action: z.literal("voidDonation"), donationId: z.string().min(1).max(64) }),
]);
export type ControlsAction = z.infer<typeof ControlsAction>;

/** GET /api/admin/events/[slug]: what Controls shows (S07-AC3). */
export const controlsFor = (slug: Slug) => controlsView(deps(), requireEvent(slug));

/** POST /api/admin/events/[slug]: one Controls action, then the fresh view (S07-AC2 to AC9). */
export async function runAction(slug: Slug, body: ControlsAction) {
  const event = requireEvent(slug);
  const d = deps();
  switch (body.action) {
    case "start":
    case "end":
    case "reopen":
      await changeStatus(d, event, body.action);
      break;
    case "adjust":
      await adjustPoints(d, event, body.playerId, body.points, body.reason);
      break;
    case "restart":
      await giveRestart(d, event, body.playerId);
      break;
    case "remove":
      await removePlayer(d, event, body.playerId);
      break;
    case "ban":
      await banPlayer(d, event, body.playerId);
      break;
    case "reset":
      await resetGame(d, event, body.playerId, body.gameId);
      break;
    case "rebuild":
      await rebuildPoints(d, event);
      break;
    case "clear":
      await clearTestData(d, event, body.confirm);
      break;
    case "phase":
      await setPhase(d, event, body.phase);
      break;
    case "teamSize":
      await setTeamSize(d, event, body.size);
      break;
    case "captain":
      await makeCaptain(d, event, body.playerId);
      break;
    case "moveTeam":
      await moveToTeam(d, event, body.playerId, body.teamId);
      break;
    case "setCaptain":
      await changeCaptain(d, event, body.teamId, body.playerId);
      break;
    case "donations":
    case "jars":
    case "drawings":
      break;
    case "scoreJar":
      await scoreJar(d, event, body.gameId, body.actual);
      break;
    case "board":
      await setBoardVisibility(d, event, {
        ...(body.phones !== undefined ? { phones: body.phones } : {}),
        ...(body.tv !== undefined ? { tv: body.tv } : {}),
      });
      break;
    case "voidDonation":
      await voidPlayerDonation(d, event, body.donationId);
      break;
  }
  return controlsView(d, event, {
    donations: body.action === "donations" || body.action === "voidDonation",
    jars: body.action === "jars" || body.action === "scoreJar",
    drawings: body.action === "drawings",
  });
}
