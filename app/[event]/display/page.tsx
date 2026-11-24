import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { DisplayView } from "@/components/display/display-view";
import { getEvent } from "@/lib/events/server";
import { teaserFor } from "@/lib/games";
import { showdownFor } from "@/lib/live";

export const dynamic = "force-dynamic";

/** The TV display (spec 05). The one page that shows the join code: it's on the poster too. */
export default async function DisplayPage({ params }: { params: Promise<{ event: string }> }) {
  const config = getEvent((await params).event);
  if (!config) notFound();
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return (
    <DisplayView
      slug={config.slug}
      name={config.name}
      joinUrl={`${proto}://${host}/join?code=${config.joinCode}`}
      shortUrl={`${host}/join/${config.joinCode}`}
      joinCode={config.joinCode}
      // The menu between showdowns: every live game that isn't off, hidden ones too (Khai, 2026-11-24).
      showdowns={config.games
        .filter((g) => g.mode === "live" && g.visibility !== "off" && showdownFor(g.type))
        .map((g) => ({ id: g.id, title: g.title, type: g.type, teaser: teaserFor(g.type) }))}
    />
  );
}
