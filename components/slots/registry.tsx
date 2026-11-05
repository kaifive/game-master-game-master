"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { SlotComponents } from "@/lib/themes";
import { DEFAULT_SLOTS } from "./defaults";

/** The pack's components where it has them, the defaults everywhere else (ADR-022). */
export const resolveSlots = (overrides: Partial<SlotComponents>): SlotComponents => ({
  ...DEFAULT_SLOTS,
  ...overrides,
});

const SlotsContext = createContext<SlotComponents>(DEFAULT_SLOTS);

export function SlotsProvider({
  overrides,
  children,
}: {
  overrides: Partial<SlotComponents>;
  children: ReactNode;
}) {
  const slots = useMemo(() => resolveSlots(overrides), [overrides]);
  return <SlotsContext.Provider value={slots}>{children}</SlotsContext.Provider>;
}

/** The slots for the current event. Games and pages use these, never styled components. */
export const useSlots = () => useContext(SlotsContext);
