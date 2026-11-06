"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSlots } from "@/components/slots/registry";
import { useOptionalDevice } from "./device";
import { PlayerSheet } from "./player-sheet";

const tab =
  "flex min-h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-gm px-3 font-gm-display text-lg font-bold text-gm-text no-underline";

/**
 * The bottom bar on event pages: who's playing and the way back to the
 * games. Leaving a game in progress asks first (S08-AC14).
 */
export function PlayerFooter({ hasTeams }: { hasTeams: boolean }) {
  const device = useOptionalDevice();
  const router = useRouter();
  const { Button } = useSlots();
  const [pending, setPending] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);
  if (!device?.active) return null;
  const hub = `/${device.slug}`;

  const go = (href: string) => (e: React.MouseEvent) => {
    if (!device.leaveWarning) return;
    e.preventDefault();
    setPending(href);
  };

  return (
    <>
      <div aria-hidden="true" className="h-20" />
      <nav
        aria-label="Party"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-gm-border bg-gm-surface/95 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur"
      >
        <div className="mx-auto flex max-w-xl gap-2">
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={() => {
              setSheet(true);
            }}
            className={tab}
          >
            <span aria-hidden="true">👤</span>
            <span className="truncate">{device.active.nickname}</span>
          </button>
          <Link href={hub} onClick={go(hub)} className={`${tab} bg-gm-surface-raised`}>
            <span aria-hidden="true">☰</span> Games
          </Link>
        </div>
      </nav>
      {sheet && (
        <PlayerSheet
          hasTeams={hasTeams}
          onClose={() => {
            setSheet(false);
          }}
        />
      )}
      {pending && device.leaveWarning && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/60 p-4">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-label="Leave the game?"
            className="grid w-full max-w-sm gap-4 rounded-gm border border-gm-border bg-gm-surface p-5 text-gm-text"
          >
            <p className="m-0 text-lg">{device.leaveWarning}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => {
                  setPending(null);
                }}
              >
                Keep playing
              </Button>
              <Button
                tone="secondary"
                onClick={() => {
                  device.setLeaveWarning(null);
                  setPending(null);
                  router.push(pending);
                }}
              >
                Leave
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
