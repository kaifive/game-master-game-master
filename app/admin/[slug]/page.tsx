import { notFound, redirect } from "next/navigation";
import { Controls } from "@/components/admin/controls";
import { controlsFor, isAdmin } from "@/lib/admin/server";
import { getEvent } from "@/lib/events/server";

export const dynamic = "force-dynamic";

/** One event's Controls (spec 07). Signed-out visitors go to the sign-in box (S06-AC4). */
export default async function ControlsPage({ params }: { params: Promise<{ slug: string }> }) {
  if (!(await isAdmin())) redirect("/admin");
  const { slug } = await params;
  const event = getEvent(slug);
  if (!event) notFound();
  return (
    <Controls
      slug={event.slug}
      name={event.name}
      games={event.games
        .filter((g) => g.mode === "solo")
        .map((g) => ({
          id: g.id,
          title: g.title,
          type: g.type,
          ...(g.keepDrawings ? { keepDrawings: true } : {}),
        }))}
      initial={await controlsFor(slug)}
    />
  );
}
