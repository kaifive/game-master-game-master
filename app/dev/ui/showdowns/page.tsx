import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShowdownPhoneFrame, ShowdownTvFrame } from "@/components/dev/showdown-gallery";
import { GALLERY_MOMENTS, type GalleryMoment } from "@/components/dev/showdown-moments";
import { loadPackRoot } from "@/components/packs/loaders";
import { holiday2026 } from "@/content/events/holiday-2026";

export const metadata: Metadata = { title: "Showdown gallery · Game Master" };

type Props = {
  searchParams: Promise<{
    game?: string;
    moment?: string;
    on?: string;
    teams?: string;
    as?: string;
    round?: string;
  }>;
};

/**
 * One showdown frozen at a moment, on the TV or a captain's phone, in the
 * party's look (dev only): ?game=flyby&moment=show&on=tv&teams=6&round=3.
 */
export default async function ShowdownGalleryPage({ searchParams }: Props) {
  if (process.env.VERCEL_ENV === "production") notFound();
  const q = await searchParams;
  const moment = (GALLERY_MOMENTS as readonly string[]).includes(q.moment ?? "")
    ? (q.moment as GalleryMoment)
    : "show";
  const type = q.game ?? "flyby";
  const teamCount = Math.min(6, Math.max(1, Number(q.teams ?? "4") || 4));
  const round = Math.max(1, Math.min(10, Number(q.round ?? "1") || 1));
  const PackRoot = await loadPackRoot(holiday2026.style.pack);
  return (
    <PackRoot styleRef={holiday2026.style}>
      {q.on === "phone" ? (
        <ShowdownPhoneFrame
          type={type}
          moment={moment}
          teamCount={teamCount}
          as={q.as}
          round={round}
        />
      ) : (
        <ShowdownTvFrame type={type} moment={moment} teamCount={teamCount} round={round} />
      )}
    </PackRoot>
  );
}
