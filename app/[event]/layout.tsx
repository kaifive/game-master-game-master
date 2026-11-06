import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { EventSurface } from "@/components/events/surface";
import { loadPackRoot } from "@/components/packs/loaders";
import { DeviceProvider } from "@/components/players/device";
import { PlayerFooter } from "@/components/players/footer";
import { getEvent } from "@/lib/events/server";
import { deviceIdentity } from "@/lib/players/server";

type Props = { params: Promise<{ event: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const event = getEvent((await params).event);
  return { title: event ? `${event.name} · Game Master` : "Game Master" };
}

/**
 * Every event page renders in the event's own style pack (S01-AC4), with this
 * phone's players shared across its pages and the footer (spec 02, S08-AC14).
 */
export default async function EventLayout({ params, children }: Props & { children: ReactNode }) {
  const event = getEvent((await params).event);
  if (!event) notFound();
  const PackRoot = await loadPackRoot(event.style.pack);
  return (
    <PackRoot styleRef={event.style}>
      <EventSurface>
        <DeviceProvider slug={event.slug} identity={deviceIdentity()}>
          {children}
          <PlayerFooter hasTeams={event.scoring !== "individual"} />
        </DeviceProvider>
      </EventSurface>
    </PackRoot>
  );
}
