"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
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
  /** The code from `?code=`, if the phone arrived through a QR link. */
  code: string | undefined;
  load: DeviceLoad;
  players: PlayerSummary[];
  active: PlayerSummary | null;
  /** A fresh token proving which device this is. */
  token: () => Promise<string>;
  choose: (id: string) => void;
  /** Joins a player; returns an error message, or null when it worked. */
  join: (nickname: string, code: string | undefined) => Promise<string | null>;
  retry: () => void;
};

const DeviceContext = createContext<DeviceState | null>(null);

/** This phone's players in one event, shared by the hub, the game list and game pages (spec 02). */
export function DeviceProvider({
  slug,
  identity,
  code,
  children,
}: {
  slug: string;
  identity: Identity;
  code?: string | undefined;
  children: React.ReactNode;
}) {
  const [load, setLoad] = useState<DeviceLoad>({ kind: "loading" });
  const [activeId, setActiveId] = useState<string | null>(null);
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
    let current = true;
    void fetchDevice().then((res) => {
      if (current) apply(res);
    });
    return () => {
      current = false;
    };
  }, [fetchDevice, apply]);

  const value = useMemo<DeviceState>(() => {
    const players = load.kind === "ready" ? load.device.players : [];
    const choose = (id: string) => {
      activePlayer.write(slug, id);
      setActiveId(id);
    };
    return {
      slug,
      code,
      load,
      players,
      active: players.find((p) => p.id === activeId) ?? players[0] ?? null,
      token,
      choose,
      retry: () => {
        setLoad({ kind: "loading" });
        void fetchDevice().then(apply);
      },
      join: async (nickname, typedCode) => {
        const joinCode = typedCode ?? code;
        const res = await playersApi.join(slug, await token(), {
          nickname,
          ...(joinCode ? { code: joinCode } : {}),
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
  }, [slug, code, load, activeId, token, fetchDevice, apply]);

  return <DeviceContext.Provider value={value}>{children}</DeviceContext.Provider>;
}

export function useDevice(): DeviceState {
  const state = useContext(DeviceContext);
  if (!state) throw new Error("useDevice needs a <DeviceProvider> above it.");
  return state;
}

/** The device, or null outside a provider (pages that show no player hub). */
export const useOptionalDevice = () => useContext(DeviceContext);
