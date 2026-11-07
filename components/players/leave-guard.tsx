"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useContext, useState, type ReactNode } from "react";
import { useSlots } from "@/components/slots/registry";
import { useOptionalDevice } from "./device";

type Guard = (href: string) => (e: React.MouseEvent) => void;

const GuardContext = createContext<Guard>(() => () => undefined);

/**
 * Leaving a game in progress asks first, from any link on the page: the
 * tabs, the header's back arrow (S08-AC14).
 */
export function LeaveGuard({ children }: { children: ReactNode }) {
  const device = useOptionalDevice();
  const router = useRouter();
  const { Button } = useSlots();
  const [pending, setPending] = useState<string | null>(null);
  const guard: Guard = (href) => (e) => {
    if (!device?.leaveWarning) return;
    e.preventDefault();
    setPending(href);
  };
  return (
    <GuardContext.Provider value={guard}>
      {children}
      {pending && device?.leaveWarning && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/60 p-4">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-label="Leave the game?"
            className="grid w-full max-w-sm gap-4 rounded-gm border border-gm-border bg-gm-surface p-5 text-gm-text"
          >
            <p className="m-0 text-lg">{device.leaveWarning}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => {
                  setPending(null);
                }}
              >
                Keep playing
              </Button>
              <Button
                tone="secondary"
                onClick={() => {
                  device.setLeaveWarning(null);
                  setPending(null);
                  router.push(pending);
                }}
              >
                Leave
              </Button>
            </div>
          </div>
        </div>
      )}
    </GuardContext.Provider>
  );
}

/** A link that asks before leaving a game in progress. */
export function GuardedLink({
  href,
  children,
  className,
  label,
  current,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  /** An accessible name, for an icon-only link. */
  label?: string;
  current?: boolean;
}) {
  const guard = useContext(GuardContext);
  return (
    <Link
      href={href}
      onClick={guard(href)}
      className={className}
      aria-label={label}
      aria-current={current ? "page" : undefined}
    >
      {children}
    </Link>
  );
}
