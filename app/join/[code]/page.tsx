import { redirect } from "next/navigation";
import { resolveJoin } from "@/lib/events";
import { allEvents } from "@/lib/events/server";

/** /join/CODE: the address on the TV, easy to type when a camera won't scan (S01-AC9). */
export default async function JoinCodePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  redirect(resolveJoin(decodeURIComponent(code), allEvents()).href);
}
