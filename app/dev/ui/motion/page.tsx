import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { galleryCombos } from "@/components/dev/combos";
import { MotionGallery } from "@/components/dev/motion-gallery";
import { loadPackRoot } from "@/components/packs/loaders";
import { AdminRoot } from "@/components/theme";

export const metadata: Metadata = { title: "Motion gallery · Game Master" };

/** Replays every motion primitive and moment in every pack, variant and mode (S14-AC11). Hidden in production. */
export default async function MotionGalleryPage() {
  if (process.env.VERCEL_ENV === "production") notFound();
  const combos = await Promise.all(
    galleryCombos().map(async (c) => ({ ...c, PackRoot: await loadPackRoot(c.styleRef.pack) })),
  );
  return (
    <main className="grid gap-8 p-4">
      <h1 className="m-0 font-sans text-3xl font-bold">Motion gallery</h1>
      {combos.map(({ title, styleRef, PackRoot }) => (
        <PackRoot key={title} styleRef={styleRef}>
          <MotionGallery title={title} />
        </PackRoot>
      ))}
      <AdminRoot>
        <MotionGallery title="Admin · Light" />
      </AdminRoot>
    </main>
  );
}
