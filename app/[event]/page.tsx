import { notFound } from "next/navigation";
import { EndedView, LiveView, QuickEventView, UpcomingView } from "@/components/events/views";
import { toPublicEvent } from "@/lib/events";
import { eventRuntime, getEvent } from "@/lib/events/server";

export const dynamic = "force-dynamic";

/** The event's page: upcoming, live or ended (spec 01). */
export default async function EventPage({ params }: { params: Promise<{ event: string }> }) {
  const config = getEvent((await params).event);
  if (!config) notFound();
  const event = toPublicEvent(config);
  const runtime = eventRuntime();
  const status = await runtime.status(event.slug);
  if (event.kind === "quick") return <QuickEventView event={event} status={status} />;
  if (status === "ended")
    return <EndedView event={event} standings={await runtime.finalStandings(event.slug)} />;
  return status === "live" ? <LiveView event={event} /> : <UpcomingView event={event} />;
}
