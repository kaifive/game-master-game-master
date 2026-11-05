import { EventNotFound } from "@/components/events/views";
import { AdminRoot } from "@/components/theme";

export default function NotFound() {
  return (
    <AdminRoot>
      <EventNotFound what="event" />
    </AdminRoot>
  );
}
