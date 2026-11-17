"use client";

import Link from "next/link";
import { useCallback } from "react";
import { ArrowIcon } from "@/components/icons/nav";
import { liveApi } from "@/lib/live";
import { IDLE_POLL_MS, useLive } from "./use-live";

/** "Live now" on the games list while the host runs a live game (spec 11 UI). */
export function LiveBanner({ slug }: { slug: string }) {
  // The TV's view: no token, so the banner costs no auth and no Firestore read.
  const load = useCallback(() => liveApi.view(slug, "", null), [slug]);
  // Only whether a game is on matters here, so it never polls faster than idle.
  const { view } = useLive(load, { activeMs: IDLE_POLL_MS });
  if (!view?.active) return null;
  return (
    <Link
      href={`/${slug}/live`}
      className="flex min-h-16 items-center justify-between gap-3 rounded-gm bg-gm-accent px-4 py-3 text-gm-text-on-accent no-underline"
    >
      <span className="grid">
        <span className="text-sm font-bold uppercase">Live now</span>
        <span className="font-gm-display text-xl font-bold">{view.session.title}</span>
      </span>
      <ArrowIcon />
    </Link>
  );
}
