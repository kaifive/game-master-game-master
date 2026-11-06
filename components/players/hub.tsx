"use client";

import { useSearchParams } from "next/navigation";
import { useId, useState } from "react";
import { useSlots } from "@/components/slots/registry";
import { checkNickname, MESSAGES, NICKNAME_MAX } from "@/lib/players";
import { useDevice } from "./device";

const field =
  "min-h-11 w-full min-w-0 rounded-gm border-2 border-gm-border bg-gm-surface px-3 text-lg text-gm-text";
const label = "text-sm font-bold text-gm-text-muted";
const Alert = ({ children }: { children: string }) => (
  <p role="alert" className="m-0 text-sm font-bold text-gm-danger">
    {children}
  </p>
);

/** The name the filter refuses, shown while typing; length waits for Join (S02-AC5). */
function liveMessage(name: string): string | null {
  if (!name.trim()) return null;
  const check = checkNickname(name);
  return !check.ok && check.message !== MESSAGES.tooShort ? check.message : null;
}

function JoinForm({
  askCode,
  onJoin,
  onCancel,
  title,
}: {
  askCode: boolean;
  onJoin: (nickname: string, code: string | undefined) => Promise<string | null>;
  onCancel?: () => void;
  title: string;
}) {
  const { Button } = useSlots();
  const id = useId();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [showCode, setShowCode] = useState(askCode);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const typed = liveMessage(name);

  async function submit(e: { preventDefault: () => void }) {
    e.preventDefault();
    const check = checkNickname(name);
    if (!check.ok) {
      setError(check.message);
      return;
    }
    setBusy(true);
    setError(null);
    const failed = await onJoin(check.nickname, showCode ? code : undefined);
    setBusy(false);
    if (failed) {
      setError(failed);
      if (failed === MESSAGES.wrongCode) setShowCode(true);
    }
  }

  return (
    <form className="grid gap-3" onSubmit={(e) => void submit(e)}>
      <h2 className="m-0 font-gm-display text-2xl font-bold">{title}</h2>
      <div className="grid gap-1">
        <label htmlFor={`${id}-name`} className={label}>
          Your name
        </label>
        <input
          id={`${id}-name`}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          maxLength={NICKNAME_MAX + 8}
          autoComplete="off"
          enterKeyHint="go"
          aria-invalid={typed || error ? true : undefined}
          className={field}
        />
      </div>
      {showCode && (
        <div className="grid gap-1">
          <label htmlFor={`${id}-code`} className={label}>
            Party code
          </label>
          <input
            id={`${id}-code`}
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
            }}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            maxLength={12}
            className={`${field} font-gm-display tracking-widest uppercase`}
          />
        </div>
      )}
      {(error ?? typed) && <Alert>{(error ?? typed) as string}</Alert>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={busy || Boolean(typed)}>
          {busy ? "Joining…" : "Join"}
        </Button>
        {onCancel && (
          <Button tone="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

/** What starting over costs, in plain words (S02-AC7). Donations only come up when the event has teams. */
export function forfeitMessage(
  name: string,
  points: number,
  hasTeams: boolean,
  restartsLeft: number,
) {
  const lost = hasTeams
    ? `${name}'s ${String(points)} points will be lost, including any given to teams.`
    : `${name}'s ${String(points)} points will be lost.`;
  const left = restartsLeft === 1 ? "once" : `${String(restartsLeft)} times`;
  return `${lost} This phone can only start over ${left} at this party.`;
}

/** Join, or start over as someone new (spec 02). One player per phone (ADR-027). */
export function PlayerHub({ hasTeams }: { hasTeams: boolean }) {
  const { Panel, Button } = useSlots();
  const { load, active, total, join, restart, retry } = useDevice();
  const [mode, setMode] = useState<"view" | "confirm" | "restart">("view");
  // The join code from a QR link (`?code=`), if the phone arrived that way.
  const code = useSearchParams().get("code") ?? undefined;

  if (load.kind === "loading")
    return (
      <Panel label="Your player">
        <p aria-busy="true" className="m-0 text-gm-text-muted">
          Getting your phone ready…
        </p>
      </Panel>
    );

  if (load.kind === "error")
    return (
      <Panel label="Your player">
        <div className="grid gap-3">
          <Alert>{load.message}</Alert>
          <div>
            <Button onClick={retry}>Try again</Button>
          </div>
        </div>
      </Panel>
    );

  if (load.device.banned)
    return (
      <Panel label="Your player">
        <p className="m-0 font-bold">{MESSAGES.banned}</p>
      </Panel>
    );

  if (!active)
    return (
      <Panel label="Join the party">
        <JoinForm
          title="Join the party"
          askCode={!code}
          onJoin={(nickname, typed) => join(nickname, typed ?? code)}
        />
      </Panel>
    );

  const { restartsLeft } = load.device;
  const back = () => {
    setMode("view");
  };

  if (mode === "restart")
    return (
      <Panel label="Start over">
        <JoinForm
          title="Start over"
          askCode={false}
          onCancel={back}
          onJoin={async (nickname) => {
            const failed = await restart(nickname);
            if (!failed) back();
            return failed;
          }}
        />
      </Panel>
    );

  return (
    <Panel label="Your player">
      <div className="grid gap-3">
        <p className="m-0 text-lg">
          Playing as <strong className="font-gm-display text-2xl">{active.nickname}</strong>
        </p>
        {mode === "confirm" ? (
          <div role="alertdialog" aria-label="Start over?" className="grid gap-3">
            <p className="m-0 font-bold">
              {forfeitMessage(active.nickname, total, hasTeams, restartsLeft)}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={back}>Keep {active.nickname}</Button>
              <Button
                tone="secondary"
                onClick={() => {
                  setMode("restart");
                }}
              >
                Start over
              </Button>
            </div>
          </div>
        ) : (
          restartsLeft > 0 && (
            <div>
              <Button
                tone="secondary"
                onClick={() => {
                  setMode("confirm");
                }}
              >
                Not you? Start over
              </Button>
            </div>
          )
        )}
      </div>
    </Panel>
  );
}
