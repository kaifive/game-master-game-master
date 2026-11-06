"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { gamesApi, type HubPlays } from "@/lib/games";
import {
  activePlayer,
  deviceToken,
  playersApi,
  type DeviceView,
  type Identity,
  type PlayerSummary,
} from "@/lib/players";

export type DeviceLoad =
  { kind: "loading" } | { kind: "error"; message: string } | { kind: "ready"; device: DeviceView };

type DeviceState = {
  slug: string;
  load: DeviceLoad;
  players: PlayerSummary[];
  active: PlayerSummary | null;
  /** The active player's plays, and their total: the sum of best scores (S08-AC15). */
  plays: HubPlays;
  total: number;
  refreshPlays: () => Promise<void>;
  /** A fresh token proving which device this is. */
  token: () => Promise<string>;
  choose: (id: string) => void;
  /** Joins a player; returns an error message, or null when it worked. */
  join: (nickname: string, code: string | undefined) => Promise<string | null>;
  retry: () => void;
  /** Set while leaving would cost the player something, such as a running clock (S08-AC14). */
  leaveWarning: string | null;
  setLeaveWarning: (message: string | null) => void;
};

const DeviceContext = createContext<DeviceState | null>(null);

const totalOf = (plays: HubPlays) => Object.values(plays).reduce((sum, p) => sum + p.best, 0);

/**
 * This phone's players in one event (spec 02), shared by every event page:
 * the header total, the hub, the game list, game pages and the footer.
 */
export function DeviceProvider({
  slug,
  identity,
  children,
}: {
  slug: string;
  identity: Identity;
  children: React.ReactNode;
}) {
  const [load, setLoad] = useState<DeviceLoad>({ kind: "loading" });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [plays, setPlays] = useState<HubPlays>({});
  const [leaveWarning, setLeaveWarning] = useState<string | null>(null);
  const token = useCallback(() => deviceToken(identity), [identity]);
  const fetchDevice = useCallback(
    async () => playersApi.device(slug, await token()),
    [slug, token],
  );

  const apply = useCallback(
    (res: Awaited<ReturnType<typeof fetchDevice>>) => {
      if (!res.ok) {
        setLoad({ kind: "error", message: res.message });
        return;
      }
      setLoad({ kind: "ready", device: res.data });
      const saved = activePlayer.read(slug);
      const players = res.data.players;
      setActiveId(players.find((p) => p.id === saved)?.id ?? players[0]?.id ?? null);
    },
    [slug],
  );

  useEffect(() => {
    const alive = { current: true };
    void fetchDevice().then((res) => {
      if (alive.current) apply(res);
    });
    return () => {
      alive.current = false;
    };
  }, [fetchDevice, apply]);

  const players = useMemo(() => (load.kind === "ready" ? load.device.players : []), [load]);
  const active = players.find((p) => p.id === activeId) ?? players[0] ?? null;
  const activeKey = active?.id ?? null;

  const refreshPlays = useCallback(async () => {
    if (!activeKey) return;
    const res = await gamesApi.plays(slug, await token(), activeKey);
    if (res.ok) setPlays(res.data.plays);
  }, [slug, token, activeKey]);

  useEffect(() => {
    if (!activeKey) return;
    const alive = { current: true };
    void token()
      .then((t) => gamesApi.plays(slug, t, activeKey))
      .then((res) => {
        if (alive.current) setPlays(res.ok ? res.data.plays : {});
      });
    return () => {
      alive.current = false;
    };
  }, [slug, token, activeKey]);

  const value = useMemo<DeviceState>(() => {
    const choose = (id: string) => {
      activePlayer.write(slug, id);
      setActiveId(id);
    };
    return {
      slug,
      load,
      players,
      active,
      plays: activeKey ? plays : {},
      total: activeKey ? totalOf(plays) : 0,
      refreshPlays,
      token,
      choose,
      leaveWarning,
      setLeaveWarning,
      retry: () => {
        setLoad({ kind: "loading" });
        void fetchDevice().then(apply);
      },
      join: async (nickname, code) => {
        const res = await playersApi.join(slug, await token(), {
          nickname,
          ...(code ? { code } : {}),
        });
        if (!res.ok) return res.message;
        const player = res.data.player;
        setLoad((l) =>
          l.kind === "ready" && !l.device.players.some((p) => p.id === player.id)
            ? { kind: "ready", device: { ...l.device, players: [...l.device.players, player] } }
            : l,
        );
        choose(player.id);
        return null;
      },
    };
  }, [
    slug,
    load,
    players,
    active,
    activeKey,
    plays,
    refreshPlays,
    token,
    leaveWarning,
    fetchDevice,
    apply,
  ]);

  return <DeviceContext.Provider value={value}>{children}</DeviceContext.Provider>;
}

export function useDevice(): DeviceState {
  const state = useContext(DeviceContext);
  if (!state) throw new Error("useDevice needs a <DeviceProvider> above it.");
  return state;
}

/** The device, or null outside a provider. */
export const useOptionalDevice = () => useContext(DeviceContext);
