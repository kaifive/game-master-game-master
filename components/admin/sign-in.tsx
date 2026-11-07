"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { AdminButton, Card, field } from "./ui";

/** The passphrase box at /admin (spec 06). */
export function AdminSignIn() {
  const router = useRouter();
  const id = useId();
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: { preventDefault: () => void }) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ passphrase }),
    }).catch(() => null);
    setBusy(false);
    if (res?.ok) {
      router.refresh();
      return;
    }
    const body = (await res?.json().catch(() => null)) as { error?: string } | null;
    setError(body?.error ?? "We couldn't reach the server. Try again.");
  }

  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-sm content-center px-4">
      <h1 className="sr-only">Game Master host</h1>
      <Card title="Host sign-in">
        <form className="grid gap-3" onSubmit={(e) => void submit(e)}>
          <label htmlFor={id} className="text-sm font-bold text-gm-text-muted">
            Passphrase
          </label>
          <input
            id={id}
            type="password"
            autoComplete="current-password"
            value={passphrase}
            onChange={(e) => {
              setPassphrase(e.target.value);
            }}
            className={field}
          />
          {error && (
            <p role="alert" className="m-0 text-sm font-bold text-gm-danger">
              {error}
            </p>
          )}
          <AdminButton type="submit" disabled={busy || !passphrase}>
            {busy ? "Signing in…" : "Sign in"}
          </AdminButton>
        </form>
      </Card>
    </main>
  );
}

/** Signs out and goes back to the sign-in box (S06-AC5). */
export function SignOutButton() {
  const router = useRouter();
  return (
    <AdminButton
      tone="secondary"
      onClick={() => {
        void fetch("/api/admin/session", { method: "DELETE" }).then(() => {
          router.push("/admin");
          router.refresh();
        });
      }}
    >
      Sign out
    </AdminButton>
  );
}
