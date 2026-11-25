import { notFound } from "next/navigation";
import { CheckinPage } from "@/components/guests/checkin";
import { getEvent } from "@/lib/events/server";

type Props = { params: Promise<{ event: string }> };

/** The door's check-in page (spec 32). No tabs: it's for helpers, not players. */
export default async function Page({ params }: Props) {
  const config = getEvent((await params).event);
  if (!config) notFound();
  return (
    <main className="mx-auto grid w-full max-w-xl gap-4 px-4 py-6">
      <CheckinPage slug={config.slug} />
    </main>
  );
}
