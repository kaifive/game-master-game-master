"use client";

import { createContext, useContext } from "react";
import type { Theme } from "@/lib/themes";

export const ThemeContext = createContext<Theme | null>(null);

/** The resolved theme of the nearest StyleRoot or AdminRoot. */
export const useTheme = () => useContext(ThemeContext);
