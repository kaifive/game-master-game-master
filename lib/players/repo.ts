import type { DeviceView, PlayerSummary } from "./model";

export type NewPlayer = { nickname: string; key: string; maxPerDevice: number };

/**
 * Players, devices and nicknames for one event (spec 02). `join` is atomic:
 * it throws AppError FORBIDDEN (banned) or CONFLICT (name taken, device full),
 * and returns the existing player when this device already has that name.
 */
export interface PlayerRepo {
  device(slug: string, uid: string): Promise<DeviceView>;
  join(slug: string, uid: string, player: NewPlayer): Promise<PlayerSummary>;
}
