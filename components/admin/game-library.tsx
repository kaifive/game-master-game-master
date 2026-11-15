import Link from "next/link";
import type { CatalogEntry } from "@/lib/games";
import { SignOutButton } from "./sign-in";
import { Card } from "./ui";

/**
 * Every game that's been built, at /admin/games (spec 23). For reference when
 * planning an event: an event's games are chosen in its event file.
 */
export function GameLibrary({ games }: { games: CatalogEntry[] }) {
  return (
    <main className="mx-auto grid w-full max-w-3xl gap-4 px-4 py-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="m-0 text-2xl font-bold">Games</h1>
        <SignOutButton />
      </div>
      <Link href="/admin" className="font-bold text-gm-accent-ink">
        ← Events
      </Link>
      <Card title={`All games (${String(games.length)})`}>
        <p className="m-0 mb-3 text-gm-text-muted">
          To use one at an event, add it to the event&apos;s file with its type id.
        </p>
        <ul aria-label="Games" className="m-0 grid list-none gap-2 p-0">
          {games.map((g) => (
            <li key={g.type} className="grid gap-0.5 rounded-gm border border-gm-border px-3 py-2">
              <span className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-bold">{g.name}</span>
                <code className="text-sm text-gm-text-muted">{g.type}</code>
              </span>
              <span>{g.pitch}</span>
            </li>
          ))}
        </ul>
      </Card>
    </main>
  );
}
