"use client";

import type { ReactNode } from "react";
import type { EventStatus } from "@/lib/events";
import { cx } from "@/lib/ui";

/** Small building blocks for the standard admin look (ADR-021). */

export const Card = ({
  title,
  children,
  actions,
}: {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}) => (
  <section
    aria-label={title}
    className="overflow-hidden rounded-gm border border-gm-border bg-gm-surface"
  >
    <header className="flex items-center justify-between gap-3 border-b border-gm-border bg-gm-bg px-4 py-2.5">
      <h2 className="m-0 text-base font-bold">{title}</h2>
      {actions}
    </header>
    <div className="p-4">{children}</div>
  </section>
);

const STATUS_STYLE: Record<EventStatus, string> = {
  upcoming: "bg-gm-bg text-gm-text-muted ring-gm-border",
  live: "bg-gm-success text-white ring-gm-success",
  ended: "bg-gm-text text-gm-surface ring-gm-text",
};

export const StatusBadge = ({ status }: { status: EventStatus }) => (
  <span
    className={cx(
      "rounded-full px-2.5 py-0.5 text-xs font-bold tracking-wide uppercase ring-1",
      STATUS_STYLE[status],
    )}
  >
    {status}
  </span>
);

export const field =
  "min-h-11 w-full min-w-0 rounded-gm border border-gm-border bg-gm-surface px-3 text-base text-gm-text";

export function AdminButton({
  children,
  onClick,
  tone = "primary",
  disabled,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  tone?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "inline-flex min-h-11 items-center justify-center rounded-gm px-4 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50",
        tone === "primary" && "bg-gm-accent text-gm-text-on-accent hover:bg-gm-accent-hover",
        tone === "secondary" && "border border-gm-border bg-gm-surface text-gm-text hover:bg-gm-bg",
        tone === "danger" && "border border-gm-danger bg-gm-surface text-gm-danger hover:bg-gm-bg",
      )}
    >
      {children}
    </button>
  );
}
