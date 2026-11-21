import { z } from "zod";
import { AppError } from "@/lib/errors";
import type { EventConfig } from "@/lib/events";
import { MAX_STICKERS, STICKER_KINDS, type Selfie, type Sticker, type Team } from "./model";
import { ownPlayer, type TeamDeps } from "./service";

/**
 * Team selfies (spec 31): the captain takes one when naming the team, the
 * host dresses it up with stickers in Controls, and the winners' shows on the
 * TV at the finale. Selfies are never sent to phones.
 */

const TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
export const MAX_SELFIE_BYTES = 3 * 1024 * 1024;

export type SelfieUpload = { file: Blob; width: number; height: number };

const unavailable = () => new AppError("UNAVAILABLE", "Photos can't be sent yet. Tell the host.");

/** Checks a file and keeps it in Blob, replacing the team's last one (S31-AC1). */
async function keep(deps: TeamDeps, event: EventConfig, team: Team, upload: SelfieUpload) {
  const files = deps.files;
  if (!files) throw unavailable();
  const ext = TYPES[upload.file.type];
  if (!ext) throw new AppError("BAD_REQUEST", "Send a photo (JPEG, PNG or WebP).");
  if (upload.file.size === 0 || upload.file.size > MAX_SELFIE_BYTES)
    throw new AppError("BAD_REQUEST", "That photo is too big. Try another one.");
  const width = Math.round(upload.width);
  const height = Math.round(upload.height);
  if (!(width > 0 && height > 0 && width <= 10_000 && height <= 10_000))
    throw new AppError("BAD_REQUEST", "That photo didn't come through. Try again.");
  const url = await files.put(
    `events/${event.slug}/teams/${team.id}-${deps.id()}.${ext}`,
    upload.file,
    upload.file.type,
  );
  await deps.teams.setSelfie(event.slug, team.id, { url, width, height });
  // A retake replaces the file too.
  if (team.selfie && !team.selfie.archived)
    await files.remove([team.selfie.url]).catch(() => undefined);
}

/** The captain's selfie, before the team is named; fixed once it is (S31-AC1). */
export async function captainSelfie(
  deps: TeamDeps,
  event: EventConfig,
  uid: string,
  playerId: string,
  upload: SelfieUpload,
) {
  await ownPlayer(deps, event, uid, playerId);
  const team = (await deps.teams.list(event.slug)).find((t) => t.captainId === playerId);
  if (!team) throw new AppError("FORBIDDEN", "Only a captain takes the team selfie.");
  if (team.name !== null)
    throw new AppError("CONFLICT", "Your team selfie is set. The host can change it.");
  await keep(deps, event, team, upload);
  return { selfie: true };
}

const teamById = async (deps: TeamDeps, event: EventConfig, teamId: string) => {
  const team = (await deps.teams.list(event.slug)).find((t) => t.id === teamId);
  if (!team) throw new AppError("NOT_FOUND", "We couldn't find that team.");
  return team;
};

/** The host adds or replaces any team's selfie, say when a phone can't (S31-AC1). */
export async function hostSelfie(
  deps: TeamDeps,
  event: EventConfig,
  teamId: string,
  upload: SelfieUpload,
) {
  await keep(deps, event, await teamById(deps, event, teamId), upload);
  return selfiesFor(deps, event);
}

const share = z.number().min(0).max(1);
export const StickerList = z
  .array(
    z
      .object({
        id: z.string().min(1).max(40),
        kind: z.enum(STICKER_KINDS),
        x: share,
        y: share,
        size: z.number().min(0.03).max(1.5),
        angle: z.number().min(-360).max(360),
        flip: z.boolean(),
      })
      .strict(),
  )
  .max(MAX_STICKERS);

/** The host's stickers on a team's selfie, saved as they're placed (S31-AC2). */
export async function saveStickers(
  deps: TeamDeps,
  event: EventConfig,
  teamId: string,
  raw: unknown,
) {
  const parsed = StickerList.safeParse(raw);
  if (!parsed.success) throw new AppError("BAD_REQUEST", "Those stickers didn't save.");
  const team = await teamById(deps, event, teamId);
  if (!team.selfie) throw new AppError("CONFLICT", "That team has no selfie yet.");
  await deps.teams.setStickers(event.slug, teamId, parsed.data);
  return { ok: true };
}

/** One team's dressed-up selfie, for Controls and the finale. */
export type TeamSelfie = {
  teamId: string;
  name: string;
  color: number;
  selfie: Selfie | null;
  stickers: Sticker[];
};

const selfieOf = (t: Team): TeamSelfie => ({
  teamId: t.id,
  name: t.name ?? "New team",
  color: t.color,
  selfie: t.selfie && !t.selfie.archived ? t.selfie : null,
  stickers: t.stickers ?? [],
});

/** Every team's selfie and stickers, for Controls' Team selfies card (S31-AC2). */
export async function selfiesFor(deps: TeamDeps, event: EventConfig) {
  const teams = await deps.teams.list(event.slug);
  return { keeping: Boolean(deps.files), teams: teams.map(selfieOf) };
}

/**
 * The finale (S31-AC3): once the event has ended, the team or teams in first
 * place, dressed up. Null before then, so selfies never show early.
 */
export async function finaleFor(deps: TeamDeps, event: EventConfig) {
  if ((await deps.events.status(event.slug)) !== "ended") return null;
  const [teams, board] = await Promise.all([
    deps.teams.list(event.slug),
    deps.points.board.read(event.slug),
  ]);
  if (board.teams.length === 0) return null;
  const top = Math.max(...board.teams.map((t) => t.points));
  const winners = board.teams.filter((t) => t.points === top);
  return {
    points: top,
    teams: winners.flatMap((w) => {
      const t = teams.find((x) => x.id === w.id);
      return t ? [selfieOf(t)] : [];
    }),
  };
}

export type Finale = NonNullable<Awaited<ReturnType<typeof finaleFor>>>;
