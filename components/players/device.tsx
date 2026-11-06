"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { gamesApi, type HubPlays, type Seat } from "@/lib/games";
import {
  deviceToken,
  playersApi,
  type DeviceView,
  type Identity,
  type JoinBody,
  type PlayerSummary,
} from "@/lib/players";

export type DeviceLoad =
  { kind: "loading" } | { kind: "error"; message: string } | { kind: "ready"; device: DeviceView };

type DeviceState = {
  slug: string;
  load: DeviceLoad;
  /** The phone's one player (ADR-027), or null before joining. */
  active: PlayerSummary | null;
  /** The player's plays, and their points from the ledger (S04-AC7, S08-AC15). */
  plays: HubPlays;
  total: number;
  /** The player's team and whether they captain it, for team games (S03-AC5). */
  seat: Seat | null;
  refreshPlays: () => Promise<void>;
  /** A fresh token proving which device this is. */
  token: () => Promise<string>;
  /** Joins; returns an error message, or null when it worked. */
  join: (nickname: string, code: string | undefined) => Promise<string | null>;
  /** Starts over as a new player, forfeiting the old one (S02-AC7). */
  restart: (nickname: string) => Promise<string | null>;
  retry: () => void;
  /** Set while leaving would cost the player something, such as a running clock (S08-AC14). */
  leaveWarning: string | null;
  setLeaveWarning: (message: string | null) => void;
};

const DeviceContext = createContext<DeviceState | null>(null);

/**
 * This phone's player in one event (spec 02), shared by every event page:
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
  const [plays, setPlays] = useState<HubPlays>({});
  const [total, setTotal] = useState(0);
  const [seat, setSeat] = useState<Seat | null>(null);
  const [leaveWarning, setLeaveWarning] = useState<string | null>(null);
  const token = useCallback(() => deviceToken(identity), [identity]);
  const fetchDevice = useCallback(
    async () => playersApi.device(slug, await token()),
    [slug, token],
  );

  const apply = useCallback((res: Awaited<ReturnType<typeof fetchDevice>>) => {
    setLoad(res.ok ? { kind: "ready", device: res.data } : { kind: "error", message: res.message });
  }, []);

  useEffect(() => {
    const alive = { current: true };
    void fetchDevice().then((res) => {
      if (alive.current) apply(res);
    });
    return () => {
      alive.current = false;
    };
  }, [fetchDevice, apply]);

  const active = load.kind === "ready" ? load.device.player : null;
  const activeKey = active?.id ?? null;

  const refreshPlays = useCallback(async () => {
    if (!activeKey) return;
    const res = await gamesApi.plays(slug, await token(), activeKey);
    if (res.ok) {
      setPlays(res.data.plays);
      setTotal(res.data.total);
      setSeat(res.data.seat);
    }
  }, [slug, token, activeKey]);

  useEffect(() => {
    if (!activeKey) return;
    const alive = { current: true };
    void token()
      .then((t) => gamesApi.plays(slug, t, activeKey))
      .then((res) => {
        if (!alive.current) return;
        setPlays(res.ok ? res.data.plays : {});
        setTotal(res.ok ? res.data.total : 0);
        setSeat(res.ok ? res.data.seat : null);
      });
    return () => {
      alive.current = false;
    };
  }, [slug, token, activeKey]);

  const value = useMemo<DeviceState>(() => {
    const send = async (body: JoinBody) => {
      const res = await playersApi.join(slug, await token(), body);
      if (!res.ok) return res.message;
      setPlays({});
      setTotal(0);
      setSeat(null);
      apply(await fetchDevice());
      return null;
    };
    return {
      slug,
      load,
      active,
      plays: activeKey ? plays : {},
      total: activeKey ? total : 0,
      seat: activeKey ? seat : null,
      refreshPlays,
      token,
      leaveWarning,
      setLeaveWarning,
      retry: () => {
        setLoad({ kind: "loading" });
        void fetchDevice().then(apply);
      },
      join: (nickname, code) => send({ nickname, ...(code ? { code } : {}) }),
      restart: (nickname) => send({ nickname, restart: true }),
    };
  }, [
    slug,
    load,
    active,
    activeKey,
    plays,
    total,
    seat,
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
