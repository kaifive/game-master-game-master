import Link from "next/link";
import type { EventStatus } from "@/lib/events";
import { SignOutButton } from "./sign-in";
import { Card, StatusBadge } from "./ui";

/** Every event, at /admin once signed in (S07-AC1). */
export function EventLibrary({
  events,
}: {
  events: { slug: string; name: string; status: EventStatus }[];
}) {
  return (
    <main className="mx-auto grid w-full max-w-3xl gap-4 px-4 py-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="m-0 text-2xl font-bold">Events</h1>
        <SignOutButton />
      </div>
      <Card title="All events">
        <ul aria-label="Events" className="m-0 grid list-none gap-2 p-0">
          {events.map((e) => (
            <li key={e.slug}>
              <Link
                href={`/admin/${e.slug}`}
                className="flex min-h-12 items-center justify-between gap-3 rounded-gm border border-gm-border px-3 py-2 font-bold text-gm-text no-underline hover:bg-gm-bg"
              >
                <span className="min-w-0 truncate">{e.name}</span>
                <span className="flex items-center gap-3">
                  <StatusBadge status={e.status} />
                  <span aria-hidden="true" className="text-gm-accent-ink">
                    Controls →
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </main>
  );
}
