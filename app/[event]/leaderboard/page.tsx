import { notFound } from "next/navigation";
import { LeaderboardView } from "@/components/events/views";
import { toPublicEvent } from "@/lib/events";
import { getEvent } from "@/lib/events/server";

type Props = { params: Promise<{ event: string }> };

/** The Leaderboard tab: teams and players (spec 05, spec 03). */
export default async function Page({ params }: Props) {
  const config = getEvent((await params).event);
  if (!config) notFound();
  return <LeaderboardView event={toPublicEvent(config)} />;
}
