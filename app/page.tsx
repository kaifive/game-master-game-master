import { HomeCodeEntry } from "@/components/events/home";
import { AdminRoot } from "@/components/theme";

/** The bare site: players enter or scan a code (spec 01). */
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <AdminRoot>
      <HomeCodeEntry error={error} />
    </AdminRoot>
  );
}
