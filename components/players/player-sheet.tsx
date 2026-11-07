"use client";

import { useId, useRef, useState } from "react";
import { useFocusTrap } from "@/components/dialog/use-focus-trap";
import { PointsIcon } from "@/components/icons/points";
import { useSlots } from "@/components/slots/registry";
import { useDevice } from "./device";
import { forfeitMessage, JoinForm } from "./hub";

/**
 * Opened from the footer's name: who's playing, their total, and Start over
 * with what it costs (S02-AC7, S08-AC14).
 */
export function PlayerSheet({ hasTeams, onClose }: { hasTeams: boolean; onClose: () => void }) {
  const { Button } = useSlots();
  const { load, active, total, restart } = useDevice();
  const [mode, setMode] = useState<"view" | "confirm" | "restart">("view");
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  useFocusTrap(box, onClose, mode);
  if (!active || load.kind !== "ready") return null;
  const { restartsLeft } = load.device;

  return (
    <div className="fixed inset-0 z-40 grid place-items-end bg-black/70 p-3 sm:place-items-center">
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        className="grid w-full max-w-md gap-4 rounded-gm bg-gm-surface p-5 text-gm-text shadow-2xl ring-1 ring-gm-border"
      >
        {mode === "restart" ? (
          <JoinForm
            title="Start over"
            askCode={false}
            onCancel={onClose}
            onJoin={async (nickname) => {
              const failed = await restart(nickname);
              if (!failed) onClose();
              return failed;
            }}
          />
        ) : (
          <>
            <div className="grid gap-1">
              <h2 id={`${id}-title`} className="m-0 font-gm-display text-3xl font-bold">
                {active.nickname}
              </h2>
              <p className="m-0 text-lg">
                <span className="inline-flex items-center gap-1.5">
                  <PointsIcon /> {total} points
                </span>
              </p>
            </div>
            {mode === "confirm" ? (
              <div role="alert" className="grid gap-3">
                <p className="m-0 font-bold">
                  {forfeitMessage(active.nickname, total, hasTeams, restartsLeft)}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={onClose}>Keep {active.nickname}</Button>
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
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Button onClick={onClose}>Close</Button>
                {/* Quieter than Close: on a shared phone, this is the button you don't want by accident. */}
                {restartsLeft > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode("confirm");
                    }}
                    className="min-h-11 px-2 text-sm font-bold text-gm-text-muted underline underline-offset-4"
                  >
                    Not you? Start over
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
