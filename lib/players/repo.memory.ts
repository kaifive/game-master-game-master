import type { DeviceView, PlayerSummary } from "./model";
import type { NewPlayer, PlayerRepo } from "./repo";
import { joinErrors } from "./repo.errors";

type EventData = {
  devices: Map<string, { banned: boolean; playerIds: string[] }>;
  players: Map<string, PlayerSummary & { deviceUid: string }>;
  nicknames: Map<string, string>;
};

/** In-memory players: for tests, and local runs without Firebase. */
export class MemoryPlayerRepo implements PlayerRepo {
  private readonly events = new Map<string, EventData>();
  private nextId = 1;

  constructor(seed: { banned?: { slug: string; uid: string }[] } = {}) {
    for (const { slug, uid } of seed.banned ?? [])
      this.data(slug).devices.set(uid, { banned: true, playerIds: [] });
  }

  private data(slug: string): EventData {
    let d = this.events.get(slug);
    if (!d) {
      d = { devices: new Map(), players: new Map(), nicknames: new Map() };
      this.events.set(slug, d);
    }
    return d;
  }

  device(slug: string, uid: string): Promise<DeviceView> {
    const d = this.data(slug);
    const device = d.devices.get(uid);
    const players = (device?.playerIds ?? []).flatMap((id) => {
      const p = d.players.get(id);
      return p ? [{ id: p.id, nickname: p.nickname }] : [];
    });
    return Promise.resolve({ banned: device?.banned ?? false, players });
  }

  join(slug: string, uid: string, { nickname, key, maxPerDevice }: NewPlayer) {
    const d = this.data(slug);
    const device = d.devices.get(uid) ?? { banned: false, playerIds: [] };
    if (device.banned) return Promise.reject(joinErrors.banned());
    const owner = d.nicknames.get(key);
    if (owner !== undefined) {
      const mine = device.playerIds.includes(owner) ? d.players.get(owner) : undefined;
      return mine
        ? Promise.resolve({ id: mine.id, nickname: mine.nickname })
        : Promise.reject(joinErrors.taken());
    }
    if (device.playerIds.length >= maxPerDevice) return Promise.reject(joinErrors.full());
    const id = `p${String(this.nextId++).padStart(4, "0")}`;
    d.players.set(id, { id, nickname, deviceUid: uid });
    d.nicknames.set(key, id);
    d.devices.set(uid, { ...device, playerIds: [...device.playerIds, id] });
    return Promise.resolve({ id, nickname });
  }
}
