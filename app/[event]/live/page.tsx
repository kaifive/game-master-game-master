import { notFound } from "next/navigation";
import { LiveGameView } from "@/components/events/views";
import { toPublicEvent } from "@/lib/events";
import { getEvent } from "@/lib/events/server";

type Props = { params: Promise<{ event: string }> };

/** A live game on a phone (specs 11, 24). */
export default async function Page({ params }: Props) {
  const config = getEvent((await params).event);
  if (!config) notFound();
  return <LiveGameView event={toPublicEvent(config)} />;
}
