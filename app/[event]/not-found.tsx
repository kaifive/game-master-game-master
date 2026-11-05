import { EventNotFound } from "@/components/events/views";

/** An unknown game inside a known event, in the event's style (S01-AC3). */
export default function EventGameNotFound() {
  return <EventNotFound what="game" />;
}
