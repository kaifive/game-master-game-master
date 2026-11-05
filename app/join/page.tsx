import { redirect } from "next/navigation";
import { resolveJoin } from "@/lib/events";
import { allEvents } from "@/lib/events/server";

/** /join?code= sends a code to its event, or back home (S01-AC9). */
export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  redirect(resolveJoin(code, allEvents()).href);
}
