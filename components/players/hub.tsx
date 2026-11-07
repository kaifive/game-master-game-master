"use client";

import { useSearchParams } from "next/navigation";
import { useId, useRef, useState } from "react";
import { useSlots } from "@/components/slots/registry";
import { checkNickname, MESSAGES, NICKNAME_MAX } from "@/lib/players";
import { useDevice } from "./device";

const field =
  "min-h-11 w-full min-w-0 rounded-gm border-2 border-gm-border bg-gm-surface px-3 text-lg text-gm-text";
const label = "text-sm font-bold text-gm-text-muted";
const Alert = ({ children, id }: { children: string; id?: string }) => (
  <p id={id} role="alert" className="m-0 text-sm font-bold text-gm-danger">
    {children}
  </p>
);

/** The name the filter refuses, shown while typing; length waits for Join (S02-AC5). */
function liveMessage(name: string): string | null {
  if (!name.trim()) return null;
  const check = checkNickname(name);
  return !check.ok && check.message !== MESSAGES.tooShort ? check.message : null;
}

export function JoinForm({
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
  const nameBox = useRef<HTMLInputElement>(null);
  const codeBox = useRef<HTMLInputElement>(null);
  // A wrong code belongs to the code box; every other message to the name box.
  const codeError = error === MESSAGES.wrongCode;
  const nameError = Boolean(typed) || (Boolean(error) && !codeError);

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
      // Back to the box that needs fixing, so focus isn't lost after the wait.
      requestAnimationFrame(() => {
        (failed === MESSAGES.wrongCode ? codeBox : nameBox).current?.focus();
      });
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
          ref={nameBox}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          maxLength={NICKNAME_MAX + 8}
          autoComplete="off"
          enterKeyHint="go"
          aria-invalid={nameError ? true : undefined}
          aria-describedby={nameError ? `${id}-error` : undefined}
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
            ref={codeBox}
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              if (codeError) setError(null);
            }}
            aria-invalid={codeError ? true : undefined}
            aria-describedby={codeError ? `${id}-error` : undefined}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            maxLength={12}
            className={`${field} font-gm-display tracking-widest uppercase`}
          />
        </div>
      )}
      {(error ?? typed) && <Alert id={`${id}-error`}>{(error ?? typed) as string}</Alert>}
      <div className="flex flex-wrap gap-2">
        <Button size="lg" type="submit" disabled={busy || Boolean(typed)}>
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

/** Joining, on the party page. Once joined it shows nothing: the footer has the player (spec 02). */
export function PlayerHub() {
  const { Panel, Button } = useSlots();
  const { load, active, join, retry } = useDevice();
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

  if (active) return null;
  return (
    <Panel label="Join the party">
      <JoinForm
        title="Join the party"
        askCode={!code}
        onJoin={(nickname, typed) => join(nickname, typed ?? code)}
      />
    </Panel>
  );
}
