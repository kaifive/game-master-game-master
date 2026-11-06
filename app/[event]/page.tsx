import { notFound } from "next/navigation";
import { EndedView, LiveView, QuickEventView, UpcomingView } from "@/components/events/views";
import { toPublicEvent } from "@/lib/events";
import { eventRuntime, getEvent } from "@/lib/events/server";
import { deviceIdentity } from "@/lib/players/server";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ event: string }>;
  searchParams: Promise<{ code?: string | string[] }>;
};

/** The event's page: upcoming, live or ended (spec 01), with the player hub (spec 02). */
export default async function EventPage({ params, searchParams }: Props) {
  const config = getEvent((await params).event);
  if (!config) notFound();
  const event = toPublicEvent(config);
  const runtime = eventRuntime();
  const status = await runtime.status(event.slug);
  if (event.kind === "quick") return <QuickEventView event={event} status={status} />;
  if (status === "ended")
    return <EndedView event={event} standings={await runtime.finalStandings(event.slug)} />;
  const { code } = await searchParams;
  const device = {
    identity: deviceIdentity(),
    ...(typeof code === "string" && code ? { code } : {}),
  };
  return status === "live" ? (
    <LiveView event={event} device={device} />
  ) : (
    <UpcomingView event={event} device={device} />
  );
}
