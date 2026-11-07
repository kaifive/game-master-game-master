import { notFound } from "next/navigation";
import { TeamView } from "@/components/events/views";
import { toPublicEvent } from "@/lib/events";
import { getEvent } from "@/lib/events/server";

type Props = { params: Promise<{ event: string }> };

/** The Team tab (spec 03). */
export default async function Page({ params }: Props) {
  const config = getEvent((await params).event);
  if (!config) notFound();
  return <TeamView event={toPublicEvent(config)} />;
}
