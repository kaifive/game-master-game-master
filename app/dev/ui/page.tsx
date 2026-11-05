import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { galleryCombos } from "@/components/dev/combos";
import { GallerySlots } from "@/components/dev/gallery";
import { loadPackRoot } from "@/components/packs/loaders";
import { AdminRoot } from "@/components/theme";

export const metadata: Metadata = { title: "UI gallery · Game Master" };

/** Every slot in every pack, variant and mode, plus the admin theme (S09-AC10). Hidden in production. */
export default async function UiGalleryPage() {
  if (process.env.VERCEL_ENV === "production") notFound();
  const combos = await Promise.all(
    galleryCombos().map(async (c) => ({ ...c, PackRoot: await loadPackRoot(c.styleRef.pack) })),
  );
  return (
    <main className="grid gap-8 p-4">
      <h1 className="m-0 font-sans text-3xl font-bold">UI gallery</h1>
      {combos.map(({ title, styleRef, PackRoot }) => (
        <PackRoot key={title} styleRef={styleRef}>
          <GallerySlots title={title} />
        </PackRoot>
      ))}
      {(["light", "dark"] as const).map((mode) => (
        <AdminRoot key={mode} colorMode={mode}>
          <GallerySlots title={`Admin · ${mode === "dark" ? "Dark" : "Light"}`} />
        </AdminRoot>
      ))}
    </main>
  );
}
