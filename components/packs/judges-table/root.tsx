"use client";

import { StyleRoot, type StyleRootProps } from "@/components/theme";
import { judgesTableSlots } from "./slots";

/** Judges' Table's root: the event's StyleRoot with this pack's slots. */
export function PackRoot(props: StyleRootProps) {
  return <StyleRoot {...props} overrides={judgesTableSlots} />;
}
