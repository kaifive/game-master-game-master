import { EventLibrary } from "@/components/admin/library";
import { AdminSignIn } from "@/components/admin/sign-in";
import { isAdmin } from "@/lib/admin/server";
import { allEvents, eventRuntime } from "@/lib/events/server";

export const dynamic = "force-dynamic";

/** Sign in, then the event library (specs 06, 07). */
export default async function AdminPage() {
  if (!(await isAdmin())) return <AdminSignIn />;
  const runtime = eventRuntime();
  const events = await Promise.all(
    Object.values(allEvents()).map(async (e) => ({
      slug: e.slug,
      name: e.name,
      status: await runtime.status(e.slug),
    })),
  );
  return <EventLibrary events={events} />;
}
