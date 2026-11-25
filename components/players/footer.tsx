"use client";

import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { BoardIcon, GamesIcon, TeamIcon, YouIcon } from "@/components/icons/nav";
import { useTeams } from "@/components/teams/team-panel";
import { cx } from "@/lib/ui";
import { useOptionalDevice } from "./device";
import { GuardedLink } from "./leave-guard";
import { PlayerSheet } from "./player-sheet";

const tab =
  "flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-gm px-0.5 text-[13px] font-bold tracking-tight no-underline";
const idle = "text-gm-text-muted";
const here = "bg-gm-surface-raised text-gm-text";

function Tab({
  href,
  label,
  icon,
  current,
}: {
  href: string;
  label: string;
  icon: ReactNode;
  current: boolean;
}) {
  return (
    <GuardedLink href={href} current={current} className={cx(tab, current ? here : idle)}>
      {icon}
      <span className="max-w-full truncate">{label}</span>
    </GuardedLink>
  );
}

/**
 * The party's tabs, once this phone has joined: Games, Leaderboard, Team
 * (events with teams) and You. Leaving a game in progress asks first (S08-AC14).
 */
export function PlayerFooter({ hasTeams }: { hasTeams: boolean }) {
  const device = useOptionalDevice();
  const path = usePathname();
  const [sheet, setSheet] = useState(false);
  // Team shows once the team phase starts, or for a captain who has a team to set up (Khai, 2026-11-24).
  const [teams] = useTeams(hasTeams ? (device?.slug ?? "") : "", device?.active?.id ?? null);
  const showTeam =
    hasTeams &&
    (teams?.phase === "team" || teams?.mine?.isCaptain === true || path.endsWith("/team"));
  if (!device?.active) return null;
  const hub = `/${device.slug}`;
  // The TV display is the room's screen, not a phone: no tabs there (Khai, 2026-11-24).
  if (path.startsWith(`${hub}/display`)) return null;
  // Check-in is for door helpers, not players (spec 32).
  if (path.startsWith(`${hub}/checkin`)) return null;
  // The live game is the captain's controller: the whole screen is its, so a mashed
  // key can't land on a tab (QA, 2026-11-25). Its header's back arrow goes to Games.
  if (path === `${hub}/live`) return null;
  const board = `${hub}/leaderboard`;
  const team = `${hub}/team`;

  return (
    <>
      <div aria-hidden="true" className="h-24" />
      <nav
        aria-label="Party"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-gm-border bg-gm-surface px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]"
      >
        <div className="mx-auto flex max-w-xl gap-1">
          <Tab
            href={hub}
            label="Games"
            icon={<GamesIcon />}
            current={path === hub || path.startsWith(`${hub}/play`)}
          />
          <Tab href={board} label="Leaderboard" icon={<BoardIcon />} current={path === board} />
          {showTeam && <Tab href={team} label="Team" icon={<TeamIcon />} current={path === team} />}
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={() => {
              setSheet(true);
            }}
            className={cx(tab, idle)}
          >
            <YouIcon />
            {/* A fixed label, so a long name never squeezes the tabs; the name is in the panel. */}
            You<span className="sr-only">, playing as {device.active.nickname}</span>
          </button>
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
    </>
  );
}
