"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { SlotsProvider } from "@/components/slots/registry";
import {
  ADMIN_THEME,
  PACKS,
  resolveTheme,
  toCssVars,
  type ColorMode,
  type SlotComponents,
  type StyleRef,
  type Theme,
} from "@/lib/themes";

const ThemeContext = createContext<Theme | null>(null);

/** The resolved theme of the nearest root, for pack components that need decorations or mode. */
export const useTheme = () => useContext(ThemeContext);

export type StyleRootProps = {
  styleRef: StyleRef;
  /** Set from Controls during the event (live/{slug}/settings); wins over the event file. */
  liveColorMode?: ColorMode | undefined;
  children: ReactNode;
};

/**
 * The root of every player and TV page (spec 09): applies the event's pack,
 * variant and color mode as --gm-* tokens and provides its slot components.
 */
export function StyleRoot({
  styleRef,
  liveColorMode,
  overrides = {},
  children,
}: StyleRootProps & { overrides?: Partial<SlotComponents> }) {
  const pack = PACKS[styleRef.pack];
  if (!pack) throw new Error(`Unknown style pack ${JSON.stringify(styleRef.pack)}`);
  const mode = liveColorMode ?? styleRef.colorMode;
  const theme = useMemo(
    () => resolveTheme(pack, styleRef.variant, mode),
    [pack, styleRef.variant, mode],
  );
  return (
    <ThemeContext.Provider value={theme}>
      <div
        data-theme-root="event"
        data-pack={theme.pack}
        data-variant={theme.variant}
        data-color-mode={theme.mode}
        style={toCssVars(theme.tokens)}
      >
        <SlotsProvider overrides={overrides}>{children}</SlotsProvider>
      </div>
    </ThemeContext.Provider>
  );
}

/** The root of every admin page: the fixed admin theme and the default slots, whatever the event. */
export function AdminRoot({
  colorMode = "light",
  children,
}: {
  colorMode?: ColorMode;
  children: ReactNode;
}) {
  return (
    <ThemeContext.Provider value={null}>
      <div
        data-theme-root="admin"
        data-color-mode={colorMode}
        style={toCssVars(ADMIN_THEME[colorMode])}
      >
        <SlotsProvider overrides={{}}>{children}</SlotsProvider>
      </div>
    </ThemeContext.Provider>
  );
}
