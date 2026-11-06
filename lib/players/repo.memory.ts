import type { PlayerSummary } from "./model";
import type { NewPlayer, PlayerRepo, StoredDevice } from "./repo";
import { joinErrors } from "./repo.errors";

type Player = PlayerSummary & { deviceUid: string; status: "active" | "forfeited" };
type Device = { banned: boolean; playerId: string | null; restarts: number };
type EventData = {
  devices: Map<string, Device>;
  players: Map<string, Player>;
  nicknames: Map<string, string>;
};

/** In-memory players: for tests, and local runs without Firebase. */
export class MemoryPlayerRepo implements PlayerRepo {
  private readonly events = new Map<string, EventData>();
  private nextId = 1;

  constructor(seed: { banned?: { slug: string; uid: string }[] } = {}) {
    for (const { slug, uid } of seed.banned ?? [])
      this.data(slug).devices.set(uid, { banned: true, playerId: null, restarts: 0 });
  }

  private data(slug: string): EventData {
    let d = this.events.get(slug);
    if (!d) {
      d = { devices: new Map(), players: new Map(), nicknames: new Map() };
      this.events.set(slug, d);
    }
    return d;
  }

  private stored(slug: string, uid: string): Device {
    return this.data(slug).devices.get(uid) ?? { banned: false, playerId: null, restarts: 0 };
  }

  private current(slug: string, device: Device): PlayerSummary | null {
    const p = device.playerId ? this.data(slug).players.get(device.playerId) : undefined;
    return p && p.status === "active" ? { id: p.id, nickname: p.nickname } : null;
  }

  device(slug: string, uid: string): Promise<StoredDevice> {
    const device = this.stored(slug, uid);
    return Promise.resolve({
      banned: device.banned,
      player: this.current(slug, device),
      restarts: device.restarts,
    });
  }

  private add(
    slug: string,
    uid: string,
    device: Device,
    { nickname, key }: NewPlayer,
    restarts: number,
  ) {
    const d = this.data(slug);
    const id = `p${String(this.nextId++).padStart(4, "0")}`;
    d.players.set(id, { id, nickname, deviceUid: uid, status: "active" });
    d.nicknames.set(key, id);
    d.devices.set(uid, { ...device, playerId: id, restarts });
    return { id, nickname };
  }

  join(slug: string, uid: string, player: NewPlayer) {
    const device = this.stored(slug, uid);
    if (device.banned) return Promise.reject(joinErrors.banned());
    const mine = this.current(slug, device);
    if (mine && this.data(slug).nicknames.get(player.key) === mine.id) return Promise.resolve(mine);
    if (mine) return Promise.reject(joinErrors.hasPlayer());
    if (this.data(slug).nicknames.has(player.key)) return Promise.reject(joinErrors.taken());
    return Promise.resolve(this.add(slug, uid, device, player, device.restarts));
  }

  restart(slug: string, uid: string, player: NewPlayer, maxRestarts: number) {
    const d = this.data(slug);
    const device = this.stored(slug, uid);
    if (device.banned) return Promise.reject(joinErrors.banned());
    if (device.restarts >= maxRestarts) return Promise.reject(joinErrors.noRestarts());
    const old = device.playerId ? d.players.get(device.playerId) : undefined;
    const owner = d.nicknames.get(player.key);
    if (owner !== undefined && owner !== old?.id) return Promise.reject(joinErrors.taken());
    if (old) {
      d.players.set(old.id, { ...old, status: "forfeited" });
      for (const [key, id] of d.nicknames) if (id === old.id) d.nicknames.delete(key);
    }
    return Promise.resolve(this.add(slug, uid, device, player, device.restarts + 1));
  }
}
