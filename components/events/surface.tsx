"use client";

import type { ReactNode } from "react";
import { useSlots } from "@/components/slots/registry";

/** The event's ground (snow, carpet...) filling the screen. */
export function EventSurface({ children }: { children: ReactNode }) {
  const { Surface } = useSlots();
  return <Surface className="min-h-dvh">{children}</Surface>;
}
