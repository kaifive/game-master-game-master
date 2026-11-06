"use client";

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

/** Join, add and switch players on this phone (spec 02). Needs a DeviceProvider. */
export function PlayerHub({ maxPlayers }: { maxPlayers: number }) {
  const { Panel, Button } = useSlots();
  const { load, code, players, active, join, retry, choose: setActive } = useDevice();
  const [mode, setMode] = useState<"view" | "switch" | "add">("view");
  const choose = (id: string) => {
    setActive(id);
    setMode("view");
  };
  const joinThenShow = async (nickname: string, typed: string | undefined) => {
    const failed = await join(nickname, typed);
    if (!failed) setMode("view");
    return failed;
  };

  if (load.kind === "loading")
    return (
      <Panel label="Your players">
        <p aria-busy="true" className="m-0 text-gm-text-muted">
          Getting your phone ready…
        </p>
      </Panel>
    );

  if (load.kind === "error")
    return (
      <Panel label="Your players">
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
      <Panel label="Your players">
        <p className="m-0 font-bold">{MESSAGES.banned}</p>
      </Panel>
    );

  if (players.length === 0)
    return (
      <Panel label="Join the party">
        <JoinForm title="Join the party" askCode={!code} onJoin={joinThenShow} />
      </Panel>
    );

  if (mode === "add")
    return (
      <Panel label="Add a player">
        <JoinForm
          title="Add a player"
          askCode={false}
          onJoin={joinThenShow}
          onCancel={() => {
            setMode("view");
          }}
        />
      </Panel>
    );

  return (
    <Panel label="Your players">
      <div className="grid gap-3">
        <p className="m-0 text-lg">
          Playing as <strong className="font-gm-display text-2xl">{active?.nickname}</strong>
        </p>
        {mode === "switch" ? (
          <ul aria-label="Players on this phone" className="m-0 flex list-none flex-wrap gap-2 p-0">
            {players.map((p) => (
              <li key={p.id}>
                <Button
                  tone={p.id === active?.id ? "primary" : "secondary"}
                  onClick={() => {
                    choose(p.id);
                  }}
                >
                  {p.nickname}
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-wrap gap-2">
            {players.length > 1 && (
              <Button
                tone="secondary"
                onClick={() => {
                  setMode("switch");
                }}
              >
                Switch player
              </Button>
            )}
            {players.length < maxPlayers && (
              <Button
                tone="secondary"
                onClick={() => {
                  setMode("add");
                }}
              >
                Add player
              </Button>
            )}
          </div>
        )}
      </div>
    </Panel>
  );
}
