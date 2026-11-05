"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSlots } from "@/components/slots/registry";

/** The bare site: enter the code from the poster (S01-AC8). */
export function HomeCodeEntry({ error }: { error?: string | undefined }) {
  const router = useRouter();
  const { CodeEntry } = useSlots();
  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-md content-center gap-6 px-4 py-10">
      <div className="grid gap-2">
        <h1 className="m-0 font-gm-display text-4xl font-bold">Game Master</h1>
        <p className="m-0 text-lg text-gm-text-muted">
          Scan the QR code at your event, or enter a code.
        </p>
      </div>
      <CodeEntry
        onSubmit={(code) => {
          router.push(`/join?code=${encodeURIComponent(code)}`);
        }}
        {...(error === "code"
          ? { error: "We couldn't find that code. Check it and try again." }
          : {})}
      />
      <Link href="/admin" className="justify-self-start text-sm text-gm-text-muted">
        Admin
      </Link>
    </main>
  );
}
