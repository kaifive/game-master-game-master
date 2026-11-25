"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";
import { ArrowIcon } from "@/components/icons/nav";
import { useOptionalDevice } from "@/components/players/device";
import { liveApi } from "@/lib/live";
import { IDLE_POLL_MS, useLive } from "./use-live";

/** The sessions this phone has already been taken to, so it goes once per showdown. */
const SEEN_KEY = "gm-live-seen";

function seen(sessionId: string): boolean {
  try {
    return sessionStorage.getItem(SEEN_KEY) === sessionId;
  } catch {
    return false;
  }
}

function markSeen(sessionId: string) {
  try {
    sessionStorage.setItem(SEEN_KEY, sessionId);
  } catch {
    // Private mode: the phone may be taken again; harmless.
  }
}

/**
 * Follows the host's live games on every page of the party (specs 11, 24).
 * When a showdown starts, a joined phone goes to it at once: the captain's
 * becomes the controller, everyone else's says Watch the TV. A phone in the
 * middle of a solo game isn't pulled out (that would cost the run); it gets
 * a banner to tap instead, which every other page shows too while it runs.
 */
export function LiveWatcher({ slug }: { slug: string }) {
  const device = useOptionalDevice();
  const path = usePathname();
  const router = useRouter();
  // The TV's view: no token, so following costs no auth and no Firestore read.
  const load = useCallback(() => liveApi.view(slug, "", null), [slug]);
  const { view } = useLive(load, { activeMs: IDLE_POLL_MS });
  const live = `/${slug}/live`;
  const playing = path.startsWith(`/${slug}/play/`);
  // The TV and its pages follow the showdown themselves; check-in isn't a player page (spec 32).
  const screen = path.startsWith(`/${slug}/display`) || path.startsWith(`/${slug}/checkin`);
  const sessionId = view?.active ? view.session.id : null;
  const joined = Boolean(device?.active);

  useEffect(() => {
    if (!sessionId || !joined || screen || playing || path === live || seen(sessionId)) return;
    markSeen(sessionId);
    router.push(live);
  }, [sessionId, joined, screen, playing, path, live, router]);

  if (!view?.active || !joined || screen || path === live) return null;
  return (
    <Link
      href={live}
      className="fixed inset-x-2 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 mx-auto flex min-h-14 max-w-xl items-center justify-between gap-3 rounded-gm bg-gm-accent px-4 py-2 text-gm-text-on-accent no-underline shadow-lg"
    >
      <span className="grid">
        <span className="text-xs font-bold uppercase">Showdown on now</span>
        <span className="font-gm-display text-lg font-bold">{view.session.title}</span>
      </span>
      <ArrowIcon />
    </Link>
  );
}
